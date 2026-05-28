/* ============================================
   Scene 2 — CP-SAT 求解器 & NoOverlap2D
   步骤动画 + 交互面板
   ============================================ */

window.SolverScene = (() => {
  'use strict';

  // ────────────────────────────────────────
  // 常量 & 颜色
  // ────────────────────────────────────────
  const COLORS = [
    { fill: 'rgba(59,130,246,0.55)',  stroke: '#3b82f6',  label: '#93c5fd', name: 'A4'  },
    { fill: 'rgba(16,185,129,0.55)',  stroke: '#10b981',  label: '#6ee7b7', name: 'A5'  },
    { fill: 'rgba(245,158,11,0.55)',  stroke: '#f59e0b',  label: '#fcd34d', name: 'B5'  },
    { fill: 'rgba(139,92,246,0.55)',  stroke: '#8b5cf6',  label: '#c4b5fd', name: 'Custom' },
    { fill: 'rgba(239,68,68,0.50)',   stroke: '#ef4444',  label: '#fca5a5', name: 'E'   },
    { fill: 'rgba(14,165,233,0.50)',  stroke: '#0ea5e9',  label: '#7dd3fc', name: 'F'   },
    { fill: 'rgba(234,179,8,0.50)',   stroke: '#eab308',  label: '#fde047', name: 'G'   },
    { fill: 'rgba(168,85,247,0.50)',  stroke: '#a855f7',  label: '#d8b4fe', name: 'H'   },
  ];

  const SHEET_W = 1194;  // 对开纸宽 (mm)
  const SHEET_H = 889;   // 对开纸高 (mm)

  // 固定 4 个演示矩形
  const DEMO_ITEMS = [
    { w: 210, h: 297, id: 'A4' },
    { w: 148, h: 210, id: 'A5' },
    { w: 260, h: 185, id: 'B5' },
    { w: 176, h: 250, id: 'Custom' },
  ];

  // 步骤说明
  const STEP_DESCRIPTIONS = [
    '将纸张视为二维网格画布 (W × H)，定义求解空间',
    '声明待拼版的矩形列表，各矩形有不同尺寸',
    '为每个矩形创建坐标变量 (x_i, y_i)，值域限于纸张范围',
    '为每个矩形构建 X 轴区间和 Y 轴区间变量',
    '添加 NoOverlap2D 全局约束，求解器自动保证无重叠',
  ];

  // 步骤代码（使用 syn-* 高亮类）
  const STEP_CODES = [
    `<span class="syn-variable">model</span> <span class="syn-operator">=</span> <span class="syn-function">cp_model.CpModel</span>()
<span class="syn-variable">W</span>, <span class="syn-variable">H</span> <span class="syn-operator">=</span> <span class="syn-number">1194</span>, <span class="syn-number">889</span>  <span class="syn-comment"># 对开纸尺寸(mm)</span>`,

    `<span class="syn-variable">items</span> <span class="syn-operator">=</span> [
    (<span class="syn-number">210</span>, <span class="syn-number">297</span>),   <span class="syn-comment"># A4</span>
    (<span class="syn-number">148</span>, <span class="syn-number">210</span>),   <span class="syn-comment"># A5</span>
    (<span class="syn-number">260</span>, <span class="syn-number">185</span>),   <span class="syn-comment"># B5</span>
    (<span class="syn-number">176</span>, <span class="syn-number">250</span>),   <span class="syn-comment"># Custom</span>
]`,

    `<span class="syn-keyword">for</span> <span class="syn-variable">i</span>, (<span class="syn-variable">w_i</span>, <span class="syn-variable">h_i</span>) <span class="syn-keyword">in</span> <span class="syn-function">enumerate</span>(<span class="syn-variable">items</span>):
    <span class="syn-variable">x_i</span> <span class="syn-operator">=</span> <span class="syn-variable">model</span>.<span class="syn-function">NewIntVar</span>(<span class="syn-number">0</span>, <span class="syn-variable">W</span><span class="syn-operator">-</span><span class="syn-variable">w_i</span>, <span class="syn-string">f'x_{i}'</span>)
    <span class="syn-variable">y_i</span> <span class="syn-operator">=</span> <span class="syn-variable">model</span>.<span class="syn-function">NewIntVar</span>(<span class="syn-number">0</span>, <span class="syn-variable">H</span><span class="syn-operator">-</span><span class="syn-variable">h_i</span>, <span class="syn-string">f'y_{i}'</span>)`,

    `<span class="syn-variable">x_interval</span> <span class="syn-operator">=</span> <span class="syn-variable">model</span>.<span class="syn-function">NewIntervalVar</span>(
    <span class="syn-variable">x_i</span>, <span class="syn-variable">w_i</span>, <span class="syn-variable">x_i</span><span class="syn-operator">+</span><span class="syn-variable">w_i</span>, <span class="syn-string">f'xiv_{i}'</span>)
<span class="syn-variable">y_interval</span> <span class="syn-operator">=</span> <span class="syn-variable">model</span>.<span class="syn-function">NewIntervalVar</span>(
    <span class="syn-variable">y_i</span>, <span class="syn-variable">h_i</span>, <span class="syn-variable">y_i</span><span class="syn-operator">+</span><span class="syn-variable">h_i</span>, <span class="syn-string">f'yiv_{i}'</span>)`,

    `<span class="syn-variable">model</span>.<span class="syn-function">AddNoOverlap2D</span>(<span class="syn-variable">x_intervals</span>, <span class="syn-variable">y_intervals</span>)
<span class="syn-variable">solver</span>.<span class="syn-function">Solve</span>(<span class="syn-variable">model</span>)  <span class="syn-comment"># ✓ 求解完成</span>`,
  ];

  // ────────────────────────────────────────
  // 状态
  // ────────────────────────────────────────
  let mainCanvas, mainCtx;          // 主动画 canvas
  let panelCanvas, panelCtx;        // 交互面板 canvas
  let currentStep = 0;
  let animFrame = null;
  let isActive = false;

  // 步骤动画状态
  let stepAnim = {
    progress: 0,       // 0→1 动画进度
    phase: 'idle',     // idle | entering | active
    startTime: 0,
  };

  // 矩形动画位置 (用于插值)
  let rectStates = [];   // [{x, y, w, h, targetX, targetY, opacity, ...}]
  let coordFlicker = []; // 坐标闪烁值
  let intervalPhase = 0; // step3 区间动画阶段
  let overlapFlash = 0;  // step4 重叠红闪
  let scanLineX = 0;     // step4 扫描线
  let solvedFlag = false; // step4 是否已求解
  let checkmarkOpacity = 0;

  // 面板状态
  let panelItems = [];
  let panelPlaced = [];
  let panelUnplaced = [];
  let panelAnimating = false;
  let panelRectStates = []; // 动画用

  // ────────────────────────────────────────
  // 工具函数
  // ────────────────────────────────────────

  /** 将 mm 坐标映射到 canvas 像素 */
  function mmToCanvas(mmX, mmY, canvasW, canvasH, sheetW, sheetH, padding) {
    const drawW = canvasW - padding * 2;
    const drawH = canvasH - padding * 2;
    const scale = Math.min(drawW / sheetW, drawH / sheetH);
    const offX = padding + (drawW - sheetW * scale) / 2;
    const offY = padding + (drawH - sheetH * scale) / 2;
    return {
      x: offX + mmX * scale,
      y: offY + mmY * scale,
      scale,
      offX,
      offY,
    };
  }

  function getSheetRect(canvasW, canvasH, padding) {
    const drawW = canvasW - padding * 2;
    const drawH = canvasH - padding * 2;
    const scale = Math.min(drawW / SHEET_W, drawH / SHEET_H);
    return {
      x: padding + (drawW - SHEET_W * scale) / 2,
      y: padding + (drawH - SHEET_H * scale) / 2,
      w: SHEET_W * scale,
      h: SHEET_H * scale,
      scale,
    };
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

  /** 画圆角矩形 */
  function roundRect(ctx, x, y, w, h, r) {
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

  // ────────────────────────────────────────
  // Part A: 主 Canvas 绘制
  // ────────────────────────────────────────

  function drawGridDots(ctx, sheet) {
    ctx.save();
    roundRect(ctx, sheet.x, sheet.y, sheet.w, sheet.h, 4);
    ctx.clip();

    const spacing = 20;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.8;
    for (let gx = sheet.x + spacing * sheet.scale; gx < sheet.x + sheet.w; gx += spacing * sheet.scale) {
      ctx.beginPath();
      ctx.moveTo(gx, sheet.y);
      ctx.lineTo(gx, sheet.y + sheet.h);
      ctx.stroke();
    }
    for (let gy = sheet.y + spacing * sheet.scale; gy < sheet.y + sheet.h; gy += spacing * sheet.scale) {
      ctx.beginPath();
      ctx.moveTo(sheet.x, gy);
      ctx.lineTo(sheet.x + sheet.w, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSheet(ctx, sheet, showLabel) {
    // 纸张背景
    roundRect(ctx, sheet.x, sheet.y, sheet.w, sheet.h, 4);
    ctx.fillStyle = 'rgba(30,41,59,0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 尺寸标注
    if (showLabel) {
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.font = `500 12px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      // 宽度标注 (底部)
      ctx.fillText(`W = ${SHEET_W}mm`, sheet.x + sheet.w / 2, sheet.y + sheet.h + 18);
      // 高度标注 (右侧)
      ctx.save();
      ctx.translate(sheet.x + sheet.w + 18, sheet.y + sheet.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`H = ${SHEET_H}mm`, 0, 0);
      ctx.restore();
    }
  }

  /** 初始化矩形状态（从画布外飞入的起始位置） */
  function initRectStates() {
    const sheet = getSheetRect(700, 420, 30);
    const packed = window.BinPacker.pack(SHEET_W, SHEET_H, DEMO_ITEMS, false);

    rectStates = DEMO_ITEMS.map((item, i) => {
      const pl = packed.placed.find(p => p.id === item.id);
      // 起始位置：从四个方向飞入
      const offsets = [
        { x: -200, y: 100 },
        { x: 800, y: 50 },
        { x: -150, y: 350 },
        { x: 750, y: 300 },
      ];
      const off = offsets[i % 4];

      // 中间位置（散布/重叠，用于 step4 的 overlap 演示）
      const midPositions = [
        { x: 200, y: 150 },
        { x: 350, y: 200 },
        { x: 280, y: 180 },  // 故意重叠
        { x: 420, y: 250 },
      ];

      return {
        id: item.id,
        origW: item.w,
        origH: item.h,
        // 当前渲染位置（像素）
        cx: off.x,
        cy: off.y,
        cw: item.w * sheet.scale,
        ch: item.h * sheet.scale,
        opacity: 0,
        // 散布目标（用于 step1-3）
        scatterX: sheet.x + midPositions[i].x * sheet.scale,
        scatterY: sheet.y + midPositions[i].y * sheet.scale,
        // 求解后目标
        solvedX: pl ? sheet.x + pl.x * sheet.scale : 0,
        solvedY: pl ? sheet.y + pl.y * sheet.scale : 0,
        colorIdx: i,
      };
    });

    coordFlicker = DEMO_ITEMS.map(() => ({ vx: 0, vy: 0, timer: 0 }));
  }

  /** 主 Canvas 帧绘制 */
  function drawMainCanvas(time) {
    const W = mainCanvas.width;
    const H = mainCanvas.height;
    mainCtx.clearRect(0, 0, W, H);

    const sheet = getSheetRect(W, H, 30);

    // 始终画网格和纸张
    drawGridDots(mainCtx, sheet);
    drawSheet(mainCtx, sheet, true);

    if (currentStep >= 1) {
      drawStep1Rects(mainCtx, sheet, time);
    }
    if (currentStep >= 2) {
      drawStep2Coords(mainCtx, sheet, time);
    }
    if (currentStep >= 3) {
      drawStep3Intervals(mainCtx, sheet, time);
    }
    if (currentStep === 4) {
      drawStep4NoOverlap(mainCtx, sheet, time);
    }
  }

  /** Step 1: 矩形飞入 */
  function drawStep1Rects(ctx, sheet, time) {
    const t = Math.min(1, stepAnim.progress);
    const ease = easeOutBack(Math.min(1, t));

    for (let i = 0; i < rectStates.length; i++) {
      const r = rectStates[i];
      const c = COLORS[r.colorIdx];

      // 在 step <= 3 时，显示散布位置
      let tx, ty;
      if (currentStep < 4 || !solvedFlag) {
        tx = r.scatterX;
        ty = r.scatterY;
      } else {
        tx = r.solvedX;
        ty = r.solvedY;
      }

      if (currentStep === 1) {
        // 从画布外飞入
        const delay = i * 0.15;
        const localT = Math.max(0, Math.min(1, (stepAnim.progress - delay) / 0.7));
        const localEase = easeOutBack(localT);
        r.cx = lerp(r.cx, tx, localEase);
        r.cy = lerp(r.cy, ty, localEase);
        r.opacity = localT;
      } else {
        r.cx = lerp(r.cx, tx, 0.12);
        r.cy = lerp(r.cy, ty, 0.12);
        r.opacity = Math.min(1, r.opacity + 0.05);
      }

      // 绘制矩形
      ctx.globalAlpha = r.opacity;
      roundRect(ctx, r.cx, r.cy, r.cw, r.ch, 3);
      ctx.fillStyle = c.fill;
      ctx.fill();
      ctx.strokeStyle = c.stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 标签
      ctx.fillStyle = c.label;
      ctx.font = `600 11px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${r.origW}×${r.origH}`, r.cx + r.cw / 2, r.cy + r.ch / 2);

      ctx.globalAlpha = 1;
    }
  }

  /** Step 2: 坐标点 + 闪烁值 */
  function drawStep2Coords(ctx, sheet, time) {
    for (let i = 0; i < rectStates.length; i++) {
      const r = rectStates[i];
      const c = COLORS[r.colorIdx];
      const cf = coordFlicker[i];

      // 闪烁效果：前一段随机，然后稳定
      cf.timer += 0.02;
      if (cf.timer < 1.5) {
        cf.vx = Math.floor(Math.random() * (SHEET_W - r.origW));
        cf.vy = Math.floor(Math.random() * (SHEET_H - r.origH));
      } else {
        // 稳定到散布位置的 mm 值
        cf.vx = Math.round((r.scatterX - sheet.x) / sheet.scale);
        cf.vy = Math.round((r.scatterY - sheet.y) / sheet.scale);
      }

      // 坐标点光晕
      const dotX = r.cx;
      const dotY = r.cy + r.ch;
      const glowR = 6 + Math.sin(time * 0.003 + i) * 2;

      ctx.beginPath();
      ctx.arc(dotX, dotY, glowR, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, glowR);
      grad.addColorStop(0, c.stroke);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();

      // 实心点
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = c.stroke;
      ctx.fill();

      // 坐标标签
      const labelAlpha = Math.min(1, stepAnim.progress * 2);
      ctx.globalAlpha = labelAlpha;
      ctx.font = `500 10px 'JetBrains Mono', monospace`;
      ctx.fillStyle = c.label;
      ctx.textAlign = 'left';
      ctx.fillText(`(${cf.vx}, ${cf.vy})`, dotX + 8, dotY + 4);
      ctx.globalAlpha = 1;
    }
  }

  /** Step 3: 区间变量可视化 */
  function drawStep3Intervals(ctx, sheet, time) {
    intervalPhase = Math.min(1, stepAnim.progress);
    const showY = intervalPhase > 0.5;

    for (let i = 0; i < rectStates.length; i++) {
      const r = rectStates[i];
      const c = COLORS[r.colorIdx];

      // X interval (水平边)
      const xAlpha = Math.min(1, intervalPhase * 2);
      ctx.globalAlpha = xAlpha * 0.9;

      // 顶边渐变条
      const xGrad = ctx.createLinearGradient(r.cx, r.cy, r.cx + r.cw, r.cy);
      xGrad.addColorStop(0, c.stroke);
      xGrad.addColorStop(1, 'rgba(59,130,246,0.3)');
      ctx.strokeStyle = xGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r.cx, r.cy - 4);
      ctx.lineTo(r.cx + r.cw, r.cy - 4);
      ctx.stroke();

      // 标签
      ctx.font = `500 9px 'JetBrains Mono', monospace`;
      ctx.fillStyle = c.label;
      ctx.textAlign = 'center';
      ctx.fillText('X_interval', r.cx + r.cw / 2, r.cy - 10);

      // Y interval (垂直边) — 延迟显示
      if (showY) {
        const yAlpha = Math.min(1, (intervalPhase - 0.5) * 2);
        ctx.globalAlpha = yAlpha * 0.9;

        const yGrad = ctx.createLinearGradient(r.cx, r.cy, r.cx, r.cy + r.ch);
        yGrad.addColorStop(0, c.stroke);
        yGrad.addColorStop(1, 'rgba(16,185,129,0.3)');
        ctx.strokeStyle = yGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(r.cx - 4, r.cy);
        ctx.lineTo(r.cx - 4, r.cy + r.ch);
        ctx.stroke();

        ctx.fillStyle = c.label;
        ctx.textAlign = 'right';
        ctx.save();
        ctx.translate(r.cx - 10, r.cy + r.ch / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('Y_interval', 0, 0);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    }
  }

  /** Step 4: NoOverlap2D — 重叠→扫描→分离→完成 */
  function drawStep4NoOverlap(ctx, sheet, time) {
    const p = stepAnim.progress;

    // Phase 1 (0-0.2): 红色重叠闪烁
    if (p < 0.2) {
      overlapFlash = Math.sin(p * 50) * 0.5 + 0.5;
      ctx.globalAlpha = overlapFlash * 0.3;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sheet.x, sheet.y, sheet.w, sheet.h);
      ctx.globalAlpha = 1;
    }

    // Phase 2 (0.2-0.5): 蓝色扫描线
    if (p >= 0.2 && p < 0.5) {
      const scanProgress = (p - 0.2) / 0.3;
      scanLineX = sheet.x + sheet.w * easeOutCubic(scanProgress);

      // 扫描线
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(scanLineX, sheet.y);
      ctx.lineTo(scanLineX, sheet.y + sheet.h);
      ctx.stroke();
      ctx.setLineDash([]);

      // 扫描线光晕
      const scanGrad = ctx.createLinearGradient(scanLineX - 20, 0, scanLineX + 20, 0);
      scanGrad.addColorStop(0, 'transparent');
      scanGrad.addColorStop(0.5, 'rgba(59,130,246,0.15)');
      scanGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(scanLineX - 20, sheet.y, 40, sheet.h);
    }

    // Phase 3 (0.5-0.8): 矩形移到求解位置
    if (p >= 0.5 && !solvedFlag) {
      solvedFlag = true;
      // 更新目标到求解位置（触发 drawStep1Rects 中的插值）
    }

    // Phase 4 (0.8-1.0): 绿色对勾 + 文字
    if (p >= 0.8) {
      checkmarkOpacity = Math.min(1, (p - 0.8) / 0.2);

      // 绿色边框闪烁
      ctx.strokeStyle = `rgba(16,185,129,${checkmarkOpacity * 0.6})`;
      ctx.lineWidth = 2;
      roundRect(ctx, sheet.x - 1, sheet.y - 1, sheet.w + 2, sheet.h + 2, 5);
      ctx.stroke();

      // NoOverlap2D ✓ 文字
      ctx.globalAlpha = checkmarkOpacity;
      ctx.font = `700 16px 'Inter', sans-serif`;
      ctx.fillStyle = '#10b981';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NoOverlap2D ✓', sheet.x + sheet.w / 2, sheet.y - 14);

      // 对勾
      const cx = sheet.x + sheet.w / 2;
      const cy = sheet.y + sheet.h + 28;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16,185,129,0.15)';
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx - 1, cy + 4);
      ctx.lineTo(cx + 6, cy - 4);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.globalAlpha = 1;
    }
  }

  // ────────────────────────────────────────
  // 步骤切换
  // ────────────────────────────────────────

  function goToStep(step) {
    if (step === currentStep) return;
    currentStep = step;

    // 重置动画状态
    stepAnim.progress = 0;
    stepAnim.phase = 'entering';
    stepAnim.startTime = performance.now();
    solvedFlag = false;
    checkmarkOpacity = 0;
    scanLineX = 0;

    // 重置坐标闪烁
    coordFlicker.forEach(cf => cf.timer = 0);

    // 如果回到 step 0/1，重置矩形位置
    if (step <= 0) {
      initRectStates();
    }

    // 更新按钮状态
    const btns = document.querySelectorAll('.solver-step-btn');
    btns.forEach((btn, i) => {
      btn.classList.remove('solver-step-btn--active', 'solver-step-btn--done');
      if (i === step) btn.classList.add('solver-step-btn--active');
      else if (i < step) btn.classList.add('solver-step-btn--done');
    });

    // 更新说明文字
    const descEl = document.getElementById('solver-desc');
    if (descEl) {
      descEl.querySelector('p').textContent = STEP_DESCRIPTIONS[step];
    }

    // 更新代码块
    const codeEl = document.getElementById('solver-code-content');
    const codeWrap = document.getElementById('solver-code');
    if (codeEl && codeWrap) {
      codeWrap.classList.add('is-transitioning');
      codeEl.innerHTML = STEP_CODES[step];
      setTimeout(() => codeWrap.classList.remove('is-transitioning'), 500);
    }
  }

  // ────────────────────────────────────────
  // Part B: 交互面板
  // ────────────────────────────────────────

  /** 生成随机颜色索引不重复 */
  let panelColorCounter = 0;
  function nextColor() {
    return panelColorCounter++ % COLORS.length;
  }

  /** 重置面板的求解状态 */
  function resetPanelState() {
    panelPlaced = [];
    panelUnplaced = []; // 初始清空底部的未放置列表
    
    // 为所有矩形生成顺序罗列的初始布局（在画布内）
    const binW = parseInt(document.getElementById('panel-width')?.value || 800);
    let curX = 10, curY = 10, rowH = 0;
    panelRectStates = panelItems.map(item => {
      if (curX + item.w > binW - 10) {
        curX = 10;
        curY += rowH + 10;
        rowH = 0;
      }
      const state = { ...item, x: curX, y: curY, opacity: 1, colorIdx: item.colorIdx };
      curX += item.w + 10;
      rowH = Math.max(rowH, item.h);
      return state;
    });

    const resultEl = document.getElementById('panel-result');
    if (resultEl) resultEl.style.display = 'none';
  }

  /** 初始化面板物料 */
  function initPanelItems() {
    panelColorCounter = 0;
    panelItems = [
      { w: 200, h: 150, id: 'R1', colorIdx: nextColor() },
      { w: 120, h: 180, id: 'R2', colorIdx: nextColor() },
      { w: 160, h: 100, id: 'R3', colorIdx: nextColor() },
      { w: 100, h: 220, id: 'R4', colorIdx: nextColor() },
    ];
    resetPanelState();
    renderPanelList();
    drawPanelCanvas();
  }

  /** 渲染面板列表 */
  function renderPanelList() {
    const list = document.getElementById('panel-items-list');
    if (!list) return;

    list.innerHTML = panelItems.map((item, i) => {
      const c = COLORS[item.colorIdx];
      return `
        <div class="panel-item" data-idx="${i}" style="border-left-color:${c.stroke}">
          <span class="panel-item-dot" style="background:${c.stroke}"></span>
          <span class="panel-item-size">${item.w} × ${item.h}</span>
          <button class="panel-item-delete" data-idx="${i}">×</button>
        </div>`;
    }).join('');
  }

  /** 添加新矩形 */
  function addPanelItem() {
    if (panelItems.length >= 8) return; // 最多8个
    const w = 80 + Math.floor(Math.random() * 180);
    const h = 80 + Math.floor(Math.random() * 180);
    const id = `R${panelItems.length + 1}`;
    panelItems.push({ w, h, id, colorIdx: nextColor() });
    
    resetPanelState();
    renderPanelList();
    drawPanelCanvas();
  }

  /** 删除矩形 */
  function deletePanelItem(idx) {
    panelItems.splice(idx, 1);
    
    resetPanelState();
    renderPanelList();
    drawPanelCanvas();
  }

  /** 绘制面板 canvas */
  function drawPanelCanvas(animItems) {
    if (!panelCtx) return;
    const W = panelCanvas.width;
    const H = panelCanvas.height;
    panelCtx.clearRect(0, 0, W, H);

    const binW = parseInt(document.getElementById('panel-width')?.value || 800);
    const binH = parseInt(document.getElementById('panel-height')?.value || 600);

    const pad = 15;
    const unplacedReservedH = 40; // 为“未放入”区域预留高度
    const drawW = W - pad * 2;
    const drawH = H - pad * 2 - unplacedReservedH;
    const scale = Math.min(drawW / binW, drawH / binH);
    const offX = pad + (drawW - binW * scale) / 2;
    const offY = pad + (drawH - binH * scale) / 2;

    // 容器背景
    roundRect(panelCtx, offX, offY, binW * scale, binH * scale, 3);
    panelCtx.fillStyle = 'rgba(30,41,59,0.5)';
    panelCtx.fill();

    // 绘制方格线网理
    panelCtx.save();
    roundRect(panelCtx, offX, offY, binW * scale, binH * scale, 3);
    panelCtx.clip();
    panelCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    panelCtx.lineWidth = 0.8;
    const gridStep = 20;
    for (let gx = offX + gridStep; gx < offX + binW * scale; gx += gridStep) {
      panelCtx.beginPath();
      panelCtx.moveTo(gx, offY);
      panelCtx.lineTo(gx, offY + binH * scale);
      panelCtx.stroke();
    }
    for (let gy = offY + gridStep; gy < offY + binH * scale; gy += gridStep) {
      panelCtx.beginPath();
      panelCtx.moveTo(offX, gy);
      panelCtx.lineTo(offX + binW * scale, gy);
      panelCtx.stroke();
    }
    panelCtx.restore();

    panelCtx.strokeStyle = 'rgba(148,163,184,0.3)';
    panelCtx.lineWidth = 1;
    panelCtx.stroke();

    // 尺寸标注
    panelCtx.fillStyle = 'rgba(148,163,184,0.5)';
    panelCtx.font = `500 10px 'JetBrains Mono', monospace`;
    panelCtx.textAlign = 'center';
    panelCtx.fillText(`${binW}×${binH}`, offX + binW * scale / 2, offY + binH * scale + 14);

    // 绘制矩形
    const items = animItems || panelRectStates;
    if (items.length > 0) {
      for (const r of items) {
        const rx = offX + r.x * scale;
        const ry = offY + r.y * scale;
        const rw = r.w * scale;
        const rh = r.h * scale;
        const c = COLORS[r.colorIdx % COLORS.length];

        panelCtx.globalAlpha = r.opacity !== undefined ? r.opacity : 1;
        roundRect(panelCtx, rx, ry, rw, rh, 2);
        panelCtx.fillStyle = c.fill;
        panelCtx.fill();
        panelCtx.strokeStyle = c.stroke;
        panelCtx.lineWidth = 1;
        panelCtx.stroke();

        // 标签
        if (rw > 30 && rh > 20) {
          panelCtx.fillStyle = c.label;
          panelCtx.font = `600 9px 'JetBrains Mono', monospace`;
          panelCtx.textAlign = 'center';
          panelCtx.textBaseline = 'middle';
          panelCtx.fillText(`${r.w}×${r.h}`, rx + rw / 2, ry + rh / 2);
        }
        panelCtx.globalAlpha = 1;
      }
    }

    // 未放置的矩形（灰色，在底部显示）
    if (panelUnplaced.length > 0) {
      let upX = offX + 4;
      const upY = offY + binH * scale + 22;
      panelCtx.font = `500 9px 'Inter', sans-serif`;
      panelCtx.fillStyle = 'rgba(148,163,184,0.5)';
      panelCtx.textAlign = 'left';
      panelCtx.fillText('未放入:', upX, upY);
      upX += 45;

      for (const u of panelUnplaced) {
        const uw = Math.min(u.w * scale * 0.4, 30);
        const uh = Math.min(u.h * scale * 0.4, 20);
        roundRect(panelCtx, upX, upY - uh + 2, uw, uh, 1);
        panelCtx.fillStyle = 'rgba(100,116,139,0.3)';
        panelCtx.fill();
        panelCtx.strokeStyle = 'rgba(100,116,139,0.5)';
        panelCtx.lineWidth = 0.5;
        panelCtx.stroke();
        upX += uw + 6;
      }
    }
  }

  /** 求解面板 */
  function solvePanel() {
    if (panelAnimating) return;

    const binW = parseInt(document.getElementById('panel-width')?.value || 800);
    const binH = parseInt(document.getElementById('panel-height')?.value || 600);

    const startTime = performance.now();
    const result = window.BinPacker.pack(binW, binH, panelItems, true);
    const solveTime = performance.now() - startTime;

    panelPlaced = result.placed.map(p => {
      const origItem = panelItems.find(it => it.id === p.id);
      return { ...p, colorIdx: origItem ? origItem.colorIdx : 0 };
    });
    panelUnplaced = result.unplaced;

    // 保存初始罗列位置作为动画起点
    const startStates = [...panelRectStates];
    panelAnimating = true;

    let animStart = null;
    function animateSolve(timestamp) {
      if (!animStart) animStart = timestamp;
      const elapsed = timestamp - animStart;
      const duration = 800;
      const t = Math.min(1, elapsed / duration);
      const ease = easeOutCubic(t);

      const frames = panelItems.map((item, i) => {
        const start = startStates.find(s => s.id === item.id) || { x: 0, y: 0, opacity: 1 };
        const target = panelPlaced.find(p => p.id === item.id);
        
        const delay = i * 0.05;
        const localT = Math.max(0, Math.min(1, (t - delay) / (1 - delay * panelItems.length * 0.1)));
        const localEase = easeOutCubic(Math.max(0, localT));

        if (target) {
          // 被放置的矩形：飞向求解位置
          return {
            ...item,
            colorIdx: item.colorIdx,
            x: lerp(start.x, target.x, localEase),
            y: lerp(start.y, target.y, localEase),
            opacity: 1,
          };
        } else {
          // 未被放置的矩形：停留在原地并淡出（稍后显示在底部未放置区）
          return {
            ...item,
            colorIdx: item.colorIdx,
            x: start.x,
            y: start.y,
            opacity: 1 - localT,
          };
        }
      });

      drawPanelCanvas(frames);

      if (t < 1) {
        requestAnimationFrame(animateSolve);
      } else {
        panelAnimating = false;
        panelRectStates = panelPlaced.map(p => ({ ...p, opacity: 1 }));
        drawPanelCanvas();
      }
    }
    requestAnimationFrame(animateSolve);

    // 显示结果
    const resultEl = document.getElementById('panel-result');
    if (resultEl) {
      resultEl.style.display = 'block';
      const rateEl = document.getElementById('panel-result-rate');
      const timeEl = document.getElementById('panel-result-time');
      const placedEl = document.getElementById('panel-result-placed');
      if (rateEl) {
        const pct = (result.utilization * 100).toFixed(1);
        rateEl.textContent = pct + '%';
        rateEl.className = 'result-value ' + (result.utilization > 0.75 ? 'result-value--high' : 'result-value--low');
      }
      if (timeEl) timeEl.textContent = solveTime.toFixed(1) + 'ms';
      if (placedEl) placedEl.textContent = `${result.placed.length} / ${panelItems.length}`;
    }
  }

  // ────────────────────────────────────────
  // 主动画循环
  // ────────────────────────────────────────

  function mainLoop(time) {
    if (!isActive) return;

    // 更新步骤动画进度
    if (stepAnim.phase === 'entering') {
      const elapsed = time - stepAnim.startTime;
      const duration = currentStep === 4 ? 3000 : 1500;
      stepAnim.progress = Math.min(1, elapsed / duration);
      if (stepAnim.progress >= 1) {
        stepAnim.phase = 'active';
      }
    }

    drawMainCanvas(time);
    animFrame = requestAnimationFrame(mainLoop);
  }

  // ────────────────────────────────────────
  // 事件绑定
  // ────────────────────────────────────────

  function bindEvents() {
    // 步骤按钮 (事件委托)
    const stepNav = document.querySelector('.solver-step-nav');
    if (stepNav) {
      stepNav.addEventListener('click', (e) => {
        const btn = e.target.closest('.solver-step-btn');
        if (!btn) return;
        const step = parseInt(btn.dataset.step);
        if (!isNaN(step)) goToStep(step);
      });
    }

    // 面板物料列表（事件委托 — 删除按钮）
    const itemsList = document.getElementById('panel-items-list');
    if (itemsList) {
      itemsList.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.panel-item-delete');
        if (!delBtn) return;
        const idx = parseInt(delBtn.dataset.idx);
        if (!isNaN(idx)) deletePanelItem(idx);
      });
    }

    // 添加矩形
    const addBtn = document.getElementById('panel-add-item');
    if (addBtn) {
      addBtn.addEventListener('click', addPanelItem);
    }

    // 求解按钮
    const solveBtn = document.getElementById('panel-solve');
    if (solveBtn) {
      solveBtn.addEventListener('click', solvePanel);
    }

    // 画布尺寸变更
    const widthInput = document.getElementById('panel-width');
    const heightInput = document.getElementById('panel-height');
    if (widthInput) {
      widthInput.addEventListener('change', () => {
        drawPanelCanvas();
        const resultEl = document.getElementById('panel-result');
        if (resultEl) resultEl.style.display = 'none';
      });
    }
    if (heightInput) {
      heightInput.addEventListener('change', () => {
        drawPanelCanvas();
        const resultEl = document.getElementById('panel-result');
        if (resultEl) resultEl.style.display = 'none';
      });
    }
  }

  // ────────────────────────────────────────
  // 公共 API
  // ────────────────────────────────────────

  function init() {
    mainCanvas = document.getElementById('solver-canvas');
    panelCanvas = document.getElementById('solver-panel-canvas');

    if (!mainCanvas || !panelCanvas) return;

    mainCtx = mainCanvas.getContext('2d');
    panelCtx = panelCanvas.getContext('2d');

    initRectStates();
    initPanelItems();
    bindEvents();

    // 初始绘制
    goToStep(0);
    
    // 启动动画循环
    onEnter();
  }

  function onEnter() {
    isActive = true;
    stepAnim.startTime = performance.now();
    stepAnim.phase = 'entering';
    animFrame = requestAnimationFrame(mainLoop);
  }

  function onLeave() {
    isActive = false;
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  return { init, onEnter, onLeave };
})();
