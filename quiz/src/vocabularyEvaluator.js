function _statEntryCount(statStr) {
  if (!statStr || String(statStr).trim() === "") return 0;
  return String(statStr)
    .trim()
    .split("|")
    .filter((v) => v.trim() !== "").length;
}

function _openIDB(name, version) {
  return new Promise((resolve, reject) => {
    const req = (
      window.indexedDB ||
      window.mozIndexedDB ||
      window.webkitIndexedDB ||
      window.msIndexedDB
    ).open(name, version);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
    req.onupgradeneeded = () => { };
  });
}

function _getAllRecords(idb, storeName) {
  return new Promise((resolve, reject) => {
    if (!idb.objectStoreNames.contains(storeName)) return resolve([]);
    const tx = idb.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

function _putRecord(idb, storeName, record) {
  return new Promise((resolve, reject) => {
    if (!idb.objectStoreNames.contains(storeName)) return resolve();
    const tx = idb.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

async function gatherEvaluationCandidates() {
  const candidates = [];

  try {
    const testDB = await _openIDB("test", 1);
    const testRecords = await _getAllRecords(testDB, "data");
    testDB.close();

    for (const rec of testRecords) {
      if (
        rec.showInDays === 0 &&
        !rec.isSkip &&
        _statEntryCount(rec.showInDaysStat) >= 5
      ) {
        candidates.push({
          dbName: "test",
          storeName: "data",
          id: rec.id,
          source: rec.source || "",
          target: rec.target || "",
          interval_string: String(rec.showInDaysStat || ""),
        });
      }
    }
  } catch (err) {
    console.warn("[VocabEval] Could not read 'test' DB:", err);
  }

  try {
    const userDB = await _openIDB("user", 1);
    const userRecords = await _getAllRecords(userDB, "userData");
    userDB.close();

    for (const rec of userRecords) {
      if (
        rec.showInDays === 0 &&
        !rec.isSkip &&
        _statEntryCount(rec.showInDaysStat) >= 5
      ) {
        candidates.push({
          dbName: "user",
          storeName: "userData",
          id: rec.id,
          source: rec.source || "",
          target: rec.target || "",
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

async function callAIEvaluation(candidates) {
  if (!candidates || candidates.length === 0) return null;

  const sourceLangObj = JSON.parse(localStorage.getItem("source-language") || "{}");
  const targetLangObj = JSON.parse(localStorage.getItem("target-language") || "{}");

  const sourceLang = sourceLangObj?.description || sourceLangObj?.name || "Unknown";
  const targetLang = targetLangObj?.description || targetLangObj?.name || "Unknown";

  const words = candidates.map((c) => ({
    source: c.source,
    target: c.target,
    interval_string: c.interval_string,
  }));

  const selectedModel =
    typeof getSelectedModel === "function"
      ? getSelectedModel()
      : "gemini-2.5-flash";

  try {
    const response = await fetch(`${API_URL}/api/evaluate_vocabulary.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_language: sourceLang,
        target_language: targetLang,
        words: words,
        model: selectedModel,
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

async function applyEvaluationResults(candidates, evaluations) {
  if (!evaluations || evaluations.length === 0) return;

  const evalMap = new Map();
  for (const ev of evaluations) {
    const key = `${(ev.source || "").trim()}||${(ev.target || "").trim()}`;
    evalMap.set(key, ev);
  }

  const groups = {};
  for (const candidate of candidates) {
    const groupKey = `${candidate.dbName}:${candidate.storeName}`;
    if (!groups[groupKey]) {
      groups[groupKey] = {
        dbName: candidate.dbName,
        storeName: candidate.storeName,
        items: [],
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
      const ev = evalMap.get(lookupKey);

      if (!ev) {
        console.log(`[VocabEval] No evaluation returned for: ${lookupKey}`);
        continue;
      }

      try {
        const record = await new Promise((resolve, reject) => {
          if (!idb.objectStoreNames.contains(storeName)) return resolve(null);
          const tx = idb.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const req = store.get(candidate.id);
          req.onsuccess = (e) => resolve(e.target.result);
          req.onerror = (e) => reject(e.target.error);
        });

        if (!record) {
          console.log(`[VocabEval] Record id=${candidate.id} not found in ${dbName}.${storeName}`);
          continue;
        }

        record.probability = parseFloat(ev.probability_weight) || 0.0;
        record.status = String(ev.status || "N").toUpperCase().charAt(0);

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

async function applyDefaultProbability() {
  const DB_TARGETS = [
    { dbName: "test", storeName: "data" },
    { dbName: "user", storeName: "userData" },
  ];

  for (const { dbName, storeName } of DB_TARGETS) {
    let idb;
    try {
      idb = await _openIDB(dbName, 1);
    } catch (err) {
      console.warn(`[VocabEval] applyDefaultProbability: cannot open DB "${dbName}":`, err);
      continue;
    }

    try {
      const records = await _getAllRecords(idb, storeName);
      let updatedCount = 0;

      for (const rec of records) {
        if (
          rec.showInDays === 0 &&
          !rec.isSkip &&
          _statEntryCount(rec.showInDaysStat) < 5
        ) {
          rec.probability = DEFAULT_PROBABILITY;
          rec.status = 'N';
          await _putRecord(idb, storeName, rec);
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        console.log(`[VocabEval] ✓ Default probability=${DEFAULT_PROBABILITY} applied to ${updatedCount} record(s) in ${dbName}.${storeName}`);
      }
    } catch (err) {
      console.warn(`[VocabEval] applyDefaultProbability error in "${dbName}":`, err);
    } finally {
      idb.close();
    }
  }
}

async function runVocabularyEvaluation() {
  console.log("[VocabEval] Starting vocabulary evaluation…");

  try {
    await applyDefaultProbability();

  } catch (error) {

  }


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
    console.error("[VocabEval] Unhandled error:", err);
  }
}
