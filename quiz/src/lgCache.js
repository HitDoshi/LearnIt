var lgCache = (function () {
  var PREFIX = "lg-cache:";

  function read(key) {
    try {
      var raw = sessionStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function write(key, value) {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.warn("Cache write skipped", error);
    }
  }

  function remove(key) {
    try {
      sessionStorage.removeItem(PREFIX + key);
    } catch (error) {
      console.warn("Cache remove skipped", error);
    }
  }

  function same(a, b) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (error) {
      return false;
    }
  }

  function tokenKey() {
    var token = localStorage.getItem("token") || "guest";
    return token.slice(-24);
  }

  return { read: read, write: write, remove: remove, same: same, tokenKey: tokenKey };
})();
