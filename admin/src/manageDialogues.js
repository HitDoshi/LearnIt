const SENTENCE_FIELDS = {
  text: "Text",
  roman: "Roman",
  vocab: "Vocab",
  tense: "Tense",
};

let dialogues = [];
let levels = [];
let topics = [];

let editor = null;
let isSaving = false;
let dialogueToDelete = null;

let selectedLanguages = JSON.parse(localStorage.getItem("admin-dialogue-languages") || "null");
let selectedFields = JSON.parse(localStorage.getItem("admin-dialogue-fields") || '["text"]');

const dialoguesTableBody = document.querySelector("#dialoguesTable tbody");
const levelFilter = document.getElementById("levelFilter");
const topicFilter = document.getElementById("topicFilter");
const dialogueSearch = document.getElementById("dialogueSearch");

const sentencesThead = document.querySelector("#sentencesTable thead");
const sentencesTbody = document.querySelector("#sentencesTable tbody");
const descInput = document.getElementById("dialogueDescInput");
const saveDialogueBtn = document.getElementById("saveDialogueBtn");
const discardChangesBtn = document.getElementById("discardChangesBtn");

window.addEventListener("load", loadDialogues);

async function loadDialogues() {
  toggleLoader(true);
  try {
    const response = await adminRequest("get_dialogues.php");
    dialogues = response.data.dialogues || [];
    levels = response.data.levels || [];
    topics = response.data.topics || [];

    renderLevelOptions();
    renderTopicOptions();
    renderDialogues();
  } catch (error) {
    showToast(error.message);
    dialoguesTableBody.innerHTML = `<tr class="empty-row"><td colspan="4">Unable to load dialogues.</td></tr>`;
  } finally {
    toggleLoader(false);
  }
}

function renderLevelOptions() {
  levelFilter.innerHTML =
    `<option value="">All levels</option>` +
    levels
      .map((level) => `<option value="${escapeHtml(level.levelID)}">${escapeHtml(level.levelID)} - ${escapeHtml(level.level_desc)}</option>`)
      .join("");
}

function renderTopicOptions() {
  const level = levelFilter.value;
  const levelTopics = topics.filter((topic) => topic.levelID == level);

  topicFilter.innerHTML =
    `<option value="">All topics</option>` +
    levelTopics
      .map((topic) => {
        const number = String(topic.topicID || "").split(".").pop();
        return `<option value="${escapeHtml(topic.topicID)}">${escapeHtml(number)} - ${escapeHtml(topic.topic_desc)}</option>`;
      })
      .join("");

  topicFilter.disabled = !level;
}

function getTopicName(dialogue) {
  const topic = topics.find((item) => item.topicID == dialogue.topic_id && item.levelID == dialogue.level_id);
  return topic?.topic_desc || "";
}

function getFilteredDialogues() {
  const level = levelFilter.value;
  const topic = topicFilter.value;
  const term = dialogueSearch.value.trim().toLowerCase();

  return dialogues.filter((dialogue) => {
    if (level && dialogue.level_id != level) return false;
    if (topic && dialogue.topic_id != topic) return false;
    if (!term) return true;
    return (
      String(dialogue.dialogue_id || "").toLowerCase().includes(term) ||
      String(dialogue.dialogue_desc || "").toLowerCase().includes(term)
    );
  });
}

function renderDialogues() {
  const list = getFilteredDialogues();
  document.getElementById("dialogueCount").textContent = `${list.length} of ${dialogues.length} dialogues`;

  if (!list.length) {
    dialoguesTableBody.innerHTML = `<tr class="empty-row"><td colspan="4">${dialogues.length ? "No dialogues match your filters." : "No dialogues found."}</td></tr>`;
    return;
  }

  dialoguesTableBody.innerHTML = list
    .map((dialogue) => {
      const topicName = getTopicName(dialogue);
      return `
        <tr data-id="${escapeHtml(dialogue.dialogue_id)}" style="cursor: pointer">
          <td>${escapeHtml(dialogue.dialogue_id)}</td>
          <td>
            ${escapeHtml(dialogue.dialogue_desc || "-")}
            ${topicName ? `<span class="sub-text">${escapeHtml(dialogue.level_id)} &middot; ${escapeHtml(topicName)}</span>` : ""}
          </td>
          <td>${escapeHtml(dialogue.sentences_count ?? "-")}</td>
          <td class="col-actions">
            <button type="button" class="icon-btn" data-action="edit" title="Edit"><i class="fa fa-pencil"></i></button>
            <button type="button" class="icon-btn danger" data-action="delete" title="Delete"><i class="fa fa-trash-o"></i></button>
          </td>
        </tr>`;
    })
    .join("");
}

function findDialogue(dialogueId) {
  return dialogues.find((dialogue) => dialogue.dialogue_id === dialogueId);
}

async function openEditor(dialogue) {
  editor = {
    dialogue,
    sentences: [],
    languages: [],
    pending: {},
  };

  document.getElementById("editorDialogueId").textContent = dialogue.dialogue_id;
  document.getElementById("editorMeta").innerHTML = [dialogue.level_id, getTopicName(dialogue), `${dialogue.sentences_count ?? 0} sentences`]
    .filter(Boolean)
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join("");

  descInput.value = dialogue.dialogue_desc || "";
  descInput.classList.remove("is-changed");
  document.getElementById("languageChips").innerHTML = "";
  document.getElementById("fieldChips").innerHTML = "";
  sentencesThead.innerHTML = "";
  sentencesTbody.innerHTML = `<tr class="empty-row"><td>Loading sentences...</td></tr>`;
  updateEditorButtons();

  $("#dialogueEditorModal").modal("show");

  try {
    const response = await adminRequest(`get_dialogue_sentences.php?dialogue_id=${encodeURIComponent(dialogue.dialogue_id)}`);
    if (editor?.dialogue !== dialogue) return;

    editor.sentences = response.data.sentences || [];
    editor.languages = detectLanguages(editor.sentences);

    if (!selectedLanguages || !selectedLanguages.some((lang) => editor.languages.includes(lang))) {
      selectedLanguages = [...editor.languages];
    }

    renderChips();
    renderSentences();
  } catch (error) {
    sentencesTbody.innerHTML = `<tr class="empty-row"><td>${escapeHtml(error.message)}</td></tr>`;
  }
}

function detectLanguages(sentences) {
  const languages = [];
  sentences.forEach((sentence) => {
    Object.keys(sentence).forEach((key) => {
      const match = key.match(/^([A-Za-z]+)_(text|roman|vocab|tense)$/);
      if (match && !languages.includes(match[1])) {
        languages.push(match[1]);
      }
    });
  });
  return languages;
}

function renderChips() {
  const languageChips = document.getElementById("languageChips");
  const fieldChips = document.getElementById("fieldChips");

  languageChips.innerHTML =
    `<span class="chip-group-label">Languages</span>` +
    editor.languages
      .map((lang) => `<button type="button" class="chip ${selectedLanguages.includes(lang) ? "active" : ""}" data-language="${escapeHtml(lang)}">${escapeHtml(lang)}</button>`)
      .join("");

  fieldChips.innerHTML =
    `<span class="chip-group-label">Fields</span>` +
    Object.entries(SENTENCE_FIELDS)
      .map(([field, label]) => `<button type="button" class="chip ${selectedFields.includes(field) ? "active" : ""}" data-field="${field}">${label}</button>`)
      .join("");
}

function toggleSelection(list, value) {
  if (list.includes(value)) {
    return list.length > 1 ? list.filter((item) => item !== value) : list;
  }
  return [...list, value];
}

function getVisibleColumns() {
  const columns = [];
  editor.languages
    .filter((lang) => selectedLanguages.includes(lang))
    .forEach((lang) => {
      Object.keys(SENTENCE_FIELDS)
        .filter((field) => selectedFields.includes(field))
        .forEach((field) => {
          const key = `${lang}_${field}`;
          if (editor.sentences.some((sentence) => key in sentence)) {
            columns.push({ key, lang, field });
          }
        });
    });
  return columns;
}

function renderSentences() {
  const columns = getVisibleColumns();
  const showFieldName = selectedFields.length > 1 || selectedFields[0] !== "text";

  sentencesThead.innerHTML = `
    <tr>
      <th style="width: 50px">#</th>
      <th style="width: 70px">Speaker</th>
      ${columns.map((col) => `<th>${escapeHtml(col.lang)}${showFieldName ? ` <span class="text-lowercase font-weight-normal">${SENTENCE_FIELDS[col.field]}</span>` : ""}</th>`).join("")}
    </tr>`;

  if (!editor.sentences.length) {
    sentencesTbody.innerHTML = `<tr class="empty-row"><td colspan="${columns.length + 2}">No sentences found for this dialogue.</td></tr>`;
    return;
  }

  sentencesTbody.innerHTML = editor.sentences
    .map((sentence) => {
      const number = String(sentence.sentence_id || "").split(".").pop();
      const cells = columns
        .map((col) => {
          const pendingValue = editor.pending[sentence.id]?.[col.key];
          const value = pendingValue !== undefined ? pendingValue : sentence[col.key] ?? "";
          return `
            <td>
              <textarea class="sentence-field ${pendingValue !== undefined ? "is-changed" : ""}"
                data-id="${escapeHtml(sentence.id)}" data-key="${escapeHtml(col.key)}">${escapeHtml(String(value).trim())}</textarea>
            </td>`;
        })
        .join("");

      return `
        <tr>
          <td title="${escapeHtml(sentence.sentence_id)}">${escapeHtml(number)}</td>
          <td><span class="speaker-tag">${escapeHtml(sentence.speaker || "-")}</span></td>
          ${cells}
        </tr>`;
    })
    .join("");
}

function handleSentenceChange(event) {
  const textarea = event.target;
  if (!textarea.classList.contains("sentence-field")) return;

  const { id, key } = textarea.dataset;
  const sentence = editor.sentences.find((item) => String(item.id) === id);
  const original = String(sentence?.[key] ?? "").trim();
  const value = textarea.value.trim();

  if (value !== original) {
    editor.pending[id] = { ...(editor.pending[id] || {}), [key]: value };
  } else if (editor.pending[id]) {
    delete editor.pending[id][key];
    if (!Object.keys(editor.pending[id]).length) {
      delete editor.pending[id];
    }
  }

  textarea.classList.toggle("is-changed", value !== original);
  updateEditorButtons();
}

function isDescChanged() {
  return editor && descInput.value.trim() !== String(editor.dialogue.dialogue_desc || "").trim();
}

function countChanges() {
  if (!editor) return 0;
  const sentenceChanges = Object.values(editor.pending).reduce((total, fields) => total + Object.keys(fields).length, 0);
  return sentenceChanges + (isDescChanged() ? 1 : 0);
}

function updateEditorButtons() {
  const changes = countChanges();
  saveDialogueBtn.disabled = changes === 0 || isSaving;
  discardChangesBtn.disabled = changes === 0 || isSaving;
  document.getElementById("changeCount").textContent = changes ? `${changes} unsaved change${changes > 1 ? "s" : ""}` : "";
}

function discardChanges() {
  if (!editor) return;
  editor.pending = {};
  descInput.value = editor.dialogue.dialogue_desc || "";
  descInput.classList.remove("is-changed");
  renderSentences();
  updateEditorButtons();
}

async function saveDialogue() {
  if (!editor || !countChanges()) return;

  const payload = { dialogue_id: editor.dialogue.dialogue_id };

  if (isDescChanged()) {
    const desc = descInput.value.trim();
    if (!desc) {
      showToast("Description cannot be empty.");
      return;
    }
    payload.dialogue_desc = desc;
  }

  payload.sentences = Object.entries(editor.pending).map(([id, fields]) => ({ id: Number(id), ...fields }));

  const spinner = document.getElementById("saveDialogueSpinner");
  isSaving = true;
  spinner.classList.remove("d-none");
  updateEditorButtons();

  try {
    const response = await adminRequest("update_dialogue.php", payload);

    if (payload.dialogue_desc) {
      editor.dialogue.dialogue_desc = payload.dialogue_desc;
    }
    payload.sentences.forEach((change) => {
      const sentence = editor.sentences.find((item) => String(item.id) === String(change.id));
      if (sentence) Object.assign(sentence, change);
    });
    editor.pending = {};

    showToast(response.message || "Dialogue updated.");
    renderDialogues();
    $("#dialogueEditorModal").modal("hide");
  } catch (error) {
    showToast(error.message);
  } finally {
    isSaving = false;
    spinner.classList.add("d-none");
    updateEditorButtons();
  }
}

function openDeleteModal(dialogue) {
  dialogueToDelete = dialogue;
  document.getElementById("deleteDialogueId").textContent = dialogue.dialogue_id;
  document.getElementById("deleteDialogueDesc").textContent = dialogue.dialogue_desc || "";
  document.getElementById("confirmDeleteDialogueBtn").disabled = false;
  $("#deleteDialogueModal").modal("show");
}

async function deleteDialogue() {
  if (!dialogueToDelete) return;

  const confirmBtn = document.getElementById("confirmDeleteDialogueBtn");
  const spinner = document.getElementById("deleteDialogueSpinner");
  confirmBtn.disabled = true;
  spinner.classList.remove("d-none");

  try {
    const response = await adminRequest("delete_dialogue.php", { dialogue_id: dialogueToDelete.dialogue_id });
    dialogues = dialogues.filter((dialogue) => dialogue !== dialogueToDelete);
    dialogueToDelete = null;
    renderDialogues();
    $("#deleteDialogueModal").modal("hide");
    showToast(response.message || "Dialogue deleted.");
  } catch (error) {
    showToast(error.message);
    confirmBtn.disabled = false;
  } finally {
    spinner.classList.add("d-none");
  }
}

dialoguesTableBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-id]");
  if (!row) return;

  const dialogue = findDialogue(row.dataset.id);
  if (!dialogue) return;

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "delete") {
    openDeleteModal(dialogue);
  } else {
    openEditor(dialogue);
  }
});

document.getElementById("languageChips").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-language]");
  if (!chip) return;

  const nextLanguages = toggleSelection(selectedLanguages, chip.dataset.language);
  if (!nextLanguages.some((lang) => editor.languages.includes(lang))) return;

  selectedLanguages = nextLanguages;
  localStorage.setItem("admin-dialogue-languages", JSON.stringify(selectedLanguages));
  renderChips();
  renderSentences();
});

document.getElementById("fieldChips").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-field]");
  if (!chip) return;

  selectedFields = toggleSelection(selectedFields, chip.dataset.field);
  localStorage.setItem("admin-dialogue-fields", JSON.stringify(selectedFields));
  renderChips();
  renderSentences();
});

sentencesTbody.addEventListener("input", handleSentenceChange);

descInput.addEventListener("input", () => {
  descInput.classList.toggle("is-changed", isDescChanged());
  updateEditorButtons();
});

saveDialogueBtn.addEventListener("click", saveDialogue);
discardChangesBtn.addEventListener("click", discardChanges);
document.getElementById("confirmDeleteDialogueBtn").addEventListener("click", deleteDialogue);

$("#dialogueEditorModal").on("hide.bs.modal", (event) => {
  if (!isSaving && countChanges() > 0 && !confirm("You have unsaved changes. Close without saving?")) {
    event.preventDefault();
  }
});

$("#dialogueEditorModal").on("hidden.bs.modal", () => {
  editor = null;
});

levelFilter.addEventListener("change", () => {
  renderTopicOptions();
  renderDialogues();
});

topicFilter.addEventListener("change", renderDialogues);
dialogueSearch.addEventListener("input", renderDialogues);

document.getElementById("backButton").onclick = function () {
  window.location.href = "admin.html";
};
