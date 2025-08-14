// 設定と定数定義

export const ENG_FREQ = {
  A:.08167,B:.01492,C:.02782,D:.04253,E:.12702,F:.02228,G:.02015,H:.06094,I:.06966,
  J:.00153,K:.00772,L:.04025,M:.02406,N:.06749,O:.07507,P:.01929,Q:.00095,R:.05987,
  S:.06327,T:.09056,U:.02758,V:.00978,W:.02360,X:.00150,Y:.01974,Z:.00074
};

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const TOP_BIGRAMS = ["TH","HE","IN","ER","AN","RE","ON","AT","EN","ND","TI","ES","OR","TE","OF","ED","IS","IT","AL","AR","ST","TO","NT","NG","SE","HA","AS","OU","IO","LE"];

export const TOP_TRIGRAMS = ["THE","ING","AND","HER","ERE","ENT","THA","NTH","ETH","HES","EST","FOR","TIO","TER","ATI","HAT","ION","ERS"];

export const SAMPLES = {
  VIG: "LXFOPVEFRNHR",
  CAESAR: "KHOOR ZRUOG",
  AFFINE: "IHHWVC SWFRCP",
  PLAYFAIR: "BMODZBXDNABEKUDMUIXMMOUVIF",
  COLUMNAR: "WECRL TEERD SOEEF EAOCA IVDEN"
};

// 暗号方式の説明
export const CIPHER_DESCRIPTIONS = {
  caesar: "各文字を一定数ずらすもっとも基本的な暗号。例：A→D, B→E, C→F",
  affine: "文字を数式(ax+b)で変換する暗号。シーザーの拡張版",
  vigenere: "複数のシーザー暗号を組み合わせた多表式暗号。鍵にキーワードを使用",
  playfair: "マトリクスを用いて2文字ずつ換字する暗号。",
  transposition: "文字の順番を入れ替える転置式暗号",
  adfgx: "第一次世界大戦でドイツが使用。文字をADFGX(V)のみで表現",
  substitution: "文字を別の文字に1対1で置き換える単純な換字式暗号",
  unknown: "判定できませんでした。暗号文が短すぎるか、未対応の方式の可能性があります"
};