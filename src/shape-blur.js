/* ShapeBlur hover 效果
   移植自 React Bits 的 ShapeBlur 组件

   原组件为每个实例创建一个 Three.js WebGL canvas。本页有 8+ 个交互元素，
   逐个挂 canvas 会逼近浏览器 WebGL 上下文上限（约 16 个，DarkVeil 已占 1 个），
   开销也不划算。这里用等价的 CSS 实现同一套视觉：
     shader 的 strokeAA(sdRoundRect)  ->  圆角 border
     shader 的 fill(sdCircle, 鼠标位置) ->  radial-gradient 遮罩
   鼠标位置写入 --mx / --my，并保留原组件的阻尼跟随手感。 */
(function () {
  const SELECTOR = '.icon-button, .search-button, .settings-toggle, .quick-links a, .search-card';
  const DAMP = 12; // 对应原组件 MathUtils.damp 的阻尼系数

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** 当前光标下的所有目标（按钮 + 其所在的搜索框，两者都要跟随） */
  let targets = [];
  let rafId = null;
  let lastTime = 0;

  function setVars(el, x, y) {
    el.style.setProperty('--mx', `${x}px`);
    el.style.setProperty('--my', `${y}px`);
  }

  /** 收集从事件目标向上的所有匹配元素，而不只是最内层的那个 */
  function collect(node, event) {
    const found = [];
    let el = node.closest ? node.closest(SELECTOR) : null;
    while (el) {
      const rect = el.getBoundingClientRect();
      found.push({
        el,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      el = el.parentElement && el.parentElement.closest(SELECTOR);
    }
    return found;
  }

  function frame(now) {
    if (!targets.length) {
      rafId = null;
      return;
    }

    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
    lastTime = now;

    // 指数阻尼，等价于 THREE.MathUtils.damp
    const k = 1 - Math.exp(-DAMP * dt);
    targets.forEach((t) => {
      t.x += (t.tx - t.x) * k;
      t.y += (t.ty - t.y) * k;
      setVars(t.el, t.x, t.y);
    });

    rafId = requestAnimationFrame(frame);
  }

  function ensureLoop() {
    if (rafId === null) {
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    }
  }

  document.addEventListener(
    'pointermove',
    (event) => {
      const hits = collect(event.target, event);

      if (!hits.length) {
        targets = [];
        return;
      }

      targets = hits.map((hit) => {
        const prev = targets.find((t) => t.el === hit.el);
        return prev
          // 已在跟随：只更新目标位置，保留当前位置以延续阻尼
          ? Object.assign(prev, { tx: hit.x, ty: hit.y })
          // 新进入：从光标处起步，避免从上一个元素"飞"过来
          : { el: hit.el, x: hit.x, y: hit.y, tx: hit.x, ty: hit.y };
      });

      if (prefersReducedMotion) {
        targets.forEach((t) => setVars(t.el, t.tx, t.ty));
      } else {
        targets.forEach((t) => setVars(t.el, t.x, t.y));
        ensureLoop();
      }
    },
    { passive: true }
  );

  // 键盘聚焦时把高光放在元素中心
  document.addEventListener(
    'focusin',
    (event) => {
      const el = event.target.closest && event.target.closest(SELECTOR);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setVars(el, rect.width / 2, rect.height / 2);
    },
    true
  );
})();
