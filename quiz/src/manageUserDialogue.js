let dialogueData = [];
let pendingDeletions = new Set();
let activeDialogueRow = null;

const dialogueTableBody = document.querySelector("#dataTable tbody");
const backButton = document.getElementById("backButton");

window.addEventListener("load", loadDialogueList);

async function loadDialogueList() {
  try {
    $("#modal-loading").modal("show");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const token = localStorage.getItem("token") || "";
    fetch(`${API_URL}/api/get_dialogue_data.php?token=${token}`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data?.success) {
          // Filter ONLY user dialogues
          dialogueData = (data?.data || []).filter(item => item.dialogue_id && item.dialogue_id.startsWith('A0.00.'));
          renderDialogueRows(dialogueData);
        } else {
          showToast(data?.message || "Unable to load dialogues");
        }
        $("#modal-loading").modal("hide");
      })
      .catch((error) => {
        showToast("Error: " + error?.message);
        $("#modal-loading").modal("hide");
      });
  } catch (error) {
    showToast("Error: " + error?.message);
    $("#modal-loading").modal("hide");
  }
}

function renderDialogueRows(data) {
  if (!dialogueTableBody) return;

  dialogueTableBody.innerHTML = "";
  pendingDeletions.clear();
  hideUpdateOption();

  data.forEach((rowData) => {
    const row = createDialogueRow(rowData);
    dialogueTableBody.appendChild(row);
  });
}

function createDialogueRow(dialogue) {
  const row = document.createElement("tr");

  const idTd = document.createElement("td");
  const idLink = document.createElement("a");
  idLink.href = "javascript:void(0);";
  idLink.textContent = dialogue?.dialogue_id || "-";
  idLink.style.textDecoration = "underline";
  idLink.style.color = "blue";
  idLink.addEventListener("click", () => handleDialogueSelect(dialogue, row));
  idTd.appendChild(idLink);

  const deleteTd = document.createElement("td");
  const deleteCheckbox = document.createElement("input");
  deleteCheckbox.type = "checkbox";
  deleteCheckbox.className = "record-checkbox";
  deleteCheckbox.style.cursor = "pointer";
  deleteCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      pendingDeletions.add(dialogue.dialogue_id);
    } else {
      pendingDeletions.delete(dialogue.dialogue_id);
    }
    changeUpdateOption();
  });
  deleteTd.appendChild(deleteCheckbox);

  row.appendChild(idTd);
  row.appendChild(deleteTd);

  return row;
}

function handleDialogueSelect(dialogue, rowEl) {
  if (!dialogue) return;

  if (activeDialogueRow) {
    activeDialogueRow.classList.remove("active-row");
  }
  activeDialogueRow = rowEl;
  activeDialogueRow.classList.add("active-row");

  // Open the modal with the selected dialogue
  if (typeof openEditSentencesModal === 'function') {
    openEditSentencesModal(dialogue);
  } else {
    // Wait for modal to be loaded
    setTimeout(() => {
      if (typeof openEditSentencesModal === 'function') {
        openEditSentencesModal(dialogue);
      }
    }, 100);
  }
}

function changeUpdateOption() {
  if (pendingDeletions.size > 0) {
    displayUpdateOption();
  } else {
    hideUpdateOption();
  }
}

function displayUpdateOption() {
  const updateIcons = document.querySelectorAll(".update-icon");
  updateIcons.forEach(function (updateIcon) {
    updateIcon.style.display = "block";
  });
}

function hideUpdateOption() {
  const updateIcons = document.querySelectorAll(".update-icon");
  updateIcons.forEach(function (updateIcon) {
    updateIcon.style.display = "none";
  });
}

function undoData() {
  pendingDeletions.clear();
  const checkboxes = document.querySelectorAll('.record-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = false;
  });
  hideUpdateOption();
}

async function updateData() {
  if (pendingDeletions.size === 0) {
    showToast("No dialogues selected for deletion.");
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    showToast("Please login first.");
    return;
  }

  const btn = document.getElementById("updateDataBtn");
  if (btn) btn.style.pointerEvents = "none";
  $("#modal-loading").modal("show");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  fetch(`${API_URL}/api/delete_user_dialogues.php?token=${token}`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      dialogue_ids: Array.from(pendingDeletions)
    })
  })
    .then((response) => response.json())
    .then((data) => {
      if (data?.success) {
        showToast(data?.message || "Deleted successfully");
        hideUpdateOption();
        loadDialogueList(); // reload table
      } else {
        showToast(data?.message || "Delete failed");
        $("#modal-loading").modal("hide");
      }
    })
    .catch((error) => {
      showToast("Error: " + error?.message);
      $("#modal-loading").modal("hide");
    })
    .finally(() => {
      if (btn) btn.style.pointerEvents = "auto";
    });
}

backButton.onclick = function () {
  window.location.href = "levelTopicSelection.html";
};

function replaceStateWithHistory(page) {
  const topicNumber = localStorage.getItem("topic");
  const token = localStorage.getItem("token");
  if (topicNumber == 0 && !token) {
    showToast(
      "Access to this section requires a login.\nPlease login first !!"
    );
  } else {
    history.replaceState(null, "", page);
    // window.location.reload();
    window.location.href = page;
  }
}