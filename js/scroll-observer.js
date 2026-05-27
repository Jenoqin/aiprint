/* ============================================
   滚动观察器 — IntersectionObserver 管理
   ============================================ */

window.ScrollObserver = {
  /** 当前活跃的场景索引 */
  activeScene: 0,

  /** 场景元素缓存 */
  scenes: [],

  /** 回调列表 */
  onSceneChange: [],

  init() {
    // 收集所有场景
    this.scenes = Array.from(document.querySelectorAll('.scene'));

    // 1. 设置场景观察器
    this._setupSceneObserver();

    // 2. 设置 reveal 动画观察器
    this._setupRevealObserver();

    // 3. 设置进度条
    this._setupProgressBar();

    // 4. 设置导航
    this._setupNavigation();
  },

  /** 监听场景进入/离开视口 */
  _setupSceneObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = this.scenes.indexOf(entry.target);
          if (index !== -1 && index !== this.activeScene) {
            this.activeScene = index;
            this._updateNavigation(index);
            this.onSceneChange.forEach(cb => cb(index, entry.target));
          }
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: '-10% 0px'
    });

    this.scenes.forEach(scene => observer.observe(scene));
  },

  /** 监听 .reveal 元素进入视口 */
  _setupRevealObserver() {
    const revealElements = document.querySelectorAll(
      '.reveal, .reveal-left, .reveal-right, .reveal-scale'
    );

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
  },

  /** 顶部进度条 */
  _setupProgressBar() {
    const bar = document.getElementById('progress-bar');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = progress + '%';
    }, { passive: true });
  },

  /** 导航（顶部 + 圆点） */
  _setupNavigation() {
    const nav = document.getElementById('main-nav');
    const dotNav = document.getElementById('dot-nav');

    // 滚动显示/隐藏导航
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      if (scrollTop > 300) {
        nav.classList.add('visible');
      } else {
        nav.classList.remove('visible');
      }
      lastScroll = scrollTop;
    }, { passive: true });

    // 导航点击 → 滚动到场景
    const allNavBtns = document.querySelectorAll('[data-scene]');
    allNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.scene);
        const target = this.scenes[index];
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  },

  /** 更新导航高亮 */
  _updateNavigation(index) {
    // 圆点导航
    document.querySelectorAll('.dot-nav-item').forEach((dot, i) => {
      dot.classList.toggle('dot-nav-item--active', i === index);
    });

    // 顶部导航
    document.querySelectorAll('.nav-link').forEach((link, i) => {
      link.classList.toggle('nav-link--active', i === index);
    });
  },

  /** 滚动到指定场景 */
  scrollToScene(index) {
    const target = this.scenes[index];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};
