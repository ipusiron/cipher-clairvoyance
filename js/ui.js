// UI制御とDOM操作

import { CIPHER_DESCRIPTIONS } from './config.js';
import { 
  drawFrequencyChart, 
  drawAutocorrelation, 
  drawGCDHistogram,
  updateConfidenceBar 
} from './visualization.js';
import { generateEvidence } from './evidence.js';
import { validateCipherInput } from './utils.js';

// 暗号名の日本語表記マッピング
const CIPHER_NAMES_JP = {
  caesar: 'シーザー暗号',
  affine: 'アフィン暗号', 
  vigenere: 'ヴィジュネル暗号',
  playfair: 'プレイフェア暗号',
  transposition: '転置式暗号',
  adfgx: 'ADFGX暗号',
  substitution: '換字式暗号',
  unknown: '不明'
};

// 暗号解読ツールのリンクを更新
function updateCipherToolLinks(cipherType) {
  let toolLinksContainer = document.getElementById('toolLinks');
  
  // コンテナが存在しない場合は作成
  if (!toolLinksContainer) {
    toolLinksContainer = document.createElement('div');
    toolLinksContainer.id = 'toolLinks';
    toolLinksContainer.style.cssText = 'margin-top: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;';
    
    const toggleDetails = document.getElementById('toggleDetails');
    if (toggleDetails) {
      toggleDetails.insertAdjacentElement('beforebegin', toolLinksContainer);
    } else {
      // フォールバック: evidenceSectionの後
      const evidenceSection = document.getElementById('evidenceSection');
      if (evidenceSection) {
        evidenceSection.insertAdjacentElement('afterend', toolLinksContainer);
      } else {
        // 最終フォールバック
        const mainResult = document.getElementById('mainResult');
        if (mainResult) {
          mainResult.appendChild(toolLinksContainer);
        }
      }
    }
  } else {
  }
  
  // リンクをクリア
  toolLinksContainer.innerHTML = '';
  
  if (cipherType === 'caesar') {
    toolLinksContainer.innerHTML = `
      <div class="tool-header">
        🔧 解読ツール
      </div>
      <div class="tool-description">
        シーザー暗号の自動解読には、総当り攻撃と頻出語検索が効果的です：
      </div>
      <a href="https://ipusiron.github.io/caesar-cipher-breaker/" 
         target="_blank" 
         rel="noopener noreferrer"
         class="tool-link">
        <span>🔓</span>
        <span>Caesar Cipher Breaker で解読</span>
        <span class="tool-link-icon">↗</span>
      </a>
    `;
  } else if (cipherType === 'vigenere') {
    toolLinksContainer.innerHTML = `
      <div class="tool-header">
        🔧 解析ツール
      </div>
      <div class="tool-description">
        ヴィジュネル暗号の鍵長推定には、反復文字列の検出が重要です：
      </div>
      <a href="https://ipusiron.github.io/repeatseq-analyzer/" 
         target="_blank" 
         rel="noopener noreferrer"
         class="tool-link">
        <span>🔍</span>
        <span>RepeatSeq Analyzer で鍵長推定</span>
        <span class="tool-link-icon">↗</span>
      </a>
    `;
  } else {
    // 表示するツールがない場合は枠を隠す
    toolLinksContainer.style.display = 'none';
    return;
  }
  
  // 表示するツールがある場合は枠を表示
  toolLinksContainer.style.display = 'block';
}

// メイン結果の更新
export function updateMainResult(winner) {
  const mainResult = document.getElementById('mainResult');
  mainResult.classList.remove('hidden');
  
  const winnerName = CIPHER_NAMES_JP[winner.type] || winner.type;
  document.getElementById('winnerName').textContent = winnerName;
  document.getElementById('winnerDesc').textContent = winner.description;
  
  updateConfidenceBar(winner.probability);
}

// その他の可能性を表示
export function updateOtherPossibilities(probabilities, winner) {
  const container = document.getElementById('otherPossibilities');
  container.innerHTML = '<h4 style="width:100%;margin-bottom:0.5rem;color:var(--text-muted)">その他の可能性:</h4>';
  
  const sortedProbs = Object.entries(probabilities)
    .filter(([type]) => type !== winner.type)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  sortedProbs.forEach(([type, prob]) => {
    const percentage = Math.round(prob * 100);
    if (percentage > 5) {
      const chip = document.createElement('div');
      chip.className = 'possibility-chip';
      chip.innerHTML = `
        <span>${CIPHER_NAMES_JP[type] || type}</span>
        <span class="percentage" style="font-weight: 600; background: rgba(59, 130, 246, 0.1); padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; color: #3b82f6;">${percentage}%</span>
      `;
      container.appendChild(chip);
    }
  });
}

// 基本統計の表示
export function updateBasicStats(stats) {
  const container = document.getElementById('basicStats');
  container.innerHTML = '';
  
  const statItems = [
    { label: '文字数', value: stats.length },
    { label: 'IC (重複度)', value: stats.ioc, help: '文字の重複度。英語は約0.066' },
    { label: 'χ² 統計量', value: stats.chi2, help: '英語との頻度差。小さいほど英語に近い' },
    { label: '英語らしさ', value: stats.englishness }
  ];

  statItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'stat-item';
    div.innerHTML = `
      <div class="stat-label">
        ${item.label}
        ${item.help ? `<span title="${item.help}" style="cursor:help">ℹ️</span>` : ''}
      </div>
      <div class="stat-value">${item.value}</div>
    `;
    container.appendChild(div);
  });
}

// エラー表示
export function showError(message) {
  const mainResult = document.getElementById('mainResult');
  mainResult.classList.remove('hidden');
  document.getElementById('winnerName').textContent = 'エラー';
  document.getElementById('winnerDesc').textContent = message;
  document.getElementById('confidenceLevel').style.width = '0%';
  document.getElementById('confidenceText').textContent = '0%';
}

// 入力エラーメッセージの表示・非表示
export function showInputError(errors) {
  const errorDiv = document.getElementById('inputError');
  const errorMessage = errorDiv.querySelector('.error-message');
  const textarea = document.getElementById('cipherText');
  
  if (errors.length > 0) {
    // エラーメッセージを表示
    errorMessage.textContent = errors.join(' ');
    errorDiv.classList.remove('hidden');
    textarea.classList.add('error');
  } else {
    // エラーメッセージを非表示
    errorDiv.classList.add('hidden');
    textarea.classList.remove('error');
  }
}

// リアルタイム入力検証
export function validateInput() {
  const textarea = document.getElementById('cipherText');
  const input = textarea.value;
  
  const validation = validateCipherInput(input);
  showInputError(validation.errors);
  
  return validation.isValid;
}

// 判定根拠の表示
export function updateEvidence(results) {
  const evidenceContent = document.getElementById('evidenceContent');
  if (!evidenceContent) return;

  const evidences = generateEvidence(results);
  evidenceContent.innerHTML = '';

  evidences.forEach(evidenceGroup => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'evidence-group';
    
    const title = document.createElement('h4');
    title.textContent = evidenceGroup.title;
    groupDiv.appendChild(title);

    evidenceGroup.items.forEach(item => {
      const itemDiv = document.createElement('div');
      
      if (evidenceGroup.type === 'statistical') {
        itemDiv.className = 'evidence-item';
        itemDiv.innerHTML = `
          <div class="evidence-header">
            <span class="evidence-metric">${item.metric}</span>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span class="evidence-value">${item.value}</span>
              <span class="confidence-badge confidence-${item.confidence}">${item.confidence}</span>
            </div>
          </div>
          <div class="evidence-description">${item.analysis}</div>
        `;
      } else if (evidenceGroup.type === 'cipher-specific') {
        itemDiv.className = 'evidence-item';
        itemDiv.innerHTML = `
          <div class="evidence-header">
            <span class="evidence-metric">${item.evidence}</span>
            <span class="confidence-badge strength-${item.strength}">${item.strength}</span>
          </div>
          <div class="evidence-description">${item.description}</div>
        `;
      } else if (evidenceGroup.type === 'excluded') {
        itemDiv.className = 'excluded-item';
        itemDiv.innerHTML = `
          <span class="excluded-cipher">${item.cipher}</span>
          <span class="excluded-reason">${item.reason}</span>
          <span class="excluded-prob">${item.probability}%</span>
        `;
      }
      
      groupDiv.appendChild(itemDiv);
    });

    evidenceContent.appendChild(groupDiv);
  });
}

// 全体的なUI更新
export function updateUI(analysis) {
  if (!analysis.success) {
    showError(analysis.error);
    return;
  }

  const results = analysis.results;
  
  // メイン結果を更新
  updateMainResult(results.winner);
  
  // その他の可能性を更新
  updateOtherPossibilities(results.probabilities, results.winner);
  
  // 判定根拠を更新
  updateEvidence(results);
  
  // 解析ツールリンクを表示
  updateCipherToolLinks(results.winner.type);
  
  // 詳細分析ボタンのセクションを表示
  const toggleSections = document.querySelectorAll('.toggle-section');
  toggleSections.forEach(section => section.classList.remove('hidden'));
  
  // 基本統計を更新
  if (results.stats) {
    updateBasicStats(results.stats);
  }
  
  // 可視化を更新
  if (results.visualData) {
    if (results.visualData.frequencies) {
      drawFrequencyChart(results.visualData.frequencies, results.length);
    }
    if (results.visualData.autocorrelation) {
      drawAutocorrelation(results.visualData.autocorrelation);
    }
    if (results.visualData.gcdHistogram) {
      drawGCDHistogram(results.visualData.gcdHistogram);
    }
  }
}

// セクションの表示/非表示を切り替え
export function toggleSection(sectionId, buttonId, showText, hideText) {
  const section = document.getElementById(sectionId);
  const button = document.getElementById(buttonId);
  
  if (section && button) {
    section.classList.toggle('hidden');
    button.textContent = section.classList.contains('hidden') ? showText : hideText;
  }
}

// フォームをクリア
export function clearForm() {
  document.getElementById('cipherText').value = '';
  document.getElementById('mainResult').classList.add('hidden');
  document.getElementById('detailsSection').classList.add('hidden');
  
  // 詳細分析ボタンのセクションも非表示にする
  const toggleSections = document.querySelectorAll('.toggle-section');
  toggleSections.forEach(section => section.classList.add('hidden'));
  
  const advancedSection = document.getElementById('advancedSection');
  if (advancedSection) {
    advancedSection.classList.add('hidden');
  }
  
  // エラーメッセージもクリア
  showInputError([]);
  
  // ボタンテキストをリセット
  resetToggleButtons();
}

// トグルボタンのテキストをリセット
function resetToggleButtons() {
  const toggleDetails = document.getElementById('toggleDetails');
  const toggleAdvanced = document.getElementById('toggleAdvanced');
  
  if (toggleDetails) {
    toggleDetails.textContent = '📊 詳細な分析を見る';
  }
  
  if (toggleAdvanced) {
    toggleAdvanced.textContent = '🔬 専門家向け分析を見る';
  }
}

// ボタンの有効/無効を更新
export function updateButtonStates() {
  const cipherText = document.getElementById('cipherText');
  const btnAnalyze = document.getElementById('btnAnalyze');
  const btnClear = document.getElementById('btnClear');
  
  
  if (cipherText && btnAnalyze && btnClear) {
    const hasText = cipherText.value.trim().length > 0;
    
    btnAnalyze.disabled = !hasText;
    btnClear.disabled = !hasText;
    
    // 無効時のスタイルを適用
    if (!hasText) {
      btnAnalyze.classList.add('disabled');
      btnClear.classList.add('disabled');
    } else {
      btnAnalyze.classList.remove('disabled');
      btnClear.classList.remove('disabled');
    }
  }
}