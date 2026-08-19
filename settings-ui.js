(function () {
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsClose = document.getElementById('settingsClose');
  const pageShell = document.querySelector('.page-shell');

  const pageTitleInput = document.getElementById('settingPageTitle');
  const themeOptions = document.getElementById('themeOptions');

  const engineList = document.getElementById('engineList');
  const addEngineBtn = document.getElementById('addEngineBtn');
  const engineForm = document.getElementById('engineForm');
  const engineNameInput = document.getElementById('engineNameInput');
  const engineUrlInput = document.getElementById('engineUrlInput');
  const engineFormCancel = document.getElementById('engineFormCancel');

  const quickLinkList = document.getElementById('quickLinkSettingsList');
  const addQuickLinkBtn = document.getElementById('addQuickLinkBtn');
  const quickLinkForm = document.getElementById('quickLinkForm');
  const quickLinkNameInput = document.getElementById('quickLinkNameInput');
  const quickLinkUrlInput = document.getElementById('quickLinkUrlInput');
  const quickLinkFormCancel = document.getElementById('quickLinkFormCancel');

  const restoreDefaultsBtn = document.getElementById('restoreDefaultsBtn');

  let pageTitleDebounce = null;

  function getSettings() {
    return window.WSApp.getSettings();
  }

  function openPanel() {
    settingsOverlay.hidden = false;
    settingsPanel.hidden = false;
    requestAnimationFrame(() => {
      settingsOverlay.classList.add('visible');
      settingsPanel.classList.add('open');
    });
    document.body.classList.add('settings-open');
    settingsToggle.setAttribute('aria-expanded', 'true');
    if (pageShell) pageShell.inert = true;
    document.addEventListener('keydown', handleKeydown);
    render();
    window.setTimeout(() => pageTitleInput.focus(), 50);
  }

  function closePanel() {
    settingsOverlay.classList.remove('visible');
    settingsPanel.classList.remove('open');
    document.body.classList.remove('settings-open');
    settingsToggle.setAttribute('aria-expanded', 'false');
    if (pageShell) pageShell.inert = false;
    document.removeEventListener('keydown', handleKeydown);
    window.setTimeout(() => {
      settingsOverlay.hidden = true;
      settingsPanel.hidden = true;
    }, 220);
    settingsToggle.focus();
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closePanel();
    }
  }

  settingsToggle.addEventListener('click', () => {
    const isOpen = settingsPanel.classList.contains('open');
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  });
  settingsClose.addEventListener('click', closePanel);
  settingsOverlay.addEventListener('click', closePanel);

  pageTitleInput.addEventListener('input', () => {
    window.clearTimeout(pageTitleDebounce);
    const value = pageTitleInput.value;
    pageTitleDebounce = window.setTimeout(() => {
      window.WSApp.saveAndApply((settings) => {
        settings.pageTitle = value.trim().slice(0, 24) || 'White Search';
      });
    }, 250);
  });

  themeOptions.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-theme-choice]');
    if (!btn) return;
    const choice = btn.dataset.themeChoice;
    window.WSApp.saveAndApply((settings) => {
      settings.theme = choice;
    });
  });

  addEngineBtn.addEventListener('click', () => {
    if (getSettings().engines.length >= MAX_ENGINES) return;
    engineForm.hidden = false;
    engineNameInput.focus();
  });

  engineFormCancel.addEventListener('click', () => {
    engineForm.reset();
    engineForm.hidden = true;
  });

  engineForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const settings = getSettings();
    if (settings.engines.length >= MAX_ENGINES) return;

    const name = engineNameInput.value.trim().slice(0, 24);
    const template = normalizeEngineTemplate(engineUrlInput.value);
    if (!name || !isSafeEngineTemplate(template)) {
      engineUrlInput.setCustomValidity('请输入合法的搜索地址，并包含 %s 代表关键词');
      engineUrlInput.reportValidity();
      return;
    }
    engineUrlInput.setCustomValidity('');

    window.WSApp.saveAndApply((s) => {
      s.engines.push({
        id: genId('engine'),
        name,
        urlTemplate: template,
        iconType: 'favicon',
        iconValue: originOf(template),
      });
    });

    engineForm.reset();
    engineForm.hidden = true;
  });

  engineList.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('button[data-remove-engine]');
    const defaultBtn = event.target.closest('button[data-default-engine]');

    if (removeBtn) {
      const id = removeBtn.dataset.removeEngine;
      const settings = getSettings();
      if (settings.engines.length <= MIN_ENGINES) return;
      window.WSApp.saveAndApply((s) => {
        s.engines = s.engines.filter((e) => e.id !== id);
        if (s.defaultEngineId === id) {
          s.defaultEngineId = s.engines[0].id;
        }
      });
      return;
    }

    if (defaultBtn) {
      const id = defaultBtn.dataset.defaultEngine;
      window.WSApp.saveAndApply((s) => {
        s.defaultEngineId = id;
      });
    }
  });

  addQuickLinkBtn.addEventListener('click', () => {
    if (getSettings().quickLinks.length >= MAX_QUICK_LINKS) return;
    quickLinkForm.hidden = false;
    quickLinkNameInput.focus();
  });

  quickLinkFormCancel.addEventListener('click', () => {
    quickLinkForm.reset();
    quickLinkForm.hidden = true;
  });

  quickLinkForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const settings = getSettings();
    if (settings.quickLinks.length >= MAX_QUICK_LINKS) return;

    const name = quickLinkNameInput.value.trim().slice(0, 24);
    const url = normalizeUrlInput(quickLinkUrlInput.value);
    if (!name || !isSafeHttpUrl(url)) {
      quickLinkUrlInput.setCustomValidity('请输入合法的网址或域名');
      quickLinkUrlInput.reportValidity();
      return;
    }
    quickLinkUrlInput.setCustomValidity('');

    window.WSApp.saveAndApply((s) => {
      s.quickLinks.push({ id: genId('ql'), name, url });
    });

    quickLinkForm.reset();
    quickLinkForm.hidden = true;
  });

  quickLinkList.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('button[data-remove-quicklink]');
    if (!removeBtn) return;
    const id = removeBtn.dataset.removeQuicklink;
    window.WSApp.saveAndApply((s) => {
      s.quickLinks = s.quickLinks.filter((ql) => ql.id !== id);
    });
  });

  restoreDefaultsBtn.addEventListener('click', () => {
    if (!window.confirm('确定要恢复默认设置吗？自定义的搜索引擎和快捷入口将被清空。')) return;
    window.WSApp.resetAndApply();
  });

  function renderEngineList(settings) {
    engineList.innerHTML = '';
    settings.engines.forEach((engine) => {
      const li = document.createElement('li');
      li.className = 'settings-list-item';

      const main = document.createElement('div');
      main.className = 'settings-list-item-main';
      main.appendChild(createIconElement(engine));
      const nameSpan = document.createElement('span');
      nameSpan.textContent = engine.name;
      main.appendChild(nameSpan);

      const actions = document.createElement('div');
      actions.className = 'settings-list-item-actions';

      const defaultBtn = document.createElement('button');
      defaultBtn.type = 'button';
      defaultBtn.className = 'settings-default-btn';
      const isDefault = engine.id === settings.defaultEngineId;
      defaultBtn.textContent = isDefault ? '默认' : '设为默认';
      defaultBtn.disabled = isDefault;
      defaultBtn.dataset.defaultEngine = engine.id;
      actions.appendChild(defaultBtn);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'settings-remove-btn';
      removeBtn.textContent = '删除';
      removeBtn.dataset.removeEngine = engine.id;
      removeBtn.disabled = settings.engines.length <= MIN_ENGINES;
      if (removeBtn.disabled) removeBtn.title = '至少保留 1 个搜索引擎';
      actions.appendChild(removeBtn);

      li.appendChild(main);
      li.appendChild(actions);
      engineList.appendChild(li);
    });

    addEngineBtn.disabled = settings.engines.length >= MAX_ENGINES;
    addEngineBtn.textContent = addEngineBtn.disabled ? '最多 4 个' : '+ 添加';
  }

  function renderQuickLinkList(settings) {
    quickLinkList.innerHTML = '';
    settings.quickLinks.forEach((link) => {
      const li = document.createElement('li');
      li.className = 'settings-list-item';

      const main = document.createElement('div');
      main.className = 'settings-list-item-main';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = link.name;
      main.appendChild(nameSpan);

      const actions = document.createElement('div');
      actions.className = 'settings-list-item-actions';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'settings-remove-btn';
      removeBtn.textContent = '删除';
      removeBtn.dataset.removeQuicklink = link.id;
      actions.appendChild(removeBtn);

      li.appendChild(main);
      li.appendChild(actions);
      quickLinkList.appendChild(li);
    });

    addQuickLinkBtn.disabled = settings.quickLinks.length >= MAX_QUICK_LINKS;
    addQuickLinkBtn.textContent = addQuickLinkBtn.disabled ? '最多 8 个' : '+ 添加';
  }

  function render() {
    const settings = getSettings();
    pageTitleInput.value = settings.pageTitle;

    themeOptions.querySelectorAll('button[data-theme-choice]').forEach((btn) => {
      const active = btn.dataset.themeChoice === settings.theme;
      btn.setAttribute('aria-checked', String(active));
    });

    renderEngineList(settings);
    renderQuickLinkList(settings);
  }

  window.WSSettingsUI = { render };

  render();
})();
