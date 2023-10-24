const dbName = "main";
const dbVersion = 1;
const storeName = "subject";

const openRequest = indexedDB.open(dbName, dbVersion);
let db; // Reference to the IndexedDB database

var indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;
// var request = indexedDB.deleteDatabase("test");
var allData = [];
var selected_subject = 0;
var selected_topic = 0;

function replaceStateWithHistory(page) {
  history.replaceState(null, '', page);
  // window.location.reload();
  window.location.href = page;
}

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

openRequest.onsuccess = (event) => {
  db = event.target.result;

  // Fetch and store data from data.json if it doesn't exist in IndexedDB
  fetch("subject.json")
    .then((response) => response.json())
    .then((jsonData) => {
      const transaction = db.transaction(storeName, "readwrite");
      const objectStore = transaction.objectStore(storeName);

      // Check if data.json records already exist in IndexedDB
      objectStore.count().onsuccess = (event) => {
        const count = event.target.result;
        const countJsonData = jsonData.length;

        console.log("Subjects:- ",jsonData);
        if (count == 0) {
          // Store data from data.json into IndexedDB
          jsonData.forEach((item) => {
            objectStore.add(item);
          });
        }
      };

      getData();
    })
    .catch((error) => {
      console.error("Error loading JSON data: " + error);
    });
};


function getData() {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  const transaction = db.transaction(storeName, "readonly");
  const objectStore = transaction.objectStore(storeName);

  // const favoritesTable = document.getElementById("favoritesTable");
  // const favoritesTbody = favoritesTable.querySelector("tbody");

  objectStore.getAll().onsuccess = (event) => {
    allData = event.target.result;
    var subject = document.getElementById('dropdown-subject');
    var topic = document.getElementById('dropdown-topic');

    subject.options.length = 0;
    topic.options.length = 0;


    if (allData.length > 0) {
        allData.forEach((option)=>{
            var newOption = document.createElement('option');
            newOption.value = option.id;
            newOption.text = option.name;
            subject.add(newOption);
        })    
    }
    
    const selected_subject = parseInt(localStorage.getItem("subject")) || 1;

    allData[selected_subject-1].topic.forEach((t)=>{
        var newOption = document.createElement('option');
        newOption.value = t.id;
        newOption.text = t.task;
        topic.add(newOption);
    });  

    var newOption = document.createElement('option');
    newOption.value = 0;
    newOption.text = "User Data";
    topic.add(newOption);


    setOption();

    // Handle the select dropdown change event
    subject
.addEventListener("change", function () {
  var selectedOption = this.value;
  // You can perform an action based on the selected option.
  console.log("Selected subject: " + selectedOption);
  localStorage.setItem("subject", selectedOption);
  localStorage.setItem("topic", 1);
  localStorage.setItem("total_right", 0);
  topic.options.length = 0;

  allData[selectedOption-1].topic.forEach((t)=>{
    var newOption = document.createElement('option');
    newOption.value = t.id;
    newOption.text = t.task;
    topic.add(newOption);
});  

var newOption = document.createElement('option');
newOption.value = 0;
newOption.text = "User Data";
topic.add(newOption);

  setOption();
});
    topic
.addEventListener("change", function () {
  var selectedOption = this.value;
  // You can perform an action based on the selected option.
  console.log("Selected topic: " + selectedOption);
  localStorage.setItem("topic", selectedOption);
  setOption();
});

  };
  
}

function setOption(){
    const selected_subject = parseInt(localStorage.getItem("subject")) || 1;
    const selected_topic = parseInt(localStorage.getItem("topic"));

    var subject = document.getElementById('dropdown-subject');
    var topic = document.getElementById('dropdown-topic');

    subject.value = allData[selected_subject-1].id;
    subject.text = allData[selected_subject-1].name;    

    console.log(selected_topic==0);

    if(selected_topic==0){
      topic.value = 0;
      topic.text = 'User Data';
    }else{
      topic.value = allData[selected_subject-1].topic[selected_topic-1].id;
      topic.text = allData[selected_subject-1].topic[selected_topic-1].task;
    }

    
}
