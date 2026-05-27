/* ============================================
   Scene 5: AI + OR-Tools 协同 (AI Workflow)
   ============================================ */

window.AIWorkflowScene = {
  hasAnimated: false,

  init() {
    // 注册到 ScrollObserver 的进入回调，或者使用独立的 IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.hasAnimated) {
          this.hasAnimated = true;
          this.startAnimation();
        }
      });
    }, { threshold: 0.5 });

    const pipeline = document.getElementById('pipeline');
    if (pipeline) observer.observe(pipeline);
  },

  startAnimation() {
    const stages = document.querySelectorAll('.pipeline-stage');
    const flows = document.querySelectorAll('.pipeline-flow');
    const checks = document.querySelectorAll('.pipeline-check');

    // 1. Stage 0
    setTimeout(() => stages[0].classList.add('visible'), 100);

    // 2. Flow 0 & Stage 1
    setTimeout(() => {
      flows[0].classList.add('flowing');
      this.animateParticles();
    }, 600);

    setTimeout(() => {
      stages[1].classList.add('visible');
      this.drawNeuralNet();
    }, 1200);

    // 3. Flow 1 & Stage 2
    setTimeout(() => flows[1].classList.add('flowing'), 2000);
    
    setTimeout(() => stages[2].classList.add('visible'), 2600);

    // Checks (staggered)
    setTimeout(() => {
      checks.forEach(check => {
        const delay = parseInt(check.dataset.delay) * 300;
        setTimeout(() => check.classList.add('visible'), delay);
      });
    }, 3000);

    // 4. Flow 2 & Stage 3
    setTimeout(() => flows[2].classList.add('flowing'), 4500);
    
    setTimeout(() => stages[3].classList.add('visible'), 5000);
  },

  animateParticles() {
    const container = document.getElementById('pipeline-particles-0');
    if (!container) return;
    
    // 生成一些流动的小方块代表数据
    for (let i = 0; i < 15; i++) {
      const p = document.createElement('div');
      p.className = 'data-particle';
      p.style.top = `${Math.random() * 40 + 10}px`;
      p.style.animationDelay = `${Math.random() * 2}s`;
      p.style.background = Utils.RECT_COLORS[Math.floor(Math.random() * Utils.RECT_COLORS.length)].stroke;
      container.appendChild(p);
    }
  },

  drawNeuralNet() {
    const container = document.getElementById('ai-neural-net');
    if (!container) return;
    
    // 用 SVG 绘制一个简单的神经网络结构
    container.innerHTML = `
      <svg width="100%" height="80" viewBox="0 0 120 80">
        <!-- Lines -->
        <g stroke="rgba(139, 92, 246, 0.3)" stroke-width="1">
          <line x1="20" y1="20" x2="60" y2="20" />
          <line x1="20" y1="20" x2="60" y2="40" />
          <line x1="20" y1="20" x2="60" y2="60" />
          
          <line x1="20" y1="40" x2="60" y2="20" />
          <line x1="20" y1="40" x2="60" y2="40" />
          <line x1="20" y1="40" x2="60" y2="60" />
          
          <line x1="20" y1="60" x2="60" y2="20" />
          <line x1="20" y1="60" x2="60" y2="40" />
          <line x1="20" y1="60" x2="60" y2="60" />
          
          <line x1="60" y1="20" x2="100" y2="40" />
          <line x1="60" y1="40" x2="100" y2="40" />
          <line x1="60" y1="60" x2="100" y2="40" />
        </g>
        <!-- Nodes -->
        <g fill="var(--accent-purple)">
          <circle cx="20" cy="20" r="4" style="animation: signal-propagate 2s infinite" />
          <circle cx="20" cy="40" r="4" style="animation: signal-propagate 2s infinite 0.5s" />
          <circle cx="20" cy="60" r="4" style="animation: signal-propagate 2s infinite 1s" />
          
          <circle cx="60" cy="20" r="4" style="animation: signal-propagate 2s infinite 0.2s" />
          <circle cx="60" cy="40" r="4" style="animation: signal-propagate 2s infinite 0.7s" />
          <circle cx="60" cy="60" r="4" style="animation: signal-propagate 2s infinite 1.2s" />
          
          <circle cx="100" cy="40" r="5" fill="var(--accent-blue)" style="animation: glow-pulse 2s infinite" />
        </g>
      </svg>
    `;
  }
};
