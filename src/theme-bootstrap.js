/* 主题引导：必须在首屏渲染前执行，避免暗色模式下闪白。
   独立成文件而非内联，以满足浏览器扩展 MV3 的 CSP（禁止内联脚本）。 */
(function () {
  try {
    var raw = window.localStorage.getItem('whiteSearch.settings');
    var theme = raw ? (JSON.parse(raw).theme || 'system') : 'system';
    var resolved = theme === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (err) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
