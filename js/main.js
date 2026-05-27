/* ============================================
   主入口 — 初始化所有模块
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // 渲染 KaTeX 数学公式
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }

  // 初始化滚动观察器
  if (window.ScrollObserver) {
    window.ScrollObserver.init();
  }

  // 初始化各场景
  const scenes = [
    { name: 'HeroScene', label: 'Hero' },
    { name: 'SolverScene', label: 'CP-SAT 求解器' },
    { name: 'AIWorkflowScene', label: 'AI 协同' },
    { name: 'SummaryScene', label: '总结' }
  ];

  scenes.forEach(({ name, label }) => {
    if (window[name] && typeof window[name].init === 'function') {
      try {
        window[name].init();
        console.log(`✓ ${label} (${name}) 初始化完成`);
      } catch (e) {
        console.error(`✗ ${label} (${name}) 初始化失败:`, e);
      }
    } else {
      console.warn(`⚠ ${name} 未找到或缺少 init()`);
    }
  });

  console.log('🖨️ OR-Tools 智能拼版 Demo 已就绪');
});
