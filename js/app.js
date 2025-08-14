// メインアプリケーション

import { analyzeText } from './analyzer.js';
import { updateUI, toggleSection, clearForm, updateButtonStates } from './ui.js';
import { CIPHER_SAMPLES } from './samples.js';

// 初期化処理
function init() {
  setupEventListeners();
}

// イベントリスナーの設定
function setupEventListeners() {
  // テキストエリアの入力監視
  const cipherText = document.getElementById('cipherText');
  if (cipherText) {
    cipherText.addEventListener('input', updateButtonStates);
    // 初期状態を設定
    updateButtonStates();
  }

  // サンプル選択ボタン
  const btnSampleSelect = document.getElementById('btnSampleSelect');
  if (btnSampleSelect) {
    btnSampleSelect.addEventListener('click', openSampleModal);
  }

  // モーダル関連
  const modalClose = document.getElementById('modalClose');
  const sampleModal = document.getElementById('sampleModal');
  
  if (modalClose) {
    modalClose.addEventListener('click', closeSampleModal);
  }
  
  if (sampleModal) {
    sampleModal.addEventListener('click', (e) => {
      if (e.target === sampleModal) closeSampleModal();
    });
  }

  // サンプルリストを初期化
  initializeSampleList();

  // 解析実行
  const btnAnalyze = document.getElementById('btnAnalyze');
  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', performAnalysis);
  }

  // クリア
  const btnClear = document.getElementById('btnClear');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      clearForm();
      updateButtonStates();
    });
  }

  // 詳細表示トグル
  const toggleDetails = document.getElementById('toggleDetails');
  if (toggleDetails) {
    toggleDetails.addEventListener('click', () => {
      toggleSection('detailsSection', 'toggleDetails', 
        '📊 詳細な分析を見る', '📊 詳細を隠す');
    });
  }

  // 専門家向け表示トグル
  const toggleAdvanced = document.getElementById('toggleAdvanced');
  if (toggleAdvanced) {
    toggleAdvanced.addEventListener('click', () => {
      toggleSection('advancedSection', 'toggleAdvanced', 
        '🔬 専門家向け分析を見る', '🔬 専門家向けを隠す');
    });
  }
}

// サンプルリストを初期化
function initializeSampleList() {
  const sampleList = document.getElementById('sampleList');
  if (!sampleList) return;

  sampleList.innerHTML = '';
  
  CIPHER_SAMPLES.forEach(sample => {
    const item = document.createElement('div');
    item.className = 'sample-item';
    
    // ヴィジュネル暗号の場合、鍵情報を追加
    let keyInfo = '';
    if (sample.id === 'vigenere') {
      keyInfo = `
        <div class="key-info" style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
          <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 0.25rem;">
            <span>キーワード: 
              <span class="key-mask" data-key="${sample.key}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">
                ${'*'.repeat(sample.key.length)}
              </span>
            </span>
            <span>鍵長: 
              <span class="keylength-mask" data-length="${sample.keyLength}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">
                **
              </span>
            </span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            クリックで表示
          </div>
        </div>
      `;
    }
    
    item.innerHTML = `
      <h4>${sample.name}</h4>
      <p>${sample.description}</p>
      ${keyInfo}
    `;
    
    item.addEventListener('click', (e) => {
      // マスクされた要素がクリックされた場合の処理
      if (e.target.classList.contains('key-mask')) {
        e.stopPropagation();
        toggleMask(e.target, e.target.dataset.key);
        return;
      }
      
      if (e.target.classList.contains('keylength-mask')) {
        e.stopPropagation();
        toggleMask(e.target, e.target.dataset.length);
        return;
      }
      
      // サンプル読み込み
      loadSample(sample.ciphertext);
      closeSampleModal();
    });
    
    sampleList.appendChild(item);
  });
}

// サンプルモーダルを開く
function openSampleModal() {
  const modal = document.getElementById('sampleModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

// サンプルモーダルを閉じる
function closeSampleModal() {
  const modal = document.getElementById('sampleModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// サンプルを読み込む
function loadSample(ciphertext) {
  document.getElementById('cipherText').value = ciphertext;
  updateButtonStates(); // ボタン状態を更新
}

// 解析を実行
function performAnalysis() {
  const text = document.getElementById('cipherText').value;
  if (!text.trim()) {
    alert('暗号文を入力してください');
    return;
  }

  // オプションを取得
  const opts = {
    stripNonLetters: getCheckboxValue('chkStripNonLetters'),
    preserveSpaces: getCheckboxValue('chkPreserveSpaces'),
    basic: getCheckboxValue('chkBasic'),
    caesarAffine: getCheckboxValue('chkCaesarAffine'),
    vigAutoKasiski: getCheckboxValue('chkVigAutoKasiski'),
    vigColumns: getCheckboxValue('chkVigColumns'),
    playfair: getCheckboxValue('chkPlayfair'),
    transposition: getCheckboxValue('chkTransposition'),
    adfgx: getCheckboxValue('chkADFGX')
  };

  // 解析実行
  const analysis = analyzeText(text, opts);
  
  // UI更新
  updateUI(analysis);
}

// チェックボックスの値を取得
function getCheckboxValue(id) {
  const checkbox = document.getElementById(id);
  return checkbox ? checkbox.checked : true;
}

// マスク表示を切り替える
function toggleMask(element, value) {
  const isHidden = element.textContent.includes('*');
  
  if (isHidden) {
    element.textContent = value;
    element.style.background = '#dcfce7';
    element.style.color = '#166534';
  } else {
    if (element.classList.contains('key-mask')) {
      element.textContent = '*'.repeat(value.length);
    } else {
      element.textContent = '**';
    }
    element.style.background = '#f1f5f9';
    element.style.color = 'var(--text-muted)';
  }
}

// DOMContentLoadedイベントで初期化
document.addEventListener('DOMContentLoaded', init);