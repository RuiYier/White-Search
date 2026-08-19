const SETTINGS_KEY = 'whiteSearch.settings';
const SETTINGS_VERSION = 1;

const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  pageTitle: 'White Search',
  theme: 'system',
  defaultEngineId: 'baidu',
  engines: [
    { id: 'baidu', name: '百度', urlTemplate: 'https://www.baidu.com/s?wd=%s', iconType: 'iconfont', iconValue: 'icon-baidu_' },
    { id: 'bing', name: 'Bing', urlTemplate: 'https://www.bing.com/search?q=%s', iconType: 'iconfont', iconValue: 'icon-bing' },
    { id: 'google', name: 'Google', urlTemplate: 'https://www.google.com/search?q=%s', iconType: 'iconfont', iconValue: 'icon-logo-google' },
  ],
  quickLinks: [
    { id: 'ql_chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com' },
    { id: 'ql_gemini', name: 'Gemini', url: 'https://gemini.google.com' },
    { id: 'ql_deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com' },
    { id: 'ql_doubao', name: '豆包', url: 'https://www.doubao.com/chat' },
  ],
};

const MAX_ENGINES = 4;
const MIN_ENGINES = 1;
const MAX_QUICK_LINKS = 8;
const THEME_VALUES = ['system', 'light', 'dark'];

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function readStore() {
  try {
    return window.localStorage.getItem(SETTINGS_KEY);
  } catch (err) {
    return null;
  }
}

function writeStore(value) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, value);
    return true;
  } catch (err) {
    return false;
  }
}

function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

function normalizeUrlInput(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeEngineTemplate(value) {
  let trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  if (trimmed.includes('%s')) return trimmed;
  if (/[?&=]$/.test(trimmed)) return `${trimmed}%s`;
  return '';
}

function isSafeEngineTemplate(value) {
  if (typeof value !== 'string' || !value.includes('%s')) return false;
  return isSafeHttpUrl(value.replace('%s', 'placeholder'));
}

function buildSearchUrl(engine, query) {
  return engine.urlTemplate.replace('%s', encodeURIComponent(query));
}

function originOf(urlOrTemplate) {
  try {
    const url = new URL(urlOrTemplate.includes('%s') ? urlOrTemplate.replace('%s', 'x') : urlOrTemplate);
    return url.hostname;
  } catch (err) {
    return '';
  }
}

function sanitizeEngine(raw, fallbackIndex) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim().slice(0, 24);
  if (!name) return null;

  let urlTemplate = String(raw.urlTemplate || '');
  if (!isSafeEngineTemplate(urlTemplate)) {
    urlTemplate = normalizeEngineTemplate(urlTemplate);
  }
  if (!isSafeEngineTemplate(urlTemplate)) return null;

  const id = typeof raw.id === 'string' && raw.id ? raw.id : genId('engine');
  const isPresetIcon = raw.iconType === 'iconfont' && typeof raw.iconValue === 'string';
  return {
    id,
    name,
    urlTemplate,
    iconType: isPresetIcon ? 'iconfont' : 'favicon',
    iconValue: isPresetIcon ? raw.iconValue : originOf(urlTemplate),
  };
}

function sanitizeQuickLink(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim().slice(0, 24);
  if (!name) return null;
  const url = normalizeUrlInput(raw.url || raw.urlTemplate || '');
  if (!isSafeHttpUrl(url)) return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : genId('ql');
  return { id, name, url };
}

function sanitizeSettings(raw) {
  const defaults = cloneDefaults();
  if (!raw || typeof raw !== 'object') return defaults;

  const out = defaults;

  out.pageTitle = String(raw.pageTitle || defaults.pageTitle).trim().slice(0, 40) || defaults.pageTitle;
  out.theme = THEME_VALUES.includes(raw.theme) ? raw.theme : defaults.theme;

  let engines = Array.isArray(raw.engines) ? raw.engines.map(sanitizeEngine).filter(Boolean) : [];
  const seen = new Set();
  engines = engines.filter((engine) => {
    if (seen.has(engine.id)) return false;
    seen.add(engine.id);
    return true;
  });
  if (!engines.length) engines = defaults.engines;
  if (engines.length > MAX_ENGINES) engines = engines.slice(0, MAX_ENGINES);
  out.engines = engines;

  out.defaultEngineId = engines.some((e) => e.id === raw.defaultEngineId)
    ? raw.defaultEngineId
    : engines[0].id;

  let quickLinks = Array.isArray(raw.quickLinks) ? raw.quickLinks.map(sanitizeQuickLink).filter(Boolean) : [];
  const seenQl = new Set();
  quickLinks = quickLinks.filter((ql) => {
    if (seenQl.has(ql.id)) return false;
    seenQl.add(ql.id);
    return true;
  });
  if (quickLinks.length > MAX_QUICK_LINKS) quickLinks = quickLinks.slice(0, MAX_QUICK_LINKS);
  out.quickLinks = quickLinks;

  return out;
}

function migrateSettings(raw) {
  if (!raw || typeof raw !== 'object') return cloneDefaults();
  if (raw.version === SETTINGS_VERSION) return raw;
  console.warn('[white-search] 未知设置版本，已重置为默认设置');
  return cloneDefaults();
}

function loadSettings() {
  const raw = readStore();
  if (!raw) return cloneDefaults();
  try {
    const parsed = JSON.parse(raw);
    return sanitizeSettings(migrateSettings(parsed));
  } catch (err) {
    console.warn('[white-search] 设置解析失败，已重置为默认设置', err);
    return cloneDefaults();
  }
}

function saveSettings(settings) {
  const clean = sanitizeSettings(settings);
  writeStore(JSON.stringify(clean));
  return clean;
}

function resetSettings() {
  try {
    window.localStorage.removeItem(SETTINGS_KEY);
  } catch (err) {
    // ignore
  }
  return cloneDefaults();
}

function resolveSuggestSource(settings) {
  const engine = settings.engines.find((e) => e.id === settings.defaultEngineId);
  const knownSources = ['baidu', 'bing', 'google'];
  return (engine && knownSources.includes(engine.id) && engine.id) || 'baidu';
}
