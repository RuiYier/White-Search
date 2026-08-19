const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const suggestions = document.getElementById('suggestions');
const clearButton = document.getElementById('clearButton');
const engineButtons = document.getElementById('engineButtons');
const quickLinksEl = document.getElementById('quickLinks');
const brandTitle = document.getElementById('brandTitle');
const rootElement = document.documentElement;

let settings = loadSettings();

let debounceTimer = null;
let activeIndex = -1;
let currentItems = [];
let jsonpCounter = 0;
let jsonpScript = null;
let suggestToken = 0;
let suggestTimeoutId = null;
const SUGGEST_TIMEOUT_MS = 2500;

let bgHues = null;

const BG_EDGE_RANGES = {
  light: { sat: [30, 35], light: [90, 95] },
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function resolveTheme() {
  if (settings.theme === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return settings.theme;
}

function randomEdgeColor(hue, resolvedTheme) {
  const range = BG_EDGE_RANGES[resolvedTheme] || BG_EDGE_RANGES.light;
  const saturation = Math.floor(randomBetween(range.sat[0], range.sat[1]));
  const lightness = Math.floor(randomBetween(range.light[0], range.light[1]));
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function applyRandomBackgroundEdges(resolvedTheme) {
  // 暗色模式由 DarkVeil 画布负责背景，无需渐变
  if (resolvedTheme === 'dark') {
    rootElement.style.removeProperty('--bg-left');
    rootElement.style.removeProperty('--bg-right');
    return;
  }
  if (!bgHues) {
    bgHues = [Math.floor(randomBetween(0, 360)), Math.floor(randomBetween(0, 360))];
  }
  rootElement.style.setProperty('--bg-left', randomEdgeColor(bgHues[0], resolvedTheme));
  rootElement.style.setProperty('--bg-right', randomEdgeColor(bgHues[1], resolvedTheme));
}

let systemThemeQuery = null;
function applyTheme() {
  const resolvedTheme = resolveTheme();
  rootElement.setAttribute('data-theme', resolvedTheme);
  applyRandomBackgroundEdges(resolvedTheme);
  if (window.WSEffects) {
    window.WSEffects.start(resolvedTheme);
  }

  if (systemThemeQuery) {
    systemThemeQuery.removeEventListener('change', handleSystemThemeChange);
    systemThemeQuery = null;
  }
  if (settings.theme === 'system' && window.matchMedia) {
    systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeQuery.addEventListener('change', handleSystemThemeChange);
  }
}

function handleSystemThemeChange() {
  applyTheme();
}

function applyPageTitle() {
  document.title = `${settings.pageTitle} - 白搜`;
  brandTitle.textContent = settings.pageTitle;
}

function createLetterAvatar(name) {
  const span = document.createElement('span');
  span.className = 'engine-avatar';
  const chars = Array.from((name || '?').trim());
  span.textContent = (chars[0] || '?').toUpperCase();
  return span;
}

function createIconElement(item) {
  if (item.iconType === 'iconfont' && item.iconValue) {
    const span = document.createElement('span');
    span.className = `iconfont ${item.iconValue}`;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  const host = originOf(item.urlTemplate || item.url || '');
  if (!host) return createLetterAvatar(item.name);

  const img = document.createElement('img');
  img.className = 'engine-favicon';
  img.alt = '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  img.addEventListener('error', () => {
    img.replaceWith(createLetterAvatar(item.name));
  }, { once: true });
  return img;
}

function renderEngineButtons() {
  engineButtons.innerHTML = '';
  const fragment = document.createDocumentFragment();

  settings.engines.forEach((engine) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-button';
    button.dataset.engineId = engine.id;
    button.setAttribute('aria-label', `${engine.name} 搜索`);
    button.appendChild(createIconElement(engine));
    const label = document.createElement('span');
    label.className = 'visually-hidden';
    label.textContent = `${engine.name} 搜索`;
    button.appendChild(label);
    fragment.appendChild(button);
  });

  engineButtons.appendChild(fragment);
}

function renderQuickLinks() {
  quickLinksEl.innerHTML = '';
  const fragment = document.createDocumentFragment();

  settings.quickLinks.forEach((link) => {
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = link.name;
    fragment.appendChild(a);
  });

  quickLinksEl.appendChild(fragment);
}

function resolveDefaultEngine() {
  return settings.engines.find((e) => e.id === settings.defaultEngineId) || settings.engines[0];
}

function updateClearButtonVisibility() {
  clearButton.hidden = searchInput.value.trim().length === 0;
}

function openSearch(query) {
  const trimmed = query.trim();
  const engine = resolveDefaultEngine();
  if (!trimmed || !engine) {
    return;
  }
  window.location.href = buildSearchUrl(engine, trimmed);
}

function openEngineSearch(engine) {
  const trimmed = searchInput.value.trim();
  if (!trimmed || !engine) {
    return;
  }
  window.location.href = buildSearchUrl(engine, trimmed);
}

function setSuggestionsVisible(visible) {
  suggestions.classList.toggle('visible', visible);
  searchInput.setAttribute('aria-expanded', String(visible));
  document.body.classList.toggle('suggestions-open', visible);
}

function clearSuggestions() {
  currentItems = [];
  activeIndex = -1;
  suggestions.innerHTML = '';
  setSuggestionsVisible(false);
}

function renderSuggestions(items) {
  currentItems = items;
  activeIndex = -1;
  suggestions.innerHTML = '';

  if (!items.length) {
    setSuggestionsVisible(false);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion-item';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');
    button.dataset.index = String(index);
    button.textContent = item;
    button.addEventListener('click', () => openSearch(item));
    fragment.appendChild(button);
  });

  suggestions.appendChild(fragment);
  setSuggestionsVisible(true);
}

function updateActiveSuggestion(nextIndex) {
  const items = suggestions.querySelectorAll('.suggestion-item');
  items.forEach((item, index) => {
    item.setAttribute('aria-selected', String(index === nextIndex));
  });
  activeIndex = nextIndex;
  if (nextIndex >= 0 && currentItems[nextIndex]) {
    searchInput.value = currentItems[nextIndex];
  }
}

const SUGGEST_SOURCES = {
  baidu: {
    build: (query, callback) => `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=${callback}`,
    parse: (payload) => (Array.isArray(payload?.s) ? payload.s : []),
  },
  bing: {
    build: (query, callback) => `https://api.bing.com/qsonhs.aspx?type=cb&q=${encodeURIComponent(query)}&cb=${callback}`,
    parse: (payload) => (payload?.AS?.Results || []).flatMap((r) => r.Suggests || []).map((s) => s.Txt),
  },
  google: {
    build: (query, callback) => `https://suggestqueries.google.com/complete/search?client=chrome&hl=zh-CN&jsonp=${callback}&q=${encodeURIComponent(query)}`,
    parse: (payload) => (Array.isArray(payload?.[1]) ? payload[1].map((entry) => (Array.isArray(entry) ? entry[0] : entry)) : []),
  },
};

/* 扩展环境下 MV3 的 CSP 禁止注入第三方脚本，JSONP 不可用；
   但扩展有 host_permissions，可以直接 fetch 跨域。
   静态页面反之：没有 CORS 权限，只能走 JSONP。 */
const IS_EXTENSION =
  typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

function teardownJsonp() {
  if (jsonpScript) {
    jsonpScript.remove();
    jsonpScript = null;
  }
  if (suggestTimeoutId) {
    window.clearTimeout(suggestTimeoutId);
    suggestTimeoutId = null;
  }
}

/* 解析 JSONP 响应体：剥掉外层的 callback(...) 包装。
   三处不规范需要处理：
   1. Bing 会包一层 if(typeof callback == 'function') callback({...});，
      既不能取第一个左括号，也不能取最后一个右括号（末尾还有 ; 等内容），
      需要从回调的左括号起做括号配对；
   2. 百度返回的不是合法 JSON —— 键名没有引号（{q:"x",s:[...]}）；
   3. 部分接口用单引号包字符串。 */
function parseJsonpBody(text) {
  const call = /(?:^|[^\w$.])([\w$]+)\s*\(/g;
  let start = -1;
  let match;
  while ((match = call.exec(text)) !== null) {
    // 跳过 if/typeof 之类的控制结构，取最后一个函数调用作为回调
    if (match[1] !== 'if' && match[1] !== 'typeof') {
      start = call.lastIndex - 1;
    }
  }
  if (start === -1) return null;

  // 括号配对，找到回调实参真正的结束位置（跳过字符串内的括号）
  let depth = 0;
  let end = -1;
  let inStr = null;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') i += 1;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") inStr = ch;
    else if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  const body = text
    .slice(start + 1, end)
    .replace(/\/\*[\s\S]*?\*\//g, '') // Bing 会在实参尾部插入 /* pageview_candidate */
    .trim();
  try {
    return JSON.parse(body);
  } catch (err) {
    const normalized = body
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":') // 给裸键名补引号
      .replace(/'/g, '"'); // 单引号字符串换成双引号
    return JSON.parse(normalized);
  }
}

/* 百度联想接口返回 GBK 编码，直接 res.text() 会得到乱码，
   需按响应头里的 charset 解码。Bing/Google 是 UTF-8，走默认分支即可。 */
function decodeResponse(res, buffer) {
  const contentType = res.headers.get('content-type') || '';
  const match = /charset=([\w-]+)/i.exec(contentType);
  const charset = (match ? match[1] : 'utf-8').toLowerCase();
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch (err) {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

function fetchSuggestionsViaFetch(query, source, token) {
  const url = source.build(query, 'callback');
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SUGGEST_TIMEOUT_MS);

  fetch(url, { signal: controller.signal, credentials: 'omit' })
    .then((res) => res.arrayBuffer().then((buf) => decodeResponse(res, buf)))
    .then((text) => {
      window.clearTimeout(timer);
      if (token !== suggestToken) return;
      const payload = parseJsonpBody(text);
      const items = source
        .parse(payload)
        .filter((s) => typeof s === 'string' && s)
        .slice(0, 8);
      renderSuggestions(items);
    })
    .catch(() => {
      window.clearTimeout(timer);
      if (token !== suggestToken) return;
      clearSuggestions();
    });
}

function fetchSuggestionsViaJsonp(query, source, token) {
  const callbackName = `__wsSuggest_${Date.now()}_${jsonpCounter += 1}`;

  const cleanup = () => {
    delete window[callbackName];
    teardownJsonp();
  };

  window[callbackName] = (payload) => {
    if (token !== suggestToken) {
      cleanup();
      return;
    }
    cleanup();
    let items = [];
    try {
      items = source.parse(payload).filter((s) => typeof s === 'string' && s).slice(0, 8);
    } catch (err) {
      items = [];
    }
    renderSuggestions(items);
  };

  suggestTimeoutId = window.setTimeout(() => {
    if (token !== suggestToken) return;
    cleanup();
    clearSuggestions();
  }, SUGGEST_TIMEOUT_MS);

  jsonpScript = document.createElement('script');
  jsonpScript.src = source.build(query, callbackName);
  jsonpScript.onerror = () => {
    if (token !== suggestToken) return;
    cleanup();
    clearSuggestions();
  };
  document.body.appendChild(jsonpScript);
}

function fetchSuggestions(query) {
  teardownJsonp();

  const sourceKey = resolveSuggestSource(settings);
  const source = SUGGEST_SOURCES[sourceKey] || SUGGEST_SOURCES.baidu;
  const token = (suggestToken += 1);

  if (IS_EXTENSION) {
    fetchSuggestionsViaFetch(query, source, token);
  } else {
    fetchSuggestionsViaJsonp(query, source, token);
  }
}

function scheduleSuggestions(query) {
  window.clearTimeout(debounceTimer);

  const trimmed = query.trim();
  if (!trimmed) {
    suggestToken += 1;
    teardownJsonp();
    clearSuggestions();
    return;
  }

  debounceTimer = window.setTimeout(() => {
    fetchSuggestions(trimmed);
  }, 180);
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  openSearch(searchInput.value);
});

searchInput.addEventListener('input', () => {
  updateClearButtonVisibility();
  scheduleSuggestions(searchInput.value);
});

searchInput.addEventListener('focus', () => {
  if (currentItems.length) {
    setSuggestionsVisible(true);
  }
});

searchInput.addEventListener('keydown', (event) => {
  if (!currentItems.length) {
    if (event.key === 'Escape') {
      clearSuggestions();
    }
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    const nextIndex = activeIndex < currentItems.length - 1 ? activeIndex + 1 : 0;
    updateActiveSuggestion(nextIndex);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    const nextIndex = activeIndex > 0 ? activeIndex - 1 : currentItems.length - 1;
    updateActiveSuggestion(nextIndex);
    return;
  }

  if (event.key === 'Enter' && activeIndex >= 0 && currentItems[activeIndex]) {
    event.preventDefault();
    openSearch(currentItems[activeIndex]);
    return;
  }

  if (event.key === 'Escape') {
    clearSuggestions();
  }
});

document.addEventListener('click', (event) => {
  if (document.body.classList.contains('settings-open')) return;
  if (!searchForm.contains(event.target)) {
    clearSuggestions();
  }
});

clearButton.addEventListener('click', () => {
  searchInput.value = '';
  updateClearButtonVisibility();
  searchInput.focus();
  clearSuggestions();
});

engineButtons.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-engine-id]');
  if (!button) return;
  const engine = settings.engines.find((e) => e.id === button.dataset.engineId);
  openEngineSearch(engine);
});

searchInput.addEventListener('blur', () => {
  window.setTimeout(() => {
    if (!searchForm.contains(document.activeElement)) {
      clearSuggestions();
    }
  }, 120);
});

function applyAllSettings() {
  applyPageTitle();
  applyTheme();
  renderEngineButtons();
  renderQuickLinks();
  if (window.WSSettingsUI) {
    window.WSSettingsUI.render();
  }
}

window.WSApp = {
  getSettings: () => settings,
  setSettings: (next) => {
    settings = next;
  },
  saveAndApply: (mutator) => {
    mutator(settings);
    settings = saveSettings(settings);
    applyAllSettings();
  },
  resetAndApply: () => {
    settings = resetSettings();
    applyAllSettings();
  },
  applyAllSettings,
};

updateClearButtonVisibility();
applyAllSettings();
