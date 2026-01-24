let dialogueData = [];
let activeDialogueRow = null;

const dialogueTableBody = document.querySelector("#dataTable tbody");

window.addEventListener("load", loadDialogueList);

function loadDialogueList() {
  try {
    fetch(`${API_URL}/api/get_dialogue_data.php`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data?.success) {
          dialogueData = data?.data || [];
          renderDialogueRows(dialogueData);
        } else {
          showToast(data?.message || "Unable to load dialogues");
        }
      })
      .catch((error) => {
        showToast("Error: " + error?.message);
      });
  } catch (error) {
    showToast("Error: " + error?.message);
  }
}

function renderDialogueRows(data) {
  if (!dialogueTableBody) return;

  dialogueTableBody.innerHTML = "";

  let idNumber = 1;
  data.forEach((rowData) => {
    const row = createDialogueRow(rowData, idNumber);
    dialogueTableBody.appendChild(row);
    idNumber++;
  });
}

function createDialogueRow(dialogue, idNumber) {
  const row = document.createElement("tr");
  row.style.cursor = "pointer";
  row.innerHTML = `
    <td>${dialogue?.dialogue_id || "-"}</td>
    <td>
      ${dialogue?.dialogue_desc || "-"}
    </td>                       
  `;

  row.addEventListener("click", () => handleDialogueSelect(dialogue, row));

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


const backButton = document.getElementById("backButton");
backButton.onclick = function () {
  window.location.href = "ai.html";
};
