/**
 * vocabularyEvaluator.js
 *
 * Vocabulary Retention AI Evaluator  (client-side orchestrator)
 * -------------------------------------------------------------
 * Triggered when the NS (Next Session) flag is reset – i.e. the first
 * correct entry of a new session (see resetNSData() in test.js).
 *
 * Flow:
 *  1. Gather eligible records from BOTH IndexedDBs
 *     Criteria: showInDays === 0, isSkip falsy, stats string >= 5 values
 *  2. POST the word list to /api/evaluate_vocabulary.php
 *     (prompt, Gemini API key, and AI logic all live on the backend)
 *  3. Parse the response and write `probability` + `status` back to IndexedDB
 */

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

/**
 * Count pipe-separated values in a stats string.
 * "1|2|3|4|5" → 5,   "1|2|3" → 3,   "" → 0
 */
function _statEntryCount(statStr) {
  if (!statStr || String(statStr).trim() === "") return 0;
  return String(statStr)
    .trim()
    .split("|")
    .filter((v) => v.trim() !== "").length;
}

/**
 * Open an IndexedDB by name + version. Returns Promise<IDBDatabase>.
 */
function _openIDB(name, version) {
  return new Promise((resolve, reject) => {
    const req = (
      window.indexedDB ||
      window.mozIndexedDB ||
      window.webkitIndexedDB ||
      window.msIndexedDB
    ).open(name, version);
    req.onsuccess      = (e) => resolve(e.target.result);
    req.onerror        = (e) => reject(e.target.error);
    req.onupgradeneeded = () => {}; // no-op – we never create stores here
  });
}

/**
 * Read all records from a store. Returns Promise<Array>.
 */
function _getAllRecords(idb, storeName) {
  return new Promise((resolve, reject) => {
    if (!idb.objectStoreNames.contains(storeName)) return resolve([]);
    const tx    = idb.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req   = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror   = (e) => reject(e.target.error);
  });
}

/**
 * Write a single record back (put). Returns Promise.
 */
function _putRecord(idb, storeName, record) {
  return new Promise((resolve, reject) => {
    if (!idb.objectStoreNames.contains(storeName)) return resolve();
    const tx    = idb.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req   = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ─────────────────────────────────────────────
//  Step 1 – Gather candidates from both DBs
// ─────────────────────────────────────────────

/**
 * Scans both IndexedDBs and returns candidates:
 *   { dbName, storeName, id, source, target, interval_string }
 *
 * Selection criteria:
 *   - showInDays === 0
 *   - isSkip is falsy
 *   - showInDaysStat has >= 5 pipe-separated values
 */
async function gatherEvaluationCandidates() {
  const candidates = [];

  // ── App DB: "test" / store "data" ────────────────────────────────────
  try {
    const testDB      = await _openIDB("test", 1);
    const testRecords = await _getAllRecords(testDB, "data");
    testDB.close();

    for (const rec of testRecords) {
      if (
        rec.showInDays === 0 &&
        !rec.isSkip &&
        _statEntryCount(rec.showInDaysStat) >= 5
      ) {
        candidates.push({
          dbName:          "test",
          storeName:       "data",
          id:              rec.id,
          source:          rec.source || "",
          target:          rec.target || "",
          interval_string: String(rec.showInDaysStat || ""),
        });
      }
    }
  } catch (err) {
    console.warn("[VocabEval] Could not read 'test' DB:", err);
  }

  // ── User DB: "user" / store "userData" ───────────────────────────────
  try {
    const userDB      = await _openIDB("user", 1);
    const userRecords = await _getAllRecords(userDB, "userData");
    userDB.close();

    for (const rec of userRecords) {
      if (
        rec.showInDays === 0 &&
        !rec.isSkip &&
        _statEntryCount(rec.showInDaysStat) >= 5
      ) {
        candidates.push({
          dbName:          "user",
          storeName:       "userData",
          id:              rec.id,
          source:          rec.source || "",
          target:          rec.target || "",
          interval_string: String(rec.showInDaysStat || ""),
        });
      }
    }
  } catch (err) {
    console.warn("[VocabEval] Could not read 'user' DB:", err);
  }

  console.log(`[VocabEval] ${candidates.length} candidate(s) found.`);
  return candidates;
}

// ─────────────────────────────────────────────
//  Step 2 – Call backend evaluation endpoint
// ─────────────────────────────────────────────

/**
 * POSTs the word list to the backend evaluate_vocabulary.php endpoint.
 * The backend owns the prompt, the Gemini API key, and all AI logic.
 *
 * Returns the evaluations array on success, or null on failure.
 */
async function callAIEvaluation(candidates) {
  if (!candidates || candidates.length === 0) return null;

  const sourceLangObj = JSON.parse(localStorage.getItem("source-language") || "{}");
  const targetLangObj = JSON.parse(localStorage.getItem("target-language") || "{}");

  const sourceLang = sourceLangObj?.description || sourceLangObj?.name || "Unknown";
  const targetLang = targetLangObj?.description || targetLangObj?.name || "Unknown";

  // Only send the fields the backend needs
  const words = candidates.map((c) => ({
    source:          c.source,
    target:          c.target,
    interval_string: c.interval_string,
  }));

  const selectedModel =
    typeof getSelectedModel === "function"
      ? getSelectedModel()
      : "gemini-2.5-flash";

  try {
    const response = await fetch(`${API_URL}/api/evaluate_vocabulary.php`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        source_language: sourceLang,
        target_language: targetLang,
        words:           words,
        model:           selectedModel,
      }),
    });

    const resData = await response.json();
    console.log("[VocabEval] Backend response:", resData);

    if (!resData?.success) {
      console.warn("[VocabEval] Evaluation failed:", resData?.message);
      return null;
    }

    const evaluations = resData?.data?.evaluations;
    if (!Array.isArray(evaluations)) {
      console.warn("[VocabEval] Unexpected response shape:", resData);
      return null;
    }

    console.log(`[VocabEval] Received ${evaluations.length} evaluation(s).`);
    return evaluations;

  } catch (err) {
    console.error("[VocabEval] Error calling backend:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
//  Step 3 – Write results back to IndexedDB
// ─────────────────────────────────────────────

/**
 * Matches each AI evaluation to its DB record via source+target key,
 * then writes `probability` and `status` into IndexedDB.
 */
async function applyEvaluationResults(candidates, evaluations) {
  if (!evaluations || evaluations.length === 0) return;

  // Build lookup: "source||target" → evaluation
  const evalMap = new Map();
  for (const ev of evaluations) {
    const key = `${(ev.source || "").trim()}||${(ev.target || "").trim()}`;
    evalMap.set(key, ev);
  }

  // Group candidates by DB so we open each DB only once
  const groups = {};
  for (const candidate of candidates) {
    const groupKey = `${candidate.dbName}:${candidate.storeName}`;
    if (!groups[groupKey]) {
      groups[groupKey] = {
        dbName:    candidate.dbName,
        storeName: candidate.storeName,
        items:     [],
      };
    }
    groups[groupKey].items.push(candidate);
  }

  for (const groupKey of Object.keys(groups)) {
    const { dbName, storeName, items } = groups[groupKey];

    let idb;
    try {
      idb = await _openIDB(dbName, 1);
    } catch (err) {
      console.warn(`[VocabEval] Cannot open DB "${dbName}":`, err);
      continue;
    }

    for (const candidate of items) {
      const lookupKey = `${candidate.source.trim()}||${candidate.target.trim()}`;
      const ev        = evalMap.get(lookupKey);

      if (!ev) {
        console.log(`[VocabEval] No evaluation returned for: ${lookupKey}`);
        continue;
      }

      try {
        // Read the full record first
        const record = await new Promise((resolve, reject) => {
          if (!idb.objectStoreNames.contains(storeName)) return resolve(null);
          const tx    = idb.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const req   = store.get(candidate.id);
          req.onsuccess = (e) => resolve(e.target.result);
          req.onerror   = (e) => reject(e.target.error);
        });

        if (!record) {
          console.log(`[VocabEval] Record id=${candidate.id} not found in ${dbName}.${storeName}`);
          continue;
        }

        // Apply the two new fields
        record.probability = parseFloat(ev.probability_weight) || 0.0;
        record.status      = String(ev.status || "N").toUpperCase().charAt(0);

        await _putRecord(idb, storeName, record);
        console.log(
          `[VocabEval] ✓ id=${candidate.id} [${dbName}.${storeName}] → ` +
          `probability=${record.probability}, status=${record.status}`
        );
      } catch (err) {
        console.warn(`[VocabEval] Failed to update id=${candidate.id}:`, err);
      }
    }

    idb.close();
  }
}

// ─────────────────────────────────────────────
//  Main Orchestrator
// ─────────────────────────────────────────────

/**
 * Called by test.js after the NS flag is reset (start of a new session).
 * Runs fully in the background – never blocks the session flow.
 */
async function runVocabularyEvaluation() {
  console.log("[VocabEval] Starting vocabulary evaluation…");
  try {
    const candidates = await gatherEvaluationCandidates();

    if (candidates.length === 0) {
      console.log("[VocabEval] No eligible candidates. Skipping.");
      return;
    }

    const evaluations = await callAIEvaluation(candidates);

    if (!evaluations) {
      console.log("[VocabEval] No evaluations returned.");
      return;
    }

    await applyEvaluationResults(candidates, evaluations);
    console.log("[VocabEval] Evaluation complete.");
  } catch (err) {
    // Never let evaluation errors crash the session
    console.error("[VocabEval] Unhandled error:", err);
  }
}
