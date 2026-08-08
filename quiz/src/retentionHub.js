(function () {
  'use strict';

  const urlParams = new URLSearchParams(window.location.search);
  const recordId = parseInt(urlParams.get('id') || '0', 10);

  let currentRecord = null;

  let pendingImageFileName = null;

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

  function setSpinner(spinnerId, visible) {
    const el = document.getElementById(spinnerId);
    if (el) el.style.display = visible ? 'inline-block' : 'none';
  }

  function setBtnDisabled(btnId, disabled) {
    const btn = document.getElementById(btnId);
    if (btn) btn.disabled = disabled;
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

  function canUseMnemonic() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const uType = String(user?.userType || '');
    const aiFlag = String(user?.AI_Enable || '').toUpperCase();
    return (uType === '1' || uType === '2') && aiFlag === 'Y';
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
        if (rec) {
          currentRecord = rec;
          renderRecord(rec);

          if (canUseMnemonic()) {
            document.getElementById('mnemonic-section').style.display = '';
            loadSavedMnemonic(rec);
          }

          return;
        }
      } catch (err) {
        console.warn('[RecordDetail]', dbName, storeName, err);
      }
    }

    showError();
  }

  function updateRecordInDB(dbName, storeName, version, record) {
    return new Promise(function (resolve, reject) {
      var idb = window.indexedDB || window.mozIndexedDB ||
        window.webkitIndexedDB || window.msIndexedDB;
      var req = idb.open(dbName, version);
      req.onerror = function (e) { reject(e.target.error); };
      req.onupgradeneeded = function (e) { e.target.transaction.abort(); reject('no db'); };
      req.onsuccess = function (e) {
        var db = e.target.result;
        var tx = db.transaction(storeName, 'readwrite');
        var st = tx.objectStore(storeName);
        var put = st.put(record);
        put.onsuccess = function () { db.close(); resolve(); };
        put.onerror = function (ev) { db.close(); reject(ev.target.error); };
      };
    });
  }

  function loadSavedMnemonic(rec) {
    if (!rec) return;

    const localText = rec.mnemonic_text || '';
    const localImage = rec.mnemonic_image || '';

    if (localText) {
      document.getElementById('mnem-text-area').value = localText;
      setBtnDisabled('mnem-img-generate-btn', false);
      setBtnDisabled('mnem-text-save-btn', false);
    }
    if (localImage) {
      displayMnemonicImage(localImage);
    }
  }

  async function saveMnemonicToIndexedDB(text, image) {
    if (!currentRecord) return;

    if (text !== undefined) currentRecord.mnemonic_text = text;
    if (image !== undefined) currentRecord.mnemonic_image = image;

    const topic = parseInt(localStorage.getItem('topic') || '0', 10);
    const dbName = (topic === 0) ? 'user' : 'test';
    const storeName = (topic === 0) ? 'userData' : 'data';

    try {
      await updateRecordInDB(dbName, storeName, 1, currentRecord);
    } catch (err) {
      console.warn('[saveMnemonicToIndexedDB]', err);
    }
  }

  function displayMnemonicImage(fileName) {
    const placeholder = document.getElementById('mnem-img-placeholder');
    const imgEl = document.getElementById('mnem-img-display');
    const imageUrl = `${API_URL}/assets/mnemonic_images/${fileName}`;

    imgEl.src = imageUrl;
    imgEl.style.display = 'block';
    placeholder.style.display = 'none';
    setBtnDisabled('mnem-img-save-btn', false);
  }

  async function generateMnemonicText() {
    if (!currentRecord) return;

    setBtnDisabled('mnem-generate-btn', true);
    setSpinner('mnem-generate-spinner', true);

    const targetLang = JSON.parse(localStorage.getItem('target-language') || 'null');
    const language = targetLang?.name || targetLang?.description || 'Unknown';

    const targetWord = currentRecord.target || '';
    const meaning = currentRecord.source || '';

    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userContext = cachedUser?.user_context || '';

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/generate_mnemonic.php?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_word: targetWord,
          meaning: meaning,
          language: language,
          user_context: userContext
        })
      });

      const data = await res.json();

      if (data?.success && data?.data?.mnemonic_text) {
        document.getElementById('mnem-text-area').value = data.data.mnemonic_text;
        setBtnDisabled('mnem-text-save-btn', false);
        setBtnDisabled('mnem-img-generate-btn', false);
      } else {
        showToast(data?.message || 'Failed to generate mnemonic.');
      }
    } catch (err) {
      console.error('[generateMnemonicText]', err);
      showToast('Error: ' + err.message);
    }

    setBtnDisabled('mnem-generate-btn', false);
    setSpinner('mnem-generate-spinner', false);
  }

  async function saveMnemonicText() {
    if (!currentRecord) return;

    const text = document.getElementById('mnem-text-area').value.trim();
    if (!text) { showToast('Nothing to save.'); return; }

    setBtnDisabled('mnem-text-save-btn', true);
    setSpinner('mnem-text-save-spinner', true);

    try {
      await saveMnemonicToIndexedDB(text, undefined);
      showToast('Mnemonic text saved locally!');
    } catch (err) {
      console.error('[saveMnemonicText]', err);
      showToast('Error saving locally: ' + err.message);
    }

    setBtnDisabled('mnem-text-save-btn', false);
    setSpinner('mnem-text-save-spinner', false);
  }

  async function generateMnemonicImage() {
    const token = localStorage.getItem('token');
    if (!token) { showToast('Please log in to generate an image.'); return; }
    if (!currentRecord) return;

    const mnemonicText = document.getElementById('mnem-text-area').value.trim();
    if (!mnemonicText) {
      showToast('Generate or enter a mnemonic text first.');
      return;
    }

    setBtnDisabled('mnem-img-generate-btn', true);
    setSpinner('mnem-img-generate-spinner', true);
    pendingImageFileName = null;

    const placeholder = document.getElementById('mnem-img-placeholder');
    const imgEl = document.getElementById('mnem-img-display');
    imgEl.style.display = 'none';
    placeholder.style.display = 'flex';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 150000);

      const res = await fetch(`${API_URL}/api/generate_mnemonic_image.php?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          mnemonic_text: mnemonicText,
          target_word: currentRecord.target || '',
          meaning: currentRecord.source || ''
        })
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (data?.success && data?.data?.image_file_name) {
        pendingImageFileName = data.data.image_file_name;
        displayMnemonicImage(pendingImageFileName);
        showToast("Image generated! Press 'Save Image' to store it.");
      } else {
        showToast(data?.message || 'Image generation failed.');
      }
    } catch (err) {
      console.error('[generateMnemonicImage]', err);
      const msg = err.name === 'AbortError'
        ? 'Image generation timed out. Please try again.'
        : 'Error: ' + err.message;
      showToast(msg);
    }

    setBtnDisabled('mnem-img-generate-btn', false);
    setSpinner('mnem-img-generate-spinner', false);
  }

  async function saveMnemonicImage() {
    if (!currentRecord) return;
    if (!pendingImageFileName) {
      showToast('No new image to save. Generate one first.');
      return;
    }

    setBtnDisabled('mnem-img-save-btn', true);
    setSpinner('mnem-img-save-spinner', true);

    try {
      const mnemonicText = document.getElementById('mnem-text-area').value.trim();
      await saveMnemonicToIndexedDB(mnemonicText, pendingImageFileName);
      showToast('Image saved locally!');
      pendingImageFileName = null;
    } catch (err) {
      console.error('[saveMnemonicImage]', err);
      showToast('Error saving locally: ' + err.message);
    }

    setBtnDisabled('mnem-img-save-btn', false);
    setSpinner('mnem-img-save-spinner', false);
  }

  document.getElementById('mnem-text-area').addEventListener('input', function () {
    const hasText = this.value.trim().length > 0;
    setBtnDisabled('mnem-text-save-btn', !hasText);
    setBtnDisabled('mnem-img-generate-btn', !hasText);
  });

  document.getElementById('mnem-generate-btn').addEventListener('click', generateMnemonicText);
  document.getElementById('mnem-text-save-btn').addEventListener('click', saveMnemonicText);
  document.getElementById('mnem-img-generate-btn').addEventListener('click', generateMnemonicImage);
  document.getElementById('mnem-img-save-btn').addEventListener('click', saveMnemonicImage);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadRecord);
  } else {
    loadRecord();
  }

})();
