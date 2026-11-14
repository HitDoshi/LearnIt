(function () {
  var KEY = "lg-theme";
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function mode() {
    try {
      var value = localStorage.getItem(KEY);
      return value === "light" || value === "dark" ? value : "system";
    } catch (error) {
      return "system";
    }
  }

  function systemDark() {
    try {
      var flag = localStorage.getItem("lg-system-dark");
      if (flag === "1") return true;
      if (flag === "0") return false;
    } catch (error) {}
    return !!(media && media.matches);
  }

  function resolved() {
    var current = mode();
    if (current === "system") return systemDark() ? "dark" : "light";
    return current;
  }

  function syncSwitches() {
    var current = mode();
    var buttons = document.querySelectorAll("[data-lg-theme-option]");
    Array.prototype.forEach.call(buttons, function (button) {
      var active = button.getAttribute("data-lg-theme-option") === current;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function apply() {
    root.setAttribute("data-theme", resolved());
    root.setAttribute("data-theme-mode", mode());
    syncSwitches();
  }

  function set(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch (error) {}
    apply();
  }

  function bindSwitches() {
    var groups = document.querySelectorAll(".lg-theme-switch");
    Array.prototype.forEach.call(groups, function (group) {
      if (group.dataset.lgBound) return;
      group.dataset.lgBound = "1";
      group.addEventListener("click", function (event) {
        event.stopPropagation();
        var button = event.target.closest("[data-lg-theme-option]");
        if (!button) return;
        event.preventDefault();
        set(button.getAttribute("data-lg-theme-option"));
      });
    });
    syncSwitches();
  }

  if (media) {
    if (media.addEventListener) {
      media.addEventListener("change", apply);
    } else if (media.addListener) {
      media.addListener(apply);
    }
  }

  window.lgTheme = { mode: mode, set: set, refresh: apply };
  apply();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindSwitches);
  } else {
    bindSwitches();
  }
})();
