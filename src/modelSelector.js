(function () {

  function injectCSS() {
    if (document.getElementById('ai-selector-shared-style')) return;
    var s = document.createElement('style');
    s.id = 'ai-selector-shared-style';
    s.textContent =
      '.ai-selector-btn {' +
      'border-radius: 50px !important;' +
      'font-size: 13px !important;' +
      'font-weight: 500 !important;' +
      'padding: 5px 14px !important;' +
      'border: 1.5px solid #00569d !important;' +
      'color: #00569d !important;' +
      'background: #ffffff !important;' +
      'display: inline-flex !important;' +
      'align-items: center;' +
      'gap: 6px;' +
      'transition: background 0.18s, box-shadow 0.18s, border-color 0.18s;' +
      'white-space: nowrap;' +
      'line-height: 1.4;' +
      '}' +
      '.ai-selector-btn:hover,' +
      '.ai-selector-btn:focus {' +
      'background: rgba(0,86,157,0.06) !important;' +
      'border-color: #004a87 !important;' +
      'color: #004a87 !important;' +
      'box-shadow: 0 0 0 3px rgba(0,86,157,0.14) !important;' +
      'outline: none !important;' +
      '}' +
      '.ai-selector-icon {' +
      'font-size: 11px;' +
      'opacity: 0.7;' +
      'flex-shrink: 0;' +
      '}' +
      '.ai-selector-menu {' +
      'border-radius: 14px !important;' +
      'border: 1px solid rgba(0,86,157,0.13) !important;' +
      'box-shadow: 0 10px 30px rgba(0,0,0,0.13) !important;' +
      'padding: 6px !important;' +
      'min-width: 200px !important;' +
      'margin-top: 40px !important;' +
      'left: 50% !important;' +
      'transform: translateX(-50%) !important;' +
      '}' +
      '.ai-selector-menu .ai-selector-item {' +
      'border-radius: 8px;' +
      'padding: 9px 12px !important;' +
      'font-size: 13px;' +
      'display: flex !important;' +
      'align-items: center;' +
      'gap: 10px;' +
      'color: #212529 !important;' +
      'transition: background 0.14s;' +
      'cursor: pointer;' +
      '}' +
      '.ai-selector-menu .ai-selector-item:hover {' +
      'background: rgba(0,86,157,0.08) !important;' +
      'color: #00569d !important;' +
      'text-decoration: none;' +
      '}' +
      '.ai-selector-menu .ai-selector-item.ai-selector-active {' +
      'background: rgba(0,86,157,0.11) !important;' +
      'color: #00569d !important;' +
      '}' +
      '.ai-selector-check {' +
      'width: 16px;' +
      'font-size: 12px;' +
      'color: #00569d;' +
      'flex-shrink: 0;' +
      'text-align: center;' +
      '}' +
      '.ai-selector-info { display: flex; flex-direction: column; }' +
      '.ai-selector-name { font-weight: 500; line-height: 1.25; }' +
      '.ai-selector-desc {' +
      'font-size: 11px;' +
      'opacity: 0.5;' +
      'font-weight: 400;' +
      'line-height: 1.2;' +
      'margin-top: 1px;' +
      '}';
    document.head.appendChild(s);
  }

  function createSelector(items, lsKey, defVal, icon) {
    injectCSS();

    function getSelected() {
      var v = localStorage.getItem(lsKey);
      return items.some(function (m) { return m.value === v; }) ? v : defVal;
    }

    function labelFor(value) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].value === value) return items[i].label;
      }
      return items[0].label;
    }

    function init(containerId) {
      var container = document.getElementById(containerId);
      if (!container || container.querySelector('.ai-selector-btn')) return;

      var current = getSelected();

      // Button
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ai-selector-btn dropdown-toggle';
      btn.setAttribute('data-toggle', 'dropdown');
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');

      var btnInner = '';
      if (icon) {
        btnInner += '<span class="ai-selector-icon">' + icon + '</span>';
      }
      btnInner += '<span class="ai-selector-label">' + labelFor(current) + '</span>';
      btn.innerHTML = btnInner;

      // Menu
      var menu = document.createElement('div');
      menu.className = 'dropdown-menu ai-selector-menu';

      items.forEach(function (m) {
        var isCurrent = (m.value === current);
        var item = document.createElement('a');
        item.href = '#';
        item.className = 'dropdown-item ai-selector-item' + (isCurrent ? ' ai-selector-active' : '');
        item.setAttribute('data-value', m.value);
        item.innerHTML =
          '<span class="ai-selector-check">' + (isCurrent ? '&#10003;' : '') + '</span>' +
          '<span class="ai-selector-info">' +
          '<span class="ai-selector-name">' + m.label + '</span>' +
          '<span class="ai-selector-desc">' + m.desc + '</span>' +
          '</span>';

        item.addEventListener('click', function (e) {
          e.preventDefault();
          var val = this.getAttribute('data-value');
          localStorage.setItem(lsKey, val);
          btn.querySelector('.ai-selector-label').textContent = labelFor(val);
          menu.querySelectorAll('.ai-selector-item').forEach(function (el) {
            var active = el.getAttribute('data-value') === val;
            el.classList.toggle('ai-selector-active', active);
            el.querySelector('.ai-selector-check').innerHTML = active ? '&#10003;' : '';
          });
        });

        menu.appendChild(item);
      });

      var wrapper = document.createElement('div');
      wrapper.className = 'dropdown';
      wrapper.appendChild(btn);
      wrapper.appendChild(menu);
      container.appendChild(wrapper);
    }

    return { init: init, getSelected: getSelected };
  }

  var _modelSelector = createSelector(
    [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Fast & efficient' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Most capable' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Previous gen fast' },
    ],
    'ai_selected_model',
    'gemini-2.5-flash',
    '✦'
  );

  window.getSelectedModel = function () { return _modelSelector.getSelected(); };
  window.initModelSelector = function (containerId) { _modelSelector.init(containerId); };

  var _themeSelector = createSelector(
    [
      { value: 'DARK HUMOR / SHOCK',   label: 'Dark Humor / Shock',  desc: 'Edgy, unexpected twists' },
      { value: 'BIZARRE / SURREAL',    label: 'Bizarre / Surreal',   desc: 'Weird, dreamlike scenarios' },
      { value: 'DRAMATIC / INTENSE',   label: 'Dramatic / Intense',  desc: 'High stakes, emotional depth' },
      { value: 'RELIABLY HUMOROUS',    label: 'Reliably Humorous',   desc: 'Classic, feel-good comedy' },
      { value: 'NEUTRAL',              label: 'Neutral',             desc: 'Standard, practical dialogue' },
    ],
    'ai_dialogue_theme',
    'RELIABLY HUMOROUS',
    null   // no icon
  );

  window.getSelectedTheme = function () { return _themeSelector.getSelected(); };
  window.initThemeSelector = function (containerId) { _themeSelector.init(containerId); };

})();
