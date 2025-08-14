// UI制御とDOM操作

import { CIPHER_DESCRIPTIONS } from './config.js';
import { 
  drawFrequencyChart, 
  drawAutocorrelation, 
  drawGCDHistogram,
  updateConfidenceBar 
} from './visualization.js';
import { generateEvidence } from './evidence.js';

// メイン結果の更新
export function updateMainResult(winner) {
  const mainResult = document.getElementById('mainResult');
  mainResult.classList.remove('hidden');
  
  const winnerName = winner.type.charAt(0).toUpperCase() + winner.type.slice(1);
  document.getElementById('winnerName').textContent = `${winnerName}暗号`;
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
        <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
        <span class="percentage">${percentage}%</span>
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
    { label: 'IoC (重複度)', value: stats.ioc, help: '文字の重複度。英語は約0.066' },
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
  
  const advancedSection = document.getElementById('advancedSection');
  if (advancedSection) {
    advancedSection.classList.add('hidden');
  }
  
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