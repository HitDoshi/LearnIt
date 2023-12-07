var testDBName = "test";
var testDBVersion = 1;
var testStoreName = "data";

var allData = [];
var selected_subject = 0;
var selected_topic = 0;
var subjectData = [];
var topicData = [];

function replaceStateWithHistory(page) {
  history.replaceState(null, '', page);
  // window.location.reload();
  window.location.href = page;
}


async function openDatabase(dbName, dbVersion, storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event) => {
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        const objectStore = db.createObjectStore(storeName, { keyPath: "id" });

        if(dbName=="test"){
            objectStore.createIndex('subjectTopicIndex', ["subjectId", "topicId"]);
        }
        
        // Create any needed indexes here
      }
    };
  });
}

async function getQuizData() {
  
  const testDB = await openDatabase(testDBName, testDBVersion, testStoreName);

  const SubjectID = localStorage.getItem('subject') || 1;

  fetch(`https://learnit123.000webhostapp.com/api/get_quiz_data.php?SubjectID=${SubjectID}`)
  .then((response) => response.json())
  .then( async (jsonData) => {

    const transaction = testDB.transaction(testStoreName, "readwrite");
    const objectStore = transaction.objectStore(testStoreName);

    // Check if data.json records already exist in IndexedDB
    objectStore.count().onsuccess = (event) => {
      const count = event.target.result;
      
      console.log('---->',jsonData);
      
      if (count == 0) {
        // Store data from data.json into IndexedDB
        jsonData.data.forEach((item) => {
          item.isFav = false;
          item.isSkip = false;
          objectStore.add(item);
        });
        showToast("Download successfully !!"); 
      }else{
        //  if (window.confirm("Data will be reloaded. Do you want to proceed?")) {
          // User confirmed, proceed with data reloading
          // Delete all records from IndexedDB
          const clearRequest = objectStore.clear();

          clearRequest.onsuccess = () => {
            // Store data from data.json into IndexedDB
            jsonData.data.forEach((item) => {

              item.isFav = false;
              item.isSkip = false;
              objectStore.add(item);
            });
            showToast("Download successfully !!"); 
          };

          clearRequest.onerror = (event) => {
            console.error("Error clearing IndexedDB:", event.target.error);
          // };
        // } else {
          // User canceled, handle accordingly (optional)
          // console.log("User canceled data reload.");
        }
      }
    };

  })
  .catch((error) => {
    console.error("Error loading JSON data: " + error);
  });

}

async function getTopicData(){
  const SubjectID = localStorage.getItem('subject') || 1;

  var xhr1 = new XMLHttpRequest();
  var url1 = `https://learnit123.000webhostapp.com/api/get_topic_data.php?SubjectID=${SubjectID}`;
  
  xhr1.open('GET', url1, true);
  
  xhr1.onload = function () {
    if (xhr1.status == 200) {
        var responseData = JSON.parse(xhr1.responseText);
        console.log(responseData);
        topicData = responseData.data;      
        customRenderListItems();  
    } else {
        console.error('Request failed with status:', xhr1.status);
    }
  };
  
  xhr1.send();
  
  xhr1.onerror = function (e) {
    console.error('Request failed', e);
  };
  
}

getData();

function getData() {

var xhr = new XMLHttpRequest();
var url = 'https://learnit123.000webhostapp.com/api/get_subject_data.php';

xhr.open('GET', url, true);

xhr.onload = function () {
  if (xhr.status == 200) {
      var responseData = JSON.parse(xhr.responseText);
      console.log(responseData);
      subjectData = responseData.data;     
      renderListItems();

      getTopicData();

  } else {
      console.error('Request failed with status:', xhr.status);
  }
};

xhr.send();

xhr.onerror = function (e) {
  console.error('Request failed', e);
};

  
}

function setOption(){
    const selected_subject = parseInt(localStorage.getItem("subject")) || 1;
    const selected_topic = parseInt(localStorage.getItem("topic"));

    var subject = document.getElementById('dropdown-subject');
    var topic = document.getElementById('dropdown-topic');

    subject.value = subjectData[selected_subject-1].id;
    subject.text = subjectData[selected_subject-1].name;    

    console.log(selected_topic==0);

    if(selected_topic==0){
      topic.value = 0;
      topic.text = 'User Data';
    }else{
      topic.value = topicData.id;
      topic.text = topicData.name;
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
      <button class="dropdown-button list-button" data-translate-value="${translateValue}%" data-value="${index}">
        <span class="text-truncate">${text}</span>
      </button>
    </li>
  `;
};

const renderListItems = () => {
  console.log('--',subjectData);
  dropdownList.innerHTML += subjectData
    .map((item, index) => {

      const subject = parseInt(localStorage.getItem("subject")) || 1;

      if (subject == item.id) dropdownTitle.innerHTML = item.name;
      setDropdownProps(0, 0, 0);
      return listItemTemplate(item.name, 100 * index, item.id);
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
  const dropdownOpenHeight = 4.6 * subjectData.length + listWrapperSizes;
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
  selected_subject = translateValue;
  getTopicData();
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

  const selected_subject = localStorage.getItem('subject');
  
  customDropdownList.innerHTML = topicData
    .map((item, index) => {

      const topic = parseInt(localStorage.getItem("topic")) || 1;

      if (topic - 1 == index) {
        customDropdownTitle.innerHTML = item.topic;
        localStorage.setItem('topic',topic)

      };
      setCustomDropdownProps(0, 0, 0);
      return customListItemTemplate(item.topic, 100 * index, index);
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
  const dropdownOpenHeight = 4.6 * (topicData.length+1) + listWrapperSizes;
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
