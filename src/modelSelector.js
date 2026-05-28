(function () {

  var AI_MODELS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Fast & efficient' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Most capable' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Previous gen fast' },
  ];

  var LS_KEY = 'ai_selected_model';
  var DEFAULT_MODEL = 'gemini-2.5-flash';

  function injectCSS() {
    if (document.getElementById('ai-model-selector-style')) return;
    var s = document.createElement('style');
    s.id = 'ai-model-selector-style';
    s.textContent =
      /* Button */
      '.ai-model-btn {' +
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
      '.ai-model-btn:hover,' +
      '.ai-model-btn:focus {' +
      'background: rgba(0,86,157,0.06) !important;' +
      'border-color: #004a87 !important;' +
      'color: #004a87 !important;' +
      'box-shadow: 0 0 0 3px rgba(0,86,157,0.14) !important;' +
      'outline: none !important;' +
      '}' +
      '.ai-model-btn .ai-spark {' +
      'font-size: 11px;' +
      'opacity: 0.7;' +
      'flex-shrink: 0;' +
      '}' +
      /* Dropdown menu */
      '.ai-model-menu {' +
      'border-radius: 14px !important;' +
      'border: 1px solid rgba(0,86,157,0.13) !important;' +
      'box-shadow: 0 10px 30px rgba(0,0,0,0.13) !important;' +
      'padding: 6px !important;' +
      'min-width: 200px !important;' +
      'margin-top: 40px !important;' +
      'left: 50% !important;' +
      'transform: translateX(-50%) !important;' +
      '}' +
      /* Items */
      '.ai-model-menu .ai-model-item {' +
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
      '.ai-model-menu .ai-model-item:hover {' +
      'background: rgba(0,86,157,0.08) !important;' +
      'color: #00569d !important;' +
      'text-decoration: none;' +
      '}' +
      '.ai-model-menu .ai-model-item.ai-selected {' +
      'background: rgba(0,86,157,0.11) !important;' +
      'color: #00569d !important;' +
      '}' +
      '.ai-check {' +
      'width: 16px;' +
      'font-size: 12px;' +
      'color: #00569d;' +
      'flex-shrink: 0;' +
      'text-align: center;' +
      '}' +
      '.ai-model-info { display: flex; flex-direction: column; }' +
      '.ai-model-name { font-weight: 500; line-height: 1.25; }' +
      '.ai-model-desc {' +
      'font-size: 11px;' +
      'opacity: 0.5;' +
      'font-weight: 400;' +
      'line-height: 1.2;' +
      'margin-top: 1px;' +
      '}';
    document.head.appendChild(s);
  }

  function labelFor(value) {
    for (var i = 0; i < AI_MODELS.length; i++) {
      if (AI_MODELS[i].value === value) return AI_MODELS[i].label;
    }
    return AI_MODELS[0].label;
  }

  window.getSelectedModel = function () {
    var v = localStorage.getItem(LS_KEY);
    return AI_MODELS.some(function (m) { return m.value === v; }) ? v : DEFAULT_MODEL;
  };

  window.initModelSelector = function (containerId) {
    injectCSS();
    var container = document.getElementById(containerId);
    if (!container || container.querySelector('.ai-model-btn')) return;

    var current = window.getSelectedModel();

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn ai-model-btn dropdown-toggle';
    btn.setAttribute('data-toggle', 'dropdown');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML =
      '<span class="ai-spark">✦</span>' +
      '<span class="ai-btn-label">' + labelFor(current) + '</span>';

    var menu = document.createElement('div');
    menu.className = 'dropdown-menu ai-model-menu';

    AI_MODELS.forEach(function (m) {
      var isCurrent = (m.value === current);

      var item = document.createElement('a');
      item.href = '#';
      item.className = 'dropdown-item ai-model-item' + (isCurrent ? ' ai-selected' : '');
      item.setAttribute('data-model', m.value);
      item.innerHTML =
        '<span class="ai-check">' + (isCurrent ? '&#10003;' : '') + '</span>' +
        '<span class="ai-model-info">' +
        '<span class="ai-model-name">' + m.label + '</span>' +
        '<span class="ai-model-desc">' + m.desc + '</span>' +
        '</span>';

      item.addEventListener('click', function (e) {
        e.preventDefault();
        var val = this.getAttribute('data-model');
        localStorage.setItem(LS_KEY, val);

        btn.querySelector('.ai-btn-label').textContent = labelFor(val);

        menu.querySelectorAll('.ai-model-item').forEach(function (el) {
          var active = el.getAttribute('data-model') === val;
          el.classList.toggle('ai-selected', active);
          el.querySelector('.ai-check').innerHTML = active ? '&#10003;' : '';
        });
      });

      menu.appendChild(item);
    });

    var wrapper = document.createElement('div');
    wrapper.className = 'dropdown';
    wrapper.appendChild(btn);
    wrapper.appendChild(menu);

    container.appendChild(wrapper);
  };

})();
