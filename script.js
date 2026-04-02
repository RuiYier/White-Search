const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const suggestions = document.getElementById('suggestions');
const clearButton = document.getElementById('clearButton');
const bingButton = document.getElementById('bingButton');
const googleButton = document.getElementById('googleButton');
const rootElement = document.documentElement;

let debounceTimer = null;
let activeIndex = -1;
let currentItems = [];
let jsonpCounter = 0;
let jsonpScript = null;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomEdgeColor() {
  const hue = Math.floor(randomBetween(0, 360));
  const saturation = Math.floor(randomBetween(30, 35));
  const lightness = Math.floor(randomBetween(90, 95));
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function applyRandomBackgroundEdges() {
  rootElement.style.setProperty('--bg-left', randomEdgeColor());
  rootElement.style.setProperty('--bg-right', randomEdgeColor());
}

applyRandomBackgroundEdges();

function updateClearButtonVisibility() {
  clearButton.hidden = searchInput.value.trim().length === 0;
}

function buildBaiduUrl(query) {
  return `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
}

function buildBingUrl(query) {
  return `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
}

function buildGoogleUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function openSearch(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    return;
  }
  window.location.href = buildBaiduUrl(trimmed);
}

function openEngineSearch(builder) {
  const trimmed = searchInput.value.trim();
  if (!trimmed) {
    return;
  }
  window.location.href = builder(trimmed);
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

function fetchSuggestions(query) {
  if (jsonpScript) {
    jsonpScript.remove();
    jsonpScript = null;
  }

  const callbackName = `__baiduSuggest_${Date.now()}_${jsonpCounter += 1}`;
  window[callbackName] = (payload) => {
    delete window[callbackName];
    if (jsonpScript) {
      jsonpScript.remove();
      jsonpScript = null;
    }

    const items = Array.isArray(payload?.s) ? payload.s.filter(Boolean).slice(0, 8) : [];
    renderSuggestions(items);
  };

  jsonpScript = document.createElement('script');
  jsonpScript.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=${callbackName}`;
  jsonpScript.onerror = () => {
    delete window[callbackName];
    clearSuggestions();
  };
  document.body.appendChild(jsonpScript);
}

function scheduleSuggestions(query) {
  window.clearTimeout(debounceTimer);

  const trimmed = query.trim();
  if (!trimmed) {
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

bingButton.addEventListener('click', () => {
  openEngineSearch(buildBingUrl);
});

googleButton.addEventListener('click', () => {
  openEngineSearch(buildGoogleUrl);
});

searchInput.addEventListener('blur', () => {
  window.setTimeout(() => {
    if (!searchForm.contains(document.activeElement)) {
      clearSuggestions();
    }
  }, 120);
});

updateClearButtonVisibility();
