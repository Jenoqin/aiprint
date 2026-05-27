/* ============================================
   OR-Tools 智能拼版 Demo — 工具函数
   ============================================ */

;(function () {
  'use strict';

  // ── 矩形配色方案 ──
  const RECT_COLORS = [
    { fill: 'rgba(59, 130, 246, 0.6)',  stroke: '#3b82f6', name: '蓝' },
    { fill: 'rgba(16, 185, 129, 0.6)',  stroke: '#10b981', name: '绿' },
    { fill: 'rgba(245, 158, 11, 0.6)',  stroke: '#f59e0b', name: '橙' },
    { fill: 'rgba(139, 92, 246, 0.6)',  stroke: '#8b5cf6', name: '紫' },
    { fill: 'rgba(236, 72, 153, 0.6)',  stroke: '#ec4899', name: '粉' },
    { fill: 'rgba(20, 184, 166, 0.6)',  stroke: '#14b8a6', name: '青' },
    { fill: 'rgba(251, 146, 60, 0.6)',  stroke: '#fb923c', name: '橘' },
    { fill: 'rgba(167, 139, 250, 0.6)', stroke: '#a78bfa', name: '淡紫' },
  ];

  // ── 缓动函数 ──

  /** Exponential ease-out: fast start, slow end */
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  /** Back ease-out: slight overshoot then settle */
  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  /** Cubic ease in-out: smooth acceleration & deceleration */
  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ── 数学工具 ──

  /** 线性插值 a→b，t ∈ [0,1] */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** 将 val 限制在 [min, max] */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /** [min, max) 范围的随机浮点数 */
  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  /** 从颜色方案数组中随机取一个 */
  function randomColor(palette) {
    const p = palette || RECT_COLORS;
    return p[Math.floor(Math.random() * p.length)];
  }

  // ── Canvas 绘图辅助 ──

  /**
   * 在 canvas 上绘制圆角矩形路径（不自动填充/描边）
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - 左上角 x
   * @param {number} y - 左上角 y
   * @param {number} w - 宽度
   * @param {number} h - 高度
   * @param {number} r - 圆角半径
   */
  function drawRoundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ── 碰撞检测 ──

  /**
   * AABB 矩形碰撞检测
   * rect 格式: { x, y, w, h }
   */
  function isColliding(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    );
  }

  /**
   * 检测 rect 是否完全在 bounds 内
   * 格式均为 { x, y, w, h }
   */
  function isInsideBounds(rect, bounds) {
    return (
      rect.x >= bounds.x &&
      rect.y >= bounds.y &&
      rect.x + rect.w <= bounds.x + bounds.w &&
      rect.y + rect.h <= bounds.y + bounds.h
    );
  }

  // ── 动画工具 ──

  /**
   * 数字滚动动画
   * @param {HTMLElement} element  — 显示数字的 DOM 元素
   * @param {number}      target  — 目标数值
   * @param {number}      duration — 持续时间(ms)
   * @param {string}      prefix  — 前缀，如 '¥'
   * @param {string}      suffix  — 后缀，如 '%'
   */
  function animateCounter(element, target, duration, prefix, suffix) {
    prefix = prefix || '';
    suffix = suffix || '';
    const startTime = performance.now();
    const isFloat = target % 1 !== 0;

    function tick(now) {
      const elapsed = now - startTime;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased = easeOutExpo(progress);
      const current = lerp(0, target, eased);
      element.textContent = prefix + (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }

  /**
   * 打字机效果
   * @param {HTMLElement} element
   * @param {string}      text
   * @param {number}      speed — 每字符间隔(ms)
   * @returns {Promise} 完成后 resolve
   */
  function typeWriter(element, text, speed) {
    speed = speed || 40;
    element.textContent = '';
    return new Promise(function (resolve) {
      let i = 0;
      function next() {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          setTimeout(next, speed);
        } else {
          resolve();
        }
      }
      next();
    });
  }

  // ── 通用工具 ──

  /**
   * 防抖
   * @param {Function} fn
   * @param {number}   delay — ms
   * @returns {Function}
   */
  function debounce(fn, delay) {
    let timer = null;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  /**
   * 获取鼠标/触摸在 canvas 上的缩放坐标
   * 自动处理 CSS 缩放和 DPI 差异
   * @param {HTMLCanvasElement} canvas
   * @param {MouseEvent|TouchEvent} event
   * @returns {{ x: number, y: number }}
   */
  function getScaledCoords(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  // ── 导出到全局 window.Utils ──
  window.Utils = {
    RECT_COLORS: RECT_COLORS,
    // 缓动
    easeOutExpo: easeOutExpo,
    easeOutBack: easeOutBack,
    easeInOutCubic: easeInOutCubic,
    // 数学
    lerp: lerp,
    clamp: clamp,
    randomRange: randomRange,
    randomColor: randomColor,
    // Canvas
    drawRoundedRect: drawRoundedRect,
    // 碰撞
    isColliding: isColliding,
    isInsideBounds: isInsideBounds,
    // 动画
    animateCounter: animateCounter,
    typeWriter: typeWriter,
    // 工具
    debounce: debounce,
    getScaledCoords: getScaledCoords,
  };
})();
