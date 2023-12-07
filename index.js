// const dbName1= "main";
// const dbVersion1 = 1;
// const storeName1 = "subject";

// var testDBName = "test";
// var testDBVersion = 1;
// var testStoreName = "data";

// var userDBName = "test";
// var userDBVersion = 1;
// var userStoreName = "data";

// async function openDatabase(dbName, dbVersion, storeName) {
//   return new Promise((resolve, reject) => {
//     const request = indexedDB.open(dbName, dbVersion);

//     request.onerror = (event) => {
//       reject(event.target.error);
//     };

//     request.onsuccess = (event) => {
//       resolve(event.target.result);
//     };

//     request.onupgradeneeded = (event) => {
//       const db = event.target.result;
//       if (!db.objectStoreNames.contains(storeName)) {
//         const objectStore = db.createObjectStore(storeName, { keyPath: "id" });

//         if(dbName=="test"){
//             objectStore.createIndex('subjectTopicIndex', ["subjectId", "topicId"]);
//         }
        
//         if(dbName=="user"){
//           objectStore.createIndex('subjectIndex', ["subjectId"]);
//         }
//         // Create any needed indexes here
//       }
//     };
//   });
// }

// async function fetchAndStoreData(db, storeName, jsonDataFile) {
  
//   fetch(jsonDataFile)
//     .then((response) => response.json())
//     .then((jsonData) => {
//       const transaction = db.transaction(storeName, "readwrite");
//       const objectStore = transaction.objectStore(storeName);

//       // Check if data.json records already exist in IndexedDB
//       objectStore.count().onsuccess = (event) => {
//         const count = event.target.result;
//         const countJsonData = jsonData.length;

//         console.log("Subjects:- ",jsonData);
//         if (count == 0) {
//           // Store data from data.json into IndexedDB
//           jsonData.forEach((item) => {
//             objectStore.add(item);
//           });
//         }
//       };

//     })
//     .catch((error) => {
//       console.error("Error loading JSON data: " + error);
//     });
// }

// (async () => {
//   const db1 = await openDatabase(dbName1, dbVersion1, storeName1);
//   await fetchAndStoreData(db1, storeName1, "subject.json");

//   const userDB1 = await openDatabase(userDBName, userDBVersion, userStoreName);
//   const testDB1 = await openDatabase(testDBName, testDBVersion, testStoreName);
//   // await fetchAndStoreData(testDB1, testStoreName, "data.json");
// })();
