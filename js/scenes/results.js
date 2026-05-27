/* ============================================
   Scene 6: 实战效果对比 (Results)
   ============================================ */

window.ResultsScene = {
  hasAnimated: false,

  init() {
    this.drawBeforeCanvas();
    this.drawAfterCanvas();
    this.bindSlider();

    // IntersectionObserver for counters
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.hasAnimated) {
          this.hasAnimated = true;
          this.animateCounters();
        }
      });
    }, { threshold: 0.5 });

    const metrics = document.querySelector('.results-metrics');
    if (metrics) observer.observe(metrics);
  },

  drawBeforeCanvas() {
    const canvas = document.getElementById('results-before-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    
    // 背景
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    // 绘制一个凌乱的、有浪费的版面 (人工凭感觉排)
    const items = [
      {x: 20, y: 20, w: 180, h: 250},
      {x: 220, y: 30, w: 120, h: 180},
      {x: 360, y: 20, w: 160, h: 220},
      {x: 20, y: 290, w: 200, h: 70},
      {x: 240, y: 230, w: 100, h: 120},
      {x: 370, y: 260, w: 140, h: 100}
    ];

    items.forEach((item, i) => {
      // 故意使用带一点灰度的颜色表示低效
      const c = Utils.RECT_COLORS[i % Utils.RECT_COLORS.length];
      Utils.drawRoundedRect(ctx, item.x, item.y, item.w, item.h, 4);
      ctx.fillStyle = c.fill.replace('0.6', '0.3'); // 更透明/黯淡
      ctx.fill();
      ctx.strokeStyle = c.stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 绘制浪费的空白区域提示 (红色虚线)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.strokeRect(10, 10, w-20, h-20);
    ctx.setLineDash([]);
  },

  drawAfterCanvas() {
    const canvas = document.getElementById('results-after-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    
    // 背景
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    // 绘制一个紧密排列的完美版面 (OR-Tools)
    // 假设这些是利用 BinPacker 排好序的结果
    const items = [
      {x: 10, y: 10, w: 180, h: 250},
      {x: 195, y: 10, w: 140, h: 200},
      {x: 340, y: 10, w: 190, h: 260},
      {x: 10, y: 265, w: 200, h: 105},
      {x: 215, y: 215, w: 120, h: 155},
      {x: 340, y: 275, w: 190, h: 95}
    ];

    items.forEach((item, i) => {
      const c = Utils.RECT_COLORS[i % Utils.RECT_COLORS.length];
      Utils.drawRoundedRect(ctx, item.x, item.y, item.w, item.h, 4);
      ctx.fillStyle = c.fill; 
      ctx.fill();
      ctx.strokeStyle = c.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 绿色的整体边框
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, w-16, h-16);
  },

  bindSlider() {
    const wrapper = document.querySelector('.comparison-wrapper');
    const slider = document.getElementById('comparison-slider');
    const afterSide = document.querySelector('.comparison-after');

    if (!wrapper || !slider || !afterSide) return;

    let isDragging = false;

    const onMove = (clientX) => {
      if (!isDragging) return;
      const rect = wrapper.getBoundingClientRect();
      // 计算鼠标在 wrapper 内的相对百分比
      let x = clientX - rect.left;
      let percent = (x / rect.width) * 100;
      percent = Utils.clamp(percent, 0, 100);

      slider.style.left = `${percent}%`;
      // clip-path 裁切右侧的 After 图层
      // `polygon(left top, right top, right bottom, left bottom)`
      // 只有百分比右边的可见
      afterSide.style.clipPath = `polygon(${percent}% 0, 100% 0, 100% 100%, ${percent}% 100%)`;
    };

    slider.addEventListener('mousedown', () => isDragging = true);
    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('mousemove', (e) => onMove(e.clientX));

    // Touch events for mobile
    slider.addEventListener('touchstart', () => isDragging = true);
    window.addEventListener('touchend', () => isDragging = false);
    window.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX));

    // 初始化位置 50%
    slider.style.left = '50%';
    afterSide.style.clipPath = `polygon(50% 0, 100% 0, 100% 100%, 50% 100%)`;
  },

  animateCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
      const target = parseFloat(counter.dataset.target);
      const prefix = counter.dataset.prefix || '';
      const suffix = counter.dataset.suffix || '';
      Utils.animateCounter(counter, target, 2000, prefix, suffix);
    });
  }
};
