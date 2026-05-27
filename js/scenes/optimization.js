/* ============================================
   Scene 4: 多目标成本优化 (Optimization)
   ============================================ */

window.OptimizationScene = {
  // 状态变量
  weights: {
    w1: 0.5, // 边角料
    w2: 0.3, // 换版
    w3: 0.2  // 折页
  },

  // 常数
  CONSTANTS: {
    basePaperCost: 8200,
    maxPaperVary: 3000,
    basePlateCost: 1500,
    maxPlateVary: 2500,
    basePostCost: 800,
    maxPostVary: 1200
  },

  init() {
    this.bindSliders();
    this.updateAll();
    this.drawMergeVsSplit();

    // 绑定 resize 以重绘 canvas
    window.addEventListener('resize', Utils.debounce(() => {
      this.drawOptimizationCanvas();
      this.drawMergeVsSplit();
    }, 200));
  },

  bindSliders() {
    ['w1', 'w2', 'w3'].forEach(id => {
      const slider = document.getElementById(`${id}-slider`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          this.weights[id] = parseInt(e.target.value) / 100;
          document.getElementById(`${id}-val`).textContent = this.weights[id].toFixed(2);
          this.updateAll();
        });
      }
    });
  },

  updateAll() {
    this.updateCosts();
    this.updateRecommendation();
    
    // 用 requestAnimationFrame 防抖绘制
    if (!this.drawTicking) {
      this.drawTicking = true;
      requestAnimationFrame(() => {
        this.drawOptimizationCanvas();
        this.drawTicking = false;
      });
    }
  },

  updateCosts() {
    const w1 = this.weights.w1;
    const w2 = this.weights.w2;
    const w3 = this.weights.w3;

    // paperCost: w1 越大，省纸越好，成本越低
    const paperCost = this.CONSTANTS.basePaperCost + (1 - w1) * this.CONSTANTS.maxPaperVary;
    
    // plateCost: w2 越大，为了省换版费，可能会牺牲其他，这里简单计算：w2 越大，换版成本越低
    const plateCost = this.CONSTANTS.basePlateCost + (1 - w2) * this.CONSTANTS.maxPlateVary;
    
    // postCost: w3 越大，后道越简单，成本越低
    const postCost = this.CONSTANTS.basePostCost + (1 - w3) * this.CONSTANTS.maxPostVary;

    const total = paperCost + plateCost + postCost;

    // 更新 DOM
    this.setBar('paper', paperCost, 12000);
    this.setBar('plate', plateCost, 4000);
    this.setBar('post', postCost, 2500);

    document.getElementById('cost-total').textContent = `¥${total.toLocaleString('en-US', {maximumFractionDigits:0})}`;
  },

  setBar(id, value, maxVal) {
    const elValue = document.getElementById(`cost-val-${id}`);
    const elFill = document.getElementById(`cost-bar-${id}`);
    
    if (elValue) elValue.textContent = `¥${value.toLocaleString('en-US', {maximumFractionDigits:0})}`;
    if (elFill) {
      const percentage = Math.max(5, Math.min(100, (value / maxVal) * 100));
      elFill.style.width = `${percentage}%`;
    }
  },

  updateRecommendation() {
    const cardA = document.getElementById('merge-option-a');
    const cardB = document.getElementById('merge-option-b');
    
    if (!cardA || !cardB) return;

    // 清理状态
    cardA.classList.remove('merge-card--recommended');
    cardB.classList.remove('merge-card--recommended');
    
    // 移除之前的 badge
    const oldBadges = document.querySelectorAll('.merge-badge');
    oldBadges.forEach(b => b.remove());

    // 简单逻辑：w1 (省纸) > 0.5 推荐合版，否则如果 w2 (换版) 很高推荐合版，其他情况看 w3
    const scoreA = this.weights.w1 * 2 + this.weights.w2 * 0.5 - this.weights.w3 * 1.5;
    const scoreB = -this.weights.w1 * 1.5 + this.weights.w2 * 2 + this.weights.w3 * 1.5;

    const recommended = scoreA > scoreB ? cardA : cardB;
    recommended.classList.add('merge-card--recommended');
    
    const badge = document.createElement('div');
    badge.className = 'merge-badge';
    badge.innerHTML = '✨ 推荐';
    badge.style.position = 'absolute';
    badge.style.top = '-10px';
    badge.style.right = '-10px';
    badge.style.background = 'var(--accent-blue)';
    badge.style.color = 'white';
    badge.style.padding = '2px 8px';
    badge.style.borderRadius = '12px';
    badge.style.fontSize = '12px';
    badge.style.boxShadow = 'var(--shadow-glow)';
    
    recommended.style.position = 'relative';
    recommended.appendChild(badge);
  },

  drawOptimizationCanvas() {
    const canvas = document.getElementById('optimization-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 绘制版面背景
    Utils.drawRoundedRect(ctx, 20, 20, w - 40, h - 40, 8);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    const w1 = this.weights.w1;
    const w2 = this.weights.w2;

    // 根据权重决定布局形态
    // 高 w1 = 紧凑混合布局 (合版)
    // 高 w2, 低 w1 = 宽松同色布局 (独版)

    let items = [];
    if (w1 > 0.6) {
      // 合版：塞满
      items = [
        {x: 40, y: 40, w: 200, h: 280, c: 0},
        {x: 250, y: 40, w: 140, h: 200, c: 1},
        {x: 250, y: 250, w: 140, h: 130, c: 2},
        {x: 400, y: 40, w: 120, h: 160, c: 3},
        {x: 400, y: 210, w: 120, h: 170, c: 0},
      ];
      this.drawStatusText(ctx, w, "极致合版方案 (高利用率)");
    } else if (w2 > 0.6 && w1 <= 0.6) {
      // 独版：同一种颜色
      items = [
        {x: 40, y: 40, w: 200, h: 280, c: 0},
        {x: 260, y: 40, w: 200, h: 280, c: 0},
      ];
      this.drawStatusText(ctx, w, "独立版方案 (低换版成本)");
    } else {
      // 均衡
      items = [
        {x: 40, y: 40, w: 200, h: 280, c: 0},
        {x: 250, y: 40, w: 200, h: 150, c: 1},
        {x: 250, y: 200, w: 100, h: 140, c: 1},
      ];
      this.drawStatusText(ctx, w, "均衡折中方案");
    }

    // 绘制项目
    items.forEach(item => {
      const color = Utils.RECT_COLORS[item.c];
      Utils.drawRoundedRect(ctx, item.x, item.y, item.w, item.h, 4);
      ctx.fillStyle = color.fill;
      ctx.fill();
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  },

  drawStatusText(ctx, w, text) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(text, w - 30, 40);
  },

  drawMergeVsSplit() {
    this.drawMergeA();
    this.drawMergeB();
  },

  drawMergeA() {
    const canvas = document.getElementById('merge-canvas-a');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景
    Utils.drawRoundedRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 4);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    // A 和 B
    const colorA = Utils.RECT_COLORS[0];
    const colorB = Utils.RECT_COLORS[2];

    Utils.drawRoundedRect(ctx, 20, 20, 80, 100, 2);
    ctx.fillStyle = colorA.fill; ctx.fill();
    ctx.strokeStyle = colorA.stroke; ctx.stroke();
    
    Utils.drawRoundedRect(ctx, 110, 20, 80, 100, 2);
    ctx.fillStyle = colorB.fill; ctx.fill();
    ctx.strokeStyle = colorB.stroke; ctx.stroke();
  },

  drawMergeB() {
    const canvas = document.getElementById('merge-canvas-b');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 两张背景纸
    Utils.drawRoundedRect(ctx, 10, 10, 90, canvas.height - 20, 4);
    ctx.fillStyle = '#1e293b'; ctx.fill();
    
    Utils.drawRoundedRect(ctx, 120, 10, 90, canvas.height - 20, 4);
    ctx.fillStyle = '#1e293b'; ctx.fill();

    // A 和 B 分开
    const colorA = Utils.RECT_COLORS[0];
    const colorB = Utils.RECT_COLORS[2];

    Utils.drawRoundedRect(ctx, 15, 15, 80, 100, 2);
    ctx.fillStyle = colorA.fill; ctx.fill();
    ctx.strokeStyle = colorA.stroke; ctx.stroke();
    
    Utils.drawRoundedRect(ctx, 125, 15, 80, 100, 2);
    ctx.fillStyle = colorB.fill; ctx.fill();
    ctx.strokeStyle = colorB.stroke; ctx.stroke();
  }
};
