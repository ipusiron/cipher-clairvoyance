// 暗号解析ロジック

import { LETTERS } from './config.js';
import { 
  clamp01, sum, mean, argmin, gcd, toAZ,
  countLetters, chiSquare, indexOfCoincidence, 
  englishnessScore, invMod 
} from './utils.js';

// 自己相関
export function autoCorrelationMatches(s, maxT=40){
  const N=s.length, arr=[];
  for (let t=1;t<=Math.min(maxT,N-1);t++){
    let m=0; 
    for (let i=0;i<N-t;i++) if (s[i]===s[i+t]) m++;
    arr.push(m/Math.max(1,N-t));
  }
  return arr;
}

// カシスキー法（繰り返し間距離）- 長いn-gramも検索
export function kasiskiDistances(s, minN=3, maxN=7){
  const dist=[];
  for (let n=minN;n<=maxN;n++){
    const seen={};
    for (let i=0;i<=s.length-n;i++){
      const sub=s.slice(i,i+n); 
      (seen[sub] ||= []).push(i);
    }
    for (const k in seen){
      const pos=seen[k]; 
      if (pos.length > 1) {
        for (let i=1;i<pos.length;i++) {
          const distance = pos[i]-pos[i-1];
          // 長いn-gramには重み付けを追加
          const weight = n >= 5 ? 2 : 1;
          for (let w = 0; w < weight; w++) {
            dist.push(distance);
          }
        }
      }
    }
  }
  return dist;
}

// GCDヒストグラム
export function gcdHistogram(dists, kmax=20){
  const hist=new Map();
  for (let i=0;i<dists.length;i++){
    for (let j=i+1;j<dists.length;j++){
      const g=gcd(dists[i],dists[j]);
      if (g>=2 && g<=kmax) hist.set(g,(hist.get(g)||0)+1);
    }
  }
  return hist;
}

// 鍵長候補の抽出（極度改善版 - 小さな約数の数学的偏向を根本的に解決）
export function topKeyLengthCandidatesFromPeaks(ac, gcdHist, kmax=20){
  const scores=new Map();
  
  // 自己相関からのスコア計算（より重視）
  ac.forEach((v,idx)=>{ 
    const t=idx+1; 
    if (t>=2 && t<=kmax){ 
      const sc=Math.max(0,(v-0.035)); 
      if (sc>0) {
        // 長い鍵長により大きな重みを与える
        const lengthBonus = Math.log(t + 1) / Math.log(2.5); // 対数的なボーナス
        scores.set(t,(scores.get(t)||0)+sc*30*lengthBonus); // 自己相関の重みを増加
      }
    }
  });
  
  // GCDヒストグラムからのスコア計算（根本的な偏向補正）
  for (let k=2;k<=kmax;k++){ 
    const cnt=gcdHist.get(k)||0; 
    if (cnt>0) {
      // 極端な対数的正規化で小さな約数の影響を最小化
      let bias_correction;
      if (k <= 2) {
        bias_correction = Math.pow(k, 6); // k=2は桁違いに多いため指数的減点
      } else if (k <= 4) {
        bias_correction = Math.pow(k, 4); // k=3,4も大幅減点
      } else if (k <= 6) {
        bias_correction = Math.pow(k, 2); // k=5,6は中程度減点
      } else {
        bias_correction = Math.sqrt(k); // k>=7は軽微な減点のみ
      }
      
      // 長い鍵長への大幅優遇
      let lengthWeight = 1.0;
      if (k >= 12) lengthWeight = 10.0; // 12以上は10倍優遇
      else if (k >= 10) lengthWeight = 8.0; // 10以上は8倍優遇
      else if (k >= 8) lengthWeight = 5.0; // 8以上は5倍優遇
      else if (k >= 6) lengthWeight = 2.0; // 6以上は2倍優遇
      else lengthWeight = 0.01; // 6未満は1%に減点
      
      // 対数的正規化されたスコア
      const normalizedScore = Math.log(1 + cnt / bias_correction) * lengthWeight;
      scores.set(k,(scores.get(k)||0)+normalizedScore); 
    }
  }
  
  // Vigenère暗号の典型的な鍵長へのボーナス
  const vigenereTypicalLengths = [8, 10, 12, 15, 16, 18, 20];
  for (const candidate of vigenereTypicalLengths) {
    if (candidate <= kmax && gcdHist.has(candidate)) {
      const gcdCount = gcdHist.get(candidate);
      // 典型的なVigenère鍵長には大幅ボーナス
      const bonus = candidate >= 12 ? gcdCount * 2.0 : gcdCount * 1.0;
      scores.set(candidate, (scores.get(candidate) || 0) + bonus);
    }
  }
  
  // 約数関係の極端なペナルティ
  const finalScores = new Map();
  for (const [k, score] of scores) {
    let adjustedScore = score;
    
    // より大きな鍵長の約数である場合は極端なペナルティ
    for (const [largerK] of scores) {
      if (largerK > k && largerK % k === 0) {
        const ratio = largerK / k;
        let penalty;
        if (k <= 4) {
          penalty = Math.max(0.01, 0.1 - ratio * 0.02); // 小さな約数に極端ペナルティ
        } else if (k <= 6) {
          penalty = Math.max(0.1, 0.3 - ratio * 0.05); // 中間約数に大きなペナルティ
        } else {
          penalty = Math.max(0.5, 0.8 - ratio * 0.1); // 大きな約数に適度なペナルティ
        }
        adjustedScore *= penalty;
        break;
      }
    }
    
    // 自己相関での強力なボーナス
    const acIndex = k - 1;
    if (acIndex < ac.length) {
      const acValue = ac[acIndex];
      if (acValue > 0.055) {
        adjustedScore *= 3.0; // 強い自己相関には200%ボーナス
      } else if (acValue > 0.045) {
        adjustedScore *= 2.0; // 中程度の自己相関には100%ボーナス
      } else if (acValue > 0.040) {
        adjustedScore *= 1.5; // 軽微な自己相関には50%ボーナス
      }
    }
    
    // 実際のVigenère暗号でよく使われる鍵長への微調整
    if (k >= 10 && k <= 16) {
      adjustedScore *= 1.2; // 典型的なVigenère鍵長を軽微に優遇
    }
    
    finalScores.set(k, adjustedScore);
  }
  
  return [...finalScores.entries()].sort((a,b)=>b[1]-a[1]).map(([k])=>k).slice(0,8);
}

// 列分割
export function splitColumnsByK(s,k){
  const cols=Array.from({length:k},()=>[]);
  for (let i=0;i<s.length;i++) cols[i%k].push(s[i]);
  return cols.map(a=>a.join(""));
}

// Caesar暗号の最適シフト量
export function bestCaesarShiftChi2(s){
  const N=s.length; 
  if (N===0) return {minChi2:Infinity, shift:0};
  const res=[];
  for (let sh=0;sh<26;sh++){
    const cnt=new Array(26).fill(0);
    for (let i=0;i<N;i++){
      const c=s.charCodeAt(i)-65; 
      const p=((c-sh)%26+26)%26; 
      cnt[p]++;
    }
    res.push(chiSquare(cnt,N));
  }
  const idx=argmin(res); 
  return {minChi2:res[idx], shift:idx};
}

// Affine暗号の最適パラメーター
export function bestAffineChi2(s){
  const N=s.length; 
  if (N===0) return {minChi2:Infinity,a:1,b:0};
  const cop=[1,3,5,7,9,11,15,17,19,21,23,25];
  let best={minChi2:Infinity,a:1,b:0};
  
  for (const a of cop){
    const inv=invMod(a,26);
    for (let b=0;b<26;b++){
      const cnt=new Array(26).fill(0);
      for (let i=0;i<N;i++){
        const c=s.charCodeAt(i)-65; 
        if (c < 0 || c > 25) continue; // 無効文字をスキップ
        let temp = c - b;
        while (temp < 0) temp += 26;
        const p = (inv * temp) % 26; 
        cnt[p]++;
      }
      const x2=chiSquare(cnt,N); 
      if (x2<best.minChi2) best={minChi2:x2,a,b};
    }
  }
  return best;
}

// Playfair暗号の疑い度
export function playfairSuspicion(s){
  if (s.length<4) return 0;
  const even=(s.length%2===0)?1:0;
  const jBonus=s.includes('J')?0:1;
  let pairs=0, same=0; 
  for (let i=0;i+1<s.length;i+=2){ 
    pairs++; 
    if (s[i]===s[i+1]) same++; 
  }
  const sameRate=pairs?(same/pairs):1;
  const xRate=(s.split('X').length-1)/Math.max(1,s.length);
  const xBonus=Math.min(1,xRate/0.05);
  
  // ダブルレター率が高すぎる場合は転置式暗号の可能性が高い
  let sameRatePenalty = 1.0;
  if (sameRate > 0.06) { // 6%を超える場合
    sameRatePenalty = 0.3; // 大幅減点（転置式暗号の可能性）
  } else if (sameRate > 0.04) { // 4%を超える場合  
    sameRatePenalty = 0.6; // 減点
  }
  
  return (0.35*even+0.25*jBonus+0.25*(1-sameRate)+0.15*xBonus) * sameRatePenalty;
}

// 転置式暗号の疑い度
export function englishnessVsTransposition(chisq, eng, sAZ){
  try {
    // 転置式暗号は高い英語らしさと英語に近いIC値、適度に高いχ²値を持つ
    const engScore = clamp01(eng); // 高い英語らしさをスコアとする
    const chiScore = chisq > 50 ? clamp01((chisq - 50) / 200) : 0; // χ²が50以上で転置式の可能性
    
    // IC値による判定を追加（転置式暗号は英語に近いIC値を持つべき）
    let ioc;
    if (typeof sAZ === 'string') {
      ioc = indexOfCoincidence(sAZ);
    } else {
      // フォールバック：文字列でない場合は低いスコアを返す
      return 0.1 * engScore;
    }
    
    // 転置式暗号の条件を調整（回転グリル暗号なども含む）
    let iocScore;
    if (ioc >= 0.064 && ioc <= 0.070) {
      iocScore = 1.0; // 典型的な転置式暗号のIC範囲
    } else if (ioc >= 0.075 && ioc <= 0.085) {
      iocScore = 0.8; // 回転グリル暗号など高IC転置式暗号
    } else if (ioc >= 0.060 && ioc <= 0.090) {
      iocScore = 0.4; // 広い転置式暗号範囲
    } else {
      iocScore = 0.05; // 転置式暗号ではない可能性が高い
    }
    
    // IC値が0.055以下（ヴィジュネル暗号範囲）の場合は転置式暗号として非常に低いスコア
    if (ioc <= 0.055) {
      return 0.1 * engScore * iocScore; // 大幅減点
    }
    
    // 英語らしさが非常に高い場合は転置式暗号の可能性を高める
    let engBonus = 1.0;
    if (eng >= 0.95) {
      engBonus = 1.3; // 完璧な英語らしさは転置式暗号の強い指標
    } else if (eng >= 0.85) {
      engBonus = 1.1; // 高い英語らしさ
    } else if (eng < 0.7) {
      return 0.2 * engScore * iocScore; // 英語らしさが低い場合は減点
    }
    
    return (0.4 * engScore + 0.2 * chiScore + 0.4 * iocScore) * engBonus;
  } catch (error) {
    console.error('Error in englishnessVsTransposition:', error);
    // エラー時はフォールバック
    return clamp01(eng) * 0.5;
  }
}

// ADFGX(VX)検出
export function adfgxDetector(sAZ){
  const set5=new Set(["A","D","F","G","X"]);
  const set6=new Set(["A","D","F","G","V","X"]);
  const only5=[...sAZ].every(ch=>set5.has(ch));
  const only6=[...sAZ].every(ch=>set6.has(ch));
  const even=(sAZ.length%2===0);
  let ev=0, type=null; 
  if (only6&&even){ 
    ev=1; type="ADFGVX"; 
  } else if (only5&&even){ 
    ev=0.9; type="ADFGX"; 
  }
  return {evidence:ev, info:{type, even}};
}

// Vigenère暗号解析
export function vigenereEvidence(sAZ, useAuto, useCols){
  if (!useAuto && !useCols) return {evidence:0, info:null};
  if (sAZ.length<8) return {evidence:0, info:null};
  
  let kCands=[], ac=[], dists=[], gcdHist=new Map();
  if (useAuto){
    ac=autoCorrelationMatches(sAZ,40);
    dists=kasiskiDistances(sAZ,3,5);
    gcdHist=gcdHistogram(dists,20);
    kCands=topKeyLengthCandidatesFromPeaks(ac,gcdHist,16);
  }
  if (kCands.length===0) kCands=[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

  let best=null, records=[];
  for (const k of kCands){
    if (k<2) continue;
    const cols=splitColumnsByK(sAZ,k);
    const colIC=cols.map(c=>indexOfCoincidence(c));
    const icMean=mean(colIC);

    const chiList=[], shifts=[];
    for (const c of cols){ 
      const {minChi2,shift}=bestCaesarShiftChi2(c); 
      chiList.push(minChi2); 
      shifts.push(shift); 
    }
    const chiAvg=mean(chiList);
    // ヴィジュネル暗号用のIC評価（期待値0.04程度）
    const icScore=clamp01(1-Math.abs(icMean-0.04)/0.025);
    const chiScore=clamp01((50-chiAvg)/50);
    
    // 列ICのばらつきが小さい場合のボーナス（一貫性が高い）
    let consistencyBonus = 1.0;
    try {
      const icVariance = colIC.reduce((sum, ic) => sum + Math.pow(ic - icMean, 2), 0) / colIC.length;
      consistencyBonus = icVariance < 0.001 ? 1.2 : icVariance < 0.005 ? 1.1 : 1.0;
    } catch (error) {
      console.warn('Error calculating consistency bonus:', error);
    }
    
    const score=(0.6*icScore+0.4*chiScore)*consistencyBonus;
    records.push({k,score,icMean,chiAvg,colIC,shifts});
    if (!best || score>best.score) best={k,score,icMean,chiAvg,colIC,shifts};
  }

  if (!best) return {evidence:0, info:null};
  
  // カシスキー法で強い鍵長候補が見つかった場合のボーナス
  let kasiskiBonus = 1.0;
  if (gcdHist.size > 0) {
    const maxGcdCount = Math.max(...gcdHist.values());
    const strongCandidate = [...gcdHist.entries()].find(([k, count]) => count === maxGcdCount);
    if (strongCandidate && strongCandidate[0] === best.k && maxGcdCount > 50) {
      kasiskiBonus = 1.5; // 強い鍵長候補には50%ボーナス
    }
  }
  
  // IC値がヴィジュネル暗号の期待範囲にある場合の追加ボーナス
  let iocBonus = 1.0;
  if (best.icMean >= 0.04 && best.icMean <= 0.055) {
    iocBonus = 1.3; // IC値がヴィジュネル暗号として適切な場合30%ボーナス
  }
  
  const ev=clamp01(best.score*1.4*kasiskiBonus*iocBonus);
  return {evidence:ev, info:{
    k:best.k, icMean:best.icMean, chiAvg:best.chiAvg, 
    ac, gcdHist, records, shifts:best.shifts, colIC:best.colIC
  }};
}