// Cipher Clairvoyance – Visual & Learning MVP
// 古典暗号の方式推定（擬似確率表示）＋可視化（頻度/AC/GCD/列IC）＋学習UI（反復n-gramハイライト、Vigenèreラボ）

// ========================= Config / Data =========================
const ENG_FREQ = {
  A:.08167,B:.01492,C:.02782,D:.04253,E:.12702,F:.02228,G:.02015,H:.06094,I:.06966,
  J:.00153,K:.00772,L:.04025,M:.02406,N:.06749,O:.07507,P:.01929,Q:.00095,R:.05987,
  S:.06327,T:.09056,U:.02758,V:.00978,W:.02360,X:.00150,Y:.01974,Z:.00074
};
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const TOP_BIGRAMS = ["TH","HE","IN","ER","AN","RE","ON","AT","EN","ND","TI","ES","OR","TE","OF","ED","IS","IT","AL","AR","ST","TO","NT","NG","SE","HA","AS","OU","IO","LE"];
const TOP_TRIGRAMS = ["THE","ING","AND","HER","ERE","ENT","THA","NTH","ETH","HES","EST","FOR","TIO","TER","ATI","HAT","ION","ERS"];

const SAMPLES = {
  VIG: "LXFOPVEFRNHR",
  CAESAR: "KHOOR ZRUOG",
  AFFINE: "IHHWVC SWFRCP",
  PLAYFAIR: "BMODZBXDNABEKUDMUIXMMOUVIF",
  COLUMNAR: "WECRL TEERD SOEEF EAOCA IVDEN",
  ADFGX: "ADFGADXGAFDGXAFDG",
  BACON: "ABAAB BAABB AABAA ABBBA ABBAB",
  POLYBIUS: "23 44 15 42 43 23 15 34 15",
  NIHILIST: "73 21 09 44 18 55 12 70 03"
};

// ========================= Helpers =========================
const clamp01 = x => Math.max(0, Math.min(1, x));
const sum = a => a.reduce((x,y)=>x+y,0);
const mean = a => a.length? sum(a)/a.length : 0;
const argmin = a => a.reduce((m,_,i,t)=> t[i] < t[m] ? i : m, 0);
const gcd = (a,b)=> b?gcd(b,a%b):Math.abs(a);
const upper = s => (s||"").toUpperCase();
const toAZ = s => upper(s).replace(/[^A-Z]/g,"");

function countLetters(s){
  const f = new Array(26).fill(0);
  for (let i=0;i<s.length;i++){
    const c = s.charCodeAt(i)-65; if (c>=0 && c<26) f[c]++;
  }
  return f;
}
function chiSquare(obs, N){
  let x2=0;
  for (let i=0;i<26;i++){
    const p = ENG_FREQ[LETTERS[i]], e = N*p;
    x2 += (obs[i]-e)*(obs[i]-e) / (e || 1e-9);
  }
  return x2;
}
function indexOfCoincidence(s){
  const N=s.length; if (N<2) return 0;
  const f=countLetters(s); let num=0; for (const v of f) num += v*(v-1);
  return num/(N*(N-1));
}
function englishnessScore(s){
  if (s.length<4) return 0;
  let big=0, tri=0, totalB=Math.max(1,s.length-1), totalT=Math.max(1,s.length-2);
  for (let i=0;i<s.length-1;i++){ if (TOP_BIGRAMS.includes(s.slice(i,i+2))) big++; }
  for (let i=0;i<s.length-2;i++){ if (TOP_TRIGRAMS.includes(s.slice(i,i+3))) tri++; }
  const bRate=big/totalB, tRate=tri/totalT;
  return clamp01((bRate/0.05)*0.6 + (tRate/0.02)*0.4);
}
function autoCorrelationMatches(s, maxT=40){
  const N=s.length, arr=[];
  for (let t=1;t<=Math.min(maxT,N-1);t++){
    let m=0; for (let i=0;i<N-t;i++) if (s[i]===s[i+t]) m++;
    arr.push(m/Math.max(1,N-t));
  }
  return arr;
}
function kasiskiDistances(s, minN=3, maxN=5){
  const dist=[];
  for (let n=minN;n<=maxN;n++){
    const seen={};
    for (let i=0;i<=s.length-n;i++){
      const sub=s.slice(i,i+n); (seen[sub] ||= []).push(i);
    }
    for (const k in seen){
      const pos=seen[k]; for (let i=1;i<pos.length;i++) dist.push(pos[i]-pos[i-1]);
    }
  }
  return dist;
}
function gcdHistogram(dists, kmax=20){
  const hist=new Map();
  for (let i=0;i<dists.length;i++){
    for (let j=i+1;j<dists.length;j++){
      const g=gcd(dists[i],dists[j]);
      if (g>=2 && g<=kmax) hist.set(g,(hist.get(g)||0)+1);
    }
  }
  return hist;
}
function topKeyLengthCandidatesFromPeaks(ac, gcdHist, kmax=20){
  const scores=new Map();
  ac.forEach((v,idx)=>{ const t=idx+1; if (t>=2 && t<=kmax){ const sc=Math.max(0,(v-0.03)); if (sc>0) scores.set(t,(scores.get(t)||0)+sc); }});
  for (let k=2;k<=kmax;k++){ const cnt=gcdHist.get(k)||0; if (cnt>0) scores.set(k,(scores.get(k)||0)+cnt*0.5); }
  return [...scores.entries()].sort((a,b)=>b[1]-a[1]).map(([k])=>k).slice(0,6);
}
function splitColumnsByK(s,k){
  const cols=Array.from({length:k},()=>[]);
  for (let i=0;i<s.length;i++) cols[i%k].push(s[i]);
  return cols.map(a=>a.join(""));
}
function bestCaesarShiftChi2(s){
  const N=s.length; if (N===0) return {minChi2:Infinity, shift:0};
  const res=[];
  for (let sh=0;sh<26;sh++){
    const cnt=new Array(26).fill(0);
    for (let i=0;i<N;i++){
      const c=s.charCodeAt(i)-65; const p=((c-sh)%26+26)%26; cnt[p]++;
    }
    res.push(chiSquare(cnt,N));
  }
  const idx=argmin(res); return {minChi2:res[idx], shift:idx};
}
function invMod(a,m){ for (let x=1;x<m;x++) if ((a*x)%m===1) return x; return 1; }
function bestAffineChi2(s){
  const N=s.length; if (N===0) return {minChi2:Infinity,a:1,b:0};
  const cop=[1,3,5,7,9,11,15,17,19,21,23,25];
  let best={minChi2:Infinity,a:1,b:0};
  for (const a of cop){
    const inv=invMod(a,26);
    for (let b=0;b<26;b++){
      const cnt=new Array(26).fill(0);
      for (let i=0;i<N;i++){
        const c=s.charCodeAt(i)-65; const p=((inv*(c-b))%26+26)%26; cnt[p]++;
      }
      const x2=chiSquare(cnt,N); if (x2<best.minChi2) best={minChi2:x2,a,b};
    }
  }
  return best;
}
function playfairSuspicion(s){
  if (s.length<4) return 0;
  const even=(s.length%2===0)?1:0, jBonus=s.includes('J')?0:1;
  let pairs=0, same=0; for (let i=0;i+1<s.length;i+=2){ pairs++; if (s[i]===s[i+1]) same++; }
  const sameRate=pairs?(same/pairs):1;
  const xRate=(s.split('X').length-1)/Math.max(1,s.length);
  const xBonus=Math.min(1,xRate/0.05);
  return 0.35*even+0.25*jBonus+0.25*(1-sameRate)+0.15*xBonus;
}
function englishnessVsTransposition(chisq, eng){
  const chiGood=clamp01((300 - chisq)/300);
  const invEnglish=1 - eng;
  return 0.6*chiGood + 0.4*invEnglish;
}
function softmax(scores, tau=0.7){
  const exps=scores.map(x=>Math.exp(x/tau)), Z=sum(exps)||1; return exps.map(e=>e/Z);
}

// 数字・記号系
function baconianEvidence(orig){
  const s=upper(orig).replace(/\s+/g,''); if (!s) return {evidence:0,info:null};
  const chars=[...new Set(s.split(''))].filter(ch=>/[A-Z\!\@\#\$\%\&\?\+\-\=\*\/]/.test(ch));
  let ev=0, type=null;
  if (chars.length===2){ type=(chars.includes('A')&&chars.includes('B'))?"Baconian (A/B)":"2-symbol variant"; ev=(type==="Baconian (A/B)"?1.0:0.8)*clamp01(s.length/40); }
  return {evidence:ev, info:{type, unique:chars.join('')}};
}
function polybiusEvidence(orig){
  const tokens=(orig.match(/\b\d{2}\b/g)||[]); if (tokens.length<4) return {evidence:0,info:null};
  let poly=0; for (const t of tokens){ const a=+t[0], b=+t[1]; if (a>=1 && a<=5 && b>=1 && b<=5) poly++; }
  const rate=poly/tokens.length, ev=clamp01(rate*1.2)*clamp01(tokens.length/12);
  return {evidence:ev, info:{tokens:tokens.length, polyCount:poly, rate}};
}
function nihilistEvidence(orig){
  const tokens=(orig.match(/\b\d{2,3}\b/g)||[]); if (tokens.length<5) return {evidence:0,info:null};
  const ev=clamp01(tokens.length/20)*0.9; return {evidence:ev, info:{tokens:tokens.length}};
}
function adfgxDetector(sAZ){
  const set5=new Set(["A","D","F","G","X"]), set6=new Set(["A","D","F","G","V","X"]);
  const only5=[...sAZ].every(ch=>set5.has(ch)), only6=[...sAZ].every(ch=>set6.has(ch)), even=(sAZ.length%2===0);
  let ev=0, type=null; if (only6&&even){ ev=1; type="ADFGVX"; } else if (only5&&even){ ev=0.9; type="ADFGX"; }
  return {evidence:ev, info:{type, even}};
}

// Vigenère
function vigenereEvidence(sAZ, useAuto, useCols){
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
    for (const c of cols){ const {minChi2,shift}=bestCaesarShiftChi2(c); chiList.push(minChi2); shifts.push(shift); }
    const chiAvg=mean(chiList);
    const icScore=clamp01(1-Math.abs(icMean-0.066)/0.03);
    const chiScore=clamp01((300 - chiAvg)/300);
    const cycScore = (() => {
      if (!useAuto) return 0.3;
      const ap=(ac[k-1]||0), gp=(gcdHist.get(k)||0);
      const a=clamp01((ap-0.02)/0.08), g=clamp01(gp/5);
      return 0.6*a + 0.4*g;
    })();
    const evidence=0.30*cycScore + 0.35*icScore + 0.35*chiScore;
    const rec={k,icMean,chiAvg,shifts,cycScore,icScore,chiScore,evidence,colIC};
    records.push(rec); if (!best || evidence>best.evidence) best=rec;
  }
  return {evidence: best?best.evidence:0, info:{best,records,ac,gcdHist:[...gcdHist.entries()]}};
}

// ========================= Global state for visualization =========================
const STATE = {
  orig:"", display:"", textAZ:"",
  letterMapAZ:[], // AZインデックス→原文インデックスの対応
  details:null,
};

// ========================= SVG描画 =========================
function clearSVG(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }

function drawBars(svgId, arr, onClick){
  const svg=document.getElementById(svgId); if (!svg) return;
  clearSVG(svg);
  if (!arr || !arr.length) return;
  const vb = (svg.getAttribute("viewBox")||"0 0 400 60").split(" ");
  const W=+vb[2], H=+vb[3];
  const n=arr.length, bw=Math.max(1, W/n), maxV=Math.max(1e-9, Math.max(...arr));
  // gradient
  const defs=document.createElementNS("http://www.w3.org/2000/svg","defs");
  const grad=document.createElementNS("http://www.w3.org/2000/svg","linearGradient");
  grad.setAttribute("id","barGrad"); grad.setAttribute("x1","0"); grad.setAttribute("x2","0"); grad.setAttribute("y1","0"); grad.setAttribute("y2","1");
  const s1=document.createElementNS("http://www.w3.org/2000/svg","stop"); s1.setAttribute("offset","0%"); s1.setAttribute("stop-color","#5fb6ff");
  const s2=document.createElementNS("http://www.w3.org/2000/svg","stop"); s2.setAttribute("offset","100%"); s2.setAttribute("stop-color","#0b5ea8");
  grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);

  for (let i=0;i<n;i++){
    const v=arr[i]/maxV, h=v*(H-8);
    const rect=document.createElementNS("http://www.w3.org/2000/svg","rect");
    rect.setAttribute("x",(i*bw).toFixed(2));
    rect.setAttribute("y",(H-h-4).toFixed(2));
    rect.setAttribute("width",Math.max(1,bw-1));
    rect.setAttribute("height",h.toFixed(2));
    rect.setAttribute("fill","url(#barGrad)");
    if (onClick){
      rect.style.cursor="pointer"; rect.dataset.index=i+1;
      rect.addEventListener("click", ()=> onClick(i+1));
    }
    svg.appendChild(rect);
  }
}

function drawHeatRow(svgId, arr){
  const svg=document.getElementById(svgId); if (!svg) return;
  clearSVG(svg);
  if (!arr || !arr.length) return;
  const vb = (svg.getAttribute("viewBox")||"0 0 400 36").split(" ");
  const W=+vb[2], H=+vb[3];
  const n=arr.length, cell=W/n, minV=Math.min(...arr), maxV=Math.max(...arr);
  for (let i=0;i<n;i++){
    const t=(arr[i]-minV)/Math.max(1e-9,(maxV-minV));
    const r=Math.round(34*(1-t)), g=Math.round(200*t + 80*(1-t)), b=Math.round(255 - 80*t);
    const rect=document.createElementNS("http://www.w3.org/2000/svg","rect");
    rect.setAttribute("class","cell");
    rect.setAttribute("x",(i*cell).toFixed(2));
    rect.setAttribute("y",4);
    rect.setAttribute("width",Math.max(2,cell-2));
    rect.setAttribute("height",H-8);
    rect.setAttribute("fill",`rgb(${r},${g},${b})`);
    svg.appendChild(rect);
  }
}

function drawFreqChart(svgId, counts, N){
  const svg=document.getElementById(svgId); if (!svg) return;
  clearSVG(svg);
  const W=520,H=180; svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
  const maxObs=Math.max(...counts, 1);
  const margin={l:28,r:10,t:8,b:24};
  const innerW=W-margin.l-margin.r, innerH=H-margin.t-margin.b;
  const bw=innerW/26;

  // 背景
  const bg=document.createElementNS("http://www.w3.org/2000/svg","rect");
  bg.setAttribute("x","0"); bg.setAttribute("y","0"); bg.setAttribute("width",W); bg.setAttribute("height",H);
  bg.setAttribute("fill","#0b1220"); bg.setAttribute("rx","12"); svg.appendChild(bg);

  // Bars: 観測
  for (let i=0;i<26;i++){
    const x=margin.l + i*bw;
    const obs=counts[i], h=innerH*(obs/maxObs);
    const rect=document.createElementNS("http://www.w3.org/2000/svg","rect");
    rect.setAttribute("x",x); rect.setAttribute("y",margin.t+innerH-h);
    rect.setAttribute("width",Math.max(2,bw*0.7)); rect.setAttribute("height",h);
    rect.setAttribute("fill","#5fb6ff"); svg.appendChild(rect);
  }
  // 期待（薄）
  for (let i=0;i<26;i++){
    const x=margin.l + i*bw + bw*0.75;
    const exp=N*ENG_FREQ[LETTERS[i]];
    const h=innerH*(exp/maxObs);
    const rect=document.createElementNS("http://www.w3.org/2000/svg","rect");
    rect.setAttribute("x",x); rect.setAttribute("y",margin.t+innerH-h);
    rect.setAttribute("width",Math.max(1,bw*0.2)); rect.setAttribute("height",h);
    rect.setAttribute("fill","#9ba6b1"); rect.setAttribute("opacity","0.6"); svg.appendChild(rect);
  }
  // ラベル
  for (let i=0;i<26;i++){
    const x=margin.l + i*bw + bw*0.35, y=H-8;
    const t=document.createElementNS("http://www.w3.org/2000/svg","text");
    t.setAttribute("x",x); t.setAttribute("y",y); t.setAttribute("class","freq-label");
    t.setAttribute("text-anchor","middle"); t.textContent=LETTERS[i]; svg.appendChild(t);
  }
}

// ========================= UI: summary/details =========================
function makeDonut(percent){
  const p=(percent*100).toFixed(1), r=16, C=2*Math.PI*r;
  const stroke=(C*percent).toFixed(2), gap=(C-stroke).toFixed(2);
  return `
    <div class="ring">
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="${r}" fill="none" stroke="#14213a" stroke-width="6"/>
        <circle cx="20" cy="20" r="${r}" fill="none" stroke="url(#grad)" stroke-width="6"
          stroke-linecap="round" stroke-dasharray="${stroke} ${gap}"/>
        <defs>
          <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#22c55e"/>
            <stop offset="100%" stop-color="#5fb6ff"/>
          </linearGradient>
        </defs>
      </svg>
      <div class="center">${p}%</div>
    </div>
  `;
}

function renderSummary(items){
  const box=document.getElementById('resultSummary');
  if (!items || items.length===0){ box.classList.add('empty'); box.textContent='結果はここに表示されます。'; return; }
  box.classList.remove('empty');
  box.innerHTML = items.map(it=>`
    <div class="result-card">
      <div class="cipher-name">${it.name}</div>
      ${makeDonut(it.prob)}
      <div class="score-pill">evidence: ${it.ev.toFixed(3)}</div>
    </div>
  `).join("");
}

function renderDetails(details){
  const box=document.getElementById('details'), rows=[];
  if (details.basic){
    const b=details.basic;
    rows.push(`
      <h3>基本統計</h3>
      <div class="keyval">
        <div><span>長さ（A–Z解析文字数）</span></div><div>${b.N}</div>
        <div><span>IoC</span></div><div>${b.ioc.toFixed(5)}</div>
        <div><span>χ²（単字）</span></div><div>${b.chi2.toFixed(2)}</div>
        <div><span>英語らしさ（Bi/Tri）</span></div><div>${(b.englishness*100).toFixed(1)}%</div>
        <div><span>文字集合（表示は原文）</span></div><div>${b.alphabet}</div>
      </div>
    `);
  }
  if (details.caesar){
    rows.push(`<h3>Caesar</h3>
      <table><tr><th>最小χ²</th><th>推定シフト</th></tr>
      <tr><td>${details.caesar.minChi2.toFixed(2)}</td><td>${details.caesar.shift}</td></tr></table>`);
  }
  if (details.affine){
    rows.push(`<h3>Affine</h3>
      <table><tr><th>最小χ²</th><th>a</th><th>b</th></tr>
      <tr><td>${details.affine.minChi2.toFixed(2)}</td><td>${details.affine.a}</td><td>${details.affine.b}</td></tr></table>`);
  }
  if (details.vig && details.vig.best){
    const b=details.vig.best;
    const gcdTable = details.vig.gcdHist?.length ? `
      <table><tr><th>GCD</th><th>Count</th></tr>
      ${details.vig.gcdHist.slice(0,12).map(([k,c])=>`<tr><td>${k}</td><td>${c}</td></tr>`).join("")}
      </table>` : '';
    rows.push(`
      <h3>Vigenère</h3>
      <div class="keyval">
        <div><span>最有力鍵長 k</span></div><div>${b.k}</div>
        <div><span>列IC平均</span></div><div>${b.icMean.toFixed(5)}</div>
        <div><span>列Caesar χ²平均</span></div><div>${b.chiAvg.toFixed(2)}</div>
        <div><span>周期性スコア</span></div><div>${b.cycScore.toFixed(3)}</div>
      </div>
      ${gcdTable}
    `);
  }
  if (typeof details.playfair === "number"){
    rows.push(`<h3>Playfair疑いスコア</h3><div>${(details.playfair*100).toFixed(1)}%</div>`);
  }
  if (typeof details.transposition === "number"){
    rows.push(`<h3>転置疑いスコア</h3><div>${(details.transposition*100).toFixed(1)}%</div>`);
  }
  if (details.adfgx && details.adfgx.type){
    rows.push(`<h3>ADFGX/VX</h3><div>検出: <b>${details.adfgx.type}</b>（偶数長=${details.adfgx.even}）</div>`);
  }
  if (details.bacon && details.bacon.info){
    rows.push(`<h3>Baconian / 2-symbol</h3><div>タイプ: ${details.bacon.info.type} / ユニーク: ${details.bacon.info.unique}</div>`);
  }
  if (details.polybius && details.polybius.info){
    const i=details.polybius.info;
    rows.push(`<h3>Polybius（数字ペア）疑い</h3><div>Tokens=${i.tokens}, Polybius範囲=${i.polyCount}（率 ${(i.rate*100).toFixed(1)}%）</div>`);
  }
  if (details.nihilist && details.nihilist.info){
    rows.push(`<h3>Nihilist（数字列）疑い</h3><div>数トークン数=${details.nihilist.info.tokens}</div>`);
  }
  box.innerHTML=rows.join("\n");
}

// ========================= 学習向け：原文プレビュー＆ハイライト =========================
function buildSanitizedPreview(orig, show){
  const box=document.getElementById('sanitizedPreview');
  const s=upper(orig);
  let azIndex=0, html="";
  STATE.letterMapAZ=[];

  for (let i=0;i<s.length;i++){
    const ch=s[i];
    if (/[A-Z]/.test(ch)){
      html += `<span class="ch az" data-az="${azIndex}" data-idx="${i}">${ch}</span>`;
      STATE.letterMapAZ.push(i);
      azIndex++;
    } else if (/\s/.test(ch)){
      html += `<span class="ch sp">${ch}</span>`;
    } else if (/[0-9]/.test(ch)){
      html += `<span class="ch dim">${ch}</span>`;
    } else {
      html += `<span class="ch sym">${ch}</span>`;
    }
  }
  box.innerHTML=html;
  box.hidden=!show;
}
function clearHighlights(){
  document.querySelectorAll('#sanitizedPreview .hl').forEach(el=>el.classList.remove('hl'));
}
function highlightAZRanges(ranges){ // ranges: [{start,len}, ...] on AZ index
  clearHighlights();
  const cont=document.getElementById('sanitizedPreview');
  for (const r of ranges){
    for (let k=r.start; k<r.start+r.len; k++){
      const el=cont.querySelector(`.ch.az[data-az="${k}"]`);
      if (el) el.classList.add('hl');
    }
  }
}

// ========================= 可視化：AC整列 / Repeats / Vigラボ =========================
function showShiftAlignment(t){
  const box=document.getElementById('acAlign');
  const s=STATE.textAZ; if (!s){ box.textContent="テキストがありません。"; return; }
  const L=Math.min(120, s.length - t);
  let line1="", line2="";
  for (let i=0;i<L;i++){ const a=s[i], b=s[i+t]; line1 += a; line2 += b; }
  let html="<b>t = "+t+"</b>\n";
  html += [...line1].map((c,i)=> (c===line2[i])? `<span class="hl">${c}</span>` : c).join("") + "\n";
  html += [...line2].map((c,i)=> (c===line1[i])? `<span class="hl">${c}</span>` : c).join("");
  box.innerHTML=html;
}

function findRepeatsAZ(s, nMin=3, nMax=5){
  const map=new Map();
  for (let n=nMin;n<=nMax;n++){
    const seen=new Map();
    for (let i=0;i<=s.length-n;i++){
      const sub=s.slice(i,i+n);
      const arr=seen.get(sub)||[]; arr.push(i); seen.set(sub,arr);
    }
    for (const [gram, pos] of seen.entries()){
      if (pos.length>=2){
        const dists=[]; for (let i=1;i<pos.length;i++) dists.push(pos[i]-pos[i-1]);
        let g=dists[0]||0; for (let i=1;i<dists.length;i++) g=gcd(g,dists[i]);
        const key=gram+"|"+n;
        const old=map.get(key);
        if (!old || old.pos.length<pos.length) map.set(key,{gram,n,pos,dists,g});
      }
    }
  }
  return [...map.values()].sort((a,b)=>{
    if (b.n!==a.n) return b.n-a.n;
    if (b.pos.length!==a.pos.length) return b.pos.length-a.pos.length;
    return Math.min(...a.dists) - Math.min(...b.dists);
  }).slice(0,40);
}

function renderRepeatsTable(rows){
  const box=document.getElementById('repeats');
  if (!rows || rows.length===0){ box.innerHTML="<p class='muted'>反復 n-gram は見つかりませんでした。</p>"; return; }
  const html = `
    <table class="table">
      <thead><tr><th>n</th><th>gram</th><th>出現数</th><th>位置</th><th>距離</th><th>GCD</th></tr></thead>
      <tbody>
        ${rows.map(r=>{
          return `<tr class="rep-row" data-gram="${r.gram}" data-n="${r.n}" data-pos="${r.pos.join(',')}">
            <td>${r.n}</td><td><code>${r.gram}</code></td><td>${r.pos.length}</td>
            <td>${r.pos.join(' / ')}</td><td>${r.dists.join(' / ')||'-'}</td><td>${r.g||'-'}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    <p class="muted">行をクリックすると原文プレビュー（A–Z）内で該当位置がハイライトされます。</p>
  `;
  box.innerHTML=html;
  box.querySelectorAll('.rep-row').forEach(tr=>{
    tr.addEventListener('click', ()=>{
      const n=+tr.dataset.n;
      const pos = tr.dataset.pos.split(',').map(x=>+x);
      const ranges = pos.map(p=>({start:p, len:n}));
      highlightAZRanges(ranges);
    });
  });
}

function renderVigLab(vigInfo){
  const box=document.getElementById('vigLab'); box.innerHTML="";
  if (!vigInfo || !vigInfo.best){ box.innerHTML="<p class='muted'>Vigenère用のデータがありません。</p>"; return; }
  const {k, shifts, colIC} = vigInfo.best;
  const s=STATE.textAZ;

  // 列プレビュー
  const cols=splitColumnsByK(s,k);
  const grid = document.createElement('div'); grid.className="vig-grid";
  for (let j=0;j<k;j++){
    const div=document.createElement('div'); div.className="vig-col";
    div.innerHTML = `
      <h5>列 ${j+1} / IC=${colIC[j].toFixed(3)} / shift=${shifts[j]}</h5>
      <div class="mono">${cols[j].slice(0,160)}</div>
    `;
    grid.appendChild(div);
  }

  // 暫定復号プレビュー
  const previewLen=Math.min(300, s.length);
  let dec=""; for (let i=0;i<previewLen;i++){ const c=s.charCodeAt(i)-65; const sh=shifts[i%k]; const p=((c - sh)%26+26)%26; dec += LETTERS[p]; }
  const head = `
    <div class="keyval">
      <div><span>最有力鍵長 k</span></div><div>${k}</div>
      <div><span>推定シフト配列</span></div><div>${shifts.join(', ')}</div>
    </div>
    <h4>暫定復号プレビュー</h4>
    <div class="preview">${dec}</div>
  `;
  box.innerHTML = head;
  box.appendChild(grid);
}

// ========================= 解析本体 =========================
function analyze(){
  const useBasic = document.getElementById('chkBasic').checked;
  const useCaAf  = document.getElementById('chkCaesarAffine').checked;
  const useVigAuto = document.getElementById('chkVigAutoKasiski').checked;
  const useVigCols = document.getElementById('chkVigColumns').checked;
  const usePlayfair = document.getElementById('chkPlayfair').checked;
  const useTranspose = document.getElementById('chkTransposition').checked;
  const useADFGX = document.getElementById('chkADFGX').checked;

  const stripNonLetters = document.getElementById('chkStripNonLetters').checked;
  const preserveSpaces  = document.getElementById('chkPreserveSpaces').checked;
  const detectNumeric   = document.getElementById('chkDetectNumeric').checked;
  const showSanitized   = document.getElementById('chkShowSanitized').checked;

  const orig = document.getElementById('cipherText').value || '';
  const display = upper(orig);
  const textAZ = toAZ(orig);

  // サニタイズプレビュー（学習用ハイライト基盤）
  buildSanitizedPreview(orig, showSanitized);

  if (!textAZ){
    renderSummary([]); renderDetails({});
    drawBars("acSpark",[]); drawBars("gcdSpark",[]); drawHeatRow("icHeat",[]);
    drawFreqChart("freqChart", new Array(26).fill(0), 1);
    document.getElementById('repeats').innerHTML="";
    document.getElementById('vigLab').innerHTML="";
    document.getElementById('acAlign').textContent="バーをクリックすると、原文と t シフトの一致が表示されます。";
    STATE.orig=orig; STATE.display=display; STATE.textAZ=textAZ;
    return;
  }

  STATE.orig=orig; STATE.display=display; STATE.textAZ=textAZ;

  // Basic
  const details = {};
  if (useBasic){
    const N=textAZ.length;
    const ioc=indexOfCoincidence(textAZ);
    const chi2=chiSquare(countLetters(textAZ), N);
    const eng=englishnessScore(textAZ);
    const alphabet = [...new Set(display.replace(/\s+/g, preserveSpaces?' ':'').split(''))].slice(0,80).join('');
    details.basic = {N,ioc,chi2,englishness:eng,alphabet};
  }

  // Classes
  const classes = [];

  // Numeric / Symbolic
  if (detectNumeric){
    const bacon=baconianEvidence(orig), poly=polybiusEvidence(orig), nih=nihilistEvidence(orig);
    details.bacon=bacon; details.polybius=poly; details.nihilist=nih;
    classes.push({key:"BACON", ev:bacon.evidence, name:"Baconian / 2-symbol"});
    classes.push({key:"POLY", ev:poly.evidence, name:"Polybius/分数化系（数字ペア）"});
    classes.push({key:"NIHI", ev:nih.evidence,  name:"Nihilist（数字列）"});
  }

  // ADFGX/VX
  if (useADFGX){
    const r=adfgxDetector(textAZ); details.adfgx=r.info;
    classes.push({key:"ADFGX/VX", ev:r.evidence, name: r.info.type? `ADFGX/VX (${r.info.type})` : "ADFGX/VX"});
  }

  // Vigenère
  let vig={evidence:0, info:null};
  if (useVigAuto || useVigCols){
    vig = vigenereEvidence(textAZ, useVigAuto, useVigCols);
    details.vig=vig.info; classes.push({key:"VIG", ev:vig.evidence, name:"Vigenère"});
  }

  // Caesar / Affine
  if (useCaAf){
    const c=bestCaesarShiftChi2(textAZ); details.caesar=c;
    classes.push({key:"CAESAR", ev:clamp01((400 - c.minChi2)/400), name:"Caesar"});
    const a=bestAffineChi2(textAZ); details.affine=a;
    classes.push({key:"AFFINE", ev:clamp01((450 - a.minChi2)/450), name:"Affine"});
  }

  // Playfair
  if (usePlayfair){
    const pf=playfairSuspicion(textAZ); details.playfair=pf;
    classes.push({key:"PLAYFAIR", ev:pf, name:"Playfair（疑い）"});
  }

  // 単換字 / 転置（疑い）
  if (useTranspose || useBasic){
    const chisq = details.basic ? details.basic.chi2 : chiSquare(countLetters(textAZ), textAZ.length);
    const eng   = details.basic ? details.basic.englishness : englishnessScore(textAZ);
    const transScore = englishnessVsTransposition(chisq, eng);
    details.transposition=transScore;
    classes.push({key:"MONO", ev:clamp01(((chisq-150)/350)) * Math.min(1, eng/0.6), name:"単一換字（一般）疑い"});
    if (useTranspose){ classes.push({key:"TRANS", ev:transScore, name:"転置（一般）疑い"}); }
  }

  // OTHER
  classes.push({key:"OTHER", ev:0.1, name:"その他/不明"});

  // 確率化
  const probs = softmax(classes.map(c=>c.ev), 0.7);
  const items = classes.map((c,i)=>({name:c.name, prob:probs[i], ev:c.ev}))
                       .sort((a,b)=>b.prob - a.prob)
                       .slice(0,10);

  renderSummary(items);
  renderDetails(details);

  // 可視化：頻度バー
  const counts=countLetters(textAZ);
  drawFreqChart("freqChart", counts, textAZ.length);

  // 可視化：AC, GCD, Heat
  const acArr = details.vig?.ac || [];
  drawBars("acSpark", acArr, (t)=> showShiftAlignment(t));
  const gcdArr = (details.vig?.gcdHist || []).map(([k,c])=>c);
  drawBars("gcdSpark", gcdArr);
  drawHeatRow("icHeat", details.vig?.best?.colIC || []);

  // Kasiski repeats（クリックでハイライト）
  const reps = findRepeatsAZ(textAZ,3,5);
  renderRepeatsTable(reps);

  // Vigenère ラボ
  renderVigLab(details.vig);
}

// ========================= Events =========================
function loadSample(){
  const k=document.getElementById('sampleSelect').value;
  document.getElementById('cipherText').value = SAMPLES[k] || "";
  analyze();
}
document.getElementById('btnAnalyze').addEventListener('click', analyze);
document.getElementById('btnClear').addEventListener('click', ()=>{
  document.getElementById('cipherText').value="";
  document.getElementById('resultSummary').classList.add('empty');
  document.getElementById('resultSummary').textContent='結果はここに表示されます。';
  document.getElementById('details').innerHTML='';
  drawBars("acSpark",[]); drawBars("gcdSpark",[]); drawHeatRow("icHeat",[]);
  drawFreqChart("freqChart", new Array(26).fill(0), 1);
  document.getElementById('repeats').innerHTML='';
  document.getElementById('vigLab').innerHTML='';
  document.getElementById('acAlign').textContent="バーをクリックすると、原文と t シフトの一致が表示されます。";
  buildSanitizedPreview("", true);
});
document.getElementById('btnLoadSample').addEventListener('click', loadSample);

// 初期
drawBars("acSpark",[]); drawBars("gcdSpark",[]); drawHeatRow("icHeat",[]);
drawFreqChart("freqChart", new Array(26).fill(0), 1);
