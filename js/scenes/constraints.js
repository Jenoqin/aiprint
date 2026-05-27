/* ============================================
   Scene 3 — 工艺约束 (Industrial Constraints)
   三种约束可视化 + Tab 切换
   ============================================ */

;(function () {
  'use strict';

  /* ================================================
     公用工具
     ================================================ */
  const DPR = window.devicePixelRatio || 1;
  const COLORS = {
    bg:        '#0f172a',
    sheet:     '#1e293b',
    safe:      'rgba(16, 185, 129, 0.12)',
    safeBdr:   '#10b981',
    gripper:   'rgba(239, 68, 68, 0.25)',
    gripperBdr:'#ef4444',
    tail:      'rgba(245, 158, 11, 0.18)',
    tailBdr:   '#f59e0b',
    margin:    'rgba(148, 163, 184, 0.08)',
    marginBdr: 'rgba(148, 163, 184, 0.2)',
    book:      'rgba(59, 130, 246, 0.35)',
    bookBdr:   '#3b82f6',
    bookBad:   'rgba(239, 68, 68, 0.35)',
    bookBadBdr:'#ef4444',
    textPri:   '#f1f5f9',
    textSec:   '#94a3b8',
    textMut:   '#64748b',
    blue:      '#3b82f6',
    green:     '#10b981',
    red:       '#ef4444',
    amber:     '#f59e0b',
    purple:    '#8b5cf6',
    grain:     'rgba(148, 163, 184, 0.12)',
    grainLine: 'rgba(148, 163, 184, 0.18)',
    cutLine:   '#60a5fa',
    blade:     '#f1f5f9',
  };

  /** 初始化高 DPI canvas */
  function initCanvas(id, w, h) {
    const c = document.getElementById(id);
    if (!c) return null;
    c.width  = w * DPR;
    c.height = h * DPR;
    c.style.width  = w + 'px';
    c.style.height = h + 'px';
    const ctx = c.getContext('2d');
    ctx.scale(DPR, DPR);
    return { canvas: c, ctx, w, h };
  }

  function roundRect(ctx, x, y, w, h, r) {
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

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* ================================================
     Tab 切换
     ================================================ */
  function setupTabs() {
    const tabContainer = document.getElementById('constraint-tabs');
    if (!tabContainer) return;

    tabContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;

      const tabId = btn.dataset.tab;

      // 切换 tab 激活态
      tabContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
      btn.classList.add('tab--active');

      // 切换面板
      document.querySelectorAll('.constraint-panel').forEach(p => {
        p.classList.remove('constraint-panel--active');
      });
      const panel = document.getElementById('panel-' + tabId);
      if (panel) panel.classList.add('constraint-panel--active');
    });
  }

  /* ================================================
     约束 1: 咬口 & 幅面
     ================================================ */
  function setupGripper() {
    const info = initCanvas('gripper-canvas', 600, 420);
    if (!info) return;
    const { canvas, ctx, w, h } = info;

    // 纸张布局参数（像素坐标，非真实 mm）
    const pad = 30;                   // canvas 外边距
    const sheetX = pad, sheetY = pad;
    const sheetW = w - pad * 2, sheetH = h - pad * 2;

    // 可调参数
    let gripperMM = 12;              // 咬口 mm
    const maxMM = 30, minMM = 5;
    const mmScale = sheetH / 889;    // 将 mm 映射到像素（假设纸张高度 889mm）
    const tailMM = 15;               // 甩尾固定
    const sideMarginMM = 8;

    // 书本矩形（可拖拽）
    const bookW = 100, bookH = 70;
    let bookX = sheetX + sheetW / 2 - bookW / 2;
    let bookY = sheetY + sheetH / 2 - bookH / 2;
    let bookTargetX = bookX, bookTargetY = bookY;
    let bookInDanger = false;

    // 拖拽状态
    let dragging = false;
    let dragOffX = 0, dragOffY = 0;

    // 弹回动画
    let bouncing = false;
    let bounceStart = 0;
    const bounceDur = 500;
    let bounceFromY = 0, bounceToY = 0;

    // ─── 滑块 ───
    const slider = document.getElementById('gripper-slider');
    const valEl  = document.getElementById('gripper-value');
    if (slider) {
      slider.addEventListener('input', () => {
        gripperMM = parseInt(slider.value);
        if (valEl) valEl.textContent = gripperMM + 'mm';
        checkBookPosition();
      });
    }

    function gripperPx() { return gripperMM * mmScale; }
    function tailPx()    { return tailMM * mmScale; }
    function sidePx()    { return sideMarginMM * mmScale; }

    /** 安全区域范围 */
    function safeZone() {
      const gp = gripperPx(), tp = tailPx(), sp = sidePx();
      return {
        x: sheetX + sp,
        y: sheetY + gp,
        w: sheetW - sp * 2,
        h: sheetH - gp - tp,
      };
    }

    /** 检查书本是否在咬口区，如果是就弹回 */
    function checkBookPosition() {
      const sz = safeZone();
      if (bookY < sz.y) {
        bounceFromY = bookY;
        bounceToY = sz.y + 4;
        bouncing = true;
        bounceStart = performance.now();
        bookInDanger = true;
      } else {
        bookInDanger = false;
      }
    }

    // ─── 拖拽事件 ───
    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      const scaleX = w / r.width;
      const scaleY = h / r.height;
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - r.left) * scaleX,
        y: (t.clientY - r.top)  * scaleY,
      };
    }

    function onDown(e) {
      const p = getPos(e);
      if (p.x >= bookX && p.x <= bookX + bookW &&
          p.y >= bookY && p.y <= bookY + bookH) {
        dragging = true;
        bouncing = false;
        dragOffX = p.x - bookX;
        dragOffY = p.y - bookY;
        e.preventDefault();
      }
    }
    function onMove(e) {
      if (!dragging) return;
      const p = getPos(e);
      const sz = safeZone();
      bookX = clamp(p.x - dragOffX, sheetX + sidePx(), sheetX + sheetW - sidePx() - bookW);
      bookY = clamp(p.y - dragOffY, sheetY, sheetY + sheetH - tailPx() - bookH);
      bookTargetX = bookX;
      bookTargetY = bookY;

      // 实时检测危险区
      bookInDanger = bookY < sz.y;
      e.preventDefault();
    }
    function onUp() {
      if (dragging) {
        dragging = false;
        checkBookPosition();
      }
    }

    canvas.addEventListener('mousedown',  onDown);
    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('mouseup',    onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove',  onMove, { passive: false });
    canvas.addEventListener('touchend',   onUp);

    // ─── 绘制 ───
    function draw() {
      ctx.clearRect(0, 0, w, h);

      const gp = gripperPx(), tp = tailPx(), sp = sidePx();

      // 纸张底色
      roundRect(ctx, sheetX, sheetY, sheetW, sheetH, 4);
      ctx.fillStyle = COLORS.sheet;
      ctx.fill();
      ctx.strokeStyle = 'rgba(148,163,184,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 咬口区（顶部红色）
      ctx.fillStyle = COLORS.gripper;
      ctx.fillRect(sheetX, sheetY, sheetW, gp);
      ctx.strokeStyle = COLORS.gripperBdr;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(sheetX, sheetY + gp);
      ctx.lineTo(sheetX + sheetW, sheetY + gp);
      ctx.stroke();
      ctx.setLineDash([]);

      // 咬口标签
      ctx.fillStyle = COLORS.red;
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`咬口区 G=${gripperMM}mm`, sheetX + sheetW / 2, sheetY + gp / 2 + 4);

      // 甩尾区（底部黄色）
      ctx.fillStyle = COLORS.tail;
      ctx.fillRect(sheetX, sheetY + sheetH - tp, sheetW, tp);
      ctx.strokeStyle = COLORS.tailBdr;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(sheetX, sheetY + sheetH - tp);
      ctx.lineTo(sheetX + sheetW, sheetY + sheetH - tp);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = COLORS.amber;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText('甩尾区', sheetX + sheetW / 2, sheetY + sheetH - tp / 2 + 4);

      // 左右边距
      ctx.fillStyle = COLORS.margin;
      ctx.fillRect(sheetX, sheetY + gp, sp, sheetH - gp - tp);
      ctx.fillRect(sheetX + sheetW - sp, sheetY + gp, sp, sheetH - gp - tp);

      // 安全区域
      const sz = safeZone();
      ctx.fillStyle = COLORS.safe;
      ctx.fillRect(sz.x, sz.y, sz.w, sz.h);
      ctx.strokeStyle = COLORS.safeBdr;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sz.x, sz.y, sz.w, sz.h);
      ctx.setLineDash([]);

      ctx.fillStyle = COLORS.green;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓ 安全印刷区', sz.x + sz.w / 2, sz.y + 16);

      // 处理弹回动画
      if (bouncing) {
        const elapsed = performance.now() - bounceStart;
        const t = clamp(elapsed / bounceDur, 0, 1);
        const eased = easeOutBack(t);
        bookY = lerp(bounceFromY, bounceToY, eased);
        if (t >= 1) {
          bouncing = false;
          bookInDanger = false;
          bookY = bounceToY;
        }
      }

      // 书本矩形
      const bColor     = bookInDanger ? COLORS.bookBad    : COLORS.book;
      const bBdrColor  = bookInDanger ? COLORS.bookBadBdr : COLORS.bookBdr;

      roundRect(ctx, bookX, bookY, bookW, bookH, 4);
      ctx.fillStyle = bColor;
      ctx.fill();
      ctx.strokeStyle = bBdrColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = bookInDanger ? COLORS.red : COLORS.blue;
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bookInDanger ? '⚠️ 危险' : '📖 书页', bookX + bookW / 2, bookY + bookH / 2 + 4);

      // 拖拽提示
      if (!dragging && !bouncing) {
        ctx.fillStyle = COLORS.textMut;
        ctx.font = '400 10px Inter, sans-serif';
        ctx.fillText('← 拖拽书页试试 →', bookX + bookW / 2, bookY + bookH + 16);
      }

      requestAnimationFrame(draw);
    }

    draw();
  }

  /* ================================================
     约束 2: 丝缕方向
     ================================================ */
  function setupGrain() {
    const info = initCanvas('grain-canvas', 600, 420);
    if (!info) return;
    const { canvas, ctx, w, h } = info;

    const toggle   = document.getElementById('grain-toggle');
    const statusEl = document.getElementById('grain-status');
    const visualEl = canvas.closest('.constraint-visual');

    let rotated = false;
    let rotation = 0;           // 当前角度 (0 或 90)
    let targetRotation = 0;
    let animating = false;
    let waveOffset = 0;

    // 书本参数
    const bookLong = 140, bookShort = 90;

    if (toggle) {
      toggle.addEventListener('change', () => {
        rotated = toggle.checked;
        targetRotation = rotated ? 90 : 0;
        animating = true;

        if (statusEl) {
          statusEl.textContent = rotated
            ? 'R_i = 1（旋转 90°）'
            : 'R_i = 0（不旋转）';
        }

        // CSS 视觉反馈
        if (visualEl) {
          visualEl.classList.remove('constraint-visual--grain-match',
                                    'constraint-visual--grain-mismatch',
                                    'constraint-visual--grain-flash');
          // 强制回流以重新触发动画
          void visualEl.offsetWidth;
          if (rotated) {
            visualEl.classList.add('constraint-visual--grain-mismatch');
            visualEl.classList.add('constraint-visual--grain-flash');
          } else {
            visualEl.classList.add('constraint-visual--grain-match');
          }
        }
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      waveOffset += 0.3;

      // ── 丝缕背景线（竖向、微波浪）──
      ctx.save();
      const lineSpacing = 16;
      const lineCount = Math.ceil(w / lineSpacing);
      ctx.strokeStyle = COLORS.grainLine;
      ctx.lineWidth = 0.8;

      for (let i = 0; i <= lineCount; i++) {
        const baseX = i * lineSpacing;
        ctx.beginPath();
        for (let y = 0; y <= h; y += 4) {
          const waveMag = 1.5;
          const waveX = baseX + Math.sin((y + waveOffset) * 0.03) * waveMag;
          if (y === 0) ctx.moveTo(waveX, y);
          else ctx.lineTo(waveX, y);
        }
        ctx.stroke();
      }

      // 丝缕方向箭头标注
      ctx.fillStyle = COLORS.textMut;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('↕ 丝缕方向', 14, 24);
      ctx.restore();

      // ── 旋转动画插值 ──
      if (animating) {
        const speed = 4;
        const diff = targetRotation - rotation;
        if (Math.abs(diff) < 0.5) {
          rotation = targetRotation;
          animating = false;
        } else {
          rotation += diff * 0.08 * speed;
        }
      }

      // ── 书本 ──
      const cx = w / 2, cy = h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);

      const bw = bookShort, bh = bookLong;
      const bx = -bw / 2, by = -bh / 2;

      // 书本体
      roundRect(ctx, bx, by, bw, bh, 6);
      const isMatch = rotation < 45;
      ctx.fillStyle = isMatch
        ? 'rgba(16, 185, 129, 0.18)'
        : 'rgba(239, 68, 68, 0.18)';
      ctx.fill();
      ctx.strokeStyle = isMatch ? COLORS.green : COLORS.red;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 书脊线
      ctx.beginPath();
      ctx.moveTo(bx + 14, by);
      ctx.lineTo(bx + 14, by + bh);
      ctx.strokeStyle = isMatch
        ? 'rgba(16, 185, 129, 0.5)'
        : 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 折线可视化
      const foldY = 0;
      ctx.beginPath();
      if (isMatch) {
        // 平滑折线
        ctx.setLineDash([8, 4]);
        ctx.moveTo(bx, foldY);
        ctx.lineTo(bx + bw, foldY);
        ctx.strokeStyle = COLORS.green;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // 锯齿裂纹
        ctx.strokeStyle = COLORS.red;
        ctx.lineWidth = 2;
        const segments = 18;
        const segW = bw / segments;
        ctx.moveTo(bx, foldY);
        for (let i = 1; i <= segments; i++) {
          const jag = (i % 2 === 0 ? 1 : -1) * (3 + Math.random() * 3);
          ctx.lineTo(bx + i * segW, foldY + jag);
        }
        ctx.stroke();

        // 小裂纹符号
        ctx.fillStyle = COLORS.red;
        ctx.font = '600 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💥', bx + bw / 2, foldY - 16);
      }

      // 书页文字
      ctx.fillStyle = isMatch ? COLORS.green : COLORS.red;
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📖', 0, -bh / 2 + 24);

      ctx.restore();

      // ── 状态文字 ──
      ctx.textAlign = 'center';
      ctx.font = '600 14px "Noto Sans SC", Inter, sans-serif';
      if (rotation < 45) {
        ctx.fillStyle = COLORS.green;
        ctx.fillText('纵向与丝缕平行 ✓', cx, h - 36);
        ctx.fillStyle = COLORS.textMut;
        ctx.font = '400 11px Inter, sans-serif';
        ctx.fillText('折线平整，折后装订牢固', cx, h - 16);
      } else {
        ctx.fillStyle = COLORS.red;
        ctx.fillText('⚠️ 丝缕垂直！折线爆裂风险！', cx, h - 36);
        ctx.fillStyle = COLORS.textMut;
        ctx.font = '400 11px Inter, sans-serif';
        ctx.fillText('纸张纤维被拉断，折后炸开', cx, h - 16);
      }

      requestAnimationFrame(draw);
    }

    draw();
  }

  /* ================================================
     约束 3: Guillotine Cut
     ================================================ */
  function setupGuillotine() {
    const info = initCanvas('guillotine-canvas', 600, 420);
    if (!info) return;
    const { canvas, ctx, w, h } = info;

    const playBtn    = document.getElementById('guillotine-play');
    const compareBtn = document.getElementById('guillotine-compare');

    // 纸张区域
    const pad = 30;
    const sx = pad, sy = pad;
    const sw = w - pad * 2, sh = h - pad * 2;

    // ── 合法布局（可以一刀切）──
    // 先切一条横线，分成上下两条
    // 上条再切竖线，下条再切竖线
    const cutY = sy + sh * 0.45; // 水平切位置

    const validRects = [
      // 上半部分：3 块
      { x: sx,                y: sy,     w: sw * 0.40,  h: cutY - sy,     color: '#3b82f6' },
      { x: sx + sw * 0.40,   y: sy,     w: sw * 0.35,  h: cutY - sy,     color: '#8b5cf6' },
      { x: sx + sw * 0.75,   y: sy,     w: sw * 0.25,  h: cutY - sy,     color: '#10b981' },
      // 下半部分：4 块
      { x: sx,                y: cutY,   w: sw * 0.30,  h: sy + sh - cutY, color: '#f59e0b' },
      { x: sx + sw * 0.30,   y: cutY,   w: sw * 0.25,  h: sy + sh - cutY, color: '#ef4444' },
      { x: sx + sw * 0.55,   y: cutY,   w: sw * 0.20,  h: sy + sh - cutY, color: '#06b6d4' },
      { x: sx + sw * 0.75,   y: cutY,   w: sw * 0.25,  h: sy + sh - cutY, color: '#ec4899' },
    ];

    // ── 非法布局（L 形阻挡）──
    const invalidRects = [
      { x: sx,                y: sy,              w: sw * 0.5,  h: sh * 0.5,  color: '#3b82f6' },
      { x: sx + sw * 0.5,    y: sy,              w: sw * 0.5,  h: sh * 0.3,  color: '#8b5cf6' },
      { x: sx + sw * 0.5,    y: sy + sh * 0.3,   w: sw * 0.25, h: sh * 0.35, color: '#10b981' },
      // 这块挡住了水平切线 — L 形
      { x: sx + sw * 0.35,   y: sy + sh * 0.35,  w: sw * 0.40, h: sh * 0.35, color: '#f59e0b' },
      { x: sx,                y: sy + sh * 0.5,   w: sw * 0.35, h: sh * 0.5,  color: '#ef4444' },
      { x: sx + sw * 0.75,   y: sy + sh * 0.3,   w: sw * 0.25, h: sh * 0.7,  color: '#06b6d4' },
    ];

    // 动画状态
    let mode = 'idle'; // 'idle' | 'valid' | 'invalid'
    let animPhase = 0; // 动画阶段
    let animT = 0;     // 阶段内进度 [0..1]
    let animStart = 0;
    let gapAnim = 0;   // 分离间距动画

    // 合法动画阶段时间表
    const phaseDurations = [800, 400, 800, 400, 700, 600]; // ms
    // 0: 水平虚线出现
    // 1: 刀片从左到右
    // 2: 上下分离（gap）
    // 3: 竖直切线出现
    // 4: 竖直刀片移动
    // 5: 所有碎片分离

    // 非法动画
    const invalidPhaseDur = [800, 600, 800]; // 虚线→刀片→碰壁

    function drawRects(rects, gap, separateAll) {
      rects.forEach((r, i) => {
        let dx = 0, dy = 0;
        if (separateAll) {
          // 给每块加小间距
          dx = (i % 3 - 1) * gap * 0.4;
          dy = (r.y < cutY ? -1 : 1) * gap * 0.5;
        } else if (gap > 0) {
          // 只上下分离
          dy = r.y < cutY ? -gap : gap;
        }

        const rx = r.x + dx, ry = r.y + dy;
        roundRect(ctx, rx, ry, r.w, r.h, 3);
        ctx.fillStyle = r.color + '33'; // 20% alpha
        ctx.fill();
        ctx.strokeStyle = separateAll && gap > 2 ? COLORS.green : r.color + '88';
        ctx.lineWidth = separateAll && gap > 2 ? 2 : 1.5;
        ctx.stroke();
      });
    }

    function drawBlade(x, y, vertical) {
      ctx.save();
      ctx.shadowColor = '#f1f5f9';
      ctx.shadowBlur = 12;
      if (vertical) {
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x - 5, y - 14);
        ctx.lineTo(x + 5, y - 14);
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 14, y - 5);
        ctx.lineTo(x - 14, y + 5);
        ctx.closePath();
      }
      ctx.fillStyle = COLORS.blade;
      ctx.fill();
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      const now = performance.now();

      if (mode === 'idle') {
        // 静态展示合法布局
        drawRects(validRects, 0, false);

        // 提示文字
        ctx.fillStyle = COLORS.textMut;
        ctx.font = '400 12px "Noto Sans SC", Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('点击下方按钮查看裁切动画', w / 2, h - 8);

      } else if (mode === 'valid') {
        const elapsed = now - animStart;
        let accum = 0;
        let found = false;

        for (let p = 0; p < phaseDurations.length; p++) {
          if (elapsed < accum + phaseDurations[p]) {
            animPhase = p;
            animT = (elapsed - accum) / phaseDurations[p];
            found = true;
            break;
          }
          accum += phaseDurations[p];
        }

        if (!found) {
          // 动画结束，停留在最终态
          animPhase = phaseDurations.length;
          animT = 1;
        }

        // 根据阶段计算 gap
        let gap = 0;
        let separateAll = false;
        if (animPhase >= 2) gap = Math.min((animPhase >= 5 ? 8 : 4), 8);
        if (animPhase >= 5) { separateAll = true; gap = easeOutCubic(animT) * 8; }
        else if (animPhase >= 2) { gap = easeOutCubic(Math.min(animT * 2, 1)) * 4; }

        if (animPhase >= phaseDurations.length) {
          separateAll = true;
          gap = 8;
        }

        drawRects(validRects, gap, separateAll);

        // 水平切线
        if (animPhase >= 0) {
          const lineProgress = animPhase === 0 ? easeOutCubic(animT) : 1;
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = COLORS.cutLine;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const lineEndX = sx + sw * lineProgress;
          ctx.moveTo(sx, cutY + (animPhase >= 2 ? 0 : 0));
          ctx.lineTo(lineEndX, cutY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 水平刀片
        if (animPhase === 1) {
          const bladeX = sx + sw * easeOutCubic(animT);
          drawBlade(bladeX, cutY, false);
        }

        // 竖直切线
        if (animPhase >= 3) {
          const vCuts = [sw * 0.40, sw * 0.75, sw * 0.30, sw * 0.55];
          const vProgress = animPhase === 3 ? easeOutCubic(animT) : 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = COLORS.cutLine;
          ctx.lineWidth = 1;
          vCuts.forEach(cx => {
            ctx.beginPath();
            ctx.moveTo(sx + cx, sy);
            ctx.lineTo(sx + cx, sy + sh * vProgress);
            ctx.stroke();
          });
          ctx.setLineDash([]);
        }

        // 竖直刀片
        if (animPhase === 4) {
          const bladeY = sy + sh * easeOutCubic(animT);
          drawBlade(sx + sw * 0.40, bladeY, true);
        }

        // 完成文字
        if (animPhase >= phaseDurations.length) {
          ctx.fillStyle = COLORS.green;
          ctx.font = '700 15px "Noto Sans SC", Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✅ 裁切完成！每刀一刀切到底', w / 2, h - 8);
          enableButtons();
        }

      } else if (mode === 'invalid') {
        const elapsed = now - animStart;
        let accum = 0;
        let found = false;

        for (let p = 0; p < invalidPhaseDur.length; p++) {
          if (elapsed < accum + invalidPhaseDur[p]) {
            animPhase = p;
            animT = (elapsed - accum) / invalidPhaseDur[p];
            found = true;
            break;
          }
          accum += invalidPhaseDur[p];
        }

        if (!found) {
          animPhase = invalidPhaseDur.length;
          animT = 1;
        }

        drawRects(invalidRects, 0, false);

        // 尝试水平切线（在 y = sy + sh*0.5 处）
        const invalidCutY = sy + sh * 0.5;

        if (animPhase >= 0) {
          const lineProgress = animPhase === 0 ? easeOutCubic(animT) : 1;
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = COLORS.cutLine;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          // 切到 35% 位置遇到阻挡
          const maxProgress = Math.min(lineProgress, 0.60);
          ctx.moveTo(sx, invalidCutY);
          ctx.lineTo(sx + sw * maxProgress, invalidCutY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 刀片碰到阻挡块
        if (animPhase === 1) {
          const bladeX = sx + sw * Math.min(easeOutCubic(animT), 0.60);
          drawBlade(bladeX, invalidCutY, false);

          if (animT > 0.6) {
            // 变红
            ctx.fillStyle = COLORS.red;
            ctx.font = '700 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('❌', bladeX + 20, invalidCutY - 12);
          }
        }

        // 碰壁后
        if (animPhase >= 2) {
          // 红色切线
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = COLORS.red;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, invalidCutY);
          ctx.lineTo(sx + sw * 0.60, invalidCutY);
          ctx.stroke();
          ctx.setLineDash([]);

          // 碰壁 X 号
          ctx.fillStyle = COLORS.red;
          ctx.font = '700 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('❌', sx + sw * 0.62, invalidCutY + 8);

          // 高亮阻挡块
          const blocker = invalidRects[3];
          ctx.strokeStyle = COLORS.red;
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          roundRect(ctx, blocker.x, blocker.y, blocker.w, blocker.h, 3);
          ctx.stroke();
        }

        if (animPhase >= invalidPhaseDur.length) {
          ctx.fillStyle = COLORS.red;
          ctx.font = '700 15px "Noto Sans SC", Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('❌ 无法一刀切到底！', w / 2, h - 8);
          enableButtons();
        }
      }

      requestAnimationFrame(draw);
    }

    function disableButtons() {
      if (playBtn)    { playBtn.classList.add('btn--playing'); }
      if (compareBtn) { compareBtn.classList.add('btn--playing'); }
    }

    function enableButtons() {
      if (playBtn)    { playBtn.classList.remove('btn--playing'); }
      if (compareBtn) { compareBtn.classList.remove('btn--playing'); }
    }

    // ── 按钮事件 ──
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (mode === 'valid' && animPhase < phaseDurations.length) return;
        mode = 'valid';
        animPhase = 0;
        animT = 0;
        animStart = performance.now();
        disableButtons();
      });
    }

    if (compareBtn) {
      compareBtn.addEventListener('click', () => {
        if (mode === 'invalid' && animPhase < invalidPhaseDur.length) return;
        mode = 'invalid';
        animPhase = 0;
        animT = 0;
        animStart = performance.now();
        disableButtons();
      });
    }

    draw();
  }

  /* ================================================
     初始化入口
     ================================================ */
  function init() {
    setupTabs();
    setupGripper();
    setupGrain();
    setupGuillotine();
  }

  // 暴露到全局
  window.ConstraintsScene = { init };

  // DOM ready 后自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
