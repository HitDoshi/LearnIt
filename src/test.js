var dbName = "test";
var dbVersion = 1;
var storeName = "data";
var keyIndex = "subjectTopicIndex";

var topic = parseInt(localStorage.getItem("topic"));
var subject = parseInt(localStorage.getItem("subject")) || 1;
var delay = localStorage.getItem("delay");

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
var allData = 0;
var totalSkipData = 0;
var totalFavData = 0;
var totalRightAnswer = 0;
var totalFullDayRightAns = 0;
var isRightDone = false;
var toggleQuestion = "false";
var answer = "";
var timer;
var startSessionTime;
var sessionStartTimerBasicTime = 300000; // 5 min = 300000 sec
var sessionInterval, dailyInterval;
var playNextAudioIntervalId;

let currentFile = null;
let audioPlayer = null;
let isPlaying = false;
var index = 0;
const EnableAudio = localStorage.getItem("EnableAudio") || "N";

const audioElement = document.getElementById("audio");
const playPauseButton = document.getElementById("playPauseButton");
const fileNameLink = document.getElementById("fileNameLink");
const uploadButton = document.getElementsByClassName("uploadButton");
const delayInput = document.getElementById("delay_input");
const startStopButton = document.getElementById("startStopButton");
const deleteAudioButton = document.getElementById("deleteAudioButton");

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
const UserDefined1 = document.getElementById("show_UserDefined1");
const showAns = document.getElementById("show_ans");
const QuestionText = document.getElementById("value_1");

window.addEventListener("load", function () {

  const user = JSON.parse(localStorage.getItem('user') || "{}");
  const maxUD = parseInt(user?.maxUD || 0);
  document.getElementById("maxUD").innerText = `${maxUD}`;

  if (topic != 0) {
    document.getElementById("file-info").style.display = "none";
    document.getElementById("continuous_playback_container").style.display =
      "none";
  }

  delayInput.value = delay;
  clearTimeout(timer); // Clear the previous timer if it exists

  if (EnableAudio != "Y") {
    continuous_playback.disabled = true;
    delayInput.disabled = true;
    deleteAudioButton.disabled = true;
    // document.getElementById("deleteIconContainer").disabled = true;
    document
      .getElementById("continuous_playback_container")
      .addEventListener("click", () => {
        showToast("This functionality is disabled for your account !!");
      });

    document.getElementById("delay_container").addEventListener("click", () => {
      showToast("This functionality is disabled for your account !!");
    });
  }
});

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
      objectStore.createIndex(keyIndex, ["subjectId"]);
    } else {
      objectStore.createIndex(keyIndex, ["subjectId", "topicId"]);
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

    const toggleQuestionCheckbox = document.getElementById(
      "toggle_question_type"
    );
    toggleQuestionCheckbox.addEventListener("change", toggleQuestionType);

    const t = localStorage.getItem("toggle_question");

    if (t == "true") {
      document.getElementById("toggleQuestionValue").style.backgroundColor =
        "darkgray";
    } else {
      document.getElementById("toggleQuestionValue").style.backgroundColor =
        null;
    }

    await countData();
    totalData = shuffle(totalData);
    favData = shuffle(favData);

    console.log(totalData);
    console.log(favData);

    isFavOnly = localStorage.getItem("showFavOnly") || "false";
    totalRightAnswer = localStorage.getItem("total_right") || 0;
    totalFullDayRightAns = localStorage.getItem("totalRightAns") || 0;
    toggleQuestion = localStorage.getItem("toggle_question") || "false";

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

async function countData() {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error("Database is not open yet.");
      reject("Database not open");
      return;
    }

    totalData = [];
    favData = [];

    // Access the object store
    const transaction = db.transaction(storeName, "readwrite");
    const objectStore = transaction.objectStore(storeName);

    // Specify the subjectId and topicId you want to search for
    var subjectId = subject; // Change this to the subjectId you want to search for
    var topicId = topic; // Change this to the topicId you want to search for

    // Create a range for the compound index
    if (topic == 0) {
      var range = IDBKeyRange.only([subjectId]);
    } else {
      var range = IDBKeyRange.only([subjectId, topicId]);
    }
    // Use the compound index for the search
    var request = objectStore.index(keyIndex);

    request.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const data = cursor.value;

        if (data.isSkip || data.showInDays != 0) {
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
    return;
  }

  if (isFavOnly == "true") {
    // Generate a random index within the range of available records
    const randomIndex = Math.floor(Math.random() * favData.length);
    data = favData[randomIndex];

    console.log(data);
    showData();
  } else {
    // Generate a random index within the range of available records
    const randomIndex = Math.floor(Math.random() * totalData.length);
    data = totalData[randomIndex];
    console.log(data);
    showData();
  }

  if (toggleQuestion == "true") {
    answer = data.value1;
  } else {
    answer = data.value2;
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
  const randomIndex = Math.floor(Math.random() * favData.length);
  data = favData[randomIndex];
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
    var range = IDBKeyRange.only([subjectId]);
  } else {
    var range = IDBKeyRange.only([subjectId, topicId]);
  }
  // Use the compound index for the search
  var request = objectStore.index(keyIndex);

  // Use a cursor to iterate through the records and collect the keys
  request.openCursor(range).onsuccess = function (event) {
    const cursor = event.target.result;

    if (cursor) {
      const data = cursor.value;

      if (data.isSkip) {
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
      let value1 = "";
      let value2 = "";

      if (toggleQuestion == "true") {
        value1 = showAns.value;
        value2 = QuestionText.value;
      } else {
        value2 = showAns.value;
        value1 = QuestionText.value;
      }
      const updatedUserDefined1 = UserDefined1.value || "";

      existingData.value1 = value1;
      existingData.value2 = value2;
      existingData.UserDefined1 = updatedUserDefined1;

      const updateRequest = objectStore.put(existingData);
      updateRequest.onsuccess = () => {
        totalData.forEach((item, index) => {
          if (item.id == data.id) {
            item.value1 = value1;
            item.value2 = value2;
            item.UserDefined1 = updatedUserDefined1;
          }
        });

        data.value1 = value1;
        data.value2 = value2;
        data.UserDefined1 = updatedUserDefined1;
      };
      updateRequest.onerror = () => {
        showToast("Error while updating data !!");
      };
    }
  };
}

function resetEditUserDefineValueMode() {
  isEditModeOn = 0;
  UserDefined1.disabled = true;
  showButtonId.innerHTML = "Show";
  UserDefined1.style.backgroundColor = "lightblue";
  UserDefined1.style.borderWidth = "0px";

  showAns.disabled = true;
  showAns.style.backgroundColor = "lightblue";
  showAns.style.borderWidth = "0px";

  QuestionText.disabled = true;
  QuestionText.style.backgroundColor = "lightblue";
  QuestionText.style.borderWidth = "0px";
}

function toggleQuestionType() {
  const q = localStorage.getItem("toggle_question");
  console.log(q);
  toggleQuestion = q == "true" ? "false" : "true";
  console.log(toggleQuestion);
  localStorage.setItem("toggle_question", toggleQuestion);

  if (toggleQuestion == "true") {
    const toggle = (document.getElementById(
      "toggleQuestionValue"
    ).style.backgroundColor = "darkgray");
  } else {
    const toggle = (document.getElementById(
      "toggleQuestionValue"
    ).style.backgroundColor = null);
  }

  getData();
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
    const data = event.target.result;
    if (data) {
      if (isChecked) {
        allData--;
      }
      if (data.isFav) {
        totalFavData--;
      }
      data.isSkip = isChecked;

      const updateRequest = objectStore.put(data);
      updateRequest.onsuccess = () => {
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

  const showInDaysValue = document.getElementById("showInDays").value;

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
      console.log(allData);
      data.showInDays = parseInt(showInDaysValue);
      data.lastShown = parseInt(showInDaysValue);

      const updateRequest = objectStore.put(data);
      updateRequest.onsuccess = () => {
        if (!data.isSkip && showInDaysValue != 0) {
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
    currentFile = null;
    // const UserDefined1 = document.getElementById("show_UserDefined1");
    const isFav = document.getElementById("toggle_fav");
    const isSkip = document.getElementById("toggle_skip");
    const showInDays = document.getElementById("showInDays");
    const lastShown = document.getElementById("last_shown");

    if (toggleQuestion == "true") {
      QuestionText.value = data.value2;
    } else {
      QuestionText.value = data.value1;
    }

    // UserDefined1.innerHTML = data?.UserDefined1 ? data.UserDefined1 : "";
    UserDefined1.value = data?.UserDefined1 ? data.UserDefined1 : "";

    isFav.checked = data.isFav;
    isSkip.checked = data.isSkip;
    showInDays.value = data.showInDays;
    lastShown.innerHTML = data.lastShown;

    console.log(data);

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
        encodeURI(`${API_URL}/assets/audio/${data.fileName}`)
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

    // setTimer();
  } catch (error) {
    console.log("Error:-->", error?.message);
  }
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
  const showInDaysValue = document.getElementById("showInDays").value;
  if (data != null && data?.showInDays != parseInt(showInDaysValue)) {
    changeShowInDaysValue();
  }
  shwoBlankData();
  resetEditUserDefineValueMode();

  await countData();

  await getData();
}

function shwoBlankData() {
  QuestionText.value = "";
  showAns.value = "";
  document.getElementById("show_UserDefined1").value = "";
  const isFav = (document.getElementById("toggle_fav").checked = false);
  const isSkip = (document.getElementById("toggle_skip").checked = false);
  const enter_ans = document.getElementById("enter_ans");
  enter_ans.style.backgroundColor = "white";
  enter_ans.style.color = "black";

  document.getElementById("enter_ans").value = "";
  document.getElementById("showInDays").value = 0;
  document.getElementById("last_shown").innerHTML = 0;
  // setTimer();
}

function getCurrentFormattedDate(){
  const today = new Date();
  const formattedDate = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
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
  }

  const date = localStorage.getItem("date");
  document.getElementById("date").innerText = `${date}`;

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
        document.getElementById("date").innerText = `${formattedDate}`;

        const user = JSON.parse(localStorage.getItem('user') || "{}");        
        
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
  } else {
    enter_ans.style.backgroundColor = "red";
    enter_ans.style.color = "white";
    console.log("Wrong");
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
    return;
  }

  if (isEditModeOn === 1) {
    showButtonId.innerHTML = "Save";
    isEditModeOn = 2;
    UserDefined1.disabled = false;
    UserDefined1.style.backgroundColor = "transparent";
    UserDefined1.style.borderWidth = "1px";

    showAns.disabled = false;
    showAns.style.backgroundColor = "transparent";
    showAns.style.borderWidth = "1px";

    QuestionText.disabled = false;
    QuestionText.style.backgroundColor = "transparent";
    QuestionText.style.borderWidth = "1px";

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

// Set a timer with a 5-minute delay
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
        UserObjectStore.createIndex("subjectIndex", ["subjectId"]);
      } else {
        UserObjectStore.createIndex("subjectIndex", ["subjectId", "topicId"]);
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
        RegularObjectStore.createIndex("subjectTopicIndex", ["subjectId"]);
      } else {
        RegularObjectStore.createIndex("subjectTopicIndex", [
          "subjectId",
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

startStopButton.addEventListener("click", function () {
  try {
    if (EnableAudio == "Y") {
      if (!isPlaying) {
        startStopButton.querySelector(".text").textContent = "Stop";

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
          delay = delayInput.value || 0;
          localStorage.setItem("delay", delay);
          playNextAudio();
        }
      } else {
        clearInterval(playNextAudioIntervalId);

        audioPlayer?.pause();

        isPlaying = false;
        startStopButton.querySelector(".text").textContent = "Start";
        document.getElementById("continuous_playback").disabled = false;
      }
    } else {
      showToast("This functionality is disabled for your account !!");
    }
  } catch (error) {
    console.log("Error in startStopButton !", error);
  }
});

const playNextAudio = () => {
  clearInterval(playNextAudioIntervalId);

  const startStopButtonText =
    startStopButton.querySelector(".text").textContent;

  if (audioPlayer) {
    isPlaying = false;
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer.src = "";
    audioPlayer = null;
  }

  if (startStopButtonText === "Stop") {
    const randomIndex = Math.floor(
      Math.random() * attachedAudioDataOnly.length
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
      playNextAudioIntervalId = setTimeout(() => {
        playNextAudio();
        console.log("---");
      }, parseInt(delay || 0) * 1000);
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
      playNextAudioIntervalId = setTimeout(() => {
        playNextAudio();
      }, parseInt(delay || 0) * 1000);
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
  if (EnableAudio == "Y") {
    resetEditUserDefineValueMode();
    showAns.value = "";

    clearInterval(playNextAudioIntervalId);

    if (isPlaying) {
      audioPlayer?.pause();
    }

    isPlaying = false;
    index = 0;

    if (continuous_playback.checked) {
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
        delay = delayInput.value || 0;
        localStorage.setItem("delay", delay);

        const randomIndex = Math.floor(
          Math.random() * attachedAudioDataOnly.length
        );
        index = randomIndex;
        const audioData = attachedAudioDataOnly[index];
        data = audioData;
        showData();
        // playNextAudio();
      }

      playPauseButton.style.display = "none";
      startStopButton.style.removeProperty("display");
      startStopButton.querySelector(".text").textContent = "Start";

      document.getElementById("total_question").innerHTML =
        attachedAudioDataOnly.length;
    } else {
      playPauseButton.style.removeProperty("display");
      startStopButton.style.display = "none";
      startStopButton.querySelector(".text").textContent = "Start";
      document.getElementById("total_question").innerHTML =
        isFavOnly == "true" ? favData.length : totalData.length;
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
    startStopButton.disabled = false;

    document.getElementById("fileNameLink").disabled = true;
    document.getElementById("fileNameLink").style.cursor = "not-allowed";
    deleteAudioButton.onclick = null;

    playPauseButton.style.display = "none";
    startStopButton.style.removeProperty("display");
  } else {
    document
      .querySelectorAll("button")
      .forEach((button) => (button.disabled = false));
    document
      .querySelectorAll("button, input")
      .forEach((element) => (element.disabled = false));
    document.getElementById("fileNameLink").disabled = false;

    playPauseButton.style.removeProperty("display");
    startStopButton.style.display = "none";
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
