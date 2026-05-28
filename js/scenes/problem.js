/* ============================================
   Scene 1: 问题引出 — 手工拼版拖拽模拟器
   ============================================ */

;(function () {
  'use strict';

  /* ── 数据定义 ── */
  const BOOKS = [
    { name: '语文课本', size: 'A5',  w: 148, h: 210, color: 0 },
    { name: '数学练习册', size: 'B5', w: 176, h: 250, color: 1 },
    { name: '作文本',   size: 'A4',  w: 210, h: 297, color: 2 },
    { name: '英语课本', size: 'A5',  w: 148, h: 210, color: 3 },
    { name: '物理教材', size: '16K', w: 185, h: 260, color: 4 },
    { name: '美术画册', size: 'A4',  w: 210, h: 297, color: 5 },
    { name: '历史课本', size: 'A5',  w: 148, h: 210, color: 6 },
    { name: '音乐课本', size: '32K', w: 130, h: 185, color: 7 },
  ];

  // 对开纸真实尺寸（mm）
  const SHEET_REAL_W = 1194;
  const SHEET_REAL_H = 889;

  // Canvas 物理尺寸
  const CANVAS_W = 680;
  const CANVAS_H = 500;

  // 版面在 Canvas 中的绘制区域（留边距居中）
  const SHEET_MARGIN_X = 55;
  const SHEET_MARGIN_Y = 60;
  const SHEET_DRAW_W = 570;
  const SHEET_DRAW_H = 380;

  // 缩放因子：真实 mm → 画布 px
  const SCALE = Math.min(SHEET_DRAW_W / SHEET_REAL_W, SHEET_DRAW_H / SHEET_REAL_H);

  // 实际绘制后版面像素尺寸（按等比缩放）
  const SHEET_PX_W = Math.round(SHEET_REAL_W * SCALE);
  const SHEET_PX_H = Math.round(SHEET_REAL_H * SCALE);

  // 版面左上角在 canvas 中的位置（居中）
  const SHEET_X = Math.round((CANVAS_W - SHEET_PX_W) / 2);
  const SHEET_Y = Math.round((CANVAS_H - SHEET_PX_H) / 2);

  // 颜色方案（与 Utils.RECT_COLORS 兼容）
  const COLORS = [
    { fill: 'rgba(59,130,246,0.35)',  stroke: '#3b82f6',  label: '#93c5fd' },  // blue
    { fill: 'rgba(16,185,129,0.35)',  stroke: '#10b981',  label: '#6ee7b7' },  // green
    { fill: 'rgba(245,158,11,0.35)',  stroke: '#f59e0b',  label: '#fcd34d' },  // amber
    { fill: 'rgba(139,92,246,0.35)',  stroke: '#8b5cf6',  label: '#c4b5fd' },  // purple
    { fill: 'rgba(236,72,153,0.35)',  stroke: '#ec4899',  label: '#f9a8d4' },  // pink
    { fill: 'rgba(20,184,166,0.35)',  stroke: '#14b8a6',  label: '#5eead4' },  // teal
    { fill: 'rgba(249,115,22,0.35)',  stroke: '#f97316',  label: '#fdba74' },  // orange
    { fill: 'rgba(99,102,241,0.35)',  stroke: '#6366f1',  label: '#a5b4fc' },  // indigo
  ];

  /* ── 状态 ── */
  let canvas, ctx;
  let placedItems = [];    // { bookIdx, x, y, pw, ph }  — x/y 是相对于版面左上角的 canvas px
  let dragState = null;    // { bookIdx, offsetX, offsetY, fromTray: bool, placedIdx?: number }
  let collisionPairs = []; // 碰撞对
  let ghostEl = null;      // 拖拽跟随 DOM

  /* ── 初始化 ── */
  function init() {
    canvas = document.getElementById('problem-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // 高 DPI 适配
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = CANVAS_W + 'px';
    canvas.style.height = CANVAS_H + 'px';
    ctx.scale(dpr, dpr);

    buildTray();
    bindEvents();
    render();
  }

  /* ── 构建 HTML 托盘 ── */
  function buildTray() {
    const tray = document.getElementById('problem-tray');
    if (!tray) return;
    tray.innerHTML = '';

    BOOKS.forEach((book, i) => {
      const el = document.createElement('div');
      el.className = 'tray-item';
      el.dataset.index = i;
      el.style.setProperty('--tray-item-color', COLORS[book.color].stroke);

      // 让宽高大致成比例（缩放到装饰性尺寸）
      const ratio = book.w / book.h;
      const displayH = 48;
      const displayW = Math.round(displayH * ratio);

      el.innerHTML = `
        <div class="tray-item-preview" style="
          width:${displayW}px; height:${displayH}px;
          background:${COLORS[book.color].fill};
          border:1px solid ${COLORS[book.color].stroke};
          border-radius:3px; margin-bottom:3px;
        "></div>
        <span class="tray-item-name">${book.name}</span>
        <span class="tray-item-size">${book.size} ${book.w}×${book.h}</span>
      `;
      tray.appendChild(el);
    });
  }

  /* ── 事件绑定 ── */
  function bindEvents() {
    const tray = document.getElementById('problem-tray');
    const wrap = document.getElementById('problem-canvas-wrap');

    // ─ 从托盘开始拖拽（鼠标 + 触摸）─
    if (tray) {
      tray.addEventListener('mousedown', onTrayDown);
      tray.addEventListener('touchstart', onTrayDown, { passive: false });
    }

    // ─ 从 canvas 上的已放置方块拖拽 ─
    canvas.addEventListener('mousedown', onCanvasDown);
    canvas.addEventListener('touchstart', onCanvasDown, { passive: false });

    // ─ 全局移动 & 释放 ─
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);

    // ─ 双击已放置方块删除（返回托盘） ─
    canvas.addEventListener('dblclick', onCanvasDblClick);
  }

  /* ── 从托盘抓起 ── */
  function onTrayDown(e) {
    const item = e.target.closest('.tray-item');
    if (!item || item.classList.contains('placed')) return;
    e.preventDefault();

    const idx = parseInt(item.dataset.index, 10);
    const book = BOOKS[idx];
    const pw = Math.round(book.w * SCALE);
    const ph = Math.round(book.h * SCALE);

    const pt = getPointerPos(e);

    dragState = {
      bookIdx: idx,
      offsetX: pw / 2,
      offsetY: ph / 2,
      fromTray: true,
      pw, ph,
    };

    createGhost(idx, pw, ph);
    moveGhost(pt.clientX, pt.clientY);
  }

  /* ── 从 canvas 抓起已放置方块 ── */
  function onCanvasDown(e) {
    if (dragState) return; // 正在托盘拖拽中
    e.preventDefault();

    const pt = getPointerPos(e);
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const cx = (pt.clientX - rect.left) * scaleX;
    const cy = (pt.clientY - rect.top) * scaleY;

    // 寻找点击到的方块（后放置的优先）
    for (let i = placedItems.length - 1; i >= 0; i--) {
      const p = placedItems[i];
      const ax = SHEET_X + p.x;
      const ay = SHEET_Y + p.y;
      if (cx >= ax && cx <= ax + p.pw && cy >= ay && cy <= ay + p.ph) {
        dragState = {
          bookIdx: p.bookIdx,
          offsetX: cx - ax,
          offsetY: cy - ay,
          fromTray: false,
          placedIdx: i,
          pw: p.pw,
          ph: p.ph,
        };
        createGhost(p.bookIdx, p.pw, p.ph);
        moveGhost(pt.clientX, pt.clientY);
        // 暂时从 placed 列表移除
        placedItems.splice(i, 1);
        render();
        return;
      }
    }
  }

  /* ── 移动拖拽 ── */
  function onMove(e) {
    if (!dragState) return;
    e.preventDefault();
    const pt = getPointerPos(e);
    moveGhost(pt.clientX, pt.clientY);
  }

  /* ── 释放：放置到版面 ── */
  function onUp(e) {
    if (!dragState) return;

    const pt = getPointerPos(e);
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const cx = (pt.clientX - rect.left) * scaleX;
    const cy = (pt.clientY - rect.top) * scaleY;

    // 判断释放位置是否在版面区域（允许部分超出）
    const dropX = cx - dragState.offsetX - SHEET_X;
    const dropY = cy - dragState.offsetY - SHEET_Y;

    // 只要中心在 canvas 范围内即允许放置
    const centerX = cx - dragState.offsetX + dragState.pw / 2;
    const centerY = cy - dragState.offsetY + dragState.ph / 2;
    const inCanvas = centerX > 0 && centerX < CANVAS_W && centerY > 0 && centerY < CANVAS_H;

    if (inCanvas) {
      // 吸附到版面坐标（限制不让完全跑出版面）
      const placeX = Math.max(-dragState.pw + 10, Math.min(dropX, SHEET_PX_W - 10));
      const placeY = Math.max(-dragState.ph + 10, Math.min(dropY, SHEET_PX_H - 10));

      placedItems.push({
        bookIdx: dragState.bookIdx,
        x: placeX,
        y: placeY,
        pw: dragState.pw,
        ph: dragState.ph,
      });

      // 标记托盘已放置
      if (dragState.fromTray) {
        markTrayPlaced(dragState.bookIdx, true);
      }
    } else if (!dragState.fromTray) {
      // 如果是从 canvas 拖到外面 → 相当于删除，返回托盘
      markTrayPlaced(dragState.bookIdx, false);
    }

    destroyGhost();
    dragState = null;
    checkCollisions();
    render();
    updateWaste();
  }

  /* ── 双击删除 ── */
  function onCanvasDblClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    for (let i = placedItems.length - 1; i >= 0; i--) {
      const p = placedItems[i];
      const ax = SHEET_X + p.x;
      const ay = SHEET_Y + p.y;
      if (cx >= ax && cx <= ax + p.pw && cy >= ay && cy <= ay + p.ph) {
        placedItems.splice(i, 1);
        markTrayPlaced(p.bookIdx, false);
        checkCollisions();
        render();
        updateWaste();
        return;
      }
    }
  }

  /* ── 辅助：指针坐标统一（鼠标 / 触摸） ── */
  function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  }

  /* ── 拖拽幽灵 ── */
  function createGhost(bookIdx, pw, ph) {
    destroyGhost();
    const book = BOOKS[bookIdx];
    const c = COLORS[book.color];
    ghostEl = document.createElement('div');
    ghostEl.className = 'drag-ghost';
    ghostEl.style.width = pw + 'px';
    ghostEl.style.height = ph + 'px';
    ghostEl.style.background = c.fill;
    ghostEl.style.borderColor = c.stroke;
    ghostEl.textContent = book.name;
    document.body.appendChild(ghostEl);
  }

  function moveGhost(cx, cy) {
    if (!ghostEl || !dragState) return;
    ghostEl.style.left = (cx - dragState.offsetX) + 'px';
    ghostEl.style.top = (cy - dragState.offsetY) + 'px';
  }

  function destroyGhost() {
    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }
  }

  /* ── 托盘状态 ── */
  function markTrayPlaced(bookIdx, placed) {
    const tray = document.getElementById('problem-tray');
    if (!tray) return;
    const items = tray.querySelectorAll('.tray-item');
    items.forEach(el => {
      if (parseInt(el.dataset.index, 10) === bookIdx) {
        el.classList.toggle('placed', placed);
      }
    });
  }

  /* ── 碰撞检测 ── */
  function checkCollisions() {
    collisionPairs = [];
    for (let i = 0; i < placedItems.length; i++) {
      for (let j = i + 1; j < placedItems.length; j++) {
        const a = placedItems[i];
        const b = placedItems[j];
        if (rectsOverlap(a.x, a.y, a.pw, a.ph, b.x, b.y, b.pw, b.ph)) {
          collisionPairs.push([i, j]);
        }
      }
    }

    // 有碰撞时触发震动
    const wrap = document.getElementById('problem-canvas-wrap');
    if (collisionPairs.length > 0 && wrap) {
      wrap.classList.remove('shake');
      // 触发 reflow 强制重新播放
      void wrap.offsetWidth;
      wrap.classList.add('shake');
      setTimeout(() => wrap.classList.remove('shake'), 500);
    }
  }

  function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
  }

  /* ── 计算重叠区域 ── */
  function getOverlapRect(a, b) {
    const ox = Math.max(a.x, b.x);
    const oy = Math.max(a.y, b.y);
    const ox2 = Math.min(a.x + a.pw, b.x + b.pw);
    const oy2 = Math.min(a.y + a.ph, b.y + b.ph);
    if (ox2 > ox && oy2 > oy) {
      return { x: ox, y: oy, w: ox2 - ox, h: oy2 - oy };
    }
    return null;
  }

  /* ── 浪费率 ── */
  function updateWaste() {
    const totalArea = SHEET_REAL_W * SHEET_REAL_H;
    let usedArea = 0;
    placedItems.forEach(p => {
      const book = BOOKS[p.bookIdx];
      // 只计算在版面内的有效面积
      const clampX = Math.max(0, p.x);
      const clampY = Math.max(0, p.y);
      const clampR = Math.min(SHEET_PX_W, p.x + p.pw);
      const clampB = Math.min(SHEET_PX_H, p.y + p.ph);
      if (clampR > clampX && clampB > clampY) {
        // 把 canvas px 转回 mm
        const wMM = (clampR - clampX) / SCALE;
        const hMM = (clampB - clampY) / SCALE;
        usedArea += wMM * hMM;
      }
    });

    const wastePercent = Math.max(0, Math.round(((totalArea - usedArea) / totalArea) * 100));
    const el = document.getElementById('problem-waste-value');
    if (el) {
      el.textContent = wastePercent + '%';
      el.classList.remove('waste-high', 'waste-mid', 'waste-low');
      if (wastePercent > 50) {
        el.classList.add('waste-high');
      } else if (wastePercent > 20) {
        el.classList.add('waste-mid');
      } else {
        el.classList.add('waste-low');
      }
    }
  }

  /* ══════════════════════════════════════════════
     渲 染
     ══════════════════════════════════════════════ */
  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    drawSheet();
    drawPlacedItems();
    drawCollisions();
  }

  /* ── 绘制版面 ── */
  function drawSheet() {
    // 版面底色
    ctx.fillStyle = '#0d1117';
    roundRect(ctx, SHEET_X, SHEET_Y, SHEET_PX_W, SHEET_PX_H, 4);
    ctx.fill();

    // 网格线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.8;
    const gridStep = 40;
    for (let gx = SHEET_X + gridStep; gx < SHEET_X + SHEET_PX_W; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, SHEET_Y);
      ctx.lineTo(gx, SHEET_Y + SHEET_PX_H);
      ctx.stroke();
    }
    for (let gy = SHEET_Y + gridStep; gy < SHEET_Y + SHEET_PX_H; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(SHEET_X, gy);
      ctx.lineTo(SHEET_X + SHEET_PX_W, gy);
      ctx.stroke();
    }

    // 版面边框
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, SHEET_X, SHEET_Y, SHEET_PX_W, SHEET_PX_H, 4);
    ctx.stroke();

    // 标签
    ctx.font = '12px "Inter", "Noto Sans SC", sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('对开纸 1194×889mm', SHEET_X + 8, SHEET_Y - 6);

    // 尺寸标注：宽度
    ctx.fillStyle = 'rgba(148,163,184,0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('1194mm', SHEET_X + SHEET_PX_W / 2, SHEET_Y + SHEET_PX_H + 8);

    // 尺寸标注：高度
    ctx.save();
    ctx.translate(SHEET_X - 12, SHEET_Y + SHEET_PX_H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('889mm', 0, 0);
    ctx.restore();
  }

  /* ── 绘制已放置方块 ── */
  function drawPlacedItems() {
    placedItems.forEach((p, i) => {
      const book = BOOKS[p.bookIdx];
      const c = COLORS[book.color];
      const ax = SHEET_X + p.x;
      const ay = SHEET_Y + p.y;

      // 检测是否超出版面
      const oob = (p.x < 0 || p.y < 0 ||
                   p.x + p.pw > SHEET_PX_W ||
                   p.y + p.ph > SHEET_PX_H);

      ctx.save();

      // 填充
      ctx.fillStyle = c.fill;
      ctx.fillRect(ax, ay, p.pw, p.ph);

      // 边框
      if (oob) {
        // 超出部分用红色虚线
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = 'rgba(239,68,68,0.8)';
        ctx.lineWidth = 2;
      } else {
        ctx.setLineDash([]);
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = 1.5;
      }
      ctx.strokeRect(ax, ay, p.pw, p.ph);
      ctx.setLineDash([]);

      // 超出部分半透明红色覆盖
      if (oob) {
        drawOOBOverlay(p);
      }

      // 文字标签
      ctx.fillStyle = c.label;
      ctx.font = 'bold 11px "Inter", "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const labelX = ax + p.pw / 2;
      const labelY = ay + p.ph / 2;
      // 只在方块足够大时显示标签
      if (p.pw > 30 && p.ph > 20) {
        ctx.fillText(book.name, labelX, labelY - 7);
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(148,163,184,0.6)';
        ctx.fillText(`${book.w}×${book.h}`, labelX, labelY + 8);
      }

      ctx.restore();
    });
  }

  /* ── 超出版面覆盖 ── */
  function drawOOBOverlay(p) {
    const ax = SHEET_X + p.x;
    const ay = SHEET_Y + p.y;

    // 裁剪出超出版面的部分
    ctx.save();

    // 用红色半透明覆盖超出的区域
    // 上方超出
    if (p.y < 0) {
      ctx.fillStyle = 'rgba(239,68,68,0.15)';
      ctx.fillRect(ax, ay, p.pw, Math.min(-p.y, p.ph));
    }
    // 左侧超出
    if (p.x < 0) {
      ctx.fillStyle = 'rgba(239,68,68,0.15)';
      ctx.fillRect(ax, ay, Math.min(-p.x, p.pw), p.ph);
    }
    // 下方超出
    if (p.y + p.ph > SHEET_PX_H) {
      const overH = p.y + p.ph - SHEET_PX_H;
      ctx.fillStyle = 'rgba(239,68,68,0.15)';
      ctx.fillRect(ax, SHEET_Y + SHEET_PX_H, p.pw, overH);
    }
    // 右侧超出
    if (p.x + p.pw > SHEET_PX_W) {
      const overW = p.x + p.pw - SHEET_PX_W;
      ctx.fillStyle = 'rgba(239,68,68,0.15)';
      ctx.fillRect(SHEET_X + SHEET_PX_W, ay, overW, p.ph);
    }

    ctx.restore();
  }

  /* ── 绘制碰撞区域 ── */
  function drawCollisions() {
    const time = Date.now();
    if (collisionPairs.length === 0) return;

    // 闪烁效果
    const alpha = 0.2 + 0.15 * Math.sin(time / 150);

    collisionPairs.forEach(([i, j]) => {
      const a = placedItems[i];
      const b = placedItems[j];
      if (!a || !b) return;

      const overlap = getOverlapRect(a, b);
      if (!overlap) return;

      ctx.fillStyle = `rgba(239,68,68,${alpha})`;
      ctx.fillRect(
        SHEET_X + overlap.x,
        SHEET_Y + overlap.y,
        overlap.w,
        overlap.h
      );

      // 红色叉号
      ctx.strokeStyle = `rgba(239,68,68,${alpha + 0.3})`;
      ctx.lineWidth = 2;
      const cx = SHEET_X + overlap.x;
      const cy = SHEET_Y + overlap.y;
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy + 2);
      ctx.lineTo(cx + overlap.w - 2, cy + overlap.h - 2);
      ctx.moveTo(cx + overlap.w - 2, cy + 2);
      ctx.lineTo(cx + 2, cy + overlap.h - 2);
      ctx.stroke();
    });

    // 如果有碰撞，持续重绘闪烁
    if (collisionPairs.length > 0) {
      requestAnimationFrame(() => render());
    }
  }

  /* ── 圆角矩形辅助 ── */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ── 导出 ── */
  window.ProblemScene = { init };
})();
