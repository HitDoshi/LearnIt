var dbName = "test";
var dbVersion = 1;
var storeName = "data";
var keyIndex = "subjectTopicIndex";

var topic = parseInt(localStorage.getItem("topic"));

if (topic == 0) {
  dbName = "user";
  dbVersion = 1;
  storeName = "userData";
  keyIndex = "subjectIndex";
}

var data = null;
var isFavOnly = false;
var favData = [];
var totalData = [];
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

let isEditModeOn = 0; // 0 means off, 1 means on edit , 2 means on save

let db; // Reference to the IndexedDB database

var subject = parseInt(localStorage.getItem("subject")) || 1;
var topic = parseInt(localStorage.getItem("topic"));

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

window.addEventListener("load", function () {
  clearTimeout(timer); // Clear the previous timer if it exists
});

function replaceStateWithHistory(page) {
  history.replaceState(null, "", page);
  // window.location.reload();
  window.location.href = page;
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

        if (data.isSkip) {
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
function saveUserDefineValue1() {
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
      const updatedUserDefined1 = UserDefined1.value || "";
      console.log(updatedUserDefined1);
      existingData.UserDefined1 = updatedUserDefined1;
      const updateRequest = objectStore.put(existingData);
      updateRequest.onsuccess = () => {
        totalData.forEach((item, index) => {
          if (item.id == data.id) {
            item.UserDefined1 = updatedUserDefined1;
          }
        });
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

function showData() {
  if (!data) {
    return;
  }

  try {
    const value1 = document.getElementById("value_1");
    // const UserDefined1 = document.getElementById("show_UserDefined1");
    const isFav = document.getElementById("toggle_fav");
    const isSkip = document.getElementById("toggle_skip");

    if (toggleQuestion == "true") {
      value1.innerText = data.value2;
    } else {
      value1.innerText = data.value1;
    }

    // UserDefined1.innerHTML = data?.UserDefined1 ? data.UserDefined1 : "";
    UserDefined1.value = data?.UserDefined1 ? data.UserDefined1 : "";

    isFav.checked = data.isFav;
    isSkip.checked = data.isSkip;
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

function nextValue() {
  shwoBlankData();
  resetEditUserDefineValueMode();

  getData();
}

function shwoBlankData() {
  document.getElementById("value_1").innerText = "";
  document.getElementById("show_ans").innerText = "";
  document.getElementById("show_UserDefined1").value = "";
  const isFav = (document.getElementById("toggle_fav").checked = false);
  const isSkip = (document.getElementById("toggle_skip").checked = false);
  const enter_ans = document.getElementById("enter_ans");
  enter_ans.style.backgroundColor = "white";
  enter_ans.style.color = "black";

  document.getElementById("enter_ans").value = "";
  // setTimer();
}

function checkAnswer() {
  const remainingTime = getRemainingTime();
  if (remainingTime == 0) {
    localStorage.setItem("timestamp", Date.now());
    setTimer();
    timerFunction();
  }

  const date = localStorage.getItem("date");

  if (date) {
    const today = new Date().toLocaleString().split(",")[0].toString();
    const currentDate = new Date(today).getTime();
    const storeDate = new Date(date).getTime();

    if (currentDate > storeDate) {
      uploadDailyUserDataFunction(false);
      uploadUserActivity();
      localStorage.setItem(
        "date",
        new Date().toLocaleString().split(",")[0].toString()
      );
      localStorage.setItem("totalRightAns", 0);
      totalRightAnswer = 0;
      document.getElementById("total_right_attempt").innerHTML =
        totalRightAnswer;
    }
  } else {
    localStorage.setItem(
      "date",
      new Date().toLocaleString().split(",")[0].toString()
    );
  }

  const enter_ans = document.getElementById("enter_ans");
  const ans = enter_ans.value.toLowerCase().trim().toString();
  if (!data) {
    return;
  }

  if (ans == "") {
    return;
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
  document.getElementById("show_ans").innerText = answer;

  if (isEditModeOn === 0) {
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
    return;
  }

  if (isEditModeOn === 2) {
    saveUserDefineValue1();
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
