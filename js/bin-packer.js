/* ============================================
   Bottom-Left-Fill (BLF) 二维装箱算法
   用于前端模拟演示
   ============================================ */

window.BinPacker = (() => {
  'use strict';

  /**
   * 在 skyline 中查找能放下宽 w、高 h 的最低位置
   * @param {number[]} skyline - 每列的高度
   * @param {number} binW - 容器宽度
   * @param {number} binH - 容器高度
   * @param {number} w - 矩形宽
   * @param {number} h - 矩形高
   * @returns {{x: number, y: number}|null} 最佳放置位置，或 null
   */
  function findBestPosition(skyline, binW, binH, w, h) {
    let bestX = -1;
    let bestY = Infinity;

    // 遍历每个可能的起始列
    for (let x = 0; x <= binW - w; x++) {
      // 在 [x, x+w) 范围内取 skyline 最大值，即此位置的底部 y
      let maxH = 0;
      for (let col = x; col < x + w; col++) {
        if (skyline[col] > maxH) {
          maxH = skyline[col];
        }
      }

      // 检查放置后是否超出容器高度
      if (maxH + h <= binH) {
        // 选择 y 最低的位置；y 相同时选 x 最靠左的
        if (maxH < bestY || (maxH === bestY && x < bestX)) {
          bestY = maxH;
          bestX = x;
        }
      }
    }

    if (bestX === -1) return null;
    return { x: bestX, y: bestY };
  }

  /**
   * 更新 skyline：在 [x, x+w) 范围将高度设为 y+h
   */
  function updateSkyline(skyline, x, w, y, h) {
    const top = y + h;
    for (let col = x; col < x + w; col++) {
      skyline[col] = top;
    }
  }

  /**
   * 主装箱函数 — Bottom-Left-Fill + Skyline
   * @param {number} binW - 容器宽度
   * @param {number} binH - 容器高度
   * @param {Array<{w: number, h: number, id: string}>} items - 待装箱矩形列表
   * @param {boolean} allowRotation - 是否允许旋转 90°
   * @returns {{
   *   placed: Array<{x: number, y: number, w: number, h: number, id: string, rotated: boolean}>,
   *   unplaced: Array<{w: number, h: number, id: string}>,
   *   utilization: number
   * }}
   */
  function pack(binW, binH, items, allowRotation = false) {
    // 将尺寸取整
    binW = Math.floor(binW);
    binH = Math.floor(binH);

    // 复制并按面积降序排序（大件优先），面积相同则高度优先
    const sorted = items.map((item, idx) => ({
      ...item,
      id: item.id || `item-${idx}`,
      w: Math.floor(item.w),
      h: Math.floor(item.h),
    })).sort((a, b) => {
      const areaA = a.w * a.h;
      const areaB = b.w * b.h;
      if (areaB !== areaA) return areaB - areaA;
      return Math.max(b.w, b.h) - Math.max(a.w, a.h);
    });

    // 初始化 skyline（每列高度为 0）
    const skyline = new Array(binW).fill(0);

    const placed = [];
    const unplaced = [];

    for (const item of sorted) {
      let bestPos = null;
      let bestW = item.w;
      let bestH = item.h;
      let rotated = false;

      // 尝试原始方向
      if (item.w <= binW && item.h <= binH) {
        bestPos = findBestPosition(skyline, binW, binH, item.w, item.h);
        bestW = item.w;
        bestH = item.h;
      }

      // 尝试旋转 90° 方向
      if (allowRotation && item.w !== item.h) {
        const rw = item.h;
        const rh = item.w;
        if (rw <= binW && rh <= binH) {
          const rotPos = findBestPosition(skyline, binW, binH, rw, rh);
          if (rotPos) {
            // 选择 y 更低的方向；y 相同选 x 更靠左的
            if (!bestPos ||
                rotPos.y < bestPos.y ||
                (rotPos.y === bestPos.y && rotPos.x < bestPos.x)) {
              bestPos = rotPos;
              bestW = rw;
              bestH = rh;
              rotated = true;
            }
          }
        }
      }

      if (bestPos) {
        // 放置成功
        updateSkyline(skyline, bestPos.x, bestW, bestPos.y, bestH);
        placed.push({
          x: bestPos.x,
          y: bestPos.y,
          w: bestW,
          h: bestH,
          id: item.id,
          rotated,
        });
      } else {
        // 放不下
        unplaced.push({
          w: item.w,
          h: item.h,
          id: item.id,
        });
      }
    }

    // 计算利用率
    const totalBinArea = binW * binH;
    const usedArea = placed.reduce((sum, r) => sum + r.w * r.h, 0);
    const utilization = totalBinArea > 0 ? usedArea / totalBinArea : 0;

    return { placed, unplaced, utilization };
  }

  /**
   * 检查布局是否符合 Guillotine Cut（一刀切）规则
   * 简单检查：所有矩形是否可以通过递归水平/垂直切割分离
   * @param {Array<{x: number, y: number, w: number, h: number}>} placed
   * @returns {boolean}
   */
  function isGuillotineCompatible(placed) {
    if (placed.length <= 1) return true;

    // 对当前区域内的矩形集合，尝试每个可能的水平或垂直切割线
    // 如果切割线能将矩形分成两组（不穿过任何矩形），则递归检查两组

    function canSplit(rects) {
      if (rects.length <= 1) return true;

      // 收集所有可能的垂直切割线（矩形右边界）
      const vertCuts = new Set();
      const horizCuts = new Set();
      for (const r of rects) {
        vertCuts.add(r.x + r.w);
        horizCuts.add(r.y + r.h);
      }

      // 尝试垂直切割
      for (const cx of vertCuts) {
        const left = [];
        const right = [];
        let valid = true;

        for (const r of rects) {
          if (r.x + r.w <= cx) {
            left.push(r);
          } else if (r.x >= cx) {
            right.push(r);
          } else {
            // 切割线穿过矩形
            valid = false;
            break;
          }
        }

        if (valid && left.length > 0 && right.length > 0) {
          if (canSplit(left) && canSplit(right)) return true;
        }
      }

      // 尝试水平切割
      for (const cy of horizCuts) {
        const top = [];
        const bottom = [];
        let valid = true;

        for (const r of rects) {
          if (r.y + r.h <= cy) {
            top.push(r);
          } else if (r.y >= cy) {
            bottom.push(r);
          } else {
            valid = false;
            break;
          }
        }

        if (valid && top.length > 0 && bottom.length > 0) {
          if (canSplit(top) && canSplit(bottom)) return true;
        }
      }

      return false;
    }

    return canSplit(placed);
  }

  /**
   * 计算总浪费面积
   * @param {number} binW
   * @param {number} binH
   * @param {Array<{w: number, h: number}>} placed
   * @returns {{wasteArea: number, wastePercent: number, usedArea: number}}
   */
  function calculateWaste(binW, binH, placed) {
    const totalArea = binW * binH;
    const usedArea = placed.reduce((sum, r) => sum + r.w * r.h, 0);
    const wasteArea = totalArea - usedArea;
    const wastePercent = totalArea > 0 ? (wasteArea / totalArea) * 100 : 0;

    return { wasteArea, wastePercent, usedArea };
  }

  // 暴露公共 API
  return { pack, isGuillotineCompatible, calculateWaste };
})();
