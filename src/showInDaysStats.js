var dbName = "test";
var dbVersion = 1;
var storeName = "data";
var index = "subjectTopicIndex";

var topic = parseInt(localStorage.getItem("topic"));

if (topic == 0) {
  dbName = "user";
  dbVersion = 1;
  storeName = "userData";
  index = "subjectIndex";
}

const openRequest = indexedDB.open(dbName, dbVersion);
const userOpenRequest = indexedDB.open("user", 1);
let db, userDB; // Reference to the IndexedDB database
let statsData = Array.from({ length: 100 }, (_, i) => 0);

var subject = parseInt(localStorage.getItem("subject")) || 1;

const urlParams = new URLSearchParams(window.location.search);

const value = localStorage.getItem("toggle_question"); //false means value1 show otherwise value2

var indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

window.addEventListener("load", function () {});

function replaceStateWithHistory(page) {
  const topicNumber = localStorage.getItem("topic");
  const token = localStorage.getItem("token");
  if (topicNumber == 0 && !token) {
    showToast(
      "Access to this section requires a login.\nPlease login first !!"
    );
  } else {
    history.replaceState(null, "", page);
    window.location.href = page;
  }
}

const backButton = document.getElementById("backButton");
backButton.onclick = function () {
  // window.history.back();
  window.location.href = "manageRecord.html?id=1";
};

openRequest.onupgradeneeded = (event) => {
  db = event.target.result;

  // Create the object store if it doesn't exist
  if (!db.objectStoreNames.contains(storeName)) {
    const objectStore = db.createObjectStore(storeName, { keyPath: "id" });
    // Create a compound index for subjectId and topicId

    if (topic == 0) {
      objectStore.createIndex(index, ["subjectId"]);
    } else {
      objectStore.createIndex(index, ["subjectId", "topicId"]);
    }
  }
};
userOpenRequest.onupgradeneeded = (event) => {
  userDB = event.target.result;

  // Create the object store if it doesn't exist
  if (!userDB.objectStoreNames.contains("userData")) {
    const objectStore = userDB.createObjectStore("userData", { keyPath: "id" });
    // Create a compound index for subjectId and topicId
    objectStore.createIndex("subjectIndex", ["subjectId"]);
  }
};

openRequest.onerror = (event) => {
  console.error("Database error: " + event.target.error);
};
userOpenRequest.onerror = (event) => {
  console.error("Database error: " + event.target.error);
};

openRequest.onsuccess = (event) => {
  db = event.target.result;
  displayData();
};
userOpenRequest.onsuccess = (event) => {
  userDB = event.target.result;
};

async function displayData() {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }
  try {
    const transaction = db.transaction(storeName, "readonly");
    const objectStore = transaction.objectStore(storeName);

    const dataTable = document.getElementById("dataTable");
    const suggestion = document.getElementById("suggestion");

    const tbody = dataTable.querySelector("tbody");
    tbody.innerHTML = "";

    var subjectId = subject;
    var topicId = topic;

    if (topic == 0) {
      var range = IDBKeyRange.only([subjectId]);
    } else {
      var range = IDBKeyRange.only([subjectId, topicId]);
    }

    var request = objectStore.index(index);
    var idNumber = 1;

    request.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const data = cursor.value;

        if (data?.showInDays != undefined || data?.showInDays != null) {
          statsData[data?.showInDays || 0]++;
        }
        cursor.continue();
      } else {
        let isExistData = false;
        statsData.map((item, index) => {
          if (item > 0) {
            isExistData = true;
            const row = appendData(item, index);
            tbody.appendChild(row);
          }
        });

        if (!isExistData) {
            dataTable.style.display = "none";
            suggestion.style.display = "block";
        }
      }
    };
  } catch (error) {
    console.log(error);
  }
}

function loadUpdatedTable() {
  const dataTable = document.getElementById("dataTable");
  const tbody = dataTable.querySelector("tbody");
  tbody.innerHTML = "";
  displayData();
}

function appendData(data, idNumber) {
  const row = document.createElement("tr");

  row.innerHTML = `
                    <td>${idNumber}</td>
                    <td>${data}`;
  return row;
}

async function getData() {
  if (!db) {
    console.error("Database is not open yet.");
    throw new Error("Database is not open yet.");
  }

  const transaction = db.transaction(storeName, "readonly");
  const objectStore = transaction.objectStore(storeName);
  const dataTable = document.getElementById("dataTable");
  const tbody = dataTable.querySelector("tbody");
  tbody.innerHTML = "";

  return new Promise((resolve, reject) => {
    let allData = [];

    var subjectId = subject;
    var topicId = topic;

    if (topic == 0) {
      var range = IDBKeyRange.only([subjectId]);
    } else {
      var range = IDBKeyRange.only([subjectId, topicId]);
    }
    var request = objectStore.index(index);

    const req = request.getAll(range);

    req.onsuccess = (event) => {
      allData = event.target.result;
      resolve(allData);
    };

    req.onerror = (event) => {
      console.error("Error fetching data:", event.target.error);
      reject(event.target.error);
    };
  });
}
