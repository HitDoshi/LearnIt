(function () {
  'use strict';

  const urlParams = new URLSearchParams(window.location.search);
  const recordId = parseInt(urlParams.get('id') || '0', 10);

  document.getElementById('backButton').addEventListener('click', function () {
    if (history.length > 1) {
      history.back();
    } else {
      window.location.href = 'manageRecord.html';
    }
  });

  function statusMeta(status) {
    switch (String(status || '').toUpperCase().charAt(0)) {
      case 'G': return { label: 'Green', color: '#1e7e34' };
      case 'Y': return { label: 'Yellow', color: '#b45309' };
      case 'R': return { label: 'Red', color: '#c0392b' };
      default: return { label: 'Neutral', color: '#000000' };
    }
  }

  function renderRecord(rec) {
    document.getElementById('rd-source').value = rec.source || '';
    document.getElementById('rd-target').value = rec.target || '';
    document.getElementById('rd-stats').textContent = rec.showInDaysStat || '—';

    const prob = parseFloat(rec.probability);
    document.getElementById('rd-probability').textContent = isNaN(prob)
      ? '—'
      : (prob * 100).toFixed(0) + '%';

    const meta = statusMeta(rec.status);
    const statusEl = document.getElementById('rd-status');
    statusEl.textContent = meta.label;
    statusEl.style.color = meta.color;
  }

  function showError() {
    document.getElementById('rd-error').style.display = '';
  }

  function openDB(name, version) {
    return new Promise(function (resolve, reject) {
      var idb = window.indexedDB || window.mozIndexedDB ||
        window.webkitIndexedDB || window.msIndexedDB;
      var req = idb.open(name, version);
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function (e) { reject(e.target.error); };
      req.onupgradeneeded = function (e) { e.target.transaction.abort(); reject('no db'); };
    });
  }

  function getById(db, storeName, id) {
    return new Promise(function (resolve, reject) {
      try {
        var req = db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
        req.onsuccess = function (e) { resolve(e.target.result || null); };
        req.onerror = function (e) { reject(e.target.error); };
      } catch (err) { reject(err); }
    });
  }

  async function loadRecord() {
    if (!recordId) { showError(); return; }

    const topic = parseInt(localStorage.getItem('topic') || '0', 10);

    const candidates = topic === 0
      ? [['user', 'userData', 1], ['test', 'data', 1]]
      : [['test', 'data', 1], ['user', 'userData', 1]];

    for (const [dbName, storeName, version] of candidates) {
      try {
        const db = await openDB(dbName, version);
        const rec = await getById(db, storeName, recordId);
        db.close();
        if (rec) { renderRecord(rec); return; }
      } catch (err) {
        console.warn('[RecordDetail]', dbName, storeName, err);
      }
    }

    showError();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadRecord);
  } else {
    loadRecord();
  }

})();
