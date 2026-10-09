(() => {
  const root = document.documentElement;
  const languageButton = document.querySelector('.lang-toggle');
  const themeButton = document.querySelector('.theme-toggle');
  const translations = [...document.querySelectorAll('[data-en]')].map(element => ({
    element, zh: element.textContent, en: element.dataset.en
  }));
  const readPreference = (key, fallback) => {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  };
  const savePreference = (key, value) => {
    try { localStorage.setItem(key, value); } catch (_) { /* Storage may be disabled. */ }
  };
  let language = readPreference('homepage-language', 'en') === 'zh' ? 'zh' : 'en';
  function updateThemeButton() {
    const dark = root.dataset.theme === 'dark';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', language === 'zh'
      ? (dark ? '切换浅色模式' : '切换深色模式')
      : (dark ? 'Switch to light theme' : 'Switch to dark theme'));
  }
  function applyLanguage() {
    root.lang = language === 'zh' ? 'zh-CN' : 'en';
    translations.forEach(({element, zh, en}) => { element.textContent = language === 'zh' ? zh : en; });
    languageButton.textContent = language === 'zh' ? 'English' : '中文';
    languageButton.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换中文');
    updateThemeButton();
  }
  languageButton.addEventListener('click', () => {
    language = language === 'zh' ? 'en' : 'zh';
    applyLanguage();
    savePreference('homepage-language', language);
  });
  themeButton.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    savePreference('homepage-theme', root.dataset.theme);
    updateThemeButton();
  });
  applyLanguage();
  document.querySelector('.nav-controls').hidden = false;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const videos = [...document.querySelectorAll('video[data-home-loop]')];
  let visibleVideos = new Set();
  const syncVideos = () => videos.forEach(video => {
    if (motion.matches || document.hidden || !visibleVideos.has(video)) video.pause();
    else video.play().catch(() => {});
  });
  if ('IntersectionObserver' in window) {
    const mediaObserver = new IntersectionObserver(entries => {
      entries.forEach(({target, isIntersecting}) => {
        if (isIntersecting) visibleVideos.add(target);
        else visibleVideos.delete(target);
      });
      syncVideos();
    }, { threshold: .05 });
    videos.forEach(video => mediaObserver.observe(video));
    if (!motion.matches) {
      const revealObserver = new IntersectionObserver(entries => entries.forEach(({target, isIntersecting}) => {
        if (isIntersecting) {
          target.classList.add('is-visible');
          revealObserver.unobserve(target);
        }
      }), { threshold: .12, rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('.card, .timeline-item, .skill-column').forEach(element => {
        element.classList.add('reveal');
        revealObserver.observe(element);
      });
    }
  } else {
    visibleVideos = new Set(videos);
  }
  motion.addEventListener('change', () => {
    if (motion.matches) document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
    syncVideos();
  });
  document.addEventListener('visibilitychange', syncVideos);
  // Retry muted playback after a user gesture if initial autoplay was blocked.
  document.addEventListener('pointerdown', syncVideos);
  syncVideos();

  const navigation = [...document.querySelectorAll('.nav-links a')];
  function updateNavigation() {
    const threshold = document.querySelector('nav').getBoundingClientRect().bottom + 48;
    let current = null;
    navigation.forEach(link => {
      if (document.querySelector(link.getAttribute('href')).getBoundingClientRect().top <= threshold) current = link;
    });
    navigation.forEach(link => {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  let frame = 0;
  window.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(() => { updateNavigation(); frame = 0; });
  }, { passive: true });
  window.addEventListener('resize', updateNavigation);
  updateNavigation();
})();
