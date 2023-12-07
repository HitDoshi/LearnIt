var dbName = "test";
var dbVersion = 1;
var storeName = "data";
var keyIndex = "subjectTopicIndex"

var topic = parseInt(localStorage.getItem("topic"));

if (topic == 0) {
  dbName = "user";
  dbVersion = 1;
  storeName = "userData";
  keyIndex = "subjectIndex";
}

// replace screen function

function replaceStateWithHistory(page) {
  history.replaceState(null, '', page);
  // window.location.reload();
  window.location.href = page;
}

// icon back press function

const backButton = document.getElementById('backButton');
backButton.onclick = function() {
  // window.history.back();
  window.location.href = 'test.html';
};

const openRequest = indexedDB.open(dbName, dbVersion);
let db; // Reference to the IndexedDB database
var value1 = []; // skip data ==> {id,isSkip}
var value2 = []; // delete data ==> {id}
var ansId = null;
var questionId = null;
var select = 0; // 0-none , 1-left , 2-right
var questionRow = null;
var answerRow = null;

var subject = parseInt(localStorage.getItem("subject")) || 1;
var topic = parseInt(localStorage.getItem("topic"));

const color = ['#EEE685',"#9F9F5F","#808000","#48D1CC","#C0D9D9","#AFEEEE","#00B2EE","#A4D3EE","#D8BFD8","#ECC8EC",
"#6f42c1","#fd7e14","#ffc107","#7F5A58","#3C565B","#808000","#FFFFCC","#FFDEAD","#9F8C76","#F98B88"];
var index = 0;

var indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;
// var request = indexedDB.deleteDatabase("test");

openRequest.onupgradeneeded = (event) => {
  db = event.target.result;
  // Create the object store if it doesn't exist
  if (!db.objectStoreNames.contains(storeName)) {
    db.createObjectStore(storeName, { keyPath: "id" });
    // Create a compound index for subjectId and topicId
    objectStore.createIndex(keyIndex, ["subjectId", "topicId"]);


    if(topic==0){
      objectStore.createIndex(keyIndex, ["subjectId"]);
    }else{
      objectStore.createIndex(keyIndex, ["subjectId", "topicId"]);
    }
  }
};

openRequest.onerror = (event) => {
  console.error("Database error: " + event.target.errorCode);
};

openRequest.onsuccess = (event) => {
  db = event.target.result;


  // Fetch and store data from data.json if it doesn't exist in IndexedDB
  getData();
};

// change Postition of value1 & value2 in array

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

// Get only fav data and display it on table for match pairs.

function getData() {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  const transaction = db.transaction(storeName, "readonly");
  const objectStore = transaction.objectStore(storeName);
  const dataTable = document.getElementById("dataTable");

  const tbody = dataTable.querySelector("tbody");
  tbody.innerHTML = "";
  // const favoritesTable = document.getElementById("favoritesTable");
  // const favoritesTbody = favoritesTable.querySelector("tbody");

   // Specify the subjectId and topicId you want to search for
   var subjectId = subject; // Change this to the subjectId you want to search for
   var topicId = topic;   // Change this to the topicId you want to search for

   // Create a range for the compound index
   if(topic==0){
    var range = IDBKeyRange.only([subjectId]);
  }else{
    var range = IDBKeyRange.only([subjectId, topicId]);
  }
   // Use the compound index for the search
   var request = objectStore.index(keyIndex);

   request.getAll(range).onsuccess = (event) => {
    var allData = event.target.result;

    console.log(allData);

    if (allData.length > 0) {
      allData = shuffle(allData);

      // Filter entries where isFav is true

      var favData = allData.filter((item) => item.isFav === true);

      console.log(favData.length);

      var favData = shuffle(favData);

      favData = favData.slice(0, 20);

      favData.forEach((item) => {
        value1.push({ id: item.id, value: item.value1 });
        value2.push({ id: item.id, value: item.value2 });
      });

      value1 = shuffle(value1);
      value2 = shuffle(value2);

      const dataTable = document.getElementById("dataTable");
      const suggestion = document.getElementById("suggestion");

      const tbody = dataTable.querySelector("tbody");
      tbody.innerHTML = "";

      if(favData.length==0){
        dataTable.style.display = 'none';
        suggestion.style.display = 'block';
      }

      for (var i = 0; i < favData.length; i++) {
        const row = appendData(value1[i], value2[i]);
        tbody.appendChild(row);
      }
    }
  };
}

function appendData(data1, data2) {
  const row = document.createElement("tr");

  const td1 = document.createElement("td");
  td1.setAttribute("data-id", data1.id);
  td1.style.backgroundColor = "white"; 
  td1.style.cursor = "pointer"; 
  td1.textContent = data1.value;

  console.log(td1);

  const td2 = document.createElement("td");
  td2.setAttribute("data-id", data2.id);
  td2.style.backgroundColor = "white"; 
  td2.style.cursor = "pointer"; 
  td2.textContent = data2.value;

  // Add an onclick event handler to the first td element
  td1.addEventListener("click", td1Fun);

  // Add an onclick event handler to the second td element
  td2.addEventListener("click", td2Fun);

  row.appendChild(td1);
  row.appendChild(td2);

  return row;
}

// Call when value1 table item press

function td1Fun() {
  const id = this.getAttribute("data-id");

  // const tdElement = document.querySelector(`td[data-id=${id}]`);

  if (select == 1 && id == ansId) {
    ansId = null;
    select = 0;
    this.style.backgroundColor = "white";
    questionRow = null;
    if (answerRow) {
      answerRow.style.backgroundColor = "white";
    }
  } else if ((select == 1 && id != ansId) || (select == 0 && ansId == null)) {
    if (questionRow) {
      questionRow.style.backgroundColor = "white";
    }
    if (answerRow) {
      answerRow.style.backgroundColor = "white";
    }
    const id = this.getAttribute("data-id");
    ansId = id;
    select = 1;
    this.style.backgroundColor = "#ECECEC"; //gray
    questionRow = this;
  } else if (select == 2 && id == ansId) {
    if (answerRow) answerRow.style.backgroundColor = "white"; //red
    this.style.backgroundColor = color[index]; //green
    questionRow.style.backgroundColor = color[index];
    index++;
    this.removeEventListener("click", td1Fun);
    questionRow.removeEventListener("click", td2Fun);

    questionRow = null;
    answerRow = null;
    questionId = null;
    ansId = null;
    select = 0;
  } else {
    if (answerRow) answerRow.style.backgroundColor = "white"; //red
    this.style.backgroundColor = "#EF5350"; //red
    answerRow = this;
  }
}

// Call when value2 table item press

function td2Fun() {
  const id = this.getAttribute("data-id");
  //   const tdElement = document.querySelector(`td[data-id=${id}]`);
  if (select == 2 && id == ansId) {
    ansId = null;
    select = 0;
    this.style.backgroundColor = "white";
    questionRow = null;
    if (answerRow) {
      answerRow.style.backgroundColor = "white";
    }
  } else if ((select == 2 && id != ansId) || (select == 0 && ansId == null)) {
    if (questionRow) {
      questionRow.style.backgroundColor = "white";
    }
    if (answerRow) {
      answerRow.style.backgroundColor = "white";
    }
    const id = this.getAttribute("data-id");
    ansId = id;
    select = 2;
    this.style.backgroundColor = "#ECECEC"; //gray
    questionRow = this;
    console.log("questionRow", questionRow);
  } else if (select == 1 && id == ansId) {
    if (answerRow) answerRow.style.backgroundColor = "white"; //red
    this.style.backgroundColor = color[index]; //green
    this.removeEventListener("click", td2Fun);

    questionRow.style.backgroundColor = color[index]; //green
    questionRow.removeEventListener("click", td1Fun);

    index++;
    questionRow = null;
    answerRow = null;
    questionId = null;
    ansId = null;
    select = 0;
  } else {
    if (answerRow) answerRow.style.backgroundColor = "white"; //red
    this.style.backgroundColor = "#EF5350"; //red
    answerRow = this;
  }

  console.log(select);
  console.log(questionId);
  console.log(ansId);
}
