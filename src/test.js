var dbName = "test";
var dbVersion = 1;
var storeName = "data";
var keyIndex = "subjectTopicIndex";

var topic = parseInt(localStorage.getItem("topic"));
var subject = parseInt(
  JSON.parse(localStorage.getItem("source-language") || "{}")?.id || 1,
);
var targetSubjectId = parseInt(
  JSON.parse(localStorage.getItem("target-language") || "{}")?.id || 1,
);

var delay1 = localStorage.getItem("delay1");
var delay2 = localStorage.getItem("delay2");

if (topic == 0) {
  dbName = "user";
  dbVersion = 1;
  storeName = "userData";
  keyIndex = "subjectIndex";
} else {
  if (!topic) {
    topic = 1;
  }
}

var data = null;
var isFavOnly = false;
var favData = [];
var totalData = [];
var attachedAudioDataOnly = [];
var ttsLoopData = [];

var activeCards = [];
var sessionTotalWeight = 0;
var allData = 0;
var totalSkipData = 0;
var totalFavData = 0;
var totalRightAnswer = 0;
var totalFullDayRightAns = 0;
var isRightDone = false;
var toggleQuestion = localStorage.getItem("toggle_question");
var answer = "";
var timer;
var startSessionTime;
var sessionStartTimerBasicTime = 300000; // 5 min = 300000 sec
var sessionInterval, dailyInterval;
var playNextAudioIntervalId;
var playNextTTSIntervalId;
let currentFile = null;
let audioPlayer = null;
let isPlaying = false;
var index = 0;
let currentTTSIndex = 1;
const EnableAudio = localStorage.getItem("EnableAudio") || "N";

const audioElement = document.getElementById("audio");
const playPauseButton = document.getElementById("playPauseButton");
const fileNameLink = document.getElementById("fileNameLink");
const uploadButton = document.getElementsByClassName("uploadButton");
const delayInput1 = document.getElementById("delay_input1");
const delayInput2 = document.getElementById("delay_input2");
// const startStopButton = document.getElementById("startStopButton");
const deleteAudioButton = document.getElementById("deleteAudioButton");
const ttsCheckbox = document.getElementById("toggle_tts");
const randomCheckbox = document.getElementById("random_checkbox");
const continuous_playback = document.getElementById("continuous_playback");
const audio = document.getElementById("errorSound");
const showInDaysInput = document.getElementById("showInDays");
const toggle_ns = document.getElementById("toggle_ns");

ttsCheckbox.addEventListener("click", function (event) {
  const token = localStorage.getItem("token");
  if (!token) {
    showToast(
      "Access to this section requires a login.\nPlease login first !!",
    );
    event.preventDefault();
  }

  if (topic != 0) {
    if (ttsCheckbox.checked) {
      document.getElementById("continuous_playback").disabled = false;
    } else {
      document.getElementById("continuous_playback").disabled = true;
    }
  }

  // if (ttsCheckbox.checked) {
  //   randomCheckbox.disabled = false;
  // } else {
  //   randomCheckbox.disabled = true;
  // }
});

delayInput1.addEventListener("input", function (e) {
  if (delayInput1.value === "") {
    localStorage.setItem("delay1", 2);
    delay1 = 2;
    return;
  }
  let value = parseInt(delayInput1.value);
  if (value > 10) delayInput1.value = 10;

  value = parseInt(delayInput1.value);
  if (value >= 2 && value <= 10) {
    localStorage.setItem("delay1", value);
    delay1 = value;
  } else {
    localStorage.setItem("delay1", 2);
    delay1 = 2;
  }
});

delayInput1.addEventListener("blur", function (e) {
  const value = parseInt(delayInput1.value || 0);
  if (value < 2) {
    delayInput1.value = 2;
    localStorage.setItem("delay1", 2);
    delay1 = 2;
  }
});

delayInput2.addEventListener("input", function (e) {
  if (delayInput2.value === "") {
    localStorage.setItem("delay2", 2);
    delay2 = 2;
    return;
  }
  let value = parseInt(delayInput2.value);
  if (value > 10) delayInput2.value = 10;

  value = parseInt(delayInput2.value);
  if (value >= 2 && value <= 10) {
    localStorage.setItem("delay2", value);
    delay2 = value;
  } else {
    localStorage.setItem("delay2", 2);
    delay2 = 2;
  }
});

delayInput2.addEventListener("blur", function (e) {
  const value = parseInt(delayInput2.value || 0);
  if (value < 2) {
    delayInput2.value = 2;
    localStorage.setItem("delay2", 2);
    delay2 = 2;
  }
});

showInDaysInput.addEventListener("input", function (e) {
  const value = parseInt(showInDaysInput.value || 0);

  if (value <= 0) {
    showInDaysInput.value = 0;
  } else if (value > 99) {
    showInDaysInput.value = 99;
  } else {
    showInDaysInput.value = value;
  }
});

document.getElementById("show_in_days_stats").addEventListener("input", function () {
  if (!isValidStatFormat(this.value)) {
    this.style.outline = "2px solid red";
    this.title = "Format: numbers separated by | e.g. 1|2|3|4";
  } else {
    this.style.outline = "";
    this.title = "";
  }
});
document.getElementById("show_in_days_stats").addEventListener("blur", function () {
  if (!isValidStatFormat(this.value)) {
    // Auto-revert to last saved value
    this.value = data?.showInDaysStat || "";
    this.style.outline = "";
    this.title = "";
    showToast("Invalid stats format – reverted. Use: 1|2|3|4");
  }
});

let isEditModeOn = 0; // 0 means off, 1 means on edit , 2 means on save

let db; // Reference to the IndexedDB database

var indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;
// var request = indexedDB.deleteDatabase("test");
const openRequest = indexedDB.open(dbName, dbVersion);

const showButtonId = document.getElementById("show_button");
const targetNote = document.getElementById("show_targetNote");
const showAns = document.getElementById("show_ans");
const QuestionText = document.getElementById("value_1");

window.addEventListener("load", function () {

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // const maxUD = parseInt(user?.maxUD || 0);
  // document.getElementById("maxUD").innerText = `${maxUD}`;

  if (user?.secondaryEnable?.toUpperCase() == "Y") {
    document.getElementById("show_secondary_language_container").style.display =
      "";
    document.getElementById("show_SecondaryNote").style.display = "";
  } else {
    document.getElementById("show_secondary_language_container").style.display =
      "none";
    document.getElementById("show_SecondaryNote").style.display = "none";
  }

  if (topic != 0) {
    document.getElementById("file-info").style.display = "none";
    document.getElementById("continuous_playback").disabled = true;
  }

  delayInput1.value = delay1;
  delayInput2.value = delay2;
  clearTimeout(timer); // Clear the previous timer if it exists

  if (EnableAudio != "Y") {
    continuous_playback.disabled = true;
    delayInput1.disabled = true;
    delayInput2.disabled = true;
    deleteAudioButton.disabled = true;
    // document.getElementById("deleteIconContainer").disabled = true;
    const token = localStorage.getItem("token");

    document
      .getElementById("continuous_playback_container")
      .addEventListener("click", () => {
        if (!token) {
          showToast(
            "Access to this section requires a login.\nPlease login first !!",
          );
        } else {
          showToast("This functionality is disabled for your account !!");
        }
      });

    document.getElementById("delay_container").addEventListener("click", () => {
      if (!token) {
        showToast(
          "Access to this section requires a login.\nPlease login first !!",
        );
      } else {
        showToast("This functionality is disabled for your account !!");
      }
    });
  }

  if (user?.userType == 3 || !user?.userType) {
    const aiWrapper = document.getElementById("ai_generator_wrapper");
    if (aiWrapper) {
      aiWrapper.style.opacity = "0.5";
      aiWrapper.style.pointerEvents = "auto"; // Ensure it can still receive clicks for the toast

      // Disable all controls inside
      aiWrapper.querySelectorAll("button, input").forEach((el) => {
        el.disabled = true;
      });

      aiWrapper.addEventListener(
        "click",
        (e) => {
          showToast("Please upgrade your account");
          e.stopPropagation();
          e.preventDefault();
        },
        true,
      );
    }
  }
});

const getTTSLanguge = (isLoopTTS) => {
  let language = "en-US";
  const source =
    JSON.parse(localStorage.getItem("source-language") || "{}")?.code ||
    "en-US";
  const target =
    JSON.parse(localStorage.getItem("target-language") || "{}")?.code ||
    "en-US";

  if (!isLoopTTS) {
    return toggleQuestion == "true" ? source : target;
  }
  if (toggleQuestion == "true" && currentTTSIndex == 1) {
    language = source;
  } else if (toggleQuestion == "true" && currentTTSIndex == 2) {
    language = target;
  } else if (toggleQuestion == "false" && currentTTSIndex == 1) {
    language = target;
  } else if (toggleQuestion == "false" && currentTTSIndex == 2) {
    language = source;
  }

  return language;
};

function openDeleteAudioDialog() {
  if (EnableAudio == "Y") {
    $("#deleteAudioModal").modal("show");
  } else {
    showToast("This functionality is disabled for your account !!");
  }
}

function replaceStateWithHistory(page) {
  history.replaceState(null, "", page);
  // window.location.reload();
  window.location.href = page;
}

function convertFilename(filename) {
  console.log(filename);

  if (filename) {
    const splitFilename = filename.split(".");
    const fileExtension = splitFilename[splitFilename.length - 1];
    const realFilename = filename.split("_").slice(0, -2).join("_");

    console.log(`${realFilename}${fileExtension}`);
    return `${realFilename}.${fileExtension}`;
  } else {
    null;
  }
}

openRequest.onupgradeneeded = (event) => {
  db = event.target.result;
  // Create the object store if it doesn't exist
  if (!db.objectStoreNames.contains(storeName)) {
    var objectStore = db.createObjectStore(storeName, { keyPath: "id" });

    // Create a compound index for subjectId and topicId
    if (topic == 0) {
      objectStore.createIndex(keyIndex, ["sourceSubjectId", "targetSubjectId"]);
    } else {
      objectStore.createIndex(keyIndex, [
        "sourceSubjectId",
        "targetSubjectId",
        "topicId",
      ]);
    }
  }
};

openRequest.onerror = (event) => {
  console.error("Database error: " + event.target.errorCode);
};

// Handle the database open success event
openRequest.onsuccess = async function (event) {
  db = event.target.result;

  try {
    getTotalSkipData();

    const isShowFavOnly = document.getElementById("show_fav_only");
    isShowFavOnly.addEventListener("change", toggleIsShowFavOnly);

    const isFavChange = document.getElementById("toggle_fav");
    isFavChange.addEventListener("change", toggleFavValue);

    const isSkipChange = document.getElementById("toggle_skip");
    isSkipChange.addEventListener("change", toggleSkipValue);

    toggle_ns.addEventListener("change", toggleNSValue);

    const toggleQuestionCheckbox = document.getElementById(
      "toggle_question_type",
    );
    toggleQuestionCheckbox.addEventListener("change", toggleQuestionType);

    if (toggleQuestion == "true") {
      document.getElementById("toggleQuestionValue").style.backgroundColor =
        "darkgray";
    } else {
      document.getElementById("toggleQuestionValue").style.backgroundColor =
        null;
    }

    await countData();
    totalData = shuffle(totalData);
    favData = shuffle(favData);

    initSessionState(isFavOnly == "true" ? favData : totalData);

    console.log(totalData);
    console.log(favData);

    isFavOnly = localStorage.getItem("showFavOnly") || "false";
    totalRightAnswer = localStorage.getItem("total_right") || 0;
    totalFullDayRightAns = localStorage.getItem("totalRightAns") || 0;

    document.getElementById("show_fav_only").checked = isFavOnly == "true";
    document.getElementById("toggle_question_type").checked =
      toggleQuestion == "true";

    document.getElementById("total_question").innerHTML =
      isFavOnly == "true" ? favData.length : totalData.length;
    document.getElementById("total_right_attempt").innerHTML = totalRightAnswer;
    document.getElementById("total_right_by_full_days").innerHTML =
      totalFullDayRightAns;

    await getData();

    setTimer();
    // Initial call to update the counter
    updateDailyCounter();

    // Update the counter every second
    clearInterval(dailyInterval);
    dailyInterval = setInterval(updateDailyCounter, 1000);
  } catch (error) {
    console.log(error?.message);
  }
};

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

function initSessionState(deck) {
  // Each card needs a weight; fall back to 1.0 if probability not yet set.
  activeCards = deck.map((card) => ({
    ...card,
    weight: parseFloat(card.probability) || 1.0,
  }));
  sessionTotalWeight = activeCards.reduce((sum, card) => sum + card.weight, 0);
  console.log(
    `[Session] Initialized ${activeCards.length} card(s), totalWeight=${sessionTotalWeight.toFixed(3)}`
  );
}

function onIntervalAssigned(cardId) {
  const idx = activeCards.findIndex((c) => c.id === cardId);
  if (idx !== -1) {
    sessionTotalWeight -= activeCards[idx].weight;
    activeCards.splice(idx, 1);
    console.log(
      `[Session] Card id=${cardId} removed. Remaining=${activeCards.length}, totalWeight=${sessionTotalWeight.toFixed(3)}`
    );
  }
}

function getWeightedRandomCard() {
  if (activeCards.length === 0) return null;

  let randomRoll = Math.random() * sessionTotalWeight;

  for (const card of activeCards) {
    randomRoll -= card.weight;
    if (randomRoll <= 0) return card;
  }
  // Floating-point guard: return the last card
  return activeCards[activeCards.length - 1];
}

function isValidStatFormat(str) {
  if (!str || str.trim() === "") return true;
  return /^(\d{1,2})(\|\d{1,2})*$/.test(str.trim());
}

async function countData() {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error("Database is not open yet.");
      reject("Database not open");
      return;
    }

    totalData = [];
    favData = [];
    allData = 0;
    totalSkipData = 0;
    totalFavData = 0;
    // Access the object store
    const transaction = db.transaction(storeName, "readwrite");
    const objectStore = transaction.objectStore(storeName);

    // Specify the subjectId and topicId you want to search for
    var subjectId = subject; // Change this to the subjectId you want to search for
    var topicId = topic; // Change this to the topicId you want to search for

    // Create a range for the compound index
    if (topic == 0) {
      var range = IDBKeyRange.only([subjectId, targetSubjectId]);
    } else {
      var range = IDBKeyRange.only([subjectId, targetSubjectId, topicId]);
    }
    // Use the compound index for the search
    var request = objectStore.index(keyIndex);

    request.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const data = cursor.value;

        if (data.isSkip || data.showInDays != 0 || data.isNS) {
          totalSkipData++;
        } else {
          if (data.isFav) {
            totalFavData++;
            favData.push(data);
          }
          allData++;
          totalData.push(data);
        }

        cursor.continue();
      } else {
        // Cursor has reached the end
        resolve(); // Resolve the promise with the updated count
      }
    };
  });
}

function getData() {
  data = null;
  isRightDone = false;
  shwoBlankData();
  currentFile = null;
  document.getElementById("fileInput").value = "";

  document.getElementById("total_question").innerHTML =
    isFavOnly == "true" ? favData.length : totalData.length;

  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  if (
    (favData.length == 0 && isFavOnly == "true") ||
    (totalData.length == 0 && isFavOnly == "false")
  ) {
    console.log("No data in the object store.");
    document.getElementById("showInDays").value = 0;
    document.getElementById("last_shown").innerHTML = 0;
    document.getElementById("show_in_days_stats").innerText = "";
    return;
  }

  if (isFavOnly == "true") {
    data = getWeightedRandomCard() || favData[0];
    console.log(data);
    showData();
  } else {
    // Weighted-random pick (higher probability → appears more often)
    data = getWeightedRandomCard() || totalData[0];
    console.log(data);
    showData();
  }

  if (toggleQuestion == "true") {
    answer = data?.source?.toString() || "";
  } else {
    answer = data?.target?.toString() || "";
  }
}

function getFavData() {
  data = null;

  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  if (favData.length == 0) {
    console.log("No data in the object store.");
    return;
  }
  // Weighted-random pick from the active session pool
  data = getWeightedRandomCard() || favData[0];
  console.log(data);
  showData();
}

function getTotalSkipData() {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  // Access the object store
  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  // Specify the subjectId and topicId you want to search for
  var subjectId = subject; // Change this to the subjectId you want to search for
  var topicId = topic; // Change this to the topicId you want to search for

  // Create a range for the compound index
  if (topic == 0) {
    var range = IDBKeyRange.only([subjectId, targetSubjectId]);
  } else {
    var range = IDBKeyRange.only([subjectId, targetSubjectId, topicId]);
  }
  // Use the compound index for the search
  var request = objectStore.index(keyIndex);

  // Use a cursor to iterate through the records and collect the keys
  request.openCursor(range).onsuccess = function (event) {
    const cursor = event.target.result;

    if (cursor) {
      const data = cursor.value;

      if (data.isSkip || data?.isNS) {
        totalSkipData++;
      }

      cursor.continue();
    }
  };
}

function toggleFavValue(event) {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  if (!data) {
    return;
  }

  const isChecked = event.target.checked;

  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(data.id);
  request.onsuccess = (event) => {
    const data = event.target.result;
    if (data) {
      data.isFav = isChecked;
      const updateRequest = objectStore.put(data);
      updateRequest.onsuccess = () => {
        if (isChecked) {
          favData.push(data);
        } else {
          favData.forEach((item, index) => {
            if (item.id == data.id) {
              favData.splice(index, 1);
            }
          });
        }

        totalData.forEach((item, index) => {
          if (item.id == data.id) {
            item.isFav = isChecked;
          }
        });

        totalData = shuffle(totalData);
        favData = shuffle(favData);
      };
      updateRequest.onerror = () => {
        showToast("Error while updating data !!");
      };
    }
  };
  // setTimer();
}
function saveUpdatedValue() {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  if (!data) {
    return;
  }

  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(data.id);
  request.onsuccess = (event) => {
    const existingData = event.target.result;
    if (existingData) {
      let source = "";
      let target = "";
      // const updatedTargetNote = targetNote.value || "";

      if (toggleQuestion == "true") {
        source = showAns.value;
        target = QuestionText.value;
        // existingData.UserDefined2 = updatedTargetNote;
      } else {
        target = showAns.value;
        source = QuestionText.value;
        // existingData.targetNote = updatedTargetNote;
      }
      answer = showAns.value?.toString() || "";
      const updatedTargetNote = targetNote.value || "";
      const rawStats = document.getElementById("show_in_days_stats").value || "";
      const updatedStatsStat = isValidStatFormat(rawStats)
        ? rawStats.trim()
        : (existingData.showInDaysStat || "");

      existingData.source = source;
      existingData.target = target;
      existingData.targetNote = updatedTargetNote;
      existingData.showInDaysStat = updatedStatsStat;

      const updateRequest = objectStore.put(existingData);
      updateRequest.onsuccess = () => {
        totalData.forEach((item, index) => {
          if (item.id == data.id) {
            item.source = source;
            item.target = target;
            item.targetNote = updatedTargetNote;
            item.showInDaysStat = updatedStatsStat;
          }
        });

        data.source = source;
        data.target = target;
        data.targetNote = updatedTargetNote;
        data.showInDaysStat = updatedStatsStat;
      };
      updateRequest.onerror = () => {
        showToast("Error while updating data !!");
      };
    }
  };
}

function resetEditUserDefineValueMode() {
  isEditModeOn = 0;
  targetNote.disabled = true;
  showButtonId.innerHTML = "Show";
  targetNote.style.backgroundColor = "lightblue";
  targetNote.style.borderWidth = "0px";

  showAns.disabled = true;
  showAns.style.backgroundColor = "lightblue";
  showAns.style.borderWidth = "0px";

  QuestionText.disabled = true;
  QuestionText.style.backgroundColor = "lightblue";
  QuestionText.style.borderWidth = "0px";

  const statsInput = document.getElementById("show_in_days_stats");
  statsInput.disabled = true;
  statsInput.style.backgroundColor = "#e9ecef";
  statsInput.style.borderWidth = "0px";
  statsInput.style.outline = "";
  statsInput.title = "";

  const overlay = document.getElementById("stats_click_overlay");
  if (overlay) overlay.style.display = "";
}

function toggleQuestionType() {
  if (continuous_playback.checked) {
    return;
  }

  const q = localStorage.getItem("toggle_question");
  toggleQuestion = toggleQuestion == "true" ? "false" : "true";
  localStorage.setItem("toggle_question", toggleQuestion);

  if (toggleQuestion == "true") {
    const toggle = (document.getElementById(
      "toggleQuestionValue",
    ).style.backgroundColor = "darkgray");
  } else {
    const toggle = (document.getElementById(
      "toggleQuestionValue",
    ).style.backgroundColor = null);
  }

  resetEditUserDefineValueMode();

  // getData();
  showData();
}

function toggleSkipValue(event) {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  if (!data) {
    return;
  }

  const isChecked = event.target.checked;

  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(data.id);
  request.onsuccess = (event) => {
    const updatedRecord = event.target.result;
    if (updatedRecord) {
      if (isChecked) {
        allData--;
        if (updatedRecord.isFav) {
          totalFavData--;
        }
      } else {
        allData++;
        if (updatedRecord.isFav) {
          totalFavData++;
        }
      }

      updatedRecord.isSkip = isChecked;

      const updateRequest = objectStore.put(updatedRecord);
      updateRequest.onsuccess = () => {
        // IMPORTANT: keep global `data` in sync, because `showData()` reads global `data`
        data = updatedRecord;

        totalData.forEach((item, index) => {
          if (item.id == updatedRecord.id) {
            totalData.splice(index, 1);
          }
        });

        favData.forEach((item, index) => {
          if (item.id == updatedRecord.id) {
            favData.splice(index, 1);
          }
        });

        if (!isChecked) {
          totalData.push(updatedRecord);
          if (updatedRecord.isFav) {
            favData.push(updatedRecord);
          }
        }

        totalData = shuffle(totalData);
        favData = shuffle(favData);

        document.getElementById("total_question").innerHTML =
          document.getElementById("show_fav_only").checked
            ? favData?.length
            : totalData?.length;
      };
      updateRequest.onerror = () => {
        showToast("Error while updating data !!");
      };
    }
  };
  // setTimer();
}

function toggleNSValue(event) {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  if (!data) {
    return;
  }

  const isChecked = event.target.checked;

  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(data.id);
  request.onsuccess = (event) => {
    const updatedRecord = event.target.result;
    if (updatedRecord) {
      if (isChecked) {
        allData--;
        if (updatedRecord.isFav) {
          totalFavData--;
        }
      } else {
        allData++;
        if (updatedRecord.isFav) {
          totalFavData++;
        }
      }

      updatedRecord.isNS = isChecked;

      const updateRequest = objectStore.put(updatedRecord);
      updateRequest.onsuccess = () => {
        // IMPORTANT: keep global `data` in sync, because `showData()` reads global `data`
        data = updatedRecord;

        totalData.forEach((item, index) => {
          if (item.id == updatedRecord.id) {
            totalData.splice(index, 1);
          }
        });

        favData.forEach((item, index) => {
          if (item.id == updatedRecord.id) {
            favData.splice(index, 1);
          }
        });

        if (!isChecked) {
          totalData.push(updatedRecord);
          if (updatedRecord.isFav) {
            favData.push(updatedRecord);
          }
        }

        totalData = shuffle(totalData);
        favData = shuffle(favData);

        document.getElementById("total_question").innerHTML =
          document.getElementById("show_fav_only").checked
            ? favData?.length
            : totalData?.length;
      };
      updateRequest.onerror = () => {
        showToast("Error while updating data !!");
      };
    }
  };
  // setTimer();
}

async function changeShowInDaysValue() {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  if (!data) {
    return;
  }

  const showInDaysValue = parseInt(
    document.getElementById("showInDays").value || 0,
  );

  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(data.id);
  request.onsuccess = (event) => {
    const data = event.target.result;
    if (data) {
      // if (showInDaysValue != 0 && !data.isSkip) {
      //   allData--;
      // }
      // if (data.isFav && !data.isSkip && showInDaysValue != 0) {
      //   totalFavData--;
      // }
      data.showInDays = parseInt(showInDaysValue);
      data.lastShown = parseInt(showInDaysValue);

      data.showInDaysStat = String(data?.showInDaysStat || "");

      const showInDaysStatData = data?.showInDaysStat?.split("|") || [];

      if (showInDaysStatData?.length == 0 || !showInDaysStatData?.[0]) {
        data.showInDaysStat = showInDaysValue;
      } else if (showInDaysStatData?.length < 15) {
        data.showInDaysStat =
          showInDaysStatData.join("|") + "|" + showInDaysValue;
      } else {
        data.showInDaysStat =
          showInDaysStatData.slice(1).join("|") + "|" + showInDaysValue;
      }

      data.showInDaysStat = String(data.showInDaysStat);

      const updateRequest = objectStore.put(data);
      updateRequest.onsuccess = () => {
        if (!data.isSkip && showInDaysValue != 0 && !data?.isNS) {
          totalData.forEach((item, index) => {
            if (item.id == data.id) {
              totalData.splice(index, 1);
            }
          });

          favData.forEach((item, index) => {
            if (item.id == data.id) {
              favData.splice(index, 1);
            }
          });

          // Atomically remove this card from the weighted session pool
          onIntervalAssigned(data.id);
        }
      };
      updateRequest.onerror = () => {
        showToast("Error while updating data !!");
      };
    }
  };
  // setTimer();
}

function showData() {
  if (!data) {
    return;
  }

  try {
    document.getElementById("show_secondary_language").value = "";
    document.getElementById("show_SecondaryNote").value = "";

    currentFile = null;
    // const targetNote = document.getElementById("show_targetNote");
    const isFav = document.getElementById("toggle_fav");
    const isSkip = document.getElementById("toggle_skip");
    const showInDays = document.getElementById("showInDays");
    const lastShown = document.getElementById("last_shown");

    if (toggleQuestion == "true") {
      QuestionText.value = data.target;
      // targetNote.value = data?.UserDefined2;
    } else {
      QuestionText.value = data.source;
      // targetNote.value = data?.targetNote;
    }

    // targetNote.innerHTML = data?.targetNote ? data.targetNote : "";
    targetNote.value = data?.targetNote ? data.targetNote : "";

    isFav.checked = data.isFav;
    isSkip.checked = data.isSkip;
    toggle_ns.checked = data?.isNS;
    showInDays.value = data.showInDays;
    lastShown.innerHTML = data.lastShown;

    // if (topic == 0) {
    //   document.getElementById("valueID").innerText = data?.questionId || "-";
    // } else {
    //   document.getElementById("valueID").innerText = data?.id || "-";
    // }

    document.getElementById("show_in_days_stats").value =
      data?.showInDaysStat || "";

    if (data?.fileName) {
      if (audioPlayer) {
        isPlaying = false;
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
      }

      fileNameLink.textContent = convertFilename(data?.fileName);
      document.getElementById("empty-state").style.display = "none";
      document.getElementById("file-display").style.display = "flex";
      audioPlayer = new Audio(
        encodeURI(`${API_URL}/assets/audio/${data.fileName}`),
      );

      audioPlayer.addEventListener("ended", function () {
        isPlaying = false;
        updatePlayPauseIcon();
      });
      uploadButton[0].style.display = "none";
      deleteAudioButton.style.display = "";
    } else {
      document.getElementById("empty-state").style.display = "flex";
      document.getElementById("file-display").style.display = "none";
      deleteAudioButton.style.display = "none";
      uploadButton[0].style.display = "";
    }

    const statusLabel = document.getElementById("current_status_label");
    if (statusLabel) {
      const prob = (data?.probability != null) ? parseFloat(data.probability).toFixed(2) : '-';
      const stat = data?.status || '-';
      statusLabel.textContent = `${prob}/${stat}`;
    }

    // setTimer();
  } catch (error) {
    console.log("Error:-->", error?.message);
  }
}

function openStatsRecordDetail() {
  // Overlay is hidden in Save mode, so this only fires when the stats box is read-only.
  if (!data) return;
  const toggleQ = localStorage.getItem("toggle_question");
  const title = encodeURIComponent(toggleQ === "true" ? (data.target || '') : (data.source || ''));
  window.location.href = `recordDetail.html?id=${data.id}&title=${title}`;
}

function toggleIsShowFavOnly(event) {
  isFavOnly = event.target.checked.toString();
  localStorage.setItem("showFavOnly", isFavOnly);
  console.log(favData.length);
  console.log(totalData.length);
  document.getElementById("total_question").innerHTML =
    isFavOnly == "true" ? favData.length : totalData.length;

  getData();
}

async function nextValue() {
  if (isPlaying) {
    isPlaying = false;
    audioPlayer.pause();
    audioPlayer.currentTime = 0; // Optional: Reset audio to the beginning
    playPauseButton.querySelector(".icon-play").classList.remove("d-none");
    playPauseButton.querySelector(".icon-stop").classList.add("d-none");
    playPauseButton.querySelector(".text").textContent = "Play";
  }
  stopSpeech();
  stopErrorSound();
  const showInDaysValue = document.getElementById("showInDays").value;
  if (data != null && data?.showInDays != parseInt(showInDaysValue)) {
    changeShowInDaysValue();
  }
  shwoBlankData();
  resetEditUserDefineValueMode();

  if (randomCheckbox.checked) {
    const bin = Math.round(Math.random());
    toggleQuestion = bin == 1 ? "true" : "false";
    if (toggleQuestion == "true") {
      const toggle = (document.getElementById(
        "toggleQuestionValue",
      ).style.backgroundColor = "darkgray");
    } else {
      const toggle = (document.getElementById(
        "toggleQuestionValue",
      ).style.backgroundColor = null);
    }
  }

  await countData();

  initSessionState(isFavOnly == "true" ? favData : totalData);

  await getData();
  resetAISentenceGenerator();
}

function shwoBlankData() {
  QuestionText.value = "";
  showAns.value = "";
  document.getElementById("show_targetNote").value = "";
  const isFav = (document.getElementById("toggle_fav").checked = false);
  const isSkip = (document.getElementById("toggle_skip").checked = false);
  toggle_ns.checked = false;
  const enter_ans = document.getElementById("enter_ans");
  enter_ans.style.backgroundColor = "white";
  enter_ans.style.color = "black";

  document.getElementById("enter_ans").value = "";
  document.getElementById("show_secondary_language").value = "";
  document.getElementById("show_SecondaryNote").value = "";
  // setTimer();
}

async function resetNSData() {
  return new Promise(async (resolve, reject) => {
    try {
      await Promise.all([
        new Promise((innerResolve) => {
          var myIndexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
          const openRequest = myIndexedDB.open("test", 1);
          openRequest.onsuccess = function (event) {
            const tempDB = event.target.result;
            if (!tempDB.objectStoreNames.contains("data")) {
              return innerResolve();
            }
            const transaction = tempDB.transaction(["data"], "readwrite");
            const objectStore = transaction.objectStore("data");
            const request = objectStore.openCursor();
            request.onsuccess = function (e) {
              const cursor = e.target.result;
              if (!cursor) return;
              if (cursor.value.isNS) {
                let updateData = cursor.value;
                updateData.isNS = false;
                cursor.update(updateData);
              }
              cursor.continue();
            };
            transaction.oncomplete = function () { innerResolve(); };
            transaction.onerror = function () { innerResolve(); };
          };
          openRequest.onerror = function () { innerResolve(); };
        }),
        new Promise((innerResolve) => {
          var myIndexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
          const openRequest = myIndexedDB.open("user", 1);
          openRequest.onsuccess = function (event) {
            const tempDB = event.target.result;
            if (!tempDB.objectStoreNames.contains("userData")) {
              return innerResolve();
            }
            const transaction = tempDB.transaction(["userData"], "readwrite");
            const objectStore = transaction.objectStore("userData");
            const request = objectStore.openCursor();
            request.onsuccess = function (e) {
              const cursor = e.target.result;
              if (!cursor) return;
              if (cursor.value.isNS) {
                let updateData = cursor.value;
                updateData.isNS = false;
                cursor.update(updateData);
              }
              cursor.continue();
            };
            transaction.oncomplete = function () { innerResolve(); };
            transaction.onerror = function () { innerResolve(); };
          };
          openRequest.onerror = function () { innerResolve(); };
        })
      ]);

      console.log("resetNSData transaction complete");
      await countData();
      document.getElementById("total_question").innerHTML =
        isFavOnly == "true" ? favData.length : totalData.length;
      console.log("resetNSData finished syncing");

      // Trigger AI vocabulary evaluation in the background (new session start)
      runVocabularyEvaluation(); // intentionally not awaited – runs silently

      resolve();
    } catch (error) {
      console.error("Exception in resetNSData:", error);
      reject(error);
    }
  });
}

function getCurrentFormattedDate() {
  const today = new Date();
  const formattedDate = `${today.getFullYear()}${(today.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;
  return formattedDate;
}

async function checkAnswer() {
  const enter_ans = document.getElementById("enter_ans");
  const ans = enter_ans.value.toLowerCase().trim().toString();
  if (!data) {
    return;
  }

  if (ans == "") {
    return;
  }
  const remainingTime = getRemainingTime();
  if (remainingTime == 0) {
    localStorage.setItem("timestamp", Date.now());
    setTimer();
    timerFunction();
    await resetNSData();
  }

  const date = localStorage.getItem("date");
  // document.getElementById("date").innerText = `${date}`;

  if (date) {
    if (ans == answer.toLowerCase().trim().toString()) {
      const todayFormattedDate = getCurrentFormattedDate();

      // const transaction = db.transaction(storeName, "readwrite");
      //   const objectStore = transaction.objectStore(storeName);

      //   // Open a cursor to iterate over all items in the store
      //   try {
      //     const request = objectStore.openCursor();
      //     request.onsuccess = (event) => {
      //       const cursor = event.target.result;
      //       if (cursor) {
      //         const data = cursor.value;
      //         if (data.showInDays > 0) {
      //           // Only update if isFav is not already false
      //           data.showInDays = data.showInDays - 1;
      //           const updateRequest = objectStore.put(data);
      //           updateRequest.onsuccess = () => {
      //             console.log("ShowInDays updated successfully");
      //           };
      //           updateRequest.onerror = () => {
      //             showToast("Error while updating data !!");
      //           };
      //         }
      //         cursor.continue(); // Move to the next item
      //       }
      //     };
      //     request.onerror = () => {
      //       showToast("Error while retrieving data !!");
      //     };
      //   } catch (error) {
      //     console.log("Error in showInDays update !", error);
      //   }

      if (date != todayFormattedDate) {
        await updateRegularShowInDaysValue();
        await updateUserShowInDaysValue();

        uploadDailyUserDataFunction(false);
        uploadUserActivity();
        const formattedDate = getCurrentFormattedDate();
        localStorage.setItem("date", formattedDate);
        // document.getElementById("date").innerText = `${formattedDate}`;

        const user = JSON.parse(localStorage.getItem("user") || "{}");

        localStorage.setItem("totalRightAns", 0);
        totalRightAnswer = 0;
        document.getElementById("total_right_attempt").innerHTML =
          totalRightAnswer;
      }
    }
  } else {
    const formattedDate = getCurrentFormattedDate();
    localStorage.setItem("date", formattedDate);
  }

  if (ans == answer.toLowerCase().trim().toString()) {
    console.log("Right");

    if (!isRightDone) {
      totalRightAnswer++;
      document.getElementById("total_right_attempt").innerHTML =
        totalRightAnswer;
      localStorage.setItem("total_right", totalRightAnswer);

      totalFullDayRightAns = localStorage.getItem("totalRightAns") || 0;
      totalFullDayRightAns++;
      console.log("totalFullDayRightAns", totalFullDayRightAns);
      localStorage.setItem("totalRightAns", totalFullDayRightAns);
      document.getElementById("total_right_by_full_days").innerHTML =
        totalFullDayRightAns;
      localStorage.setItem("timestamp", Date.now());
      setTimer();
    }
    enter_ans.style.backgroundColor = "green";
    enter_ans.style.color = "white";
    isRightDone = true;
    setTimer();
    playTTS({ isPlayTTS: true, text: answer, language: getTTSLanguge(false) });
  } else {
    enter_ans.style.backgroundColor = "red";
    enter_ans.style.color = "white";
    console.log("Wrong");
    playTTS({ isPlayErrorSound: true });
  }
  // setTimer();
}

function showAnswer() {
  if (!data) {
    return;
  }

  if (isEditModeOn === 0) {
    showAns.value = answer;
    showButtonId.innerHTML = "Edit";
    isEditModeOn = 1;
    const language = getTTSLanguge(false);
    playTTS({ isPlayTTS: true, text: answer, language });
    return;
  }

  if (isEditModeOn === 1) {
    showButtonId.innerHTML = "Save";
    isEditModeOn = 2;
    targetNote.disabled = false;
    targetNote.style.backgroundColor = "transparent";
    targetNote.style.borderWidth = "1px";

    showAns.disabled = false;
    showAns.style.backgroundColor = "transparent";
    showAns.style.borderWidth = "1px";

    QuestionText.disabled = false;
    QuestionText.style.backgroundColor = "transparent";
    QuestionText.style.borderWidth = "1px";

    const statsInput = document.getElementById("show_in_days_stats");
    statsInput.disabled = false;
    statsInput.style.backgroundColor = "transparent";
    statsInput.style.borderWidth = "1px";

    // Hide overlay so the input receives real clicks for editing
    const overlay = document.getElementById("stats_click_overlay");
    if (overlay) overlay.style.display = "none";

    return;
  }

  if (isEditModeOn === 2) {
    saveUpdatedValue();
    resetEditUserDefineValueMode();
    return;
  }
  // setTimer();
}

// Function to get the remaining time of the timer
function getRemainingTime() {
  let elapsedTime = Date.now() - startSessionTime;
  let remainingTime = sessionStartTimerBasicTime - elapsedTime; // 300000 milliseconds = 5 minutes
  return Math.max(0, remainingTime); // Ensure remaining time is not negative
}

// Function to update the remaining time on the screen
function updateRemainingTime() {
  let remainingTime = getRemainingTime();
  // Assuming you have an HTML element with id="session_counter" to display the remaining time
  document.getElementById("session_counter").innerText =
    formatTime(remainingTime);
}

// Function to format milliseconds into a readable time format (mm:ss)
function formatTime(milliseconds) {
  let totalSeconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

// Set a timer with a 5-minute delay2
function setTimer() {
  // clearTimeout(timer); // Clear the previous timer if it exists
  // startSessionTime = Date.now(); // Store the start time
  // timer = setTimeout(timerFunction, sessionStartTimerBasicTime); // Set a new timer for 5 minutes
  // updateRemainingTime(); // Update the remaining time immediately after setting the timer
  // Update the remaining time every second
  clearInterval(sessionInterval);

  // const reset_timestamp = localStorage.getItem("reset-timestamp");

  // if (reset_timestamp === "true") {
  //   localStorage.setItem("reset-timestamp", false);
  //   localStorage.setItem("timestamp", Date.now());
  // }

  const getSesstionTime = localStorage.getItem("timestamp") || 0;

  startSessionTime = getSesstionTime;
  sessionInterval = setInterval(updateRemainingTime, 1000);
}

// Define a function to be executed after 5 minutes
function timerFunction() {
  console.log("Timer completed after 5 minutes.");
  localStorage.setItem("total_right", 0);

  document.getElementById("total_right_attempt").innerHTML = 0;
  totalRightAnswer = 0;
  // setTimer();
}

function updateDailyCounter() {
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999); // Set end of day to 11:59:59 PM

  const remainingTime = endOfDay - now;
  const hours = Math.floor(remainingTime / (1000 * 60 * 60));
  const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

  document.getElementById("daily_counter").innerText = `${hours
    .toString()
    .padStart(2, "0")} : ${minutes.toString().padStart(2, "0")} : ${seconds
      .toString()
      .padStart(2, "0")}`;
}

async function updateUserShowInDaysValue() {
  var userIndexedDB =
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB ||
    window.shimIndexedDB;
  // var request = indexedDB.deleteDatabase("test");
  const openRequest = userIndexedDB.open("user", "1");

  let userDB;

  openRequest.onupgradeneeded = (event) => {
    userDB = event.target.result;
    // Create the object store if it doesn't exist
    if (!userDB.objectStoreNames.contains("userData")) {
      var UserObjectStore = userDB.createObjectStore("userData", {
        keyPath: "id",
      });

      // Create a compound index for subjectId and topicId
      if (topic == 0) {
        UserObjectStore.createIndex("subjectIndex", [
          "sourceSubjectId",
          "targetSubjectId",
        ]);
      } else {
        UserObjectStore.createIndex("subjectIndex", [
          "sourceSubjectId",
          "targetSubjectId",
          "topicId",
        ]);
      }
    }
  };

  openRequest.onerror = (event) => {
    console.error("Database error: " + event.target.errorCode);
  };

  // Handle the database open success event
  openRequest.onsuccess = async function (event) {
    userDB = event.target.result;

    const transaction = userDB.transaction("userData", "readwrite");
    const objectStore = transaction.objectStore("userData");

    // Open a cursor to iterate over all items in the store
    try {
      const request = objectStore.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const data = cursor.value;
          if (data.showInDays > 0) {
            // Only update if isFav is not already false
            data.showInDays = data.showInDays - 1;
            const updateRequest = objectStore.put(data);
            updateRequest.onsuccess = () => {
              console.log("ShowInDays updated successfully");
            };
            updateRequest.onerror = () => {
              showToast("Error while updating data !!");
            };
          }
          cursor.continue(); // Move to the next item
        }
      };
      request.onerror = () => {
        showToast("Error while retrieving data !!");
      };
    } catch (error) {
      console.log("Error in showInDays update !", error);
    }
  };
}

function updateAudioFileName(fileName) {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  if (!data) {
    return;
  }

  data.fileName = fileName;

  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(data.id);

  console.log(request);

  request.onsuccess = (event) => {
    const existingData = event.target.result;
    if (existingData) {
      existingData.fileName = fileName;
      const updateRequest = objectStore.put(existingData);
      updateRequest.onsuccess = () => {
        totalData.forEach((item, index) => {
          if (item.id == data.id) {
            item.fileName = fileName;
          }
        });

        favData.forEach((item, index) => {
          if (item.id == data.id) {
            item.fileName = fileName;
          }
        });
      };
      updateRequest.onerror = () => {
        showToast("Error while updating data !!");
      };
    }
  };
}

async function updateRegularShowInDaysValue() {
  var regularIndexedDB =
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB ||
    window.shimIndexedDB;
  // var request = indexedDB.deleteDatabase("test");
  const openRequest = regularIndexedDB.open("test", "1");

  let regularDB;

  openRequest.onupgradeneeded = (event) => {
    regularDB = event.target.result;
    // Create the object store if it doesn't exist
    if (!regularDB.objectStoreNames.contains("data")) {
      var RegularObjectStore = regularDB.createObjectStore("data", {
        keyPath: "id",
      });

      // Create a compound index for subjectId and topicId
      if (topic == 0) {
        RegularObjectStore.createIndex("subjectTopicIndex", [
          "sourceSubjectId",
          "targetSubjectId",
        ]);
      } else {
        RegularObjectStore.createIndex("subjectTopicIndex", [
          "sourceSubjectId",
          "targetSubjectId",
          "topicId",
        ]);
      }
    }
  };

  openRequest.onerror = (event) => {
    console.error("Database error: " + event.target.errorCode);
  };

  // Handle the database open success event
  openRequest.onsuccess = async function (event) {
    regularDB = event.target.result;

    const transaction = regularDB.transaction("data", "readwrite");
    const objectStore = transaction.objectStore("data");

    // Open a cursor to iterate over all items in the store
    try {
      const request = objectStore.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const data = cursor.value;
          if (data.showInDays > 0) {
            // Only update if isFav is not already false
            data.showInDays = data.showInDays - 1;
            const updateRequest = objectStore.put(data);
            updateRequest.onsuccess = () => {
              console.log("ShowInDays updated successfully");
            };
            updateRequest.onerror = () => {
              showToast("Error while updating data !!");
            };
          }
          cursor.continue(); // Move to the next item
        }
      };
      request.onerror = () => {
        showToast("Error while retrieving data !!");
      };
    } catch (error) {
      console.log("Error in showInDays update !", error);
    }
  };
}

document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (
      file &&
      (file.type === "audio/wav" ||
        file.type === "audio/mp3" ||
        file.type === "audio/x-m4a" ||
        file.type === "audio/m4a")
    ) {
      currentFile = file;
      fileNameLink.textContent = file.name;
      document.getElementById("empty-state").style.display = "none";
      document.getElementById("file-display").style.display = "flex";
      audioPlayer = new Audio(URL.createObjectURL(file));
      audioPlayer.addEventListener("ended", function () {
        isPlaying = false;
        updatePlayPauseIcon();
      });
      uploadButton[0].style.removeProperty("display");
      uploadButton[0].style.display = "";
      deleteAudioButton.style.display = "none";
    } else {
      console.log("Invalid file type- ", file?.type);
      showToast("Invalid file type " + file?.type);
    }
  });

function triggerFileInput(event) {
  if (EnableAudio !== "Y") {
    showToast("This functionality is disabled for your account !!");
    event.preventDefault();
  } else {
    if (event.target.id === "fileNameLink") {
      event.preventDefault();
      document.getElementById("fileInput").click();
    }
  }
}

function togglePlayPause() {
  if (isPlaying) {
    audioPlayer.pause();
  } else {
    audioPlayer.play();
  }
  isPlaying = !isPlaying;
  updatePlayPauseIcon();
}

function updatePlayPauseIcon() {
  // document.getElementById("playIcon").style.display = isPlaying
  //   ? "none"
  //   : "block";
  // document.getElementById("pauseIcon").style.display = isPlaying
  //   ? "block"
  //   : "none";
  // playPauseButton.querySelector(".text").textContent = isPlaying
  //   ? "Pause"
  //   : "Play";
  playPauseButton.querySelector(".icon-play").classList.remove("d-none");
  playPauseButton.querySelector(".icon-stop").classList.add("d-none");
  playPauseButton.querySelector(".text").textContent = "Play";
}

async function uploadFile() {
  if (EnableAudio == "Y") {
    if (!data) {
      showToast("Quiz data not found !!");
      return;
    }
    if (currentFile) {
      const formData = new FormData();
      formData.append("file", currentFile);
      // formData.append("id", data.questionId.toString());
      const token = localStorage.getItem("token");
      if (token) {
        $("#modal-loading").modal("show");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        fetch(`${API_URL}/api/uploadAudio.php?token=${token}`, {
          method: "POST",
          body: formData,
        })
          .then((response) => response.json())
          .then(async (data) => {
            $("#modal-loading").modal("hide");
            console.log(data);
            showToast(data?.message);
            if (data?.success) {
              await updateAudioFileName(data.fileName);
              fileNameLink.textContent = convertFilename(data.fileName);
              document.getElementById("empty-state").style.display = "none";
              document.getElementById("file-display").style.display = "flex";
              uploadButton[0].style.display = "none";
              deleteAudioButton.style.display = "";
              // showData();
              // currentFile = null;
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            showToast(error?.message);
            $("#modal-loading").modal("hide");
          });
      } else {
        console.log("Please login to upload file !!");
        showToast("Please login to upload !!");
      }
    } else {
      $("#modal-loading").modal("hide");
      console.log("Please select a file");
      showToast("Invalid file type");
    }
  } else {
    showToast("This functionality is disabled for your account !!");
  }
}

playPauseButton.addEventListener("click", function () {
  try {
    if (EnableAudio == "Y") {
      if (!isPlaying) {
        isPlaying = true;
        playPauseButton.querySelector(".icon-play").classList.add("d-none");
        playPauseButton.querySelector(".icon-stop").classList.remove("d-none");
        playPauseButton.querySelector(".text").textContent = "";
        audioPlayer.play().catch((error) => {
          console.log("Error in playPauseButton !", error);

          showToast("Failed to play audio !!");
          isPlaying = false;
          audioPlayer.pause();
          audioPlayer.currentTime = 0; // Optional: Reset audio to the beginning
          playPauseButton
            .querySelector(".icon-play")
            .classList.remove("d-none");
          playPauseButton.querySelector(".icon-stop").classList.add("d-none");
          playPauseButton.querySelector(".text").textContent = "Play";
        });
      } else {
        isPlaying = false;
        audioPlayer.pause();
        audioPlayer.currentTime = 0; // Optional: Reset audio to the beginning
        playPauseButton.querySelector(".icon-play").classList.remove("d-none");
        playPauseButton.querySelector(".icon-stop").classList.add("d-none");
        playPauseButton.querySelector(".text").textContent = "Play";
      }
    } else {
      showToast("This functionality is disabled for your account !!");
    }
  } catch (error) {
    console.log("Error in playPauseButton !", error);
  }
});

// startStopButton.addEventListener("click", function () {
//   try {
//     if (EnableAudio == "Y") {
//       if (ttsCheckbox.checked) {
//         ttsUDLevelPlay();
//       } else {
//         if (!isPlaying) {
//           startStopButton.querySelector(".text").textContent = "Stop";

//           disabledControl();

//           const isFavOnly = document.getElementById("show_fav_only").checked;

//           // attachedAudioDataOnly = isFavOnly
//           //   ? favData.filter((item) => {
//           //       return item.fileName;
//           //     })
//           //   : totalData.filter((item) => {
//           //       return item.fileName;
//           //     });

//           if (attachedAudioDataOnly.length === 0) {
//             showToast("No audio attached data found !!");
//             continuous_playback.checked = false;
//           } else {
//             delay2 = parseInt(delayInput2.value || 0);
//             delayInput2.value = delay2;
//             localStorage.setItem("delay2", delay2);
//             playNextAudio();
//           }
//         } else {
//           clearInterval(playNextAudioIntervalId);

//           audioPlayer?.pause();

//           isPlaying = false;
//           startStopButton.querySelector(".text").textContent = "Start";
//           document.getElementById("continuous_playback").disabled = false;
//         }
//       }
//     } else {
//       showToast("This functionality is disabled for your account !!");
//     }
//   } catch (error) {
//     console.log("Error in startStopButton !", error);
//   }
// });

const UDLevelStartStopButtonFunctionality = () => {
  try {
    if (EnableAudio == "Y") {
      if (ttsCheckbox.checked) {
        ttsUDLevelPlay();
      } else {
        if (!isPlaying) {
          // startStopButton.querySelector(".text").textContent = "Stop";

          disabledControl();

          const isFavOnly = document.getElementById("show_fav_only").checked;

          // attachedAudioDataOnly = isFavOnly
          //   ? favData.filter((item) => {
          //       return item.fileName;
          //     })
          //   : totalData.filter((item) => {
          //       return item.fileName;
          //     });

          if (attachedAudioDataOnly.length === 0) {
            showToast("No audio attached data found !!");
            continuous_playback.checked = false;
          } else {
            delay2 = parseInt(delayInput2.value || 0);
            delayInput2.value = delay2;
            localStorage.setItem("delay2", delay2);
            playNextAudio();
          }
        } else {
          clearInterval(playNextAudioIntervalId);

          audioPlayer?.pause();

          isPlaying = false;
          // startStopButton.querySelector(".text").textContent = "Start";
          document.getElementById("continuous_playback").disabled = false;
        }
      }
    } else {
      showToast("This functionality is disabled for your account !!");
    }
  } catch (error) {
    console.log("Error !", error);
  }
};

const playNextAudio = () => {
  clearInterval(playNextAudioIntervalId);

  // const startStopButtonText =
  //   startStopButton.querySelector(".text").textContent;

  if (audioPlayer) {
    isPlaying = false;
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer.src = "";
    audioPlayer = null;
  }

  if (continuous_playback.checked) {
    const randomIndex = Math.floor(
      Math.random() * attachedAudioDataOnly.length,
    );
    index = randomIndex;
    const audioData = attachedAudioDataOnly[index];
    data = audioData;
    showData();
    audioPlayer = new Audio(`${API_URL}/assets/audio/${audioData.fileName}`);
    isPlaying = true;
  }

  audioPlayer.onended = () => {
    if (continuous_playback.checked) {
      playNextAudioIntervalId = setTimeout(
        () => {
          playNextAudio();
          console.log("---");
        },
        parseInt(delay2 || 0) * 1000,
      );
    } else {
      isPlaying = false;
      audioPlayer.currentTime = 0;
      playPauseButton.querySelector(".icon-play").classList.remove("d-none");
      playPauseButton.querySelector(".icon-stop").classList.add("d-none");
      playPauseButton.querySelector(".text").textContent = "Play";
    }
  };
  audioPlayer.play().catch((error) => {
    showToast("Failed to play audio !!");
    isPlaying = false;
    if (continuous_playback.checked) {
      playNextAudioIntervalId = setTimeout(
        () => {
          playNextAudio();
        },
        parseInt(delay2 || 0) * 1000,
      );
    } else {
      isPlaying = false;
      audioPlayer.currentTime = 0;
      playPauseButton.querySelector(".icon-play").classList.remove("d-none");
      playPauseButton.querySelector(".icon-stop").classList.add("d-none");
      playPauseButton.querySelector(".text").textContent = "Play";
    }
  });
};

continuous_playback.addEventListener("change", function () {
  currentTTSIndex = 1;
  if (EnableAudio == "Y") {
    resetEditUserDefineValueMode();
    showAns.value = "";

    clearInterval(playNextAudioIntervalId);
    stopTTSIfRunning();

    if (isPlaying) {
      audioPlayer?.pause();
    }

    isPlaying = false;
    index = 0;

    if (continuous_playback.checked) {
      if (topic != 0) {
        playLoopTTS();
      } else {
        if (ttsCheckbox.checked) {
          // playPauseButton.style.display = "none";
          // startStopButton.style.removeProperty("display");
          // startStopButton.querySelector(".text").textContent = "Start";

          const isFavOnly = document.getElementById("show_fav_only").checked;

          ttsLoopData = isFavOnly ? favData : totalData;

          if (ttsLoopData?.length > 0) {
            showData();
          } else {
            showToast("No data found !!");
            continuous_playback.checked = false;
          }
        } else {
          const isFavOnly = document.getElementById("show_fav_only").checked;

          attachedAudioDataOnly = isFavOnly
            ? favData.filter((item) => {
              return item.fileName;
            })
            : totalData.filter((item) => {
              return item.fileName;
            });

          if (attachedAudioDataOnly.length === 0) {
            showToast("No audio attached data found !!");
            continuous_playback.checked = false;
          } else {
            delay2 = parseInt(delayInput2.value || 0);
            localStorage.setItem("delay2", delay2);

            const randomIndex = Math.floor(
              Math.random() * attachedAudioDataOnly.length,
            );
            index = randomIndex;
            const audioData = attachedAudioDataOnly[index];
            data = audioData;
            showData();
            // playNextAudio();
          }

          // playPauseButton.style.display = "none";
          // startStopButton.style.removeProperty("display");
          // startStopButton.querySelector(".text").textContent = "Start";

          document.getElementById("total_question").innerHTML =
            attachedAudioDataOnly.length;
        }
        UDLevelStartStopButtonFunctionality();
      }
    } else {
      playPauseButton.style.removeProperty("display");
      // startStopButton.style.display = "none";
      // startStopButton.querySelector(".text").textContent = "Start";
      document.getElementById("total_question").innerHTML =
        isFavOnly == "true" ? favData.length : totalData.length;

      toggleQuestion = localStorage.getItem("toggle_question");
      if (toggleQuestion == "true") {
        const toggle = (document.getElementById(
          "toggleQuestionValue",
        ).style.backgroundColor = "darkgray");
      } else {
        const toggle = (document.getElementById(
          "toggleQuestionValue",
        ).style.backgroundColor = null);
      }
      if (toggleQuestion == "true") {
        answer = data?.source?.toString() || "";
      } else {
        answer = data?.target?.toString() || "";
      }
      showData();
    }

    disabledControl();
    document.getElementById("continuous_playback").disabled = false;
  } else {
    showToast("This functionality is disabled for your account !!");
  }
});

function disabledControl() {
  if (continuous_playback.checked) {
    document
      .querySelectorAll("button, input")
      .forEach((element) => (element.disabled = true));

    document
      .querySelectorAll("button")
      .forEach((button) => (button.disabled = true));
    // startStopButton.disabled = false;

    if (ttsCheckbox.checked) {
      document.getElementById("show_fav_only").disabled = false;
      document.getElementById("toggle_fav").disabled = false;
      document.getElementById("toggle_skip").disabled = false;
      document.getElementById("toggle_ns").disabled = false;
    }

    document.getElementById("fileNameLink").disabled = true;
    document.getElementById("fileNameLink").style.cursor = "not-allowed";
    deleteAudioButton.onclick = null;

    // playPauseButton.style.display = "none";
    // startStopButton.style.removeProperty("display");
  } else {
    document
      .querySelectorAll("button")
      .forEach((button) => (button.disabled = false));
    document
      .querySelectorAll("button, input")
      .forEach((element) => (element.disabled = false));
    document.getElementById("fileNameLink").disabled = false;

    playPauseButton.style.removeProperty("display");
    // startStopButton.style.display = "none";
    document.getElementById("fileNameLink").style.removeProperty("cursor");
    deleteAudioButton.onclick = () => {
      $("#deleteAudioModal").modal("show");
    };
  }
}

const deleteAudio = () => {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  if (!data) {
    return;
  }

  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(data.id);
  request.onsuccess = (event) => {
    const data1 = event.target.result;
    if (data1) {
      data1.fileName = null;
      data1.audio_file_name = null;

      data = data1;

      const updateRequest = objectStore.put(data1);
      updateRequest.onsuccess = async () => {
        showData();
        await countData();
        $("#deleteAudioModal").modal("hide");
      };
      updateRequest.onerror = () => {
        showToast("Error while updating data !!");
      };
    }
  };
};

function playErrorSound() {
  try {
    audio.currentTime = 0;
    audio.play();
  } catch (error) { }
}

function stopErrorSound() {
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (error) { }
}

function playTTS({
  text,
  isPlayTTS,
  isPlayErrorSound,
  isLoopTTS,
  language = "en-US",
}) {
  try {
    const token = localStorage.getItem("token");

    if (isLoopTTS && token) {
      speakText(text, language);
    } else {
      if (token && ttsCheckbox.checked) {
        if (isPlayErrorSound) {
          playErrorSound();
        }
        if (isPlayTTS) {
          speakText(text, language);
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

function playLoopTTS() {
  try {
    let delayBTWTTS, speakText;
    const isFavOnly = document.getElementById("show_fav_only").checked;

    ttsLoopData = isFavOnly ? favData : totalData;

    if (ttsLoopData?.length > 0) {
      if (currentTTSIndex == 1) {
        if (
          continuous_playback.checked &&
          ttsCheckbox.checked &&
          randomCheckbox.checked
        ) {
          const bin = Math.round(Math.random());
          toggleQuestion = bin == 1 ? "true" : "false";
          if (toggleQuestion == "true") {
            const toggle = (document.getElementById(
              "toggleQuestionValue",
            ).style.backgroundColor = "darkgray");
          } else {
            const toggle = (document.getElementById(
              "toggleQuestionValue",
            ).style.backgroundColor = null);
          }
        }

        const randomIndex = Math.floor(Math.random() * ttsLoopData.length);
        index = randomIndex;
        const audioData = ttsLoopData[index];
        data = audioData;
      }

      if (toggleQuestion == "true") {
        answer = data?.source?.toString() || "";
      } else {
        answer = data?.target?.toString() || "";
      }

      showAns.value = answer;

      showData();

      if (currentTTSIndex == 1) {
        speakText = QuestionText.value || "";
        currentTTSIndex = 2;
        delayBTWTTS = localStorage.getItem("delay1") || 0;
      } else {
        speakText = showAns.value || "";
        currentTTSIndex = 1;
        delayBTWTTS = localStorage.getItem("delay2") || 0;
      }

      let language = getTTSLanguge(true);
      playNextTTS(speakText, delayBTWTTS, language);
    } else {
      showToast("No data found !!");
      continuous_playback.checked = false;
    }

    document.getElementById("total_question").innerHTML =
      ttsLoopData?.length || 0;
  } catch (error) {
    console.log(error);
  }
}

const playNextTTS = (speakText, delayBTWTTS, language) => {
  try {
    isPlaying = true;
    clearInterval(playNextTTSIntervalId);

    speechSynthesis.cancel();

    playTTS({ text: speakText, isLoopTTS: true, language });

    utterance.onend = () => {
      if (continuous_playback.checked && isPlaying) {
        playNextTTSIntervalId = setTimeout(
          () => {
            playLoopTTS();
          },
          parseInt(delayBTWTTS || 0) * 1000,
        );
      } else {
        isPlaying = false;
        clearInterval(playNextTTSIntervalId);
      }
    };

    utterance.onerror = () => {
      isPlaying = false;
      clearInterval(playNextTTSIntervalId);
      if (continuous_playback.checked && isPlaying) {
        showToast("Failed to play TTS !!");
        playLoopTTS();
      }
    };
  } catch (error) {
    console.log(error);
  }
};

function stopTTSIfRunning() {
  try {
    isPlaying = false;

    clearInterval(playNextTTSIntervalId);

    speechSynthesis.cancel();
  } catch (error) {
    console.log(error);
  }
}

function ttsUDLevelPlay() {
  if (!isPlaying) {
    // startStopButton.querySelector(".text").textContent = "Stop";
    disabledControl();
    playLoopTTS();
  } else {
    clearInterval(playNextTTSIntervalId);
    stopTTSIfRunning();
    // startStopButton.querySelector(".text").textContent = "Start";
    document.getElementById("continuous_playback").disabled = false;
  }
  console.log("ttsUDLevelPlay", isPlaying);
}

async function showSecondaryLanguage() {
  const btn = document.getElementById("show_secondary_language_button");
  const spinner = document.getElementById("new-spinner");
  const btnText = document.getElementById("show_text");
  const input = document.getElementById("show_secondary_language");
  const input2 = document.getElementById("show_SecondaryNote");

  try {
    const secondaryLanguage = JSON.parse(
      localStorage.getItem("secondary-language") || "{}",
    );
    const languagePhrase = secondaryLanguage?.code || "en-US";
    const secondLanguage = secondaryLanguage?.name;

    if (input.value && input.value != "Not found.") {
      playTTS({ isPlayTTS: true, text: input.value, language: languagePhrase });
      return;
    }

    btn.disabled = true;
    spinner.classList.remove("d-none");
    btnText.classList.add("d-none");

    const response = await fetch(
      `${API_URL}/api/get_language_data.php?sourceSubjectId=${data?.sourceSubjectId}&source=${data?.source}`,
    );
    const result = await response.json();

    if (result?.success) {
      input.value = result?.data?.[secondLanguage];
      input2.value = result?.data?.[secondLanguage + "_NOTE"];

      playTTS({ isPlayTTS: true, text: input.value, language: languagePhrase });
    } else {
      input.value = "Not found.";
    }
  } catch (error) {
    input.value = "Not found.";
    console.error(error);
  } finally {
    btn.disabled = false;
    spinner.classList.add("d-none");
    btnText.classList.remove("d-none");
  }
}

// AI Sentence Generator Logic
const aiCreateBtn = document.getElementById("ai_create_btn");
const aiSaveBtn = document.getElementById("ai_save_btn");
const aiOutput = document.getElementById("ai_sentence_output");
let generatedSentenceData = null;

if (aiCreateBtn) {
  aiCreateBtn.addEventListener("click", async () => {
    if (!data) {
      showToast("No data available to generate sentence.");
      return;
    }

    const sourceLangObj = JSON.parse(localStorage.getItem('source-language') || '{}');
    const targetLangObj = JSON.parse(localStorage.getItem('target-language') || '{}');
    const sourceLang = sourceLangObj?.description || sourceLangObj?.name || 'English';
    const targetLang = targetLangObj?.description || targetLangObj?.name || 'English';

    const sourceText = data.source;
    const targetWord = data.target;

    aiCreateBtn.disabled = true;
    aiCreateBtn.innerText = "Wait...";
    aiSaveBtn.style.display = "none";
    aiOutput.style.display = "block";
    aiOutput.innerHTML = "Generating...";

    try {
      // Read selected model from shared localStorage store
      const selectedModel = getSelectedModel();

      // Read user profile context from localStorage
      const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userContext = cachedUser?.user_context || '';

      const response = await fetch(`${API_URL}/api/generate_sentence.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLang,
          targetLang,
          sourceText,
          targetWord,
          model: selectedModel,
          user_context: userContext
        })
      });
      const resData = await response.json();
      if (resData.success && resData.data) {
        generatedSentenceData = {
          source: resData?.data?.source,
          target: resData?.data?.target
        };
        aiOutput.innerHTML = `<strong>S:</strong> ${resData.data.source}\n<strong>T:</strong> ${resData.data.target}`;
        aiSaveBtn.style.display = "inline-block";
      } else {
        aiOutput.innerHTML = "Error: " + (resData.message || "Failed to generate.");
      }
    } catch (e) {
      aiOutput.innerHTML = "Error: " + e.message;
    }
    aiCreateBtn.disabled = false;
    aiCreateBtn.innerText = "Create";
  });
}

if (aiSaveBtn) {
  aiSaveBtn.addEventListener("click", () => {
    if (!generatedSentenceData) return;

    const userDBReq = indexedDB.open("user", 1);
    userDBReq.onsuccess = (e) => {
      const uDB = e.target.result;
      const tx = uDB.transaction("userData", "readwrite");
      const store = tx.objectStore("userData");

      const countReq = store.openCursor(null, "prev");
      countReq.onsuccess = (event) => {
        const cursor = event.target.result;
        let nextId = 1;
        if (cursor) {
          nextId = cursor.value.id + 1;
        }

        const newData = {
          id: nextId,
          subjectId: subject,
          source: generatedSentenceData?.source,
          target: generatedSentenceData?.target,
          targetNote: "",
          isFav: false,
          isSkip: false,
          showInDays: 0,
          lastShown: 0,
          targetSubjectId: targetSubjectId,
          sourceSubjectId: subject,
          topicId: 0
        };

        const addReq = store.add(newData);
        addReq.onsuccess = () => {
          showToast("Saved to UserData!");
          aiSaveBtn.style.display = "none";
          aiOutput.style.display = "none";
          generatedSentenceData = null;
        };
        addReq.onerror = () => {
          showToast("Error saving to UserData.");
        };
      };
    };
    userDBReq.onerror = () => {
      showToast("Error opening UserData.");
    };
  });
}

function resetAISentenceGenerator() {
  const aiOutput = document.getElementById("ai_sentence_output");
  const aiSaveBtn = document.getElementById("ai_save_btn");
  if (aiOutput) {
    aiOutput.style.display = "none";
    aiOutput.innerHTML = "";
  }
  if (aiSaveBtn) {
    aiSaveBtn.style.display = "none";
  }
  generatedSentenceData = null;
}
