var isShowLoading = false;
var dialogueData = [];
var sentences = [];
var selectedDialogue = null;
let currentLang = {};
const sourceLang = JSON.parse(localStorage.getItem("source-language") || "{}");
const targetLang = JSON.parse(localStorage.getItem("target-language") || "{}");
const ttsCheckbox = document.getElementById("toggle_tts");
const backButton = document.getElementById("backButton");

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

async function getData() {
  $("#modal-loading").modal("show");
  isShowLoading = true;

  // Wait for a short delay to ensure the modal is fully shown
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const url = `${API_URL}/api/get_dialogue_data.php`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log(responseData);

    if (responseData.success) {
      let dialogueTopic = {};
      try {
        const dialogueTopicStr = localStorage.getItem("dialogue-topic");
        if (dialogueTopicStr && dialogueTopicStr !== "undefined" && dialogueTopicStr !== "null") {
          dialogueTopic = JSON.parse(dialogueTopicStr);
        }
      } catch (error) {
        console.error("Error parsing dialogue-topic from localStorage:", error);
        dialogueTopic = {};
      }
      const { levelID, topicID } = dialogueTopic;
      console.log(levelID, topicID);
      dialogueData = responseData.data;
      dialogueData = dialogueData.filter(
        (item) => item.level_id == levelID && item.topic_id == topicID
      );

      if (!dialogueData.length) {
        showToast("No dialogues found.");
        $("#modal-loading").modal("hide");
        isShowLoading = false;
        return;
      }
      customSubjectRenderSelectOptions();

      getSentences();
    } else {
      showToast(responseData.message);
      $("#modal-loading").modal("hide");
      isShowLoading = false;
    }
  } catch (error) {
    console.error("Request failed", error);
    $("#modal-loading").modal("hide");
    isShowLoading = false;
    showToast(error.message);
  }
}

const root = document.documentElement;

const customSubjectDropdownSelect = document.querySelector(
  ".dialogue-list-custom-dropdown-select"
);

const customSubjectOptionTemplate = (
  text,
  translateValue,
  index,
  selected = false
) => {
  return `<option value="${index}" data-translate-value="${translateValue}%" ${
    selected ? "selected" : ""
  }>${text}</option>`;
};

const customSubjectRenderSelectOptions = () => {
  dialogueData.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  if (!selectedDialogue) {
    selectedDialogue = dialogueData[0];
  }

  const options = dialogueData
    .map((item, index) => {
      const isSelected = selectedDialogue === parseInt(item.id);
      return customSubjectOptionTemplate(
        item.dialogue_desc,
        100 * index,
        item.id,
        isSelected
      );
    })
    .join("");

  customSubjectDropdownSelect.innerHTML = options;
};

const handleSelectSubjectChange = (event) => {
  const selectedValue = event.target.value;
  const selectedOption = event.target.options[event.target.selectedIndex].text;

  console.log(`Selected Value: ${selectedValue}`);
  console.log(`Selected Option: ${selectedOption}`);

  selectedDialogue = dialogueData?.find((item) => item?.id == selectedValue);

  getSentences();
};

customSubjectDropdownSelect.addEventListener(
  "change",
  handleSelectSubjectChange
);

const setDropdownProps = (deg, ht, opacity) => {
  root.style.setProperty("--rotate-arrow", deg !== 0 ? deg + "deg" : 0);
  root.style.setProperty("--dropdown-height", ht !== 0 ? ht + "rem" : 0);
  root.style.setProperty("--list-opacity", opacity);
};

$(document).ready(function () {
  $("#modal-loading").on("show.bs.modal", function () {
    // Do something when the modal is shown
    console.log("Modal is shown");
    if (!isShowLoading) {
      $("#modal-loading").modal("hide");
    }
  });

  $("#modal-loading").on("hide.bs.modal", function () {
    // Do something when the modal is hidden
    console.log("Modal is hidden");
  });
});

async function getSentences() {
  $("#modal-loading").modal("show");
  isShowLoading = true;

  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const url = `${API_URL}/api/get_dialogue_sentences.php?dialogue_id=${selectedDialogue?.dialogue_id}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }

    const responseData = await response.json();

    if (responseData.success) {
      sentences = responseData.data;
      sentences = sentences?.map((s) => {
        return {
          ...s,
          language: sourceLang?.description,
        };
      });
      renderSentences(sentences);
    } else [showToast(responseData.message)];

    $("#modal-loading").modal("hide");
    isShowLoading = false;
  } catch (error) {
    console.error("Request failed", error);
    $("#modal-loading").modal("hide");
    isShowLoading = false;
    showToast(error.message);
  }
}

function renderSentences(dialogueData) {
  stopSpeech();
  sentences = dialogueData;

  const container = document.getElementById("sentencesContainer");
  container.innerHTML = "";

  for (let i = 0; i < 6; i++) {
    const s = sentences[i];
    const isActive = s !== undefined;
    const box = document.createElement("div");
    box.className = "sentence_box";
    const textValue = s
      ? (s[sourceLang?.description + "_" + "text"] || "").replace(
          /"/g,
          "&quot;"
        )
      : "";
    box.innerHTML = `
            <div class="sentence-content-wrapper">
              <textarea
                id="sentenceBox${i}"
                class="text_container"
                autocomplete="off"
                disabled
                readonly
              >${textValue}</textarea>
              <button 
                class="toggle-lang-btn"
                onclick="toggleLang(${i})"
                ${isActive ? "" : "disabled"}
              >
                ${sourceLang?.name} &#8644; ${targetLang?.name}
              </button>
            </div>
        `;

    container.appendChild(box);
    // Auto-adjust textarea height
    if (s) {
      const textarea = document.getElementById(`sentenceBox${i}`);
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }
    }
  }
}

function toggleLang(index) {
  stopSpeech();
  if (!sentences[index]) return;

  const s = sentences[index];

  const box = document.getElementById(`sentenceBox${index}`);
  const source = sourceLang?.description + "_" + "text";
  const target = targetLang?.description + "_" + "text";

  if (s?.language == sourceLang?.description) {
    box.value = s?.[target] || "";
    box.style.height = "auto";
    box.style.height = box.scrollHeight + "px";
    sentences = sentences.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          language: targetLang?.description,
        };
      }
      return item;
    });
    if (ttsCheckbox.checked) {
      speakText(s?.[target], targetLang?.code, box.value);
    }
  } else {
    box.value = s?.[source] || "";
    box.style.height = "auto";
    box.style.height = box.scrollHeight + "px";
    sentences = sentences.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          language: sourceLang?.description,
        };
      }
      return item;
    });

    if (ttsCheckbox.checked) {
      speakText(s?.[source], sourceLang?.code, box.value);
    }
  }
}

backButton.onclick = function () {
  window.location.href = "levelTopicSelection.html";
};
