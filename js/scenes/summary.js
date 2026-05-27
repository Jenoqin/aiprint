/* ============================================
   Scene 7: 总结 (Summary Architecture)
   ============================================ */

window.SummaryScene = {
  hasAnimated: false,

  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.hasAnimated) {
          this.hasAnimated = true;
          this.startAnimation();
        }
      });
    }, { threshold: 0.3 });

    const arch = document.getElementById('architecture');
    if (arch) observer.observe(arch);
  },

  startAnimation() {
    const layers = document.querySelectorAll('.arch-layer');
    const connectors = document.querySelectorAll('.arch-connector');

    // 逐层淡入
    layers.forEach((layer, i) => {
      setTimeout(() => {
        layer.style.opacity = '1';
        layer.style.transform = 'translateY(0)';
        layer.classList.add('glow-pulse-once'); // 可选的闪光效果
      }, i * 600);
    });

    // 连接线动画
    connectors.forEach((conn, i) => {
      setTimeout(() => {
        conn.style.opacity = '1';
      }, i * 600 + 300);
    });
  }
};
