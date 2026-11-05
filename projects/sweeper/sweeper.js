(() => {
  const read = (key, fallback) => {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(key, value); } catch (_) { /* Preferences are optional in private browsing. */ }
  };
  const textNodes = [...document.querySelectorAll('[data-en]')].map(node => ({ node, zh: node.textContent, en: node.dataset.en }));
  const labels = [...document.querySelectorAll('[data-en-aria-label]')].map(node => ({ node, zh: node.getAttribute('aria-label'), en: node.dataset.enAriaLabel }));
  const langButton = document.querySelector('.lang-toggle');
  const themeButton = document.querySelector('.theme-toggle');
  let language = read('homepage-language', 'en') === 'zh' ? 'zh' : 'en';
  const updateThemeLabel = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', language === 'zh' ? (dark ? '切换浅色模式' : '切换深色模式') : (dark ? 'Switch to light theme' : 'Switch to dark theme'));
  };
  const setLanguage = () => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    for (const entry of textNodes) entry.node.textContent = entry[language];
    for (const entry of labels) entry.node.setAttribute('aria-label', entry[language]);
    document.title = language === 'zh' ? '扫地机 · 覆盖规划与实车执行 | Jinghai Li' : 'Sweeper · Coverage Planning & Real-Robot Execution | Jinghai Li';
    langButton.textContent = language === 'zh' ? 'English' : '中文';
    langButton.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换为中文');
    updateThemeLabel();
  };
  langButton.addEventListener('click', () => {
    language = language === 'zh' ? 'en' : 'zh';
    save('homepage-language', language);
    setLanguage();
  });
  themeButton.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    save('homepage-theme', theme);
    updateThemeLabel();
  });
  // Keep recordings user-controlled and avoid playing multiple demos at once.
  const videos = [...document.querySelectorAll('video')];
  for (const video of videos) {
    video.addEventListener('play', () => {
      for (const other of videos) if (other !== video) other.pause();
    });
  }
  document.querySelector('.nav-controls').hidden = false;
  setLanguage();
})();
