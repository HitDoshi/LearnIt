let sentencesData = [];
let editableColumns = [];
let pendingChanges = {};
let selectedDialogue = null;

let sentencesTable = null;
let sentencesThead = null;
let sentencesTbody = null;
let selectedDialogueLabel = null;
let selectedDialogueMeta = null;
let saveButton = null;
let discardButton = null;
let loadingOverlay = null;
let editSentencesModalEl = null;

let modalInstance = null;

// Function to get elements (call after DOM is ready)
function getElements() {
  sentencesTable = document.getElementById("sentencesTable");
  sentencesThead = sentencesTable?.querySelector("thead");
  sentencesTbody = sentencesTable?.querySelector("tbody");
  selectedDialogueLabel = document.getElementById("selectedDialogueLabel");
  selectedDialogueMeta = document.getElementById("selectedDialogueMeta");
  saveButton = document.getElementById("saveSentencesBtn");
  discardButton = document.getElementById("discardChangesBtn");
  loadingOverlay = document.getElementById("sentencesLoading");
  editSentencesModalEl = document.getElementById("editSentencesModal");

  // Attach event listeners
  if (saveButton) {
    saveButton.addEventListener("click", saveSentenceChanges);
  }

  if (discardButton) {
    discardButton.addEventListener("click", discardPendingChanges);
  }
}

// Function to initialize modal instance
function initEditSentencesModal() {
  getElements();
  if (typeof bootstrap !== 'undefined' && editSentencesModalEl && !modalInstance) {
    modalInstance = new bootstrap.Modal(editSentencesModalEl);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditSentencesModal);
} else {
  // Small delay to ensure Bootstrap 5 is loaded
  setTimeout(initEditSentencesModal, 100);
}

// Also expose globally for delayed initialization
window.initEditSentencesModal = initEditSentencesModal;

// Function to open modal with dialogue data (exposed globally)
window.openEditSentencesModal = function openEditSentencesModal(dialogue) {
  if (!dialogue) return;

  // Ensure elements are available
  if (!sentencesTable) {
    getElements();
  }

  selectedDialogue = dialogue;
  pendingChanges = {};

  if (selectedDialogueLabel) {
    selectedDialogueLabel.textContent = `Dialogue ${dialogue?.dialogue_id || "-"}`;
  }
  if (selectedDialogueMeta) {
    selectedDialogueMeta.textContent = dialogue?.dialogue_desc || "";
  }

  clearSentencesTable();
  updateActionButtons();

  if (modalInstance) {
    modalInstance.show();
  } else if (editSentencesModalEl) {
    // Fallback for Bootstrap 4
    $(editSentencesModalEl).modal('show');
  } else {
    // Try to initialize if not done yet
    initEditSentencesModal();
    if (modalInstance) {
      modalInstance.show();
    }
  }

  fetchSentencesForDialogue(dialogue);
}

async function fetchSentencesForDialogue(dialogue) {
  if (!dialogue?.dialogue_id) return;

  toggleSentencesLoading(true);
  clearSentencesTable();

  const token = localStorage.getItem("token") || "";


  try {
    const url = `${API_URL}/api/get_dialogue_sentences.php?dialogue_id=${dialogue.dialogue_id}&token=${token}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }

    const responseData = await response.json();

    if (responseData?.success) {
      sentencesData = responseData?.data || [];
      computeEditableColumns(sentencesData);
      renderSentencesTable();
    } else {
      sentencesData = [];
      showEmptySentences(responseData?.message || "No sentences found.");
    }
  } catch (error) {
    sentencesData = [];
    showEmptySentences(error?.message || "Unable to load sentences.");
    showToast(error?.message || "Unable to load sentences.");
  } finally {
    toggleSentencesLoading(false);
  }
}

function computeEditableColumns(items) {
  const lockedColumns = ["sentence_id", "speaker"]; // Removed "id" column
  const ignored = ["id", "dialogue_id", "level_id", "topic_id", "created_at", "updated_at"];
  const set = new Set();

  items.forEach((item) => {
    Object.keys(item || {}).forEach((key) => {
      if (lockedColumns.includes(key) || ignored.includes(key)) return;
      set.add(key);
    });
  });

  editableColumns = Array.from(set).sort();
}

function renderSentencesTable() {
  const lockedColumns = ["sentence_id", "speaker"]; // Removed "id" column

  // Ensure elements are available
  if (!sentencesTable) {
    getElements();
  }

  if (!sentencesTable || !sentencesThead || !sentencesTbody) return;

  clearSentencesTable();

  if (!sentencesData.length) {
    showEmptySentences("No sentences found for this dialogue.");
    return;
  }

  const headRow = document.createElement("tr");
  [...lockedColumns, ...editableColumns].forEach((col) => {
    const th = document.createElement("th");
    th.textContent = formatHeader(col);
    // Add specific styling for sentence_id column to prevent wrapping
    if (col === "sentence_id") {
      th.style.whiteSpace = "nowrap";
      th.style.minWidth = "fit-content";
    }
    headRow.appendChild(th);
  });
  sentencesThead.appendChild(headRow);

  sentencesData.forEach((sentence) => {
    const tr = document.createElement("tr");

    lockedColumns.forEach((col, index) => {
      const td = document.createElement("td");
      td.textContent = sentence?.[col] ?? "";
      // Add specific styling for sentence_id column to prevent wrapping
      if (col === "sentence_id") {
        td.className = "sentence-id-cell";
        td.style.whiteSpace = "nowrap";
        td.style.minWidth = "fit-content";
      } else if (col === "speaker") {
        td.className = "speaker-cell";
      }
      tr.appendChild(td);
    });

    editableColumns.forEach((col) => {
      const td = document.createElement("td");
      const input = document.createElement("textarea");
      input.className = "sentence-input";
      input.dataset.id = sentence?.id;
      input.dataset.field = col;
      // Trim the value when displaying
      input.value = (sentence?.[col] ?? "").toString().trim();
      input.addEventListener("input", handleCellChange);
      td.appendChild(input);
      tr.appendChild(td);
    });

    sentencesTbody.appendChild(tr);
  });

  updateActionButtons();
}

function formatHeader(key = "") {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function handleCellChange(event) {
  const textarea = event.target;
  const id = textarea?.dataset?.id;
  const field = textarea?.dataset?.field;

  if (!id || !field) return;

  const originalSentence = sentencesData.find((s) => String(s?.id) === String(id));
  // Trim original value for comparison
  const originalValue = originalSentence ? (originalSentence[field] ?? "").toString().trim() : "";
  // Trim new value
  const newValue = textarea.value.trim();

  if (newValue !== originalValue) {
    if (!pendingChanges[id]) {
      pendingChanges[id] = { id: parseInt(id), updates: {} };
    }
    // Store trimmed value
    pendingChanges[id].updates[field] = newValue;
  } else if (pendingChanges[id]) {
    delete pendingChanges[id].updates[field];
    if (Object.keys(pendingChanges[id].updates).length === 0) {
      delete pendingChanges[id];
    }
  }

  updateActionButtons();
}

function updateActionButtons() {
  // Ensure elements are available
  if (!saveButton || !discardButton) {
    getElements();
  }
  const hasChanges = Object.keys(pendingChanges).length > 0;
  if (saveButton) {
    saveButton.disabled = !hasChanges || !selectedDialogue;
  }
  if (discardButton) {
    discardButton.disabled = !hasChanges;
  }
}

function clearSentencesTable() {
  // Ensure elements are available
  if (!sentencesTable) {
    getElements();
  }
  if (sentencesThead) sentencesThead.innerHTML = "";
  if (sentencesTbody) sentencesTbody.innerHTML = "";
}

function showEmptySentences(message) {
  clearSentencesTable();
  if (!sentencesTbody) return;

  const row = document.createElement("tr");
  const td = document.createElement("td");
  // Updated colspan calculation (removed "id" column, so it's 2 + editableColumns.length)
  td.colSpan = Math.max(1, 2 + editableColumns.length);
  td.className = "text-center";
  td.textContent = message || "No data found.";
  row.appendChild(td);
  sentencesTbody.appendChild(row);

  updateActionButtons();
}

function discardPendingChanges() {
  if (!Object.keys(pendingChanges).length) return;
  pendingChanges = {};
  renderSentencesTable();
}

async function saveSentenceChanges() {
  if (!selectedDialogue?.dialogue_id) {
    showToast("Please select a dialogue first.");
    return;
  }

  if (!Object.keys(pendingChanges).length) {
    showToast("No changes to save.");
    return;
  }

  toggleSentencesLoading(true);

  try {
    const isUserDialogue = selectedDialogue.dialogue_id.startsWith("A0.00.");
    const payload = {
      dialogue_id: selectedDialogue.dialogue_id,
      sentences: Object.values(pendingChanges).map((item) => {
        const updates = {};
        // Trim all update values
        Object.keys(item.updates).forEach((key) => {
          updates[key] = String(item.updates[key] || "").trim();
        });
        const originalSentence = sentencesData.find((s) => String(s?.id) === String(item.id));
        return {
          id: item.id,
          sentence_id: originalSentence ? originalSentence.sentence_id : undefined,
          ...updates,
        };
      }),
    };

    const token = localStorage.getItem("token");

    const endpoint = isUserDialogue
      ? "/api/update_user_dialogue_sentences.php"
      : "/api/update_dialogue_sentences.php";

    const response = await fetch(
      `${API_URL}${endpoint}?token=${token}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (data?.success) {
      showToast(data?.message || "Sentences updated.");
      pendingChanges = {};
      await fetchSentencesForDialogue(selectedDialogue);
      $(editSentencesModalEl).modal('hide');
    } else {
      showToast(data?.message || "Unable to save changes.");
    }
  } catch (error) {
    showToast(error?.message || "Unable to save changes.");
  } finally {
    toggleSentencesLoading(false);
  }
}

function toggleSentencesLoading(isLoading) {
  // Ensure elements are available
  if (!loadingOverlay) {
    getElements();
  }
  if (!loadingOverlay) return;
  if (isLoading) {
    loadingOverlay.classList.remove("d-none");
  } else {
    loadingOverlay.classList.add("d-none");
  }
}

