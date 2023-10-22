var testDBName = "test";
var testDBVersion = 1;
var testStoreName = "data";


let testDB; // Reference to the IndexedDB database

var indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

const testOpenRequest = indexedDB.open(testDBName, testDBVersion);

testOpenRequest.onupgradeneeded = (event) => {
  testDB = event.target.result;
  // Create the object store if it doesn't exist
  if (!testDB.objectStoreNames.contains(testStoreName)) {
    const objectStore = testDB.createObjectStore(testStoreName, { keyPath: "id" });
    objectStore.createIndex("subjectTopicIndex", ["subjectId","topicId"]);
  }
};

testOpenRequest.onerror = (event) => {
  console.error("Database error: " + event.target.errorCode);
};

testOpenRequest.onsuccess = (event) => {
  testDB = event.target.result;


  fetch("data.json")
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
  })
  .catch((error) => {
    console.error("Error loading JSON data: " + error);
  });

};