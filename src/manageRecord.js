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

var subject = parseInt(localStorage.getItem("subject")) || 1;

const urlParams = new URLSearchParams(window.location.search);
const myParam = urlParams.get("id") || "1";

const value = localStorage.getItem("toggle_question"); //false means value1 show otherwise value2

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

    var value1 = document.getElementById("value1").value;
    var value2 = document.getElementById("value2").value;
    var UserDefined1 = document.getElementById("UserDefined1").value;
    var isFav = document.getElementById("favourite").checked;
    var isSkip = document.getElementById("skip").checked;

    // Check if value1 and value2 are not empty
    if (value1.trim() === "" || value2.trim() === "") {
    } else {
      // Perform your custom action here with value1 and value2
      addUserData({
        subjectId: subject,
        value1: value1,
        value2: value2,
        UserDefined1: UserDefined1,
        isFav: isFav,
        isSkip: isSkip,
        showInDays : 0,
        lastShown : 0,
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

  const dropdownItems = document.querySelectorAll(".dropdown-item");

  if (myParam == "1") {
    dropdownItems[0].style.color = "green";
    displayData();
  } else if (myParam == "2") {
    dropdownItems[1].style.color = "green";
    displayFavData();
  } else if (myParam == "3") {
    dropdownItems[2].style.color = "green";
    displaySkipData();
  }else if(myParam == "4"){
    dropdownItems[3].style.color = "green";
    displayCurrentData();
  }else if(myParam == "5"){
    dropdownItems[4].style.color = "green";
    displayAudioData();
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
};

function displayData() {
  if (!db) {
    console.error("Database is not open yet.");
    return;
  }
  try {
    const transaction = db.transaction(storeName, "readonly");
    const objectStore = transaction.objectStore(storeName);
    const dataTable = document.getElementById("dataTable");

    const tbody = dataTable.querySelector("tbody");
    tbody.innerHTML = "";
    // const favoritesTable = document.getElementById("favoritesTable");
    // const favoritesTbody = favoritesTable.querySelector("tbody");

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

    var request = objectStore.index(index);
    var idNumber = 1;

    request.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const data = cursor.value;

        console.log(data);

        const row = appendData(data, idNumber);
        tbody.appendChild(row);

        cursor.continue();
        idNumber++;
      }
    };
  } catch (error) {
    console.log(error);
  }
}

function displayFavData() {
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
  var topicId = topic; // Change this to the topicId you want to search for

  // Create a range for the compound index
  if (topic == 0) {
    var range = IDBKeyRange.only([subjectId]);
  } else {
    var range = IDBKeyRange.only([subjectId, topicId]);
  }
  // Use the compound index for the search
  var request = objectStore.index(index);
  var idNumber = 1;

  request.openCursor(range).onsuccess = (event) => {
    const cursor = event.target.result;

    if (cursor) {
      const data = cursor.value;

      if (data.isFav) {
        const row = appendData(data, idNumber);
        tbody.appendChild(row);
        idNumber++;
      }
      cursor.continue();
    }
  };
}

function displaySkipData() {
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
  var topicId = topic; // Change this to the topicId you want to search for

  // Create a range for the compound index
  if (topic == 0) {
    var range = IDBKeyRange.only([subjectId]);
  } else {
    var range = IDBKeyRange.only([subjectId, topicId]);
  }
  // Use the compound index for the search
  var request = objectStore.index(index);
  var idNumber = 1;

  request.openCursor(range).onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      const data = cursor.value;

      if (data.isSkip) {
        const row = appendData(data, idNumber);
        tbody.appendChild(row);
        idNumber++;
      }
      cursor.continue();
    }
  };
}

function displayAudioData() {
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
  var topicId = topic; // Change this to the topicId you want to search for

  // Create a range for the compound index
  if (topic == 0) {
    var range = IDBKeyRange.only([subjectId]);
  } else {
    var range = IDBKeyRange.only([subjectId, topicId]);
  }
  // Use the compound index for the search
  var request = objectStore.index(index);
  var idNumber = 1;

  request.openCursor(range).onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      const data = cursor.value;

      if (data?.fileName) {
        const row = appendData(data, idNumber);
        tbody.appendChild(row);
        idNumber++;
      }
      cursor.continue();
    }
  };
}

function displayCurrentData() {
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
  var topicId = topic; // Change this to the topicId you want to search for

  // Create a range for the compound index
  if (topic == 0) {
    var range = IDBKeyRange.only([subjectId]);
  } else {
    var range = IDBKeyRange.only([subjectId, topicId]);
  }
  // Use the compound index for the search
  var request = objectStore.index(index);
  var idNumber = 1;

  request.openCursor(range).onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      const data = cursor.value;

      if (data?.showInDays == 0) {
        const row = appendData(data, idNumber);
        tbody.appendChild(row);
        idNumber++;
      }
      cursor.continue();
    }
  };
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
      data.showInDays = item.value || 0;
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
    var range = IDBKeyRange.only([subjectId]);
  } else {
    var range = IDBKeyRange.only([subjectId, topicId]);
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
                            <td>${data.value1}</td>
                            <td>${data.value2}</td>
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
  // const option = getSelectedOptionText();

  // console.log(typeof option);
  // console.log(option);

  if (myParam == "1") {
    const dataTable = document.getElementById("dataTable");
    const tbody = dataTable.querySelector("tbody");
    tbody.innerHTML = "";

    displayData();
  } else if (myParam == "2") {
    displayFavData();
  } else if (myParam == "3") {
    displaySkipData();
  }else if (myParam == "4") {
    displayCurrentData();
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

  row.innerHTML = `
    <td style="${data?.fileName ? 'color:#00569d;font-weight: 500;' : ''}">${idNumber}</td>
    <td style="${data?.fileName ? 'color:#00569d;font-weight: 500;' : ''}">
      ${value == "true" ? data.value2 : data.value1}
    </td>                    
    <td><input data-id="${data.id}" type="number" style="width: 60px;" class="showInDays" value="${data.showInDays}" /></td>                    
    <td><input type="checkbox" data-id="${data.id}" class="favorite" ${data.isFav ? "checked" : ""} /></td>
    <td><input type="checkbox" data-id="${data.id}" class="skip" ${data.isSkip ? "checked" : ""} /></td>
    <td><input type="checkbox" data-id="${data.id}" class="delete"/></td>
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
    }

    value = parseInt(e.target.value);

    console.log(value);

    showInDaysDataState.forEach((item, index) => {
      if (item.id == id) {
        isExist = true
      }
    });

    if (!isExist) {

      const show = { id: id, value: value || 0 };
      showInDaysDataState.push(show);
    } else {
      if(value == data.showInDays){
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

    // Iterate through the JSON array to find objects with matching "value1" or "value2" properties
    for (const obj of jsonArray) {
      if (regex.test(obj.value1) || regex.test(obj.value2)) {
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
      var range = IDBKeyRange.only([subjectId]);
    } else {
      var range = IDBKeyRange.only([subjectId, topicId]);
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

