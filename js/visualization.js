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

// 周期性分析グラフのツールチップを初期化
function initPeriodTooltip(type) {
  const tooltipId = type === 'autocorr' ? 'autocorrTooltip' : 'gcdTooltip';
  
  // 既存のツールチップを削除
  const existingTooltip = document.getElementById(tooltipId);
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
  const tooltip = document.createElement('div');
  tooltip.id = tooltipId;
  tooltip.className = 'period-tooltip hidden';
  document.body.appendChild(tooltip);
}

// 周期性分析バーのツールチップ設定
function setupPeriodBarTooltip(element, data) {
  element.addEventListener('mouseenter', (e) => {
    showPeriodTooltip(e, data);
  });
  
  element.addEventListener('mousemove', (e) => {
    updatePeriodTooltipPosition(e, data.type);
  });
  
  element.addEventListener('mouseleave', () => {
    hidePeriodTooltip(data.type);
  });
}

// 周期性分析ツールチップを表示
function showPeriodTooltip(event, data) {
  const tooltipId = data.type === 'autocorr' ? 'autocorrTooltip' : 'gcdTooltip';
  const tooltip = document.getElementById(tooltipId);
  if (!tooltip) return;
  
  let content = '';
  if (data.type === 'autocorr') {
    // 自己相関グラフのツールチップ
    content = `
      <div class="tooltip-header">シフト量 ${data.shift}</div>
      <div class="tooltip-content">
        <div class="tooltip-row">
          <span class="tooltip-label">一致率:</span>
          <span class="tooltip-value">${data.percentage}%</span>
        </div>
        ${data.isPeak ? `
        <div class="tooltip-row">
          <span class="tooltip-label" style="color: #22c55e;">⚡ 強いピーク</span>
        </div>` : ''}
        ${data.isSignificant ? `
        <div class="tooltip-row" style="color: #6b7280; font-size: 0.85rem;">
          鍵長 ${data.shift} の可能性あり
        </div>` : ''}
      </div>
    `;
  } else {
    // カシスキー法グラフのツールチップ
    content = `
      <div class="tooltip-header">鍵長 ${data.keyLength}</div>
      <div class="tooltip-content">
        <div class="tooltip-row">
          <span class="tooltip-label">出現回数:</span>
          <span class="tooltip-value">${data.count}回</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">相対頻度:</span>
          <span class="tooltip-value">${data.percentage}%</span>
        </div>
        ${data.isPrime ? `
        <div class="tooltip-row" style="color: #f59e0b; font-size: 0.85rem;">
          素数（単一鍵の可能性）
        </div>` : `
        <div class="tooltip-row" style="color: #6b7280; font-size: 0.85rem;">
          約数: ${data.divisors.join(', ')}
        </div>`}
        ${data.isSignificant ? `
        <div class="tooltip-row" style="color: #22c55e; font-size: 0.85rem;">
          ⚡ 有力な候補
        </div>` : ''}
      </div>
    `;
  }
  
  tooltip.innerHTML = content;
  tooltip.classList.remove('hidden');
  
  updatePeriodTooltipPosition(event, data.type);
}

// 周期性分析ツールチップの位置を更新
function updatePeriodTooltipPosition(event, type) {
  const tooltipId = type === 'autocorr' ? 'autocorrTooltip' : 'gcdTooltip';
  const tooltip = document.getElementById(tooltipId);
  if (!tooltip || tooltip.classList.contains('hidden')) return;
  
  const x = event.pageX + 10;
  const y = event.pageY - 30;
  
  // 画面端でのはみ出しを防ぐ
  const rect = tooltip.getBoundingClientRect();
  const adjustedX = x + rect.width > window.innerWidth - 20 ? event.pageX - rect.width - 10 : x;
  const adjustedY = y - rect.height < 10 ? event.pageY + 10 : y;
  
  tooltip.style.left = adjustedX + 'px';
  tooltip.style.top = adjustedY + 'px';
}

// 周期性分析ツールチップを非表示
function hidePeriodTooltip(type) {
  const tooltipId = type === 'autocorr' ? 'autocorrTooltip' : 'gcdTooltip';
  const tooltip = document.getElementById(tooltipId);
  if (tooltip) {
    tooltip.classList.add('hidden');
  }
}

// 素数判定
function isPrime(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

// 約数を取得
function getDivisors(n) {
  const divisors = [];
  for (let i = 1; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      divisors.push(i);
      if (i !== n / i && i !== 1 && n / i !== n) {
        divisors.push(n / i);
      }
    }
  }
  return divisors.sort((a, b) => a - b);
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
  
  // ツールチップを初期化
  initPeriodTooltip('autocorr');
  
  // 上位5つを特定
  const acWithIndex = ac.slice(0, 40).map((val, i) => ({ value: val, index: i, shift: i + 1 }));
  const top5 = [...acWithIndex].sort((a, b) => b.value - a.value).slice(0, 5);
  const top5Indices = new Set(top5.map(item => item.index));
  
  ac.slice(0, 40).forEach((val, i) => {
    const barHeight = val * height * 0.8;
    const barGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    barGroup.setAttribute('class', 'period-bar-group');
    
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('x', i * barWidth);
    bar.setAttribute('y', height - barHeight);
    bar.setAttribute('width', barWidth - 1);
    bar.setAttribute('height', barHeight);
    bar.setAttribute('fill', val > 0.05 ? '#22c55e' : '#64748b');
    bar.setAttribute('class', 'period-bar');
    
    // ツールチップ設定
    setupPeriodBarTooltip(bar, {
      type: 'autocorr',
      shift: i + 1,
      value: val,
      percentage: (val * 100).toFixed(2),
      isSignificant: val > 0.05,
      isPeak: val > 0.055
    });
    
    barGroup.appendChild(bar);
    svg.appendChild(barGroup);
    
    // 上位5つにラベルを追加
    if (top5Indices.has(i)) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', i * barWidth + barWidth / 2);
      label.setAttribute('y', height - barHeight - 2);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '9');
      label.setAttribute('font-weight', '600');
      label.setAttribute('fill', val > 0.05 ? '#16a34a' : '#374151');
      label.textContent = `${i + 1}`;
      svg.appendChild(label);
      
      // パーセンテージラベル（小さく表示）
      const pctLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      pctLabel.setAttribute('x', i * barWidth + barWidth / 2);
      pctLabel.setAttribute('y', height - barHeight + 10);
      pctLabel.setAttribute('text-anchor', 'middle');
      pctLabel.setAttribute('font-size', '7');
      pctLabel.setAttribute('fill', '#6b7280');
      pctLabel.textContent = `${(val * 100).toFixed(1)}%`;
      svg.appendChild(pctLabel);
    }
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
  
  // ツールチップを初期化
  initPeriodTooltip('gcd');
  
  // 上位5つを特定（値が存在するもののみ）
  const gcdEntries = [];
  for (let k = 2; k <= 20; k++) {
    const val = gcdHist.get(k) || 0;
    if (val > 0) {
      gcdEntries.push({ keyLength: k, count: val });
    }
  }
  const top5GCD = [...gcdEntries].sort((a, b) => b.count - a.count).slice(0, 5);
  const top5Keys = new Set(top5GCD.map(item => item.keyLength));
  
  for (let k = 2; k <= 20; k++) {
    const val = gcdHist.get(k) || 0;
    if (val === 0) continue;
    
    const barHeight = (val / maxVal) * height * 0.8;
    const barGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    barGroup.setAttribute('class', 'period-bar-group');
    
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('x', (k - 2) * barWidth);
    bar.setAttribute('y', height - barHeight);
    bar.setAttribute('width', barWidth - 1);
    bar.setAttribute('height', barHeight);
    bar.setAttribute('fill', val > maxVal * 0.3 ? '#f59e0b' : '#64748b');
    bar.setAttribute('class', 'period-bar');
    
    // ツールチップ設定
    setupPeriodBarTooltip(bar, {
      type: 'gcd',
      keyLength: k,
      count: val,
      percentage: ((val / maxVal) * 100).toFixed(1),
      isSignificant: val > maxVal * 0.3,
      isPrime: isPrime(k),
      divisors: getDivisors(k)
    });
    
    barGroup.appendChild(bar);
    svg.appendChild(barGroup);
    
    // 上位5つにラベルを追加
    if (top5Keys.has(k)) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (k - 2) * barWidth + barWidth / 2);
      label.setAttribute('y', height - barHeight - 2);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '9');
      label.setAttribute('font-weight', '600');
      label.setAttribute('fill', val > maxVal * 0.3 ? '#ea580c' : '#374151');
      label.textContent = k;
      svg.appendChild(label);
      
      // カウントラベル（小さく表示）
      const countLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      countLabel.setAttribute('x', (k - 2) * barWidth + barWidth / 2);
      countLabel.setAttribute('y', height - barHeight + 10);
      countLabel.setAttribute('text-anchor', 'middle');
      countLabel.setAttribute('font-size', '7');
      countLabel.setAttribute('fill', '#6b7280');
      countLabel.textContent = val >= 1000 ? `${Math.round(val/1000)}k` : val;
      svg.appendChild(countLabel);
    }
  }
}

// 結果の信頼度バーを更新
// 開発用：確率表示のテスト関数
window.testConfidenceDisplay = function(percentage) {
  updateConfidenceBar(percentage / 100);
  console.log(`Testing confidence display at ${percentage}%`);
};

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
    
    // 信頼度に応じて文字色と配置を動的に調整
    if (confidence < 25) {
      // 非常に低い確率：バーの外側に黒文字
      text.style.cssText = 'font-weight: 700; font-size: 1rem; color: #374151; letter-spacing: 0.5px; position: absolute; right: -45px; top: 50%; transform: translateY(-50%); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;';
    } else if (confidence < 50) {
      // 低〜中程度の確率：バーの中で黒文字（コントラスト重視）
      text.style.cssText = 'font-weight: 700; font-size: 1rem; color: #000000; text-shadow: 0 0 4px rgba(255,255,255,0.8); letter-spacing: 0.5px; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;';
    } else {
      // 高い確率：バーの中で白文字
      text.style.cssText = 'font-weight: 700; font-size: 1rem; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.7); letter-spacing: 0.5px; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;';
    }
  }
}