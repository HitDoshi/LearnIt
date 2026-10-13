const FIELD_LABELS = {
  id: "User ID",
  username: "User Name",
  email: "Email",
  usertype: "User Type",
  maxud: "MaxUD",
  maxuddialogue: "MaxUD Dialogues",
  ai_enable: "AI Features",
  enableaudio: "Audio Upload",
  secondaryenable: "Secondary Language",
  db: "Database",
  isauth: "Sign-in Method",
  user_context: "User Context",
  createdat: "Created",
  updatedat: "Updated",
};

const userId = new URLSearchParams(window.location.search).get("id");
const currentAdmin = JSON.parse(localStorage.getItem("user") || "{}");
const isOwnAccount = String(currentAdmin?.id) === String(userId);

let userData = null;
let userStats = {};
let editableFields = {};
let pendingChanges = {};

const settingsFields = document.getElementById("settingsFields");
const flagFields = document.getElementById("flagFields");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const resetSettingsBtn = document.getElementById("resetSettingsBtn");

window.addEventListener("load", loadUser);

async function loadUser() {
  if (!userId) {
    showNotFound("No user selected.");
    return;
  }

  toggleLoader(true);
  try {
    const response = await adminRequest(`get_user.php?id=${encodeURIComponent(userId)}`);
    userData = response.data.user;
    userStats = response.data.stats || {};
    editableFields = response.data.editable || {};

    renderSummary();
    renderSettings();
    renderDetails();

    document.getElementById("deleteUserCard").classList.toggle("d-none", isOwnAccount);
    document.getElementById("userInfoContent").classList.remove("d-none");
  } catch (error) {
    showNotFound(error.message);
  } finally {
    toggleLoader(false);
  }
}

function showNotFound(message) {
  document.getElementById("userNotFoundText").textContent = message;
  document.getElementById("userNotFound").classList.remove("d-none");
}

function getField(key) {
  const match = Object.keys(userData || {}).find((field) => field.toLowerCase() === key.toLowerCase());
  return match ? userData[match] : undefined;
}

function getFieldLabel(key) {
  const label = FIELD_LABELS[key.toLowerCase()];
  if (label) return label;

  const words = key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatFieldValue(key, value) {
  if (value === null || value === undefined || value === "") return "-";

  const lowerKey = key.toLowerCase();
  if (lowerKey === "isauth") return String(value) === "1" ? "Google" : "Email & Password";
  if (lowerKey === "usertype") return USER_TYPES[value] || value;
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return formatDateTime(value);

  return String(value);
}

function renderSummary() {
  const stats = userStats;
  const name = getField("userName")?.trim() || "(no name)";
  const email = getField("email") || "";

  document.getElementById("userAvatar").textContent = (name !== "(no name)" ? name : email).charAt(0) || "?";
  document.getElementById("summaryName").textContent = name;
  document.getElementById("summaryType").innerHTML = getUserTypeBadge(getField("userType"));
  document.getElementById("summaryEmail").textContent = email;

  document.getElementById("statLastAccessed").innerHTML = stats.lastAccessed
    ? `${formatDateTime(stats.lastAccessed)}<span class="sub-text">${timeAgo(stats.lastAccessed)}</span>`
    : "No activity";

  document.getElementById("statWords").textContent = Number(stats.words || 0).toLocaleString();

  const maxDialogues = getField("maxUDDialogue");
  document.getElementById("statDialogues").textContent =
    stats.userDialogues === null || stats.userDialogues === undefined
      ? "-"
      : maxDialogues !== undefined && maxDialogues !== null
        ? `${stats.userDialogues} / ${maxDialogues}`
        : stats.userDialogues;

  const images = Number(stats.mnemonicImages || 0);
  const imageLimit = Number(stats.mnemonicImageLimit || 0);
  const imagesEl = document.getElementById("statImages");
  imagesEl.textContent = imageLimit ? `${images} / ${imageLimit}` : images;
  imagesEl.classList.toggle("limit-reached", imageLimit > 0 && images >= imageLimit);
}

function getOriginalValue(field) {
  const value = userData[field];
  const type = editableFields[field];

  if (type === "flag") return String(value || "").toUpperCase() === "Y" ? "Y" : "N";
  if (type === "number") return String(Number(value) || 0);
  return String(value ?? "");
}

function renderSettings() {
  settingsFields.innerHTML = "";
  flagFields.innerHTML = "";
  pendingChanges = {};

  Object.entries(editableFields).forEach(([field, type]) => {
    if (type === "flag") {
      flagFields.appendChild(createFlagField(field));
    } else {
      settingsFields.appendChild(createInputField(field, type));
    }
  });

  flagFields.classList.toggle("d-none", !flagFields.children.length);
  updateSettingsButtons();
}

function createInputField(field, type) {
  const wrapper = document.createElement("div");
  const inputId = `field-${field}`;
  const label = document.createElement("label");
  label.htmlFor = inputId;
  label.textContent = getFieldLabel(field);
  wrapper.appendChild(label);

  let input;

  if (type === "userType") {
    input = document.createElement("select");
    input.className = "custom-select";
    Object.entries(USER_TYPES).forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      input.appendChild(option);
    });
    input.disabled = isOwnAccount;
  } else {
    input = document.createElement("input");
    input.className = "form-control";
    input.type = type === "number" ? "number" : "text";
    if (type === "number") {
      input.min = "0";
      input.step = "1";
    } else {
      input.maxLength = 100;
    }
  }

  input.id = inputId;
  input.dataset.field = field;
  input.value = getOriginalValue(field);
  input.addEventListener("input", handleSettingChange);
  input.addEventListener("change", handleSettingChange);
  wrapper.appendChild(input);

  if (type === "userType" && isOwnAccount) {
    const hint = document.createElement("small");
    hint.className = "text-muted";
    hint.textContent = "You can't change your own user type.";
    wrapper.appendChild(hint);
  }

  return wrapper;
}

function createFlagField(field) {
  const wrapper = document.createElement("div");
  wrapper.className = "custom-control custom-switch";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "custom-control-input";
  input.id = `field-${field}`;
  input.dataset.field = field;
  input.checked = getOriginalValue(field) === "Y";
  input.addEventListener("change", handleSettingChange);

  const label = document.createElement("label");
  label.className = "custom-control-label";
  label.htmlFor = input.id;
  label.textContent = getFieldLabel(field);

  wrapper.appendChild(input);
  wrapper.appendChild(label);
  return wrapper;
}

function handleSettingChange(event) {
  const input = event.target;
  const field = input.dataset.field;
  const type = editableFields[field];

  let value;
  if (type === "flag") {
    value = input.checked ? "Y" : "N";
  } else if (type === "number") {
    value = input.value === "" ? "" : String(Number(input.value));
  } else {
    value = input.value.trim();
  }

  const isChanged = value !== getOriginalValue(field);
  if (isChanged) {
    pendingChanges[field] = value;
  } else {
    delete pendingChanges[field];
  }

  const highlightEl = type === "flag" ? input.closest(".custom-control") : input;
  highlightEl.classList.toggle("is-changed", isChanged);

  updateSettingsButtons();
}

function updateSettingsButtons() {
  const hasChanges = Object.keys(pendingChanges).length > 0;
  saveSettingsBtn.disabled = !hasChanges;
  resetSettingsBtn.disabled = !hasChanges;
}

function validateChanges() {
  for (const [field, value] of Object.entries(pendingChanges)) {
    const type = editableFields[field];
    const label = getFieldLabel(field);

    if (type === "text" && !value) {
      return `${label} cannot be empty.`;
    }
    if (type === "number" && (value === "" || !Number.isInteger(Number(value)) || Number(value) < 0)) {
      return `${label} must be a whole number (0 or more).`;
    }
  }
  return null;
}

async function saveSettings(event) {
  event.preventDefault();
  if (!Object.keys(pendingChanges).length) return;

  const validationError = validateChanges();
  if (validationError) {
    showToast(validationError);
    return;
  }

  const spinner = document.getElementById("saveSettingsSpinner");
  saveSettingsBtn.disabled = true;
  resetSettingsBtn.disabled = true;
  spinner.classList.remove("d-none");

  try {
    const response = await adminRequest("update_user.php", { id: Number(userId), data: pendingChanges });
    userData = response.data;

    if (isOwnAccount) {
      localStorage.setItem("user", JSON.stringify({ ...currentAdmin, ...userData }));
    }

    showToast(response.message || "User updated.");
    renderSummary();
    renderSettings();
    renderDetails();
  } catch (error) {
    showToast(error.message);
    updateSettingsButtons();
  } finally {
    spinner.classList.add("d-none");
  }
}

function renderDetails() {
  const rows = Object.keys(userData)
    .filter((key) => !editableFields[key])
    .map((key) => `
      <tr>
        <th>${escapeHtml(getFieldLabel(key))}</th>
        <td>${escapeHtml(formatFieldValue(key, userData[key]))}</td>
      </tr>`)
    .join("");

  document.getElementById("detailsBody").innerHTML = rows;
}

async function deleteUser() {
  const confirmBtn = document.getElementById("confirmDeleteBtn");
  const spinner = document.getElementById("deleteSpinner");

  confirmBtn.disabled = true;
  spinner.classList.remove("d-none");

  try {
    const response = await adminRequest("delete_user.php", { id: Number(userId) });
    $("#deleteUserModal").modal("hide");
    showToast(response.message || "User deleted.");
    setTimeout(() => window.location.replace("manageUsers.html"), 1200);
  } catch (error) {
    showToast(error.message);
    confirmBtn.disabled = false;
  } finally {
    spinner.classList.add("d-none");
  }
}

document.getElementById("settingsForm").addEventListener("submit", saveSettings);
resetSettingsBtn.addEventListener("click", renderSettings);

document.getElementById("deleteUserBtn").addEventListener("click", () => {
  document.getElementById("deleteUserName").textContent = getField("userName")?.trim() || `user #${userId}`;
  document.getElementById("deleteUserEmail").textContent = getField("email") || "";
  document.getElementById("confirmDeleteBtn").disabled = false;
  $("#deleteUserModal").modal("show");
});

document.getElementById("confirmDeleteBtn").addEventListener("click", deleteUser);

document.getElementById("backButton").onclick = function () {
  window.location.href = "manageUsers.html";
};
