/* ============================================
   HNXX印务智能排产 Demo - 交互与核心算法逻辑
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initSliders();
  initGantt();
  initExceptionSimulator();
});


// ============================================
// 2. Sliders & 权重设定
// ============================================
let weightA = 50; // 交付时效
let weightB = 30; // 材料利用率
let weightC = 20; // 换版成本

function initSliders() {
  const sliderA = document.getElementById('weight-a');
  const sliderB = document.getElementById('weight-b');
  const sliderC = document.getElementById('weight-c');
  
  const valA = document.getElementById('weight-a-val');
  const valB = document.getElementById('weight-b-val');
  const valC = document.getElementById('weight-c-val');

  if (!sliderA) return;

  function balanceWeights(changedSource, val) {
    if (changedSource === 'A') {
      weightA = parseInt(val);
      // 等比例分配剩余份额给 B 和 C
      const remain = 100 - weightA;
      const bRatio = weightB / (weightB + weightC || 1);
      weightB = Math.round(remain * bRatio);
      weightC = remain - weightB;
    } else if (changedSource === 'B') {
      weightB = parseInt(val);
      const remain = 100 - weightB;
      const aRatio = weightA / (weightA + weightC || 1);
      weightA = Math.round(remain * aRatio);
      weightC = remain - weightA;
    } else {
      weightC = parseInt(val);
      const remain = 100 - weightC;
      const aRatio = weightA / (weightA + weightB || 1);
      weightA = Math.round(remain * aRatio);
      weightB = remain - weightA;
    }

    // 纠正微小舍入误差
    const total = weightA + weightB + weightC;
    if (total !== 100) {
      weightA += (100 - total);
    }

    // 更新 UI Sliders
    sliderA.value = weightA;
    sliderB.value = weightB;
    sliderC.value = weightC;

    valA.textContent = weightA + '%';
    valB.textContent = weightB + '%';
    valC.textContent = weightC + '%';
  }

  sliderA.addEventListener('input', (e) => balanceWeights('A', e.target.value));
  sliderB.addEventListener('input', (e) => balanceWeights('B', e.target.value));
  sliderC.addEventListener('input', (e) => balanceWeights('C', e.target.value));
}


// ============================================
// 3. Gantt Chart & AI 排产引擎
// ============================================
let ganttData = {
  m1: [
    { id: 'job-1', name: '教材印制：语文', start: 0, duration: 3, color: 'var(--accent-blue)', priority: '高' },
    { id: 'job-2', name: '教材印制：数学', start: 3, duration: 4, color: 'var(--accent-blue)', priority: '高' },
    { id: 'job-3', name: '精品画册', start: 7, duration: 3, color: 'var(--accent-green)', priority: '中' }
  ],
  m2: [
    { id: 'job-4', name: '教材印制：英语', start: 0, duration: 4, color: 'var(--accent-blue)', priority: '高' },
    { id: 'job-5', name: '教材印制：物理', start: 4, duration: 3, color: 'var(--accent-blue)', priority: '高' },
    { id: 'job-6', name: '期刊月刊 A', start: 7, duration: 2, color: 'var(--accent-green)', priority: '中' }
  ],
  m3: [
    { id: 'job-7', name: '少儿绘本', start: 0, duration: 3, color: 'var(--accent-green)', priority: '中' },
    { id: 'job-8', name: '企业内刊', start: 3, duration: 3, color: 'var(--text-muted)', priority: '低' },
    { id: 'job-9', name: '单页广告', start: 6, duration: 2, color: 'var(--text-muted)', priority: '低' }
  ],
  m4: [
    { id: 'job-10', name: '教材印制：化学', start: 0, duration: 3, color: 'var(--accent-blue)', priority: '高' },
    { id: 'job-11', name: '教辅作业本', start: 3, duration: 4, color: 'var(--accent-green)', priority: '中' },
    { id: 'job-12', name: '宣传统一单', start: 7, duration: 2, color: 'var(--text-muted)', priority: '低' }
  ]
};

let manualMetrics = { cost: 18450, oee: 74.2, delay: 18 };
let aiMetrics = { cost: 13200, oee: 89.6, delay: 1 };
let isScheduledByAi = false;

function initGantt() {
  renderGantt();
  
  const solveBtn = document.getElementById('btn-solve-schedule');
  if (solveBtn) {
    solveBtn.addEventListener('click', () => {
      isScheduledByAi = true;
      solveBtn.disabled = true;
      solveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>AI 引擎精确求解中...`;
      
      // 模拟秒级排程计算延迟
      setTimeout(() => {
        // 根据权重微调排产甘特图块
        adjustGanttBasedOnWeights();
        renderGantt();
        showComparisonMetrics();
        
        solveBtn.disabled = false;
        solveBtn.innerHTML = `🚀 一键 AI 智能排程`;
        
        // 弹出成功提示
        showRescheduleBanner('✅ AI 排程算法成功执行！在 186 毫秒内计算了 3,240 个决策变量，交期延误降低了 94%，材料废弃率降低 18%。', 'success');
      }, 1200);
    });
  }
}

function renderGantt() {
  const timeLabels = document.getElementById('gantt-time-labels');
  if (timeLabels) {
    timeLabels.innerHTML = '';
    for (let i = 0; i <= 10; i++) {
      const label = document.createElement('div');
      label.textContent = `${i * 2}h`;
      timeLabels.appendChild(label);
    }
  }

  // 渲染机台排程行
  const machineKeys = ['m1', 'm2', 'm3', 'm4'];
  machineKeys.forEach(mKey => {
    const row = document.getElementById(`gantt-row-${mKey}`);
    if (!row) return;
    row.innerHTML = '';

    const list = ganttData[mKey];
    list.forEach(job => {
      const block = document.createElement('div');
      block.className = 'gantt-block';
      block.id = job.id;
      block.style.left = `${job.start * 10}%`;
      block.style.width = `${job.duration * 10}%`;
      block.style.background = job.color;
      block.style.border = `1px solid ${lightenColor(job.color, 0.2)}`;
      
      block.innerHTML = `
        <div class="gantt-block-title">${job.name}</div>
        <div class="gantt-block-info">P:${job.priority} | ${job.duration * 2}h</div>
      `;
      
      row.appendChild(block);
    });
  });
}

function adjustGanttBasedOnWeights() {
  // 根据用户滑块权重动态模拟甘特图调整
  // 例如交付时效权重高时，高优先级（教材）印件全部靠前
  if (weightA > 50) {
    // 交付时效极高，语文数学物理化学等教材全部紧凑排最前
    ganttData.m1 = [
      { id: 'job-1', name: '教材印制：语文', start: 0, duration: 3, color: 'var(--accent-blue)', priority: '高' },
      { id: 'job-2', name: '教材印制：数学', start: 3, duration: 4, color: 'var(--accent-blue)', priority: '高' },
      { id: 'job-11', name: '教辅作业本', start: 7, duration: 3, color: 'var(--accent-green)', priority: '中' }
    ];
    ganttData.m2 = [
      { id: 'job-4', name: '教材印制：英语', start: 0, duration: 4, color: 'var(--accent-blue)', priority: '高' },
      { id: 'job-5', name: '教材印制：物理', start: 4, duration: 3, color: 'var(--accent-blue)', priority: '高' },
      { id: 'job-3', name: '精品画册', start: 7, duration: 3, color: 'var(--accent-green)', priority: '中' }
    ];
  } else {
    // 换版成本和利用率高时，混合排列以节省工艺开销
    ganttData.m1 = [
      { id: 'job-1', name: '教材印制：语文', start: 0, duration: 3, color: 'var(--accent-blue)', priority: '高' },
      { id: 'job-3', name: '精品画册', start: 3, duration: 3, color: 'var(--accent-green)', priority: '中' },
      { id: 'job-2', name: '教材印制：数学', start: 6, duration: 4, color: 'var(--accent-blue)', priority: '高' }
    ];
  }
}

function showComparisonMetrics() {
  const manualCard = document.getElementById('metric-manual');
  const aiCard = document.getElementById('metric-ai');
  const compareWrapper = document.getElementById('compare-metrics-wrapper');
  
  if (compareWrapper) compareWrapper.style.display = 'flex';
  
  if (manualCard && aiCard) {
    animateCount('val-manual-cost', manualMetrics.cost, '￥');
    animateCount('val-ai-cost', aiMetrics.cost, '￥');
    
    animateCount('val-manual-oee', manualMetrics.oee, '', '%');
    animateCount('val-ai-oee', aiMetrics.oee, '', '%');
    
    animateCount('val-manual-delay', manualMetrics.delay, '', '单');
    animateCount('val-ai-delay', aiMetrics.delay, '', '单');
  }
}

function animateCount(id, target, prefix = '', suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  
  let current = 0;
  const step = target / 25;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      clearInterval(timer);
      el.textContent = prefix + target + suffix;
    } else {
      el.textContent = prefix + Math.round(current) + suffix;
    }
  }, 20);
}


// ============================================
// 4. 突发异常与“15分钟自适应重排” (Chaos Monkey)
// ============================================
function initExceptionSimulator() {
  const btnFail = document.getElementById('btn-inject-failure');
  const btnUrgent = document.getElementById('btn-inject-urgent');

  if (btnFail) {
    btnFail.addEventListener('click', () => {
      // 模拟设备故障：高速轮转机 2号 (m2) 2号机组故障
      const m2Row = document.getElementById('gantt-row-m2');
      if (!m2Row) return;

      showRescheduleBanner('🚨 警告：检测到设备临时故障！高斯轮转机2号发生卡纸非计划停机，预计恢复需 4 小时。AI 引擎重规划计算启动...', 'danger');
      m2Row.classList.add('row-failed');

      // 动态将 m2 上的订单重新分配给 m1 和 m4
      setTimeout(() => {
        // 执行重排：m2 行被红格覆盖，上面的印件移动到 m1 和 m4 尾部
        ganttData.m2 = []; // 彻底清除该设备上的作业
        
        ganttData.m1 = [
          { id: 'job-1', name: '教材印制：语文', start: 0, duration: 3, color: 'var(--accent-blue)', priority: '高' },
          { id: 'job-2', name: '教材印制：数学', start: 3, duration: 4, color: 'var(--accent-blue)', priority: '高' },
          { id: 'job-4', name: '教材印制：英语(重排)', start: 7, duration: 3, color: 'oklch(62% 0.22 25)', priority: '加急' } // 加急红色
        ];

        ganttData.m4 = [
          { id: 'job-10', name: '教材印制：化学', start: 0, duration: 3, color: 'var(--accent-blue)', priority: '高' },
          { id: 'job-11', name: '教辅作业本', start: 3, duration: 4, color: 'var(--accent-green)', priority: '中' },
          { id: 'job-5', name: '教材印制：物理(重排)', start: 7, duration: 3, color: 'oklch(62% 0.22 25)', priority: '加急' }
        ];

        renderGantt();
        m2Row.classList.remove('row-failed');
        
        // 更新 OEE 和负荷
        totalOeeValue = 78.5; 
        activeMachinesCount = 35;
        updateDashboardUI();
        
        showRescheduleBanner('✅ 自适应重排成功！AI 引擎已在 26 毫秒内计算完 5,000+ 个可行解，重排偏差控制在 2.4%，教材教材交付不受故障影响！', 'success');
      }, 2500);
    });
  }

  if (btnUrgent) {
    btnUrgent.addEventListener('click', () => {
      showRescheduleBanner('🚨 提示：检测到教材紧急追加订单！新增 10 万册《人教版小学数学》加急印制任务，AI 引擎重新规划分配产能...', 'warning');

      setTimeout(() => {
        // 在甘特图头部直接插入加急任务，其余任务自动顺延
        ganttData.m1 = [
          { id: 'job-urgent-math', name: '【加急】数学追加', start: 0, duration: 3, color: 'oklch(62% 0.22 25)', priority: '特急' },
          { id: 'job-1', name: '教材印制：语文(后延)', start: 3, duration: 3, color: 'var(--accent-blue)', priority: '高' },
          { id: 'job-2', name: '教材印制：数学(后延)', start: 6, duration: 4, color: 'var(--accent-blue)', priority: '高' }
        ];

        ganttData.m3 = [
          { id: 'job-7', name: '少儿绘本', start: 0, duration: 3, color: 'var(--accent-green)', priority: '中' },
          { id: 'job-urgent-cover', name: '【加急】教材封面', start: 3, duration: 2, color: 'oklch(62% 0.22 25)', priority: '特急' },
          { id: 'job-8', name: '企业内刊(后延)', start: 5, duration: 3, color: 'var(--text-muted)', priority: '低' }
        ];

        renderGantt();
        
        showRescheduleBanner('✅ 教材插单成功！AI 自适应引擎在 15 毫秒内重新规划了排版制版顺序与机台匹配，确保小学教材“课前到书”！', 'success');
      }, 2500);
    });
  }
}

function showRescheduleBanner(message, type) {
  const banner = document.getElementById('reschedule-banner');
  if (!banner) return;
  
  banner.style.display = 'block';
  banner.className = `alert alert-${type} mt-3 fade show`;
  banner.textContent = message;
  
  // 30秒后自动淡出提示，除非有新事件
  setTimeout(() => {
    banner.style.opacity = 0;
    setTimeout(() => {
      banner.style.display = 'none';
      banner.style.opacity = 1;
    }, 500);
  }, 10000);
}



// ============================================
// 通用辅助工具函数
// ============================================
function lightenColor(colorVar, amount) {
  // 简易返回高亮色 fallback，由于使用 CSS Variables，可以直接在 CSS 层面设置 hover 高亮
  return colorVar; 
}
