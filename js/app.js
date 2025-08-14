// メインアプリケーション

import { analyzeText } from './analyzer.js';
import { updateUI, toggleSection, clearForm, updateButtonStates, validateInput } from './ui.js';
import { CIPHER_SAMPLES } from './samples.js';
import { HELP_CONTENT } from './help-content.js';

// 初期化処理
function init() {
  setupEventListeners();
}

// イベントリスナーの設定
function setupEventListeners() {
  // テキストエリアの入力監視
  const cipherText = document.getElementById('cipherText');
  if (cipherText) {
    cipherText.addEventListener('input', () => {
      updateButtonStates();
      validateInput(); // リアルタイム検証
    });
    
    // フォーカスアウト時にも検証
    cipherText.addEventListener('blur', validateInput);
    
    // 初期状態を設定
    updateButtonStates();
  }

  // サンプル選択ボタン
  const btnSampleSelect = document.getElementById('btnSampleSelect');
  if (btnSampleSelect) {
    btnSampleSelect.addEventListener('click', openSampleModal);
  }

  // ヘルプボタン
  const btnHelp = document.getElementById('btnHelp');
  if (btnHelp) {
    btnHelp.addEventListener('click', openHelpModal);
  }

  // サンプルモーダル関連
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

  // ヘルプモーダル関連
  const helpModalClose = document.getElementById('helpModalClose');
  const helpModal = document.getElementById('helpModal');
  
  if (helpModalClose) {
    helpModalClose.addEventListener('click', closeHelpModal);
  }
  
  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) closeHelpModal();
    });
  }

  // サンプルリストを初期化
  initializeSampleList();

  // キーボードショートカット（Escapeキーでモーダルを閉じる）
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const sampleModal = document.getElementById('sampleModal');
      const helpModal = document.getElementById('helpModal');
      
      if (sampleModal && !sampleModal.classList.contains('hidden')) {
        closeSampleModal();
      } else if (helpModal && !helpModal.classList.contains('hidden')) {
        closeHelpModal();
      }
    }
  });

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
    
    // 鍵情報を生成（各暗号タイプに応じて）
    let keyInfo = '';
    
    if (sample.id === 'vigenere') {
      keyInfo = `
        <div class="key-info" style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
          <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 0.25rem;">
            <span>キーワード: 
              <span class="key-mask" data-key="${sample.key}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
                ${'*'.repeat(sample.key.length)}
              </span>
            </span>
            <span>鍵長: 
              <span class="keylength-mask" data-length="${sample.keyLength}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
                **
              </span>
            </span>
          </div>
        </div>
      `;
    } else if (sample.id === 'vigenere2') {
      keyInfo = `
        <div class="key-info" style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
          <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 0.25rem;">
            <span>キーワード: 
              <span class="key-mask" data-key="${sample.key}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
                ${'*'.repeat(sample.key.length)}
              </span>
            </span>
            <span>鍵長: 
              <span class="keylength-mask" data-length="${sample.keyLength}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
                *
              </span>
            </span>
          </div>
        </div>
      `;
    } else if (sample.id === 'caesar') {
      keyInfo = `
        <div class="key-info" style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
          <span>シフト量: 
            <span class="key-mask" data-key="${sample.shift}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
              *
            </span>
          </span>
        </div>
      `;
    } else if (sample.id === 'affine') {
      keyInfo = `
        <div class="key-info" style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <span>a値: 
              <span class="key-mask" data-key="${sample.a}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
                *
              </span>
            </span>
            <span>b値: 
              <span class="key-mask" data-key="${sample.b}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
                *
              </span>
            </span>
          </div>
        </div>
      `;
    } else if (sample.id === 'playfair') {
      keyInfo = `
        <div class="key-info" style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
          <span>キーワード: 
            <span class="key-mask" data-key="${sample.key}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
              ${'*'.repeat(sample.key.length)}
            </span>
          </span>
        </div>
      `;
    } else if (sample.id === 'railfence') {
      keyInfo = `
        <div class="key-info" style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
          <span>レール数: 
            <span class="key-mask" data-key="${sample.rails}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
              *
            </span>
          </span>
        </div>
      `;
    } else if (sample.id === 'columnar') {
      keyInfo = `
        <div class="key-info" style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
          <span>キーワード: 
            <span class="key-mask" data-key="${sample.key}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
              ${'*'.repeat(sample.key.length)}
            </span>
          </span>
        </div>
      `;
    } else if (sample.id === 'grille') {
      keyInfo = `
        <div class="key-info" style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
          <span>グリッドサイズ: 
            <span class="key-mask" data-key="${sample.gridSize}" style="cursor: pointer; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;" title="クリックで表示">
              **
            </span>
          </span>
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
      if (e.target.classList.contains('key-mask') || e.target.classList.contains('keylength-mask')) {
        e.stopPropagation();
        const value = e.target.dataset.key || e.target.dataset.length;
        toggleMask(e.target, value);
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

// ヘルプモーダルを開く
function openHelpModal() {
  const modal = document.getElementById('helpModal');
  if (modal) {
    // ヘルプコンテンツを動的に読み込み
    const helpContent = modal.querySelector('.help-content');
    if (helpContent) {
      helpContent.innerHTML = HELP_CONTENT;
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

// ヘルプモーダルを閉じる
function closeHelpModal() {
  const modal = document.getElementById('helpModal');
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

  // 入力検証
  if (!validateInput()) {
    // エラーがある場合は解析を実行しない
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