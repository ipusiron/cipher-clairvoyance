// 可視化機能

import { ENG_FREQ, LETTERS } from './config.js';

// 文字頻度グラフを描画
export function drawFrequencyChart(frequencies, total) {
  const svg = document.getElementById('freqChart');
  if (!svg) return;
  
  svg.innerHTML = '';
  
  const width = 520;
  const height = 180;
  const barWidth = width / 26;
  
  // ツールチップ要素を作成
  createTooltip();
  
  for (let i = 0; i < 26; i++) {
    const letter = LETTERS[i];
    const count = frequencies[i];
    const observedPercent = (count / total) * 100;
    const expectedPercent = ENG_FREQ[letter] * 100;
    
    const observedHeight = (count / total) * height * 0.8;
    const expectedHeight = ENG_FREQ[letter] * height * 0.8;
    
    // バーグループ
    const barGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    barGroup.setAttribute('class', 'bar-group');
    
    // 期待値（灰色）
    const expectedBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    expectedBar.setAttribute('x', i * barWidth + 2);
    expectedBar.setAttribute('y', height - expectedHeight - 20);
    expectedBar.setAttribute('width', barWidth - 4);
    expectedBar.setAttribute('height', expectedHeight);
    expectedBar.setAttribute('fill', '#e2e8f0');
    expectedBar.setAttribute('class', 'expected-bar');
    barGroup.appendChild(expectedBar);
    
    // 観測値（青）
    const observedBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    observedBar.setAttribute('x', i * barWidth + 2);
    observedBar.setAttribute('y', height - observedHeight - 20);
    observedBar.setAttribute('width', barWidth - 4);
    observedBar.setAttribute('height', observedHeight);
    observedBar.setAttribute('fill', '#3b82f6');
    observedBar.setAttribute('opacity', '0.8');
    observedBar.setAttribute('class', 'observed-bar');
    barGroup.appendChild(observedBar);
    
    // インタラクティブエリア（透明）
    const interactiveArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    interactiveArea.setAttribute('x', i * barWidth);
    interactiveArea.setAttribute('y', 0);
    interactiveArea.setAttribute('width', barWidth);
    interactiveArea.setAttribute('height', height - 20);
    interactiveArea.setAttribute('fill', 'transparent');
    interactiveArea.setAttribute('class', 'interactive-area');
    interactiveArea.style.cursor = 'pointer';
    
    // ツールチップイベント
    setupBarTooltip(interactiveArea, {
      letter,
      count,
      total,
      observedPercent: observedPercent.toFixed(2),
      expectedPercent: expectedPercent.toFixed(2)
    });
    
    barGroup.appendChild(interactiveArea);
    
    // ラベル
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', i * barWidth + barWidth / 2);
    label.setAttribute('y', height - 5);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '10');
    label.setAttribute('fill', '#64748b');
    label.textContent = letter;
    barGroup.appendChild(label);
    
    svg.appendChild(barGroup);
  }
}

// ツールチップ要素を作成
function createTooltip() {
  // 既存のツールチップを削除
  const existingTooltip = document.getElementById('freqTooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
  const tooltip = document.createElement('div');
  tooltip.id = 'freqTooltip';
  tooltip.className = 'freq-tooltip hidden';
  document.body.appendChild(tooltip);
}

// バーのツールチップ設定
function setupBarTooltip(element, data) {
  element.addEventListener('mouseenter', (e) => {
    showTooltip(e, data);
  });
  
  element.addEventListener('mousemove', (e) => {
    updateTooltipPosition(e);
  });
  
  element.addEventListener('mouseleave', () => {
    hideTooltip();
  });
}

// ツールチップを表示
function showTooltip(event, data) {
  const tooltip = document.getElementById('freqTooltip');
  if (!tooltip) return;
  
  tooltip.innerHTML = `
    <div class="tooltip-header">文字 "${data.letter}" の頻度</div>
    <div class="tooltip-content">
      <div class="tooltip-row">
        <span class="tooltip-label">暗号文での出現:</span>
        <span class="tooltip-value">${data.count}回 (${data.observedPercent}%)</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">英語での標準頻度:</span>
        <span class="tooltip-value">${data.expectedPercent}%</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">差分:</span>
        <span class="tooltip-value difference ${parseFloat(data.observedPercent) > parseFloat(data.expectedPercent) ? 'positive' : 'negative'}">
          ${(parseFloat(data.observedPercent) - parseFloat(data.expectedPercent)).toFixed(2)}%
        </span>
      </div>
    </div>
  `;
  
  tooltip.classList.remove('hidden');
  updateTooltipPosition(event);
}

// ツールチップの位置を更新
function updateTooltipPosition(event) {
  const tooltip = document.getElementById('freqTooltip');
  if (!tooltip) return;
  
  const rect = tooltip.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  let left = event.clientX + scrollLeft + 10;
  let top = event.clientY + scrollTop - rect.height - 10;
  
  // 画面端での調整
  if (left + rect.width > window.innerWidth + scrollLeft) {
    left = event.clientX + scrollLeft - rect.width - 10;
  }
  
  if (top < scrollTop) {
    top = event.clientY + scrollTop + 10;
  }
  
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

// ツールチップを隠す
function hideTooltip() {
  const tooltip = document.getElementById('freqTooltip');
  if (tooltip) {
    tooltip.classList.add('hidden');
  }
}

// 自己相関グラフを描画
export function drawAutocorrelation(ac) {
  const svg = document.getElementById('acSpark');
  if (!svg) return;
  
  svg.innerHTML = '';
  const width = 400;
  const height = 60;
  const barWidth = width / Math.min(ac.length, 40);
  const maxVal = Math.max(...ac);
  
  ac.slice(0, 40).forEach((val, i) => {
    const barHeight = val * height * 0.8;
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('x', i * barWidth);
    bar.setAttribute('y', height - barHeight);
    bar.setAttribute('width', barWidth - 1);
    bar.setAttribute('height', barHeight);
    bar.setAttribute('fill', val > 0.05 ? '#22c55e' : '#64748b');
    bar.setAttribute('title', `Shift ${i+1}: ${(val*100).toFixed(1)}%`);
    svg.appendChild(bar);
  });
}

// GCDヒストグラムを描画
export function drawGCDHistogram(gcdHist) {
  const svg = document.getElementById('gcdSpark');
  if (!svg) return;
  
  svg.innerHTML = '';
  const width = 400;
  const height = 60;
  
  const keys = Array.from(gcdHist.keys()).sort((a, b) => a - b);
  if (keys.length === 0) return;
  
  const maxVal = Math.max(...gcdHist.values());
  const barWidth = width / 20;
  
  for (let k = 2; k <= 20; k++) {
    const val = gcdHist.get(k) || 0;
    if (val === 0) continue;
    
    const barHeight = (val / maxVal) * height * 0.8;
    
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('x', (k - 2) * barWidth);
    bar.setAttribute('y', height - barHeight);
    bar.setAttribute('width', barWidth - 1);
    bar.setAttribute('height', barHeight);
    bar.setAttribute('fill', val > maxVal * 0.3 ? '#f59e0b' : '#64748b');
    bar.setAttribute('title', `Key length ${k}: ${val} occurrences`);
    svg.appendChild(bar);
    
    // ラベル（重要な値のみ）
    if (val > maxVal * 0.3) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (k - 2) * barWidth + barWidth / 2);
      label.setAttribute('y', height - barHeight - 2);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '10');
      label.setAttribute('fill', '#1e293b');
      label.textContent = k;
      svg.appendChild(label);
    }
  }
}

// 結果の信頼度バーを更新
export function updateConfidenceBar(probability) {
  const confidence = Math.round(probability * 100);
  const level = document.getElementById('confidenceLevel');
  const text = document.getElementById('confidenceText');
  
  if (level && text) {
    level.style.width = `${confidence}%`;
    text.textContent = `${confidence}%`;
    
    // 信頼度に応じて色を変更
    if (confidence > 70) {
      level.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
    } else if (confidence > 40) {
      level.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
    } else {
      level.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    }
  }
}