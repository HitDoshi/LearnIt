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
    // var subject = document.getElementById('dropdown-subject');
    // var topic = document.getElementById('dropdown-topic');

    // subject.options.length = 0;
    // topic.options.length = 0;


    // if (allData.length > 0) {
    //     allData.forEach((option)=>{
    //         var newOption = document.createElement('option');
    //         newOption.value = option.id;
    //         newOption.text = option.name;
    //         subject.add(newOption);
    //     })    
    // }
    
    const selected_subject = parseInt(localStorage.getItem("subject")) || 1;
    console.log(selected_subject);

    // allData[selected_subject-1].topic.forEach((t)=>{
    //     var newOption = document.createElement('option');
    //     newOption.value = t.id;
    //     newOption.text = t.task;
    //     topic.add(newOption);
    // });  

    // var newOption = document.createElement('option');
    // newOption.value = 0;
    // newOption.text = "User Data";
    // topic.add(newOption);


    // setOption();
    renderListItems();
customRenderListItems();

    // Handle the select dropdown change event
//     subject
// .addEventListener("change", function () {
//   var selectedOption = this.value;
//   // You can perform an action based on the selected option.
//   console.log("Selected subject: " + selectedOption);
//   localStorage.setItem("subject", selectedOption);
//   localStorage.setItem("topic", 1);
//   localStorage.setItem("total_right", 0);
//   topic.options.length = 0;

//   allData[selectedOption-1].topic.forEach((t)=>{
//     var newOption = document.createElement('option');
//     newOption.value = t.id;
//     newOption.text = t.task;
//     topic.add(newOption);
// });  

// var newOption = document.createElement('option');
// newOption.value = 0;
// newOption.text = "User Data";
// topic.add(newOption);

//   setOption();
// });
//     topic
// .addEventListener("change", function () {
//   var selectedOption = this.value;
//   // You can perform an action based on the selected option.
//   console.log("Selected topic: " + selectedOption);
//   localStorage.setItem("topic", selectedOption);
//   setOption();
// });

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

const root = document.documentElement;

const dropdownTitle = document.querySelector(".dropdown-title");
const dropdownList = document.querySelector(".dropdown-list");
const mainButton = document.querySelector(".main-button");
const floatingIcon = document.querySelector(".floating-icon");

const listItemTemplate = (text, translateValue, index) => {
  return `
    <li class="dropdown-list-item">
      <button class="dropdown-button list-button" data-translate-value="${translateValue}%" data-value="${index + 1}">
        <span class="text-truncate">${text}</span>
      </button>
    </li>
  `;
};

const renderListItems = () => {
  dropdownList.innerHTML += allData
    .map((item, index) => {

      const subject = parseInt(localStorage.getItem("subject")) || 1;

      if (subject - 1 == index) dropdownTitle.innerHTML = item.name;
      setDropdownProps(0, 0, 0);
      return listItemTemplate(item.name, 100 * index, index);
    })
    .join("");
};

const setDropdownProps = (deg, ht, opacity) => {
  root.style.setProperty("--rotate-arrow", deg !== 0 ? deg + "deg" : 0);
  root.style.setProperty("--dropdown-height", ht !== 0 ? ht + "rem" : 0);
  root.style.setProperty("--list-opacity", opacity);
};

mainButton.addEventListener("click", () => {
  const listWrapperSizes = 3.5; // margins, paddings & borders
  const dropdownOpenHeight = 4.6 * allData.length + listWrapperSizes;
  const currDropdownHeight = root.style.getPropertyValue("--dropdown-height") || "0";

  if (currDropdownHeight === "0") {
    setDropdownProps(180, dropdownOpenHeight, 1);
  } else {
    setDropdownProps(0, 0, 0);
  }
});

dropdownList.addEventListener("mouseover", (e) => {
  const translateValue = e.target.dataset.translateValue;
  root.style.setProperty("--translate-value", translateValue);
});

dropdownList.addEventListener("click", (e) => {
  const clickedItemText = e.target.innerText.toLowerCase().trim();
  const translateValue = e.target.getAttribute('data-value');
  dropdownTitle.innerHTML = clickedItemText;
  console.log(translateValue);
  setDropdownProps(0, 0, 0);
  localStorage.setItem("subject", translateValue);
  localStorage.setItem("topic", 1);
  localStorage.setItem("total_right", 0);
  selected_subject = translateValue - 1;
  customRenderListItems();
});

dropdownList.addEventListener("mousemove", (e) => {
  const iconSize = root.style.getPropertyValue("--floating-icon-size") || 0;
  const x = e.clientX - dropdownList.getBoundingClientRect().x;
  const y = e.clientY - dropdownList.getBoundingClientRect().y;
  root.style.setProperty("--floating-icon-left", x - iconSize / 2 + "px");
  root.style.setProperty("--floating-icon-top", y - iconSize / 2 + "px");
});
// Define an array for the data of the second dropdown
const customDropdownData = [
  { name: "Option 1" },
  { name: "Option 2" },
  { name: "Option 3" },
  { name: "Option 4" },
  { name: "Option 5" }
];

// Independent dropdown functionality
const customDropdownTitle = document.querySelector(".custom-dropdown-title");
const customDropdownList = document.querySelector(".custom-dropdown-list");
const customMainButton = document.querySelector(".custom-dropdown-button");
const customFloatingIcon = document.querySelector(".custom-floating-icon");

const customListItemTemplate = (text, translateValue, index) => {
  return `
    <li class="custom-dropdown-list-item">
      <button class="custom-dropdown-button list-button" data-translate-value="${translateValue}%" data-value="${index + 1}">
        <span class="text-truncate">${text}</span>
      </button>
    </li>
  `;
};

const customRenderListItems = () => {

  const selected_subject = localStorage.getItem('subject') - 1;
  
  customDropdownList.innerHTML = allData[selected_subject].topic
    .map((item, index) => {

      const topic = parseInt(localStorage.getItem("topic")) || 1;

      if (topic - 1 === index) customDropdownTitle.innerHTML = item.task;
      setCustomDropdownProps(0, 0, 0);
      return customListItemTemplate(item.task, 100 * index, index);
    })
    .join("");

    customDropdownList.innerHTML += customListItemTemplate('User Data', 100 * 0, -1);
};

const setCustomDropdownProps = (deg, ht, opacity) => {
  root.style.setProperty("--custom-arrow", deg !== 0 ? deg + "deg" : 0);
  root.style.setProperty("--custom-dropdown-height", ht !== 0 ? ht + "rem" : 0);
  root.style.setProperty("--custom-list-opacity", opacity);
};

// Initialize the second dropdown

customMainButton.addEventListener("click", () => {
  const listWrapperSizes = 3.5; // margins, paddings & borders
  const dropdownOpenHeight = 4.6 * (allData[selected_subject].topic.length+1) + listWrapperSizes;
  const currDropdownHeight = root.style.getPropertyValue("--custom-dropdown-height") || "0";

  if (currDropdownHeight === "0") {
    setCustomDropdownProps(180, dropdownOpenHeight, 1);
  } else {
    setCustomDropdownProps(0, 0, 0);
  }
});

customDropdownList.addEventListener("mouseover", (e) => {
  const translateValue = e.target.dataset.translateValue;
  root.style.setProperty("--custom-translate-value", translateValue);
});

customDropdownList.addEventListener("click", (e) => {
  const clickedItemText = e.target.innerText.toLowerCase().trim();
  const translateValue = e.target.getAttribute('data-value');
  customDropdownTitle.innerHTML = clickedItemText;

  console.log(translateValue);
  setCustomDropdownProps(0, 0, 0);
  localStorage.setItem("topic", translateValue);
});

customDropdownList.addEventListener("mousemove", (e) => {
  const iconSize = root.style.getPropertyValue("--custom-floating-icon-size") || 0;
  const x = e.clientX - customDropdownList.getBoundingClientRect().x;
  const y = e.clientY - customDropdownList.getBoundingClientRect().y;
  root.style.setProperty("--custom-floating-icon-left", x - iconSize / 2 + "px");
  root.style.setProperty("--custom-floating-icon-top", y - iconSize / 2 + "px");
});
