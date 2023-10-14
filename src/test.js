const dbName = "test";
const dbVersion = 1;
const storeName = "indexDB";

var data = null;
var isFavOnly = false;
var favData = [];
var totalData = [];
var allData = 0;
var totalSkipData = 0;
var totalFavData = 0;
var totalRightAnswer = 0;
var isRightDone = false;
var toggleQuestion = "false";
var answer = "";
var timer;

let db; // Reference to the IndexedDB database

var indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;
// var request = indexedDB.deleteDatabase("test");
const openRequest = indexedDB.open(dbName, dbVersion);

window.addEventListener("load", function () {
  clearTimeout(timer); // Clear the previous timer if it exists
});

openRequest.onupgradeneeded = (event) => {
  db = event.target.result;
  // Create the object store if it doesn't exist
  if (!db.objectStoreNames.contains(storeName)) {
    db.createObjectStore(storeName, { keyPath: "id" });
  }
};

openRequest.onerror = (event) => {
  console.error("Database error: " + event.target.errorCode);
};

// Handle the database open success event
openRequest.onsuccess = async function (event) {
  db = event.target.result;

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

  await countData();
  totalData = shuffle(totalData);
  favData = shuffle(favData);

  console.log(totalData);
  console.log(favData);

  isFavOnly = localStorage.getItem("showFavOnly").toString();
  totalRightAnswer = localStorage.getItem("total_right");
  toggleQuestion = localStorage.getItem("toggle_question");


  document.getElementById("show_fav_only").checked = isFavOnly == "true";
  document.getElementById("toggle_question_type").checked =
    toggleQuestion == "true";

  document.getElementById("total_question").innerHTML =
    isFavOnly == "true" ? favData.length : totalData.length;
  document.getElementById("total_right_attempt").innerHTML = totalRightAnswer;

  await getData();

  setTimer();
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
    objectStore.openCursor().onsuccess = (event) => {
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

  // Use a cursor to iterate through the records and collect the keys
  objectStore.openCursor().onsuccess = function (event) {
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

  if(!data){
    return;
  }

  const isChecked = event.target.checked;

  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  if (isChecked) {
    favData.push(data);
  } else {
    favData.forEach((item, index) => {
      if (item.id == data.id) {
        favData.splice(index, 1);
      }
    });
  }

  console.log(favData.length);

  totalData.forEach((item, index) => {
    if (item.id == data.id) {
      item.isFav = isChecked;
    }
  });

  totalData = shuffle(totalData);
  favData = shuffle(favData);

  const request = objectStore.get(data.id);
  request.onsuccess = (event) => {
    const data = event.target.result;
    if (data) {
      data.isFav = isChecked;
      objectStore.put(data);
    }
  };
  setTimer();
}
function toggleQuestionType(event) {
  toggleQuestion = event.target.checked.toString();
  localStorage.setItem("toggle_question", toggleQuestion);

  getData();
}

function toggleSkipValue(event) {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  if(!data){
    return;
  }

  const isChecked = event.target.checked;

  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

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
      objectStore.put(data);
      console.log(data);
    }
  };
  setTimer();
}

function showData() {

  if(!data){
    return;
  }

  const value1 = document.getElementById("value_1");
  const isFav = document.getElementById("toggle_fav");
  const isSkip = document.getElementById("toggle_skip");

  if (toggleQuestion == "true") {
    value1.innerText = data.value2;
  } else {
    value1.innerText = data.value1;
  }

  isFav.checked = data.isFav;
  isSkip.checked = data.isSkip;
  setTimer();
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

  getData();
}

function shwoBlankData() {
  document.getElementById("value_1").innerText = "";
  document.getElementById("show_ans").innerText = "";
  const isFav = (document.getElementById("toggle_fav").checked = false);
  const isSkip = (document.getElementById("toggle_skip").checked = false);
  const enter_ans = document.getElementById("enter_ans");
  enter_ans.style.backgroundColor = "white";
  enter_ans.style.color = "black";

  document.getElementById("enter_ans").value = "";
  setTimer();
}

function checkAnswer() {
  const enter_ans = document.getElementById("enter_ans");

  if (!data) {
    return;
  }

  if (enter_ans.value.toLowerCase().toString() == "") {
    return;
  }
  if (
    enter_ans.value.toLowerCase().toString() == answer.toLowerCase().toString()
  ) {
    console.log("Right");

    if (!isRightDone) {
      totalRightAnswer++;
      document.getElementById("total_right_attempt").innerHTML =
        totalRightAnswer;
      localStorage.setItem("total_right", totalRightAnswer);
    }
    enter_ans.style.backgroundColor = "green";
    enter_ans.style.color = "white";
    isRightDone = true;
  } else {
    enter_ans.style.backgroundColor = "red";
    enter_ans.style.color = "white";
    console.log("Wrong");
  }
  setTimer();
}

function showAnswer() {
  if (!data) {
    return;
  }

  document.getElementById("show_ans").innerText = answer;

  setTimer();
}

// Set a timer with a 5-minute delay
function setTimer() {
  clearTimeout(timer); // Clear the previous timer if it exists
  timer = setTimeout(timerFunction, 300000); // Set a new timer for 5 minutes
}

// Define a function to be executed after 5 minutes
function timerFunction() {
  console.log("Timer completed after 5 minutes.");
  localStorage.setItem("total_right", 0);

  document.getElementById("total_right_attempt").innerHTML = 0;
  // You can replace this line with any action you want to perform.
}
