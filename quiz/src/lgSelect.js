(function () {
  var OPEN_CLASS = "is-open";
  var openState = null;

  var chevronIcon =
    '<svg class="lg-select-chevron" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>';
  var checkIcon =
    '<svg class="lg-select-check" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0"/></svg>';

  function enhance(select) {
    if (select.dataset.lgEnhanced) return;
    select.dataset.lgEnhanced = "1";

    var host = select.parentElement;
    host.classList.add("lg-select");
    select.classList.add("lg-select-native");
    select.setAttribute("tabindex", "-1");
    select.setAttribute("aria-hidden", "true");

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "lg-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = '<span class="lg-select-value"></span>' + chevronIcon;

    var menu = document.createElement("div");
    menu.className = "lg-select-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    select.insertAdjacentElement("afterend", trigger);
    trigger.insertAdjacentElement("afterend", menu);

    var valueEl = trigger.querySelector(".lg-select-value");
    var state = { select: select, host: host, trigger: trigger, menu: menu };

    state.syncLabel = function () {
      var option = select.options[select.selectedIndex];
      var text = option ? option.text : "";
      valueEl.textContent = text || " ";
      host.classList.toggle("is-disabled", select.disabled);
      trigger.disabled = select.disabled;
    };

    state.buildMenu = function () {
      menu.innerHTML = "";
      Array.prototype.forEach.call(select.options, function (option, index) {
        if (option.hidden) return;
        var item = document.createElement("button");
        item.type = "button";
        item.className = "lg-select-option";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", index === select.selectedIndex ? "true" : "false");
        item.disabled = option.disabled;
        item.dataset.index = String(index);
        var label = document.createElement("span");
        label.textContent = option.text;
        item.appendChild(label);
        item.insertAdjacentHTML("beforeend", checkIcon);
        menu.appendChild(item);
      });
    };

    trigger.addEventListener("click", function () {
      if (host.classList.contains(OPEN_CLASS)) {
        close(state, true);
      } else {
        open(state);
      }
    });

    trigger.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        open(state);
      }
    });

    menu.addEventListener("click", function (event) {
      var item = event.target.closest(".lg-select-option");
      if (!item || item.disabled) return;
      choose(state, parseInt(item.dataset.index, 10));
    });

    menu.addEventListener("keydown", function (event) {
      onMenuKey(state, event);
    });

    select.addEventListener("change", state.syncLabel);

    new MutationObserver(function () {
      state.syncLabel();
      if (host.classList.contains(OPEN_CLASS)) state.buildMenu();
    }).observe(select, { childList: true, subtree: true, attributes: true, characterData: true });

    state.syncLabel();
  }

  function open(state) {
    if (state.select.disabled) return;
    if (openState && openState !== state) close(openState, false);

    state.syncLabel();
    state.buildMenu();
    state.menu.hidden = false;
    state.host.classList.add(OPEN_CLASS);
    state.trigger.setAttribute("aria-expanded", "true");

    var rect = state.trigger.getBoundingClientRect();
    var spaceBelow = window.innerHeight - rect.bottom;
    var menuHeight = Math.min(state.menu.scrollHeight, 300) + 12;
    state.host.classList.toggle("is-up", spaceBelow < menuHeight && rect.top > spaceBelow);

    openState = state;

    var current =
      state.menu.querySelector('[aria-selected="true"]') ||
      state.menu.querySelector(".lg-select-option:not(:disabled)");
    if (current) {
      current.scrollIntoView({ block: "nearest" });
      current.focus({ preventScroll: true });
    }
  }

  function close(state, focusTrigger) {
    state.menu.hidden = true;
    state.host.classList.remove(OPEN_CLASS, "is-up");
    state.trigger.setAttribute("aria-expanded", "false");
    if (openState === state) openState = null;
    if (focusTrigger) state.trigger.focus({ preventScroll: true });
  }

  function choose(state, index) {
    var select = state.select;
    close(state, true);
    if (index !== select.selectedIndex) {
      select.selectedIndex = index;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    state.syncLabel();
  }

  function onMenuKey(state, event) {
    var items = Array.prototype.filter.call(state.menu.querySelectorAll(".lg-select-option"), function (el) {
      return !el.disabled;
    });
    if (!items.length) return;
    var position = items.indexOf(document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      (items[position + 1] || items[0]).focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      (items[position - 1] || items[items.length - 1]).focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0].focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1].focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(state, true);
    } else if (event.key === "Tab") {
      close(state, false);
    }
  }

  document.addEventListener("pointerdown", function (event) {
    if (openState && !openState.host.contains(event.target)) close(openState, false);
  });

  var lastWidth = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    if (openState) close(openState, false);
  });

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll("select.main-custom-button"), enhance);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
