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
const changeFavDataState = []; // fav data ==> {id,isFav}
const changeSkipDataState = []; // skip data ==> {id,isSkip}
const deleteData = []; // delete data ==> {id}
let showInDaysDataState = [];
let currentViewData = []; // cache for the currently rendered dataset
let currentViewType = "all";

var subject = parseInt(JSON.parse(localStorage.getItem("source-language") || "{}")?.id || 1);
var targetSubjectId = parseInt(JSON.parse(localStorage.getItem("target-language") || "{}")?.id || 1);

const urlParams = new URLSearchParams(window.location.search);
const myParam = urlParams.get("id") || "1";
var totalUserData = 0;

const value = localStorage.getItem("toggle_question"); //false means source show otherwise target

var indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;
// var request = indexedDB.deleteDatabase("test");

// Select the default option on page load
window.addEventListener("load", function () {});

// document.addEventListener('DOMContentLoaded', function() {
//   // Get all the links within the navigation menu
//   const links = document.querySelectorAll('#myNavbar a');

//   // Define a click event listener for all links
//   links.forEach(function(link) {
//     link.addEventListener('click', function(event) {
//       event.preventDefault(); // Prevent the default link behavior (page navigation)

//       // Define a new URL for each link based on your logic
//       let newURL = '';

//       console.log(link);

//       if (link.id === 'showAllLink') {
//         newURL = 'new_url_for_show_all.html';
//       } else if (link.id === 'matchPairLink') {
//         newURL = 'new_url_for_match_pair.html';
//       }
//       // Add more conditions for other links if needed

//       // Use history.replaceState to change the URL without adding a new state
//       history.replaceState(null, '', newURL);

//       // Optionally, you can update the link text or perform other actions here
//     });
//   });
// });

function replaceStateWithHistory(page) {
  const topicNumber = localStorage.getItem("topic");
  const token = localStorage.getItem("token");
  if (topicNumber == 0 && !token) {
    showToast(
      "Access to this section requires a login.\nPlease login first !!"
    );
  } else {
    history.replaceState(null, "", page);
    // window.location.reload();
    window.location.href = page;
  }
}

const backButton = document.getElementById("backButton");
backButton.onclick = function () {
  // window.history.back();
  window.location.href = "test.html";
};

// Check the radio button based on the 'id' parameter
if (myParam === "1") {
  document.getElementById("showAllRadio").checked = true;
} else if (myParam === "2") {
  document.getElementById("favOnlyRadio").checked = true;
} else if (myParam === "3") {
  document.getElementById("skipOnlyRadio").checked = true;
}else if(myParam === "4"){
  document.getElementById("showCurrentRadio").checked = true;
}else if(myParam === "5"){
  document.getElementById("audioOnlyRadio").checked = true;
}

document
  .getElementById("addData-Form")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the default form submission
    const form = document.getElementById("addData-Form");

    var source = document.getElementById("source").value;
    var target = document.getElementById("target").value;
    var targetNote = document.getElementById("targetNote").value;
    var isFav = document.getElementById("favourite").checked;
    var isSkip = document.getElementById("skip").checked;

    // Check if source and target are not empty
    if (source.trim() === "" || target.trim() === "") {
    } else {
      // Perform your custom action here with source and target
      addUserData({
        subjectId: subject,
        source: source,
        target: target,
        targetNote: targetNote,
        isFav: isFav,
        isSkip: isSkip,
        showInDays : 0,
        lastShown : 0,
        targetSubjectId: targetSubjectId,
        sourceSubjectId: subject,
        topicId: 0,
      });
      // You can submit the form or perform other actions here.
    }
    $("#exampleModalCenter").modal("hide");
    form.reset();
    var navbarCollapse = document.querySelector(".navbar-collapse");

    // if (navbarCollapse.classList.contains("show")) {
    //   navbarCollapse.classList.remove("show");
    // } else {
    //   navbarCollapse.classList.add("show");
    // }
  });

document.getElementById("cancelButton").addEventListener("click", function () {
  // Get the form element by its ID
  const form = document.getElementById("addData-Form");

  // Reset the form
  form.reset();
});

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
    objectStore.createIndex("subjectIndex", ["sourceSubjectId", "targetSubjectId"]);
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

  const dropdownItems = document.querySelectorAll(".dropdown-item");

  if (myParam == "1") {
    dropdownItems[0].style.color = "green";
    renderView("all");
  } else if (myParam == "2") {
    dropdownItems[1].style.color = "green";
    renderView("fav");
  } else if (myParam == "3") {
    dropdownItems[2].style.color = "green";
    renderView("skip");
  }else if(myParam == "4"){
    dropdownItems[3].style.color = "green";
    renderView("current");
  }else if(myParam == "5"){
    dropdownItems[4].style.color = "green";
    renderView("audio");
  }


  // var navbarToggle = document.querySelector(".navbar-toggler");
  // var navbarCollapse = document.querySelector(".navbar-collapse");

  // if (navbarCollapse.classList.contains("show")) {
  //   navbarCollapse.classList.remove("show");
  // } else {
  //   navbarCollapse.classList.add("show");
  // }
};
userOpenRequest.onsuccess = (event) => {
  userDB = event.target.result;
  countTotalUserData();
};

function countTotalUserData() {
  if (!userDB) {
    console.error("Database is not open yet.");
    return;
  }
  try {
    const transaction = userDB.transaction('userData', "readonly");
    const objectStore = transaction.objectStore('userData');

    // Use count without a range to get the total count of all records
    var request = objectStore.count();

    request.onsuccess = () => {
      const totalCount = request.result;
      totalUserData = totalCount;
      console.log("Total user data count:", totalCount);
    };

    request.onerror = (error) => {
      console.error("Error counting total user data records:", error);
    };
  } catch (error) {
    console.error("Error in countTotalUsers function:", error);
  }
}


// Apply pending changes to data before rendering/searching
function applyPendingChanges(data) {
  // Create a deep copy of the data array
  const dataWithChanges = data.map(item => ({ ...item }));
  
  // Apply favorite changes
  changeFavDataState.forEach(change => {
    const item = dataWithChanges.find(d => d.id === change.id);
    if (item) {
      item.isFav = change.isFav;
    }
  });
  
  // Apply skip changes
  changeSkipDataState.forEach(change => {
    const item = dataWithChanges.find(d => d.id === change.id);
    if (item) {
      item.isSkip = change.isSkip;
    }
  });
  
  // Apply showInDays changes
  showInDaysDataState.forEach(change => {
    const item = dataWithChanges.find(d => d.id === change.id);
    if (item) {
      item.showInDays = change.value;
    }
  });
  
  return dataWithChanges;
}

function renderRows(data) {
  const dataTable = document.getElementById("dataTable");
  const tbody = dataTable.querySelector("tbody");
  tbody.innerHTML = "";

  // Apply pending changes before rendering
  const dataWithChanges = applyPendingChanges(data);

  let idNumber = 1;
  dataWithChanges.forEach((rowData) => {
    const row = appendData(rowData, idNumber);
    tbody.appendChild(row);
    idNumber++;
  });
}

async function renderView(viewType = "all") {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }

  try {
    const allData = await getData();
    let filteredData = allData;

    switch (viewType) {
      case "fav":
        filteredData = allData.filter((item) => item.isFav);
        break;
      case "skip":
        filteredData = allData.filter((item) => item.isSkip);
        break;
      case "current":
        filteredData = allData.filter((item) => item?.showInDays == 0);
        break;
      case "audio":
        filteredData = allData.filter((item) => item?.fileName);
        break;
      default:
        filteredData = allData;
        break;
    }

    currentViewType = viewType;
    currentViewData = filteredData;
    renderRows(filteredData);

    // Re-apply active search, if any
    const searchInput = document.getElementById("recordSearchInput");
    if (searchInput && searchInput.value.trim()) {
      handleSearchInput({ target: searchInput });
    }
  } catch (error) {
    console.error("Error rendering data:", error);
  }
}

function displayData() {
  renderView("all");
}

function displayFavData() {
  renderView("fav");
}

function displaySkipData() {
  renderView("skip");
}

function displayAudioData() {
  renderView("audio");
}

function displayCurrentData() {
  renderView("current");
}

function updateIsFavFlag(id, isFav) {
  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(id);
  request.onsuccess = (event) => {
    const data = event.target.result;
    if (data) {
      data.isFav = isFav;
      objectStore.put(data);
      console.log(id, isFav);
    }
  };
}

function updateIsSkipFlag(id, isSkip) {
  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(id);
  request.onsuccess = (event) => {
    const data = event.target.result;
    if (data) {
      data.isSkip = isSkip;
      objectStore.put(data);
    }
  };
}

function deleteDBData(id) {
  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(id);
  request.onsuccess = (event) => {
    const data = event.target.result;
    if (data) {
      objectStore.delete(id);
    }
  };
}
function showInDaysData(item) {
  const transaction = db.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const request = objectStore.get(item.id);
  request.onsuccess = (event) => {
    const data = event.target.result;
    if (data) {
      data.showInDays = parseInt(item.value || 0);
      // data.lastShown = item.value || 0;
      objectStore.put(data);
    }
  };
}

function updateFavoritesTable(db) {
  const transaction = db.transaction(storeName, "readonly");
  const objectStore = transaction.objectStore(storeName);
  const favoritesTable = document.getElementById("favoritesTable");
  const favoritesTbody = favoritesTable.querySelector("tbody");

  // Clear existing favorite table rows
  favoritesTbody.innerHTML = "";

  // Specify the subjectId and topicId you want to search for
  var subjectId = subject; // Change this to the subjectId you want to search for
  var topicId = topic; // Change this to the topicId you want to search for

  // Create a range for the compound index
  if (topic == 0) {
    var range = IDBKeyRange.only([subjectId,targetSubjectId]);
  } else {
    var range = IDBKeyRange.only([subjectId,targetSubjectId, topicId]);
  }
  // Use the compound index for the search
  var request = objectStore.index(index);

  request.openCursor(range).onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      const data = cursor.value;
      if (data.isFav) {
        const favoritesRow = document.createElement("tr");
        favoritesRow.innerHTML = `
                            <td>${data.id}</td>
                            <td>${data.source}</td>
                            <td>${data.target}</td>
                        `;
        favoritesTbody.appendChild(favoritesRow);
      }
      cursor.continue();
    }
  };
}

function getSelectedOptionText() {
  const selectedOption = document.querySelector(".filter-option.selected");

  if (selectedOption) {
    return selectedOption.id;
  } else {
    // Return a default value or handle the case when no option is selected
    return null;
  }
}

function loadUpdatedTable() {
  if (myParam == "1") {
    displayData();
  } else if (myParam == "2") {
    displayFavData();
  } else if (myParam == "3") {
    displaySkipData();
  }else if (myParam == "4") {
    displayCurrentData();
  }else if (myParam == "5") {
    displayAudioData();
  }
}

function updateData() {
  try {
    changeFavDataState.forEach((item) => {
      updateIsFavFlag(item.id, item.isFav);
    });

    changeSkipDataState.forEach((item) => {
      updateIsSkipFlag(item.id, item.isSkip);
    });

    deleteData.forEach((item) => {
      deleteDBData(item.id);
    });

    showInDaysDataState.forEach((item) => {
      showInDaysData(item);
    });

    hideUpdateOption();
    loadUpdatedTable();
    showToast("Data updated !!");
    countTotalUserData();

    // var navbarToggle = document.querySelector(".navbar-toggler");
    // var navbarCollapse = document.querySelector(".navbar-collapse");

    // if (navbarCollapse.classList.contains("show")) {
    //   navbarCollapse.classList.remove("show");
    // } else {
    //   navbarCollapse.classList.add("show");
    // }
  } catch (error) {
    createToast(error.message); // 3000ms duration
  }
}

function undoData() {
  changeSkipDataState.forEach((item) => {
    const checkbox = document.querySelector(
      `input[type="checkbox"][data-id="${item.id}"].skip`
    );
    console.log(checkbox);
    checkbox.checked = !item.isSkip;
  });

  changeFavDataState.forEach((item) => {
    const checkbox = document.querySelector(
      `input[type="checkbox"][data-id="${item.id}"].favorite`
    );
    checkbox.checked = !item.isFav;
  });

  deleteData.forEach((item) => {
    const checkbox = document.querySelector(
      `input[type="checkbox"][data-id="${item.id}"].delete`
    );
    checkbox.checked = false;
  });

  const updateIcons = document.querySelectorAll(".update-icon");

  // Loop through all the elements with the class "update-icon"
  updateIcons.forEach(function (updateIcon) {
    updateIcon.style.display = "none"; // To make the element visible
  });

  //clear array data
  changeFavDataState.length = 0;
  changeSkipDataState.length = 0;
  deleteData.length = 0;

  loadUpdatedTable();

  // var navbarToggle = document.querySelector(".navbar-toggler");
  // var navbarCollapse = document.querySelector(".navbar-collapse");

  // if (navbarCollapse.classList.contains("show")) {
  //   navbarCollapse.classList.remove("show");
  // } else {
  //   navbarCollapse.classList.add("show");
  // }
}

function appendData(data, idNumber) {

  const row = document.createElement("tr");

  // Check if item is marked for deletion
  const isMarkedForDelete = deleteData.some(item => item.id === data.id);

  row.innerHTML = `
    <td style="${data?.fileName ? 'color:#00569d;font-weight: 500;' : ''}">${idNumber}</td>
    <td style="${data?.fileName ? 'color:#00569d;font-weight: 500;' : ''}">
      ${value == "true" ? data.target : data.source}
    </td>                    
    <td><input data-id="${data.id}" type="number" style="width: 60px;" class="showInDays" value="${data.showInDays}" /></td>                    
    <td><input type="checkbox" data-id="${data.id}" class="favorite" ${data.isFav ? "checked" : ""} /></td>
    <td><input type="checkbox" data-id="${data.id}" class="skip" ${data.isSkip ? "checked" : ""} /></td>
    <td><input type="checkbox" data-id="${data.id}" class="delete" ${isMarkedForDelete ? "checked" : ""}/></td>
`;


  // Add an event listener to the fav checkbox
  const checkbox = row.querySelector('input[type="checkbox"].favorite');
  checkbox.addEventListener("change", (event) => {
    const id = parseInt(event.target.getAttribute("data-id"));
    let isExist = false;
    const checked = event.target.checked;

    // Update the 'isFav' flag in IndexedDB

    // updateIsFavFlag(db, id, checked);

    changeFavDataState.forEach((item, index) => {
      if (item.id == data.id) {
        isExist = true;
        changeFavDataState.splice(index, 1);
      }
    });

    console.log(isExist);

    if (!isExist) {
      const transaction = db.transaction(storeName, "readwrite");
      const objectStore = transaction.objectStore(storeName);

      const request = objectStore.get(id);

      request.onsuccess = (event) => {
        const data = event.target.result;
        if (data) {
          // data.isFav = checked;
          const fav = { id: id, isFav: checked };
          changeFavDataState.push(fav);
          displayUpdateOption();
        }
      };
    } else {
      changeUpdateOption();
      // Update the "Favorites" table in real-time
      // updateFavoritesTable(db);sa
    }
  });

  // Add an event listener to the skip checkbox
  const skipCheckBox = row.querySelector('input[type="checkbox"].skip');
  skipCheckBox.addEventListener("change", (event) => {
    const id = parseInt(event.target.getAttribute("data-id"));
    let isExist = false;
    let idNumber;
    const checked = event.target.checked;

    // Update the 'isFav' flag in IndexedDB
    // updateIsSkipFlag(db, id, checked);

    changeSkipDataState.forEach((item, index) => {
      if (item.id == data.id) {
        isExist = true;
        changeSkipDataState.splice(index, 1);
      }
    });

    if (!isExist) {
      const transaction = db.transaction(storeName, "readwrite");
      const objectStore = transaction.objectStore(storeName);

      const request = objectStore.get(id);

      request.onsuccess = (event) => {
        const data = event.target.result;
        if (data) {
          // data.isSkip = checked;
          const skip = { id: id, isSkip: checked };
          changeSkipDataState.push(skip);
          displayUpdateOption();
        }
      };
    } else {
      changeUpdateOption();
    }

    // Update the "Favorites" table in real-time
    // updateFavoritesTable(db);sa
  });

  // Add an event listener to the delete checkbox
  const deleteCheckBox = row.querySelector('input[type="checkbox"].delete');
  deleteCheckBox.addEventListener("change", (event) => {
    const id = parseInt(event.target.getAttribute("data-id"));
    let isExist = false;
    let idNumber;
    const checked = event.target.checked;

    // Update the 'isFav' flag in IndexedDB
    // updateIsSkipFlag(db, id, checked);

    deleteData.forEach((item, index) => {
      if (item.id == data.id) {
        isExist = true;
        deleteData.splice(index, 1);
      }
    });

    if (!isExist) {

      const del = { id: id };
      deleteData.push(del);

      displayUpdateOption();
    } else {
      changeUpdateOption();
    }

    // Update the "Favorites" table in real-time
    // updateFavoritesTable(db);sa
  });

  // Add this line after the code where you append the <td> element to the row
  const showInDaysInput = row.querySelector(
    `input[data-id="${data.id}"].showInDays`
  );

  // Add an event listener to the showInDays input
  showInDaysInput.addEventListener("input", (e) => {
    const id = parseInt(e.target.getAttribute("data-id"));
    const newValue = e.target.value;
    let isExist = false;
    
    let value = parseInt(e.target.value);
    if (value < 0) {
      e.target.value = 0;
    } else if (value > 99) {
      e.target.value = 99;      
    }else{
      e.target.value = value;
    }

    value = parseInt(e.target.value);

    // Get original value from currentViewData (before pending changes)
    const originalItem = currentViewData.find(item => item.id === id);
    const originalValue = originalItem ? originalItem.showInDays : data.showInDays;

    showInDaysDataState.forEach((item, index) => {
      if (item.id == id) {
        isExist = true
      }
    });

    if (!isExist && originalValue != value) {
      const show = { id: id, value: value || 0 };
      showInDaysDataState.push(show);
    } else {
      if(value == originalValue){
        showInDaysDataState = showInDaysDataState.filter((day) => day.id != id);        
      }else{
        showInDaysDataState = showInDaysDataState.filter((day) => day.id != id);        
        const show = { id: id, value: value || 0 };
        showInDaysDataState.push(show);
      }
    }

    changeUpdateOption();

  });

  return row;
}

function handleSearchInput(event) {
  const term = event.target.value.trim();
  
  // Apply pending changes to currentViewData before filtering
  const dataWithChanges = applyPendingChanges(currentViewData);
  
  if (!term) {
    renderRows(dataWithChanges);
    return;
  }

  const regex = new RegExp(term, "i");
  const filtered = dataWithChanges.filter(
    (item) => regex.test(item.source) || regex.test(item.target)
  );

  renderRows(filtered);
}

const searchInputEl = document.getElementById("recordSearchInput");
if (searchInputEl) {
  searchInputEl.addEventListener("input", handleSearchInput);
}

function changeUpdateOption() {
  if (
    changeFavDataState.length > 0 ||
    changeSkipDataState.length > 0 ||
    deleteData.length > 0 || 
    showInDaysDataState.length > 0
  ) {
    displayUpdateOption();
  } else {
    hideUpdateOption();
  }
}

function displayUpdateOption() {
  const updateIcons = document.querySelectorAll(".update-icon");
  // Loop through all the elements with the class "update-icon"
  updateIcons.forEach(function (updateIcon) {
    updateIcon.style.display = "block"; // To make the element visible
  });
}

function hideUpdateOption() {
  const updateIcons = document.querySelectorAll(".update-icon");
  // Loop through all the elements with the class "update-icon"
  updateIcons.forEach(function (updateIcon) {
    updateIcon.style.display = "none"; // To make the element visible
  });

  changeFavDataState.length = 0;
  changeSkipDataState.length = 0;
  deleteData.length = 0;
}

async function search() {
  try {
    const jsonArray = await getData();
    // Get the search term from the input field
    const searchTerm = document.getElementById("searchInput").value;
    // Initialize an array to store matching objects
    const matchingObjects = [];

    // Create a regular expression pattern using the search term and make it case-insensitive
    const regex = new RegExp(searchTerm, "i");

    const transaction = db.transaction(storeName, "readonly");
    const objectStore = transaction.objectStore(storeName);
    const dataTable = document.getElementById("dataTable");

    const tbody = dataTable.querySelector("tbody");
    tbody.innerHTML = "";

    // Iterate through the JSON array to find objects with matching "source" or "target" properties
    for (const obj of jsonArray) {
      if (regex.test(obj.source) || regex.test(obj.target)) {
        matchingObjects.push(obj);
        const row = appendData(obj);
        tbody.appendChild(row);
      }
    }

    if (!searchTerm) {
      loadUpdatedTable();
    }

    // var navbarToggle = document.querySelector(".navbar-toggler");
    // var navbarCollapse = document.querySelector(".navbar-collapse");

    // if (navbarCollapse.classList.contains("show")) {
    //   navbarCollapse.classList.remove("show");
    // } else {
    //   navbarCollapse.classList.add("show");
    // }
  } catch (error) {
    console.error("Error getting data:", error);
  }
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

    // Specify the subjectId and topicId you want to search for
    var subjectId = subject; // Change this to the subjectId you want to search for
    var topicId = topic; // Change this to the topicId you want to search for

    // Create a range for the compound index
    if (topic == 0) {
      var range = IDBKeyRange.only([subjectId,targetSubjectId]);
    } else {
      var range = IDBKeyRange.only([subjectId,targetSubjectId, topicId]);
    }
    // Use the compound index for the search
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
async function addUserData(newData) {
  if (!userDB) {
    console.error("Database is not open yet.");
    throw new Error("Database is not open yet.");
  }

  let maxIdNumber = 0;

  const transaction = userDB.transaction(["userData", "userData"], "readwrite");
  const objectStore = transaction.objectStore("userData");
  const objectStore1 = transaction.objectStore("userData");

  // Function to handle cursor iteration
  const getMaxId = () => {
    return new Promise((resolve, reject) => {
      const request1 = objectStore1.openCursor();
      request1.onsuccess = (event) => {
        const cursor1 = event.target.result;
        if (cursor1) {
          const data = cursor1.value;
          console.log(data, '--');
          if (data.id > maxIdNumber) {
            maxIdNumber = data.id;
          }
          cursor1.continue(); // Move to the next item
        } else {
          resolve(maxIdNumber);
        }
      };
      request1.onerror = () => {
        reject("Error while retrieving data !!");
      };
    });
  };

  try {
    maxIdNumber = await getMaxId();
    console.log(maxIdNumber);

    // Count the number of records
    const countRequest = objectStore.count();
    const recordCount = await new Promise((resolve, reject) => {
      countRequest.onsuccess = (event) => resolve(event.target.result);
      countRequest.onerror = (event) => reject(event.target.error);
    });

    newData["id"] = maxIdNumber + 1;
    const request = objectStore.add(newData);

    request.onsuccess = (event) => {
      console.log("Data added successfully.");
      showToast("Data added !!");
      if (topic == 0) {
        loadUpdatedTable();
      }
      countTotalUserData();
    };

    request.onerror = (event) => {
      console.error("Error adding data: " + event.target.error);
    };

    transaction.oncomplete = () => {
      console.log("Transaction completed successfully.");
    };

    transaction.onerror = (event) => {
      console.error("Transaction error: " + event.target.error);
    };

  } catch (error) {
    console.error("Error in showInDays update !", error);
    showToast("Error while retrieving data !!");
  }
}

