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

// Kasiski法（繰り返し間距離）
export function kasiskiDistances(s, minN=3, maxN=5){
  const dist=[];
  for (let n=minN;n<=maxN;n++){
    const seen={};
    for (let i=0;i<=s.length-n;i++){
      const sub=s.slice(i,i+n); 
      (seen[sub] ||= []).push(i);
    }
    for (const k in seen){
      const pos=seen[k]; 
      for (let i=1;i<pos.length;i++) dist.push(pos[i]-pos[i-1]);
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

// 鍵長候補の抽出
export function topKeyLengthCandidatesFromPeaks(ac, gcdHist, kmax=20){
  const scores=new Map();
  ac.forEach((v,idx)=>{ 
    const t=idx+1; 
    if (t>=2 && t<=kmax){ 
      const sc=Math.max(0,(v-0.03)); 
      if (sc>0) scores.set(t,(scores.get(t)||0)+sc); 
    }
  });
  for (let k=2;k<=kmax;k++){ 
    const cnt=gcdHist.get(k)||0; 
    if (cnt>0) scores.set(k,(scores.get(k)||0)+cnt*0.5); 
  }
  return [...scores.entries()].sort((a,b)=>b[1]-a[1]).map(([k])=>k).slice(0,6);
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

// Affine暗号の最適パラメータ
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
        const p=((inv*(c-b))%26+26)%26; 
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
  return 0.35*even+0.25*jBonus+0.25*(1-sameRate)+0.15*xBonus;
}

// 転置暗号の疑い度
export function englishnessVsTransposition(chisq, eng){
  const chiGood=clamp01((300 - chisq)/300);
  const invEnglish=1 - eng;
  return 0.6*chiGood + 0.4*invEnglish;
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
  if (kCands.length===0) kCands=[2,3,4,5,6,7,8];

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
    const icScore=clamp01(1-Math.abs(icMean-0.066)/0.03);
    const chiScore=clamp01((30-chiAvg)/30);
    const score=0.5*icScore+0.5*chiScore;
    records.push({k,score,icMean,chiAvg,colIC,shifts});
    if (!best || score>best.score) best={k,score,icMean,chiAvg,colIC,shifts};
  }

  if (!best) return {evidence:0, info:null};
  const ev=clamp01(best.score*1.4);
  return {evidence:ev, info:{
    k:best.k, icMean:best.icMean, chiAvg:best.chiAvg, 
    ac, gcdHist, records, shifts:best.shifts, colIC:best.colIC
  }};
}