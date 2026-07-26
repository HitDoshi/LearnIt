var isShowLoading = false;
var dialogueData = [];
var sentences = [];
var selectedDialogue = null;
let currentLang = {};
const sourceLang = JSON.parse(localStorage.getItem("source-language") || "{}");
const targetLang = JSON.parse(localStorage.getItem("target-language") || "{}");
const ttsCheckbox = document.getElementById("toggle_tts");
const backButton = document.getElementById("backButton");
const delayInput1 = document.getElementById("delay_input1");
const delayInput2 = document.getElementById("delay_input2");
var delay1 = 1;
var delay2 = 1;

// Loop TTS variables
var isPlaying = false;
var playNextTTSIntervalId;
var currentSentenceIndex = 0; // Position in fixed array (0-5)
var currentTTSIndex = 1; // 1 for source, 2 for target
var loopEnabledSentences = [null, null, null, null, null, null]; // Fixed array: index = sentence position, value = sentence index or null
var currentlyPlayingSentenceIdx = null; // Track which actual sentence index is currently being spoken

document.addEventListener("DOMContentLoaded", function () {
  delayInput1.value = delay1;
  delayInput2.value = delay2;

  // Add TTS checkbox event listener
  ttsCheckbox.addEventListener("change", function () {
    updateLoopCheckboxesState();
    if (!ttsCheckbox.checked) {
      stopDialogueTTSIfRunning();
      disabledDialogueControls();
    }
  });
});

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
    const token = localStorage.getItem("token") || "";
    const url = `${API_URL}/api/get_dialogue_data.php?token=${token}`;
    const response = await fetch(url);

    const responseData = await response.json();
    console.log(responseData);

    if (responseData.success) {
      let dialogueTopic = {};
      try {
        const dialogueTopicStr = localStorage.getItem("dialogue-topic");
        if (
          dialogueTopicStr &&
          dialogueTopicStr !== "undefined" &&
          dialogueTopicStr !== "null"
        ) {
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
  return `<option value="${index}" data-translate-value="${translateValue}%" ${selected ? "selected" : ""
    }>${text}</option>`;
};

const customSubjectRenderSelectOptions = () => {
  dialogueData.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  if (!selectedDialogue) {
    selectedDialogue = dialogueData[0];
    document.getElementById("dialogIDText").innerHTML = 'Dialogue ID: ' + (selectedDialogue?.dialogue_id || '-');
  }

  const options = dialogueData
    .map((item, index) => {
      let parts = item?.dialogue_id?.split(".") || [];
      let dilogueID = parts.length > 2 ? parts[2] : (parts.pop() || '');

      const isSelected = selectedDialogue === parseInt(item.id);
      return customSubjectOptionTemplate(
        dilogueID + ' - ' + item.dialogue_desc,
        100 * index,
        item.id,
        isSelected
      );
    })
    .join("");

  customSubjectDropdownSelect.innerHTML = options;
};

const handleSelectSubjectChange = (event) => {
  stopDialogueTTSIfRunning();

  const selectedValue = event.target.value;
  const selectedOption = event.target.options[event.target.selectedIndex].text;

  console.log(`Selected Value: ${selectedValue}`);
  console.log(`Selected Option: ${selectedOption}`);

  selectedDialogue = dialogueData?.find((item) => item?.id == selectedValue);

  document.getElementById("dialogIDText").innerHTML = 'Dialogue ID: ' + (selectedDialogue?.dialogue_id || '-');

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
    const token = localStorage.getItem("token") || "";
    const url = `${API_URL}/api/get_dialogue_sentences.php?dialogue_id=${selectedDialogue?.dialogue_id}&token=${token}`;
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
    } else[showToast(responseData.message)];

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
  stopDialogueTTSIfRunning();
  stopSpeech();
  sentences = dialogueData;
  loopEnabledSentences = [null, null, null, null, null, null]; // Reset to default
  currentlyPlayingSentenceIdx = null;

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
    const isTTSActive = isActive && ttsCheckbox.checked;
    box.innerHTML = `
            <div class="sentence-content-wrapper">
              <textarea
                id="sentenceBox${i}"
                class="text_container"
                autocomplete="off"
                disabled
                readonly
              >${textValue}</textarea>

              <div style="display: flex; align-items: center;gap: 20px;">
                <button 
                  class="toggle-lang-btn"
                  id="toggleLangBtn${i}"
                  onclick="toggleLang(${i})"
                  ${isActive ? "" : "disabled"}
                >
                  ${sourceLang?.name} &#8644; ${targetLang?.name}
                </button>

                <div>
                  <input type="checkbox" id="continuousPlayback${i}" ${!isTTSActive ? "disabled" : ""
      }/>
                  <label for="continuousPlayback${i}" class="prevent-select">Loop</label>
                </div>
              </div>
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

    // Add event listener for loop checkbox
    if (isActive) {
      const loopCheckbox = document.getElementById(`continuousPlayback${i}`);
      if (loopCheckbox) {
        loopCheckbox.addEventListener("change", function () {
          handleLoopCheckboxChange(i, this.checked);
        });
      }
    }
  }

  disabledDialogueControls();
}

function updateLoopCheckboxesState() {
  for (let i = 0; i < 6; i++) {
    const s = sentences[i];
    const isActive = s !== undefined;
    const loopCheckbox = document.getElementById(`continuousPlayback${i}`);
    if (loopCheckbox) {
      if (isActive && ttsCheckbox.checked) {
        loopCheckbox.disabled = false;
      } else {
        loopCheckbox.disabled = true;
        loopCheckbox.checked = false;
        // Reset to null when disabled
        loopEnabledSentences[i] = null;
      }
    }
  }
  // Update loop enabled sentences array based on checkbox states
  for (let i = 0; i < 6; i++) {
    const loopCheckbox = document.getElementById(`continuousPlayback${i}`);
    if (loopCheckbox && loopCheckbox.checked && sentences[i]) {
      loopEnabledSentences[i] = i;
    } else {
      loopEnabledSentences[i] = null;
    }
  }
}

function handleLoopCheckboxChange(index, checked) {
  if (checked) {
    // Set the value at this position to the sentence index
    loopEnabledSentences[index] = index;

    // If currently playing, DO NOT interrupt - just update the array silently
    // The new sentence will be picked up naturally in the playback sequence
    if (isPlaying) {
      // Do nothing - let current playback continue
      return;
    }

    // If this is the first loop checkbox enabled and not playing, start playing
    const enabledCount = loopEnabledSentences.filter((s) => s !== null).length;
    if (enabledCount === 1 && !isPlaying) {
      playLoopDialogueTTS();
    }
  } else {
    // Check if this is the currently playing sentence (by actual sentence index)
    const isCurrentlyPlaying =
      currentlyPlayingSentenceIdx === index;

    // Set to null at this position
    loopEnabledSentences[index] = null;

    // If it's the currently playing sentence, stop and move to next
    if (isCurrentlyPlaying) {
      stopSpeech();
      clearInterval(playNextTTSIntervalId);

      // Find next non-null sentence from current position onwards
      let nextIndex = -1;
      for (let i = currentSentenceIndex + 1; i < 6; i++) {
        if (loopEnabledSentences[i] !== null) {
          nextIndex = i;
          break;
        }
      }

      // If no next sentence found, check from start
      if (nextIndex === -1) {
        for (let i = 0; i < loopEnabledSentences.length; i++) {
          if (loopEnabledSentences[i] !== null) {
            nextIndex = i;
            break;
          }
        }
      }

      // If no more sentences, stop completely
      if (nextIndex === -1) {
        stopDialogueTTSIfRunning();
        disabledDialogueControls();
        currentlyPlayingSentenceIdx = null;
        return;
      }

      // Move to next sentence
      currentSentenceIndex = nextIndex;
      currentTTSIndex = 1;
      currentlyPlayingSentenceIdx = null;

      // Continue with next sentence
      playNextDialogueTTS();
      return;
    }

    // If unchecking OTHER sentences during playback, DO NOT interrupt
    // Just update the array silently - current playback continues normally
    if (isPlaying) {
      // Do nothing - let current playback continue
      return;
    }

    // If no more loop checkboxes are enabled and not playing, stop
    const enabledCount = loopEnabledSentences.filter((s) => s !== null).length;
    if (enabledCount === 0) {
      stopDialogueTTSIfRunning();
      disabledDialogueControls();
    }
  }
}

function toggleLang(index) {
  if (isPlaying) {
    return; // Don't allow toggling while playing
  }

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
    if (ttsCheckbox.checked && !isPlaying) {
      speakText(s?.[target], targetLang?.code);
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

    if (ttsCheckbox.checked && !isPlaying) {
      speakText(s?.[source], sourceLang?.code);
    }
  }
}

backButton.onclick = function () {
  window.location.href = "levelTopicSelection.html";
};

delayInput1.addEventListener("input", function (e) {
  const value = parseInt(delayInput1.value || 0);

  if (value <= 0) {
    delayInput1.value = 0;
  } else if (value > 99) {
    delayInput1.value = 99;
  } else {
    delayInput1.value = value;
  }

  delay1 = delayInput1.value;
});

delayInput2.addEventListener("input", function (e) {
  const value = parseInt(delayInput2.value || 0);

  if (value <= 0) {
    delayInput2.value = 0;
  } else if (value > 99) {
    delayInput2.value = 99;
  } else {
    delayInput2.value = value;
  }

  delay2 = delayInput2.value;
});

// Loop TTS Functions
function playLoopDialogueTTS() {
  if (!ttsCheckbox.checked) {
    return;
  }
  currentTTSIndex = 1;
  currentSentenceIndex = 0;
  currentlyPlayingSentenceIdx = null;
  clearInterval(playNextTTSIntervalId);
  disabledDialogueControls();
  playNextDialogueTTS();
}

function updateSentenceBoxDisplay(sentenceIdx, textToShow) {
  // Remove highlighting from all sentence boxes
  for (let i = 0; i < 6; i++) {
    const box = document.getElementById(`sentenceBox${i}`);
    const sentenceBox = document
      .querySelector(`#sentenceBox${i}`)
      ?.closest(".sentence_box");
    if (box) {
      box.classList.remove("playing-active");
    }
    if (sentenceBox) {
      sentenceBox.classList.remove("sentence-playing");
    }
  }

  // Highlight current sentence box and update textarea
  const currentBox = document.getElementById(`sentenceBox${sentenceIdx}`);
  const currentSentenceBox = document
    .querySelector(`#sentenceBox${sentenceIdx}`)
    ?.closest(".sentence_box");

  if (currentBox) {
    // Update textarea content with the text being played
    currentBox.value = textToShow || "";
    currentBox.style.height = "auto";
    currentBox.style.height = currentBox.scrollHeight + "px";
    currentBox.classList.add("playing-active");

    // Scroll into view if needed
    currentBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (currentSentenceBox) {
    currentSentenceBox.classList.add("sentence-playing");
  }
}

function playNextDialogueTTS() {

  if (isPlaying) {
    return;
  }


  clearInterval(playNextTTSIntervalId);
  stopSpeech();

  // Get current sentence index from loopEnabledSentences at current position
  const sentenceIdx = loopEnabledSentences[currentSentenceIndex];

  // If current position is null, find next non-null
  if (sentenceIdx === null) {
    let nextIndex = -1;
    // Look from current position onwards
    for (let i = currentSentenceIndex + 1; i < 6; i++) {
      if (loopEnabledSentences[i] !== null) {
        nextIndex = i;
        break;
      }
    }
    // If not found, wrap around from start
    if (nextIndex === -1) {
      for (let i = 0; i < loopEnabledSentences.length; i++) {
        if (loopEnabledSentences[i] !== null) {
          nextIndex = i;
          break;
        }
      }
    }

    if (nextIndex === -1) {
      // No more sentences enabled
      stopDialogueTTSIfRunning();
      return;
    }

    currentSentenceIndex = nextIndex;
    currentTTSIndex = 1;
    return playNextDialogueTTS(); // Recursively call with new position
  }

  if (currentTTSIndex == 3) {
    let nextIndex = -1;
    // Look from current position onwards
    for (let i = currentSentenceIndex + 1; i < 6; i++) {
      if (loopEnabledSentences[i] !== null) {
        nextIndex = i;
        break;
      }
    }
    // If not found, wrap around from start
    if (nextIndex === -1) {
      for (let i = 0; i < loopEnabledSentences.length; i++) {
        if (loopEnabledSentences[i] !== null) {
          nextIndex = i;
          break;
        }
      }
    }

    if (nextIndex === -1) {
      // No more sentences enabled
      stopDialogueTTSIfRunning();
      return;
    }

    currentSentenceIndex = nextIndex;
    currentTTSIndex = 1;
    return playNextDialogueTTS();
  }

  const s = sentences[sentenceIdx];

  if (!s) {
    stopDialogueTTSIfRunning();
    currentlyPlayingSentenceIdx = null;
    return;
  }

  // Track which sentence is currently being played
  currentlyPlayingSentenceIdx = sentenceIdx;

  const source = sourceLang?.description + "_" + "text";
  const target = targetLang?.description + "_" + "text";

  let textToSpeak = "";
  let language = "";
  let delayBTWTTS = 0;
  let textToShow = "";

  if (currentTTSIndex === 1) {
    // Play source text
    textToSpeak = s[source] || "";
    textToShow = textToSpeak;
    language = sourceLang?.code || "en-US";
    delayBTWTTS = parseInt(delay1 || 0);
    currentTTSIndex = 2;
  } else {
    // Play target text
    textToSpeak = s[target] || "";
    textToShow = textToSpeak;
    language = targetLang?.code || "en-US";
    delayBTWTTS = parseInt(delay2 || 0);
    currentTTSIndex = 3;
  }

  // Update sentence box display before speaking
  updateSentenceBoxDisplay(sentenceIdx, textToShow);

  if (textToSpeak) {
    isPlaying = true;
    clearInterval(playNextTTSIntervalId);
    speechSynthesis.cancel();

    isPlaying = true;
    speakText(textToSpeak, language || "en-US");

    utterance.onend = () => {
      if (ttsCheckbox.checked) {
        isPlaying = false;
        playNextTTSIntervalId = setTimeout(() => {
          playNextDialogueTTS();
        }, parseInt(delayBTWTTS || 0) * 1000);
      } else {
        isPlaying = false;
        clearInterval(playNextTTSIntervalId);
      }
    };

    utterance.onerror = () => {
      isPlaying = false;
      clearInterval(playNextTTSIntervalId);
      if (ttsCheckbox.checked) {
        playNextDialogueTTS();
      }
    };
  } else {
    playNextDialogueTTS();
  }
}

function resetSentenceBoxDisplay() {
  // Remove highlighting from all sentence boxes
  for (let i = 0; i < 6; i++) {
    const box = document.getElementById(`sentenceBox${i}`);
    const sentenceBox = document
      .querySelector(`#sentenceBox${i}`)
      ?.closest(".sentence_box");
    if (box) {
      box.classList.remove("playing-active");
      // Restore original text based on sentence language
      const s = sentences[i];
      if (s) {
        const source = sourceLang?.description + "_" + "text";
        const target = targetLang?.description + "_" + "text";
        const textToShow =
          s.language === sourceLang?.description
            ? s[source] || ""
            : s[target] || "";
        box.value = textToShow;
        box.style.height = "auto";
        box.style.height = box.scrollHeight + "px";
      }
    }
    if (sentenceBox) {
      sentenceBox.classList.remove("sentence-playing");
    }
  }
}

function stopDialogueTTSIfRunning() {
  try {
    isPlaying = false;
    clearInterval(playNextTTSIntervalId);
    stopSpeech();
    resetSentenceBoxDisplay();
    currentlyPlayingSentenceIdx = null;
    disabledDialogueControls();
  } catch (error) {
    console.log(error);
  }
}

function disabledDialogueControls() {
  const hasEnabledSentences = loopEnabledSentences.some((s) => s !== null);
  if (isPlaying && hasEnabledSentences) {
    // Disable all buttons except loop checkboxes
    document.querySelectorAll("button").forEach((button) => {
      if (!button.id.startsWith("continuousPlayback")) {
        button.disabled = true;
      }
    });

    // Disable delay inputs
    delayInput1.disabled = true;
    delayInput2.disabled = true;

    // Disable dropdown
    customSubjectDropdownSelect.disabled = true;

    // Keep loop checkboxes enabled
    for (let i = 0; i < 6; i++) {
      const loopCheckbox = document.getElementById(`continuousPlayback${i}`);
      if (loopCheckbox && ttsCheckbox.checked) {
        loopCheckbox.disabled = false;
      }
    }

    // Keep TTS checkbox enabled
    ttsCheckbox.disabled = false;
  } else {
    // Enable all controls
    document.querySelectorAll("button").forEach((button) => {
      button.disabled = false;
    });

    // Enable delay inputs
    delayInput1.disabled = false;
    delayInput2.disabled = false;

    // Enable dropdown
    customSubjectDropdownSelect.disabled = false;

    // Disable loop checkboxes if TTS is not checked
    updateLoopCheckboxesState();
  }
}

let userDB = null;
let totalUserData = 0;

const userOpenRequest = (window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB).open("user", 1);
userOpenRequest.onupgradeneeded = (event) => {
  userDB = event.target.result;
  if (!userDB.objectStoreNames.contains("userData")) {
    const objectStore = userDB.createObjectStore("userData", { keyPath: "id" });
    objectStore.createIndex("subjectIndex", ["sourceSubjectId", "targetSubjectId"]);
  }
};
userOpenRequest.onsuccess = (event) => {
  userDB = event.target.result;
  countTotalUserData();
};

function countTotalUserData() {
  if (!userDB) return;
  try {
    const tx = userDB.transaction('userData', "readonly");
    const os = tx.objectStore('userData');
    const req = os.count();
    req.onsuccess = () => { totalUserData = req.result; };
  } catch (error) { }
}

function addUserDataModalShow() {
  const token = localStorage.getItem('token');
  if (token) {
    const user = JSON.parse(localStorage.getItem('user') || "{}");
    if (user?.email) {
      const maxUD = parseInt(user?.maxUD || 0);
      if (maxUD > 0 && totalUserData >= maxUD) {
        showToast('Maximum number of values is reached for this account.');
      } else {
        $('#exampleModalCenter').modal('show');
      }
    } else {
      showToast('User not found.\nPlease login again !!');
    }
  } else {
    showToast('Access to this section requires a login.\nPlease login first !!');
  }
}

async function addUserData(newData) {
  if (!userDB) return;
  let maxIdNumber = 0;
  const tx = userDB.transaction(["userData"], "readwrite");
  const os = tx.objectStore("userData");

  const getMaxId = () => new Promise((resolve, reject) => {
    const req = os.openCursor();
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.id > maxIdNumber) maxIdNumber = cursor.value.id;
        cursor.continue();
      } else {
        resolve(maxIdNumber);
      }
    };
    req.onerror = () => reject();
  });

  try {
    maxIdNumber = await getMaxId();
    newData.id = maxIdNumber + 1;
    const req = os.add(newData);
    req.onsuccess = () => {
      showToast("Data added !!");
      countTotalUserData();
    };
  } catch (e) {
    showToast("Error while adding data !!");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addData-Form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const source = document.getElementById("source").value;
      const target = document.getElementById("target").value;
      const targetNote = document.getElementById("targetNote").value;
      const isFav = document.getElementById("favourite").checked;
      const isSkip = document.getElementById("skip").checked;

      const subjectId = parseInt(JSON.parse(localStorage.getItem("source-language") || "{}")?.id || 1);
      const targetSubjectId = parseInt(JSON.parse(localStorage.getItem("target-language") || "{}")?.id || 1);

      if (source.trim() && target.trim()) {
        addUserData({
          subjectId: subjectId,
          source: source,
          target: target,
          targetNote: targetNote,
          isFav: isFav,
          isSkip: isSkip,
          showInDays: 0,
          lastShown: 0,
          targetSubjectId: targetSubjectId,
          sourceSubjectId: subjectId,
          topicId: 0,
        });
      }
      $("#exampleModalCenter").modal("hide");
      form.reset();
    });

    const cancelButton = document.getElementById("cancelButton");
    if (cancelButton) {
      cancelButton.addEventListener("click", () => form.reset());
    }
  }
});

function replaceStateWithHistory(page) {
  window.location.href = page;
}