// ユーティリティ関数（数学・統計・文字列処理）

import { ENG_FREQ, LETTERS, TOP_BIGRAMS, TOP_TRIGRAMS } from './config.js';

// 基本的な数学関数
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const sum = a => a.reduce((x,y)=>x+y,0);
export const mean = a => a.length? sum(a)/a.length : 0;
export const argmin = a => a.reduce((m,_,i,t)=> t[i] < t[m] ? i : m, 0);
export const gcd = (a,b)=> b?gcd(b,a%b):Math.abs(a);

// 文字列処理
export const upper = s => (s||"").toUpperCase();
export const toAZ = s => upper(s).replace(/[^A-Z]/g,"");

// 文字頻度カウント
export function countLetters(s){
  const f = new Array(26).fill(0);
  for (let i=0;i<s.length;i++){
    const c = s.charCodeAt(i)-65; 
    if (c>=0 && c<26) f[c]++;
  }
  return f;
}

// カイ二乗統計量
export function chiSquare(obs, N){
  let x2=0;
  for (let i=0;i<26;i++){
    const p = ENG_FREQ[LETTERS[i]], e = N*p;
    x2 += (obs[i]-e)*(obs[i]-e) / (e || 1e-9);
  }
  return x2;
}

// 一致指数（Index of Coincidence）
export function indexOfCoincidence(s){
  const N=s.length; 
  if (N<2) return 0;
  const f=countLetters(s); 
  let num=0; 
  for (const v of f) num += v*(v-1);
  return num/(N*(N-1));
}

// 英語らしさスコア（bigram/trigram基準）
export function englishnessScore(s){
  if (s.length<4) return 0;
  let big=0, tri=0;
  const totalB=Math.max(1,s.length-1), totalT=Math.max(1,s.length-2);
  
  for (let i=0;i<s.length-1;i++){ 
    if (TOP_BIGRAMS.includes(s.slice(i,i+2))) big++; 
  }
  for (let i=0;i<s.length-2;i++){ 
    if (TOP_TRIGRAMS.includes(s.slice(i,i+3))) tri++; 
  }
  
  const bRate=big/totalB, tRate=tri/totalT;
  return clamp01((bRate/0.05)*0.6 + (tRate/0.02)*0.4);
}

// ソフトマックス正規化
export function softmax(scores, tau=0.7){
  const exps=scores.map(x=>Math.exp(x/tau));
  const Z=sum(exps)||1; 
  return exps.map(e=>e/Z);
}

// モジュラ逆元
export function invMod(a,m){ 
  for (let x=1;x<m;x++) if ((a*x)%m===1) return x; 
  return 1; 
}