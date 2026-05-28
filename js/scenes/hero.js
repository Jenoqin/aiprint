/* ============================================
   Scene 0: Hero Canvas Animation
   ============================================ */

;(function () {
  'use strict';

  var U = null; // will be set to window.Utils on init

  // ── 常量 ──
  var CANVAS_W = 600;
  var CANVAS_H = 450;
  var SHEET_PADDING = 0.10; // 10% padding each side → sheet = 80%
  var CYCLE_DURATION = 8000; // ms per full loop
  var PHASE_1_END = 1500;    // 散布阶段结束
  var PHASE_2_END = 3000;    // 重叠阶段结束
  var PHASE_3_END = 5000;    // 排列阶段结束
  var RECT_RADIUS = 4;

  // 书页预设尺寸 (canvas 像素)
  var BOOK_SIZES = [
    { w: 70,  h: 100, label: 'A4' },
    { w: 60,  h: 85,  label: 'A5' },
    { w: 55,  h: 78,  label: 'B5' },
    { w: 50,  h: 70,  label: 'A5' },
    { w: 80,  h: 60,  label: '16K' },
    { w: 65,  h: 45,  label: '32K' },
    { w: 45,  h: 65,  label: 'B5' },
    { w: 75,  h: 55,  label: 'A4' },
    { w: 40,  h: 58,  label: '32K' },
    { w: 68,  h: 48,  label: '16K' },
  ];

  // ── 状态 ──
  var canvas, ctx;
  var rects = [];
  var animId = null;
  var cycleStart = 0;
  var sheetArea;  // { x, y, w, h } 版面区域
  var scanLineX = 0;
  var statsUpdated = false;

  // ── 初始化 ──
  function init() {
    U = window.Utils;
    canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // 计算版面区域（居中，80% 大小）
    sheetArea = {
      x: CANVAS_W * SHEET_PADDING,
      y: CANVAS_H * SHEET_PADDING,
      w: CANVAS_W * (1 - 2 * SHEET_PADDING),
      h: CANVAS_H * (1 - 2 * SHEET_PADDING),
    };

    generateRects();
    cycleStart = performance.now();
    statsUpdated = false;
    loop();

    // CTA 按钮 → 滚动到 scene-1
    var cta = document.getElementById('hero-cta');
    if (cta) {
      cta.addEventListener('click', function () {
        var target = document.getElementById('scene-1');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  // ── 生成矩形 ──
  function generateRects() {
    rects = [];
    var count = Math.floor(U.randomRange(15, 19)); // 15-18

    for (var i = 0; i < count; i++) {
      var preset = BOOK_SIZES[i % BOOK_SIZES.length];
      var scale = U.randomRange(0.85, 1.15);
      var w = Math.round(preset.w * scale);
      var h = Math.round(preset.h * scale);
      var color = U.RECT_COLORS[i % U.RECT_COLORS.length];

      rects.push({
        // 当前绘制位置（会被动画驱动）
        x: 0, y: 0, w: w, h: h,
        // 散布位置（Phase 1）
        scatterX: 0, scatterY: 0,
        // 重叠位置（Phase 2）— 挤在版面内随机重叠
        overlapX: 0, overlapY: 0,
        // 最终排列位置（Phase 3）
        packedX: 0, packedY: 0,
        // 视觉属性
        color: color,
        label: preset.label,
        alpha: 1,
        rotation: 0,
      });
    }

    // 计算散布位置 — 分散在 canvas 周围
    rects.forEach(function (r) {
      var side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0: // 上方
          r.scatterX = U.randomRange(-80, CANVAS_W);
          r.scatterY = U.randomRange(-150, -40);
          break;
        case 1: // 下方
          r.scatterX = U.randomRange(-80, CANVAS_W);
          r.scatterY = U.randomRange(CANVAS_H + 20, CANVAS_H + 130);
          break;
        case 2: // 左方
          r.scatterX = U.randomRange(-160, -40);
          r.scatterY = U.randomRange(-80, CANVAS_H);
          break;
        case 3: // 右方
          r.scatterX = U.randomRange(CANVAS_W + 20, CANVAS_W + 140);
          r.scatterY = U.randomRange(-80, CANVAS_H);
          break;
      }
    });

    // 计算重叠位置 — 随机挤在版面中心附近
    rects.forEach(function (r) {
      r.overlapX = sheetArea.x + U.randomRange(20, sheetArea.w - r.w - 20);
      r.overlapY = sheetArea.y + U.randomRange(20, sheetArea.h - r.h - 20);
    });

    // 计算排列位置 — 简单 shelf 算法
    computeShelfLayout();
  }

  // ── Shelf 排列算法 ──
  function computeShelfLayout() {
    // 按高度降序排列（副本索引排序）
    var indices = [];
    for (var i = 0; i < rects.length; i++) indices.push(i);
    indices.sort(function (a, b) { return rects[b].h - rects[a].h; });

    var shelfY = sheetArea.y + 6;
    var shelfH = 0;
    var cursorX = sheetArea.x + 6;
    var gap = 4;

    for (var k = 0; k < indices.length; k++) {
      var r = rects[indices[k]];
      // 如果当前行放不下，换行
      if (cursorX + r.w > sheetArea.x + sheetArea.w - 6) {
        cursorX = sheetArea.x + 6;
        shelfY += shelfH + gap;
        shelfH = 0;
      }
      r.packedX = cursorX;
      r.packedY = shelfY;
      cursorX += r.w + gap;
      shelfH = Math.max(shelfH, r.h);
    }
  }

  // ── 主循环 ──
  function loop() {
    animId = requestAnimationFrame(loop);
    var now = performance.now();
    var elapsed = now - cycleStart;

    // 循环重置
    if (elapsed > CYCLE_DURATION) {
      cycleStart = now;
      elapsed = 0;
      statsUpdated = false;
      generateRects(); // 重新随机一轮
    }

    update(elapsed);
    draw(elapsed);
  }

  // ── 更新矩形位置 ──
  function update(elapsed) {
    rects.forEach(function (r) {
      if (elapsed < PHASE_1_END) {
        // Phase 1: 从散布位置停留
        r.x = r.scatterX;
        r.y = r.scatterY;
        r.alpha = U.clamp(elapsed / 500, 0, 1);
      } else if (elapsed < PHASE_2_END) {
        // Phase 2: 飞向重叠位置
        var t = U.clamp((elapsed - PHASE_1_END) / (PHASE_2_END - PHASE_1_END), 0, 1);
        var e = U.easeOutBack(t);
        r.x = U.lerp(r.scatterX, r.overlapX, e);
        r.y = U.lerp(r.scatterY, r.overlapY, e);
        r.alpha = 1;
      } else if (elapsed < PHASE_3_END) {
        // Phase 3: 扫描线 + 重排到 packed 位置
        var t3 = U.clamp((elapsed - PHASE_2_END) / (PHASE_3_END - PHASE_2_END), 0, 1);
        scanLineX = sheetArea.x + sheetArea.w * t3;
        // 每个矩形在扫描线到达时开始移动
        var rectStartThreshold = r.overlapX;
        if (scanLineX >= rectStartThreshold) {
          var localT = U.clamp((scanLineX - rectStartThreshold) / (sheetArea.w * 0.4), 0, 1);
          var ease3 = U.easeOutExpo(localT);
          r.x = U.lerp(r.overlapX, r.packedX, ease3);
          r.y = U.lerp(r.overlapY, r.packedY, ease3);
        } else {
          r.x = r.overlapX;
          r.y = r.overlapY;
        }
      } else {
        // Phase 4: 静止 + 微微浮动
        r.x = r.packedX;
        r.y = r.packedY;

        // 更新统计数字（仅一次）
        if (!statsUpdated) {
          statsUpdated = true;
          updateStats();
        }
      }
    });
  }

  // ── 绘制 ──
  function draw(elapsed) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // — 版面背景 —
    drawSheet();

    // — Phase 2: 重叠检测 + 红色闪烁 —
    var showOverlap = elapsed >= PHASE_1_END && elapsed < PHASE_3_END;

    // — Phase 3: 扫描线 —
    if (elapsed >= PHASE_2_END && elapsed < PHASE_3_END) {
      drawScanLine();
    }

    // — Phase 4: 完成勾号 —
    if (elapsed >= PHASE_3_END) {
      drawCheckMark();
    }

    // — 绘制矩形 —
    rects.forEach(function (r, i) {
      ctx.save();
      ctx.globalAlpha = r.alpha;

      // 碰撞高亮
      var collides = false;
      if (showOverlap) {
        for (var j = 0; j < rects.length; j++) {
          if (j !== i && U.isColliding(r, rects[j])) {
            collides = true;
            break;
          }
        }
      }

      // 浮动偏移 (Phase 4)
      var floatOffset = 0;
      if (elapsed >= PHASE_3_END) {
        floatOffset = Math.sin((elapsed / 1000) + i * 0.7) * 2;
      }

      // 填充
      var fillColor = r.color.fill;
      var strokeColor = r.color.stroke;
      if (collides) {
        // 红色闪烁
        var flash = Math.sin(elapsed / 120) * 0.5 + 0.5;
        fillColor = 'rgba(239, 68, 68, ' + (0.3 + flash * 0.4) + ')';
        strokeColor = '#ef4444';
      }

      U.drawRoundedRect(ctx, r.x, r.y + floatOffset, r.w, r.h, RECT_RADIUS);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 标签文字
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '600 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, r.x + r.w / 2, r.y + r.h / 2 + floatOffset);

      ctx.restore();
    });
  }

  // ── 绘制版面 ──
  function drawSheet() {
    ctx.save();
    U.drawRoundedRect(ctx, sheetArea.x, sheetArea.y, sheetArea.w, sheetArea.h, 8);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.fill();

    // 限制在圆角矩形内绘制网格线
    ctx.clip();

    // 绘制方格线网理
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.8;
    var gridStep = 25;
    for (var gx = sheetArea.x + gridStep; gx < sheetArea.x + sheetArea.w; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, sheetArea.y);
      ctx.lineTo(gx, sheetArea.y + sheetArea.h);
      ctx.stroke();
    }
    for (var gy = sheetArea.y + gridStep; gy < sheetArea.y + sheetArea.h; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(sheetArea.x, gy);
      ctx.lineTo(sheetArea.x + sheetArea.w, gy);
      ctx.stroke();
    }

    ctx.restore();

    // 绘制边框
    ctx.save();
    U.drawRoundedRect(ctx, sheetArea.x, sheetArea.y, sheetArea.w, sheetArea.h, 8);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 标注
    ctx.save();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('对开版 (1194 × 889 mm)', sheetArea.x + sheetArea.w / 2, sheetArea.y - 10);
    ctx.restore();
  }

  // ── 扫描线 ──
  function drawScanLine() {
    ctx.save();
    // 发光线
    var grad = ctx.createLinearGradient(scanLineX - 30, 0, scanLineX + 10, 0);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0)');
    grad.addColorStop(0.7, 'rgba(59, 130, 246, 0.6)');
    grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(scanLineX - 30, sheetArea.y, 40, sheetArea.h);

    // 细线
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scanLineX, sheetArea.y);
    ctx.lineTo(scanLineX, sheetArea.y + sheetArea.h);
    ctx.stroke();
    ctx.restore();
  }

  // ── 完成勾号 ──
  function drawCheckMark() {
    ctx.save();
    var cx = sheetArea.x + sheetArea.w - 35;
    var cy = sheetArea.y + 30;

    // 圆形背景
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 勾号
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx - 2, cy + 6);
    ctx.lineTo(cx + 8, cy - 5);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // ── 更新统计数字 ──
  function updateStats() {
    var timeEl = document.getElementById('hero-stat-time');
    var rateEl = document.getElementById('hero-stat-rate');
    if (timeEl) {
      U.animateCounter(timeEl, 0.34, 800, '', 's');
    }
    if (rateEl) {
      U.animateCounter(rateEl, 96.7, 1000, '', '%');
    }
  }

  // ── 导出 ──
  window.HeroScene = { init: init };

  // 等 DOM 就绪后自动启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
