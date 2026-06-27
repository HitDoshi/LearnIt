function replaceStateWithHistory(page) {
  history.replaceState(null, '', page);
  window.location.href = page;
}

document.getElementById('backButton').onclick = function () {
  window.location.href = 'manageUserDialogue.html';
};

function validateInput(raw) {
  if (!raw || !raw.trim()) return { valid: true, units: [] };

  const units = raw
    .split(';')
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  if (units.length < 1 || units.length > 8) return { valid: false, units };

  const wordPattern = /^[^\W\d_]+$/u; // Unicode letters only

  for (const unit of units) {
    const words = unit.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < 1 || words.length > 3) return { valid: false, units };
    for (const word of words) {
      if (!wordPattern.test(word)) return { valid: false, units };
    }
  }

  return { valid: true, units };
}

function validateDialogue(dialogue) {
  if (!Array.isArray(dialogue) || dialogue.length < 4 || dialogue.length > 6) {
    return { valid: false, pairs: [] };
  }

  const pairs = [];

  for (const item of dialogue) {
    if (
      typeof item.speaker !== 'string' || !item.speaker.trim() ||
      typeof item.source !== 'string' || !item.source.trim() ||
      typeof item.target !== 'string' || !item.target.trim()
    ) {
      return { valid: false, pairs: [] };
    }
    pairs.push({
      speaker: item.speaker.trim(),
      source: item.source.trim(),
      target: item.target.trim(),
    });
  }

  return { valid: true, pairs };
}

function renderDialogue(pairs) {
  const outputDiv = document.getElementById('output');
  outputDiv.innerHTML = '';

  pairs.forEach((pair) => {
    const pairEl = document.createElement('div');
    pairEl.className = 'dialogue-pair';

    const sourceEl = document.createElement('div');
    sourceEl.className = 'dialogue-line source-line';
    sourceEl.textContent = `${pair.speaker}: ${pair.source}`;

    const targetEl = document.createElement('div');
    targetEl.className = 'dialogue-line target-line';
    targetEl.textContent = pair.target;

    pairEl.appendChild(sourceEl);
    pairEl.appendChild(targetEl);
    outputDiv.appendChild(pairEl);
  });
}

function _openIDB(name, version) {
  return new Promise((resolve, reject) => {
    const req = (window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB).open(name, version);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
    req.onupgradeneeded = () => { };
  });
}

function _getAllRecords(idb, storeName) {
  return new Promise((resolve, reject) => {
    if (!idb.objectStoreNames.contains(storeName)) return resolve([]);
    const tx = idb.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── Build stubborn array from Red/Yellow words in IndexedDB ───────────────────
async function buildStubbornArray() {
  const pairs = [];

  const targets = [
    { dbName: 'test', storeName: 'data' },
    { dbName: 'user', storeName: 'userData' },
  ];

  for (const { dbName, storeName } of targets) {
    try {
      const idb = await _openIDB(dbName, 1);
      const records = await _getAllRecords(idb, storeName);
      idb.close();

      for (const rec of records) {
        const status = String(rec.status || '').toUpperCase().charAt(0);
        if ((status === 'R' || status === 'Y') && rec.source && rec.target) {
          pairs.push({ source: rec.source.trim(), target: rec.target.trim() });
        }
      }
    } catch (err) {
      console.warn(`[AI] Could not read '${dbName}' DB:`, err);
    }
  }

  console.log(`[AI] ${pairs.length} Red/Yellow word pair(s) found for STUBBORN_ARRAY.`);
  return pairs;
}

async function callAI(source, target, selectedTheme, units, stubbornArray, model, userProfile) {
  const url = `${API_URL}/api/generate_text.php`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source,
      target,
      selected_theme: selectedTheme,
      units,           // semicolon-separated string, or empty string
      stubborn_array: stubbornArray, // array of {source, target} objects
      model,
      user_context: userProfile,
    }),
  });

  const data = await response.json();

  if (data?.success) {
    return { success: true, dialogue: data.data?.dialogue || [] };
  }

  return { success: false, message: data?.message || 'Something went wrong.' };
}

async function saveDialogue(dialogue, source, target) {
  const token = localStorage.getItem('token');

  if (!token) {
    return { success: false, message: 'You must be logged in to save.' };
  }

  const url = `${API_URL}/api/save_ai_dialogue.php?token=${token}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, target, dialogue }),
  });

  const data = await response.json();
  return data;
}

document.addEventListener('DOMContentLoaded', () => {

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user?.userType === '1') {
    document.getElementById('manageDialogue').style.display = '';
  } else {
    document.getElementById('manageDialogue').style.display = 'none';
  }

  const sourceLang = JSON.parse(localStorage.getItem('source-language') || 'null');
  const targetLang = JSON.parse(localStorage.getItem('target-language') || 'null');

  if (!sourceLang || !targetLang) {
    showToast('Source or target language not set. Please configure languages first.');
  } else {
    document.getElementById('source-lang-display').textContent = sourceLang.name || '--';
    document.getElementById('target-lang-display').textContent = targetLang.name || '--';
  }

  const unitsInput = document.getElementById('units-input');
  const askButton = document.getElementById('ask-button');
  const createNewBtn = document.getElementById('create-new-button');
  const saveBtn = document.getElementById('save-button');
  const outputSection = document.getElementById('output-section');
  const outputDiv = document.getElementById('output');

  let currentPairs = null;

  async function generateDialogue() {
    const raw = unitsInput.value;
    const { valid, units } = validateInput(raw);

    if (!valid) {
      showToast('Invalid input. Use letters only, max 3 words per entry, separated by ;');
      return;
    }

    if (!sourceLang || !targetLang) {
      showToast('Source or target language not set.');
      return;
    }

    const source = sourceLang.description;
    const target = targetLang.description;

    const selectedTheme = (typeof getSelectedTheme === 'function')
      ? getSelectedTheme()
      : 'RELIABLY HUMOROUS';

    const unitsText = units.join('; ');

    // Build stubborn array (only needed when units is blank)
    let stubbornArray = [];
    if (!unitsText) {
      stubbornArray = await buildStubbornArray();
    }

    // Selected model
    const selectedModel = getSelectedModel();

    // User profile context
    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userProfile = cachedUser?.user_context || '';

    outputSection.style.display = 'block';
    outputDiv.innerHTML = '<div class="dialogue-loading">Generating dialogue…</div>';
    document.getElementById('action-buttons').style.display = 'none';
    askButton.disabled = true;
    currentPairs = null;

    try {
      const result = await callAI(
        source,
        target,
        selectedTheme,
        unitsText,
        stubbornArray,
        selectedModel,
        userProfile
      );

      if (!result.success) {
        outputDiv.innerHTML = '<div class="dialogue-error">Invalid Output</div>';
        showToast(result.message);
        askButton.disabled = false;
        return;
      }

      const { valid: dialogueValid, pairs } = validateDialogue(result.dialogue);

      if (!dialogueValid) {
        outputDiv.innerHTML = '<div class="dialogue-error">Invalid Output</div>';
        askButton.disabled = false;
        return;
      }

      currentPairs = pairs;
      renderDialogue(pairs);
      document.getElementById('action-buttons').style.display = 'flex';

    } catch (error) {
      console.error('Error:', error);
      outputDiv.innerHTML = '<div class="dialogue-error">Invalid Output</div>';
      showToast('Error: ' + error.message);
    }

    askButton.disabled = false;
  }

  askButton.addEventListener('click', generateDialogue);

  createNewBtn.addEventListener('click', generateDialogue);

  saveBtn.addEventListener('click', async () => {
    if (!currentPairs) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      const source = sourceLang?.description;
      const target = targetLang?.description;
      const data = await saveDialogue(currentPairs, source, target);

      if (data?.success) {
        showToast('Dialogue saved!');
        outputSection.style.display = 'none';
        unitsInput.value = '';
        currentPairs = null;
      } else {
        showToast(data?.message || 'Save failed.');
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('Save error: ' + error.message);
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  });
});
