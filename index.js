dbName = "user";
dbVersion = 1;
storeName = "userData";
index = "subjectIndex";
var userDB; 
var indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;
  var userOpenRequest = indexedDB.open('user', 1);
  userOpenRequest.onupgradeneeded = (event) => {
    userDB = event.target.result;
    
    // Create the object store if it doesn't exist
    if (!userDB.objectStoreNames.contains('userData')) {
      const objectStore = userDB.createObjectStore('userData', { keyPath: "id" });
      // Create a compound index for subjectId and topicId
        objectStore.createIndex('subjectIndex', ["subjectId"]);
    }
  };


  userOpenRequest.onerror = (event) => {
    console.error("Database error: " + event.target.error);
  };

  userOpenRequest.onsuccess = (event) => {
    userDB = event.target.result;        
  };
  