var testDBName = "test";
var testDBVersion = 1;
var testStoreName = "data";

var subjectDBName = "subject";
var subjectDBVersion = 1;
var subjectStoreName = "subjectData";
var subjectDB;

var topicDBName = "topic";
var topicDBVersion = 1;
var topicStoreName = "topicData";
var topicDB;
var keyIndex = "subjectTopicIndex";
var latestSubjectLoaded = false;
var isShowLoading = false;

var allData = [];
var selected_subject = 0;
var selected_topic = 0;
var subjectData = [];
var topicData = [];

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
var userOpenRequest = indexedDB.open("user", 1);
userOpenRequest.onupgradeneeded = (event) => {
  userDB = event.target.result;

  // Create the object store if it doesn't exist
  if (!userDB.objectStoreNames.contains("userData")) {
    const objectStore = userDB.createObjectStore("userData", { keyPath: "id" });
    // Create a compound index for subjectId and topicId
    objectStore.createIndex("subjectIndex", ["subjectId"]);
  }
};

userOpenRequest.onerror = (event) => {
  console.error("Database error: " + event.target.error);
};

userOpenRequest.onsuccess = (event) => {
  userDB = event.target.result;
};

var subjectDataOpenRequest = indexedDB.open("subject", subjectDBVersion);
subjectDataOpenRequest.onupgradeneeded = (event) => {
  subjectDB = event.target.result;

  // Create the object store if it doesn't exist
  if (!subjectDB.objectStoreNames.contains(subjectStoreName)) {
    const objectStore = subjectDB.createObjectStore(subjectStoreName, {
      keyPath: "id",
    });
    // Create a compound index for subjectId and topicId
    // objectStore.createIndex("subjectIndex", ["id"]);
  }
};

subjectDataOpenRequest.onerror = (event) => {
  console.error("Database error: " + event.target.error);
};

subjectDataOpenRequest.onsuccess = (event) => {
  subjectDB = event.target.result;

  var isUserOnline = navigator.onLine;

  const transaction = subjectDB.transaction(subjectStoreName, "readonly");
  const objectStore = transaction.objectStore(subjectStoreName);

  const request = objectStore.getAll();
  request.onsuccess = (event) => {
    const isUserOnline = navigator.onLine;
    console.log(event.target.result);
    subjectData = event.target.result;
    const isLatestSubjectLoaded = localStorage.getItem("latestSubjectLoaded");
    if (isLatestSubjectLoaded === "true") {
      renderListItems();
    }
  };
};

var topicDataOpenRequest = indexedDB.open("topic", topicDBVersion);
topicDataOpenRequest.onupgradeneeded = (event) => {
  topicDB = event.target.result;

  // Create the object store if it doesn't exist
  if (!topicDB.objectStoreNames.contains(topicStoreName)) {
    const objectStore = topicDB.createObjectStore(topicStoreName, {
      keyPath: "id",
    });
    // Create a compound index for subjectId and topicId
    objectStore.createIndex(keyIndex, ["subjectId", "topicId"]);
  }
};

topicDataOpenRequest.onerror = (event) => {
  console.error("Database error: " + event.target.error);
};

topicDataOpenRequest.onsuccess = (event) => {
  topicDB = event.target.result;

  var isUserOnline = navigator.onLine;
  const transaction = topicDB.transaction(topicStoreName, "readonly");
  const objectStore = transaction.objectStore(topicStoreName);

  const request = objectStore.getAll();
  request.onsuccess = (event) => {
    const isUserOnline = navigator.onLine;
    console.log(event.target.result);
    const isLatestSubjectLoaded = localStorage.getItem("latestSubjectLoaded");
    if (isLatestSubjectLoaded === "true") {
      setTopicData();
    }
  };
};

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

        if (dbName == "test") {
          objectStore.createIndex("subjectTopicIndex", [
            "subjectId",
            "topicId",
          ]);
        }

        // Create any needed indexes here
      }
    };
  });
}

async function getTopicData() {
  try {
    const isUserOnline = navigator.onLine;
    if (isUserOnline && !latestSubjectLoaded) {
      const subjectID = localStorage.getItem("subject") || 1;
      const url = `https://learnit123.000webhostapp.com/api/get_topic_data.php`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log(responseData);

      $("#modal-loading").modal("hide");
      isShowLoading = false;

      if (responseData.success) {
        // topicData = responseData.data;

        if (!topicDB) {
          console.error("Database is not open yet.");
          return;
        }

        const transaction = topicDB.transaction(topicStoreName, "readwrite");
        const objectStore = transaction.objectStore(topicStoreName);

        // Check if data.json records already exist in IndexedDB
        objectStore.count().onsuccess = (event) => {
          const count = event.target.result;

          const clearRequest = objectStore.clear();

          clearRequest.onsuccess = async () => {
            // Store subject data from data.json into IndexedDB
            await responseData.data.forEach((item) => {
              objectStore.add(item);
            });

            latestSubjectLoaded = true;
            localStorage.setItem("latestSubjectLoaded", true);

            setTopicData();
          };

          clearRequest.onerror = (event) => {
            console.error("Error clearing IndexedDB:", event.target.error);
          };
        };
      }
    }
  } catch (error) {
    console.error("Request failed", error);
    showToast(error.message);
    $("#modal-loading").modal("hide");
    isShowLoading = false;
  }
}

async function getData() {
  const isUserOnline = navigator.onLine;
  const isLatestSubjectLoaded = localStorage.getItem("latestSubjectLoaded");
  if (isUserOnline && isLatestSubjectLoaded !== "true") {
    $("#modal-loading").modal("show");
    isShowLoading = true;

    // Wait for a short delay to ensure the modal is fully shown
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const url =
        "https://learnit123.000webhostapp.com/api/get_subject_data.php";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log(responseData);

      if (responseData.success) {
        // subjectData = responseData.data;

        if (!subjectDB) {
          subjectData = responseData.data;
          renderListItems();
          getTopicData();
          console.error("Database is not open yet.");
          $("#modal-loading").modal("hide");
          isShowLoading = false;
          return;
        }

        const transaction = subjectDB.transaction(
          subjectStoreName,
          "readwrite"
        );
        const objectStore = transaction.objectStore(subjectStoreName);

        // Check if data.json records already exist in IndexedDB
        objectStore.count().onsuccess = (event) => {
          const count = event.target.result;

          const clearRequest = objectStore.clear();

          clearRequest.onsuccess = () => {
            // Store subject data from data.json into IndexedDB
            responseData.data.forEach((item) => {
              objectStore.add(item);
            });

            subjectData = responseData.data;

            renderListItems();

            getTopicData();
          };

          clearRequest.onerror = (event) => {
            console.error("Error clearing IndexedDB:", event.target.error);
            $("#modal-loading").modal("hide");
            isShowLoading = false;
          };
        };
      } else {
        $("#modal-loading").modal("hide");
        isShowLoading = false;
      }
    } catch (error) {
      console.error("Request failed", error);
      $("#modal-loading").modal("hide");
      isShowLoading = false;
    }
  }
}

function setOption() {
  const selected_subject = parseInt(localStorage.getItem("subject")) || 1;
  const selected_topic = parseInt(localStorage.getItem("topic"));

  var subject = document.getElementById("dropdown-subject");
  var topic = document.getElementById("dropdown-topic");

  subject.value = subjectData[selected_subject - 1].id;
  subject.text = subjectData[selected_subject - 1].name;

  console.log(selected_topic == 0);

  if (selected_topic == 0) {
    topic.value = 0;
    topic.text = "User Data";
  } else {
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
  console.log("--", subjectData);
  dropdownList.innerHTML = subjectData
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
  const currDropdownHeight =
    root.style.getPropertyValue("--dropdown-height") || "0";

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
  const translateValue = e.target.getAttribute("data-value");
  dropdownTitle.innerHTML = clickedItemText;
  console.log(translateValue);
  setDropdownProps(0, 0, 0);
  localStorage.setItem("subject", translateValue);
  localStorage.setItem("topic", 1);
  localStorage.setItem("total_right", 0);
  selected_subject = translateValue;
  getTopicData();
  setTopicData();
  // customRenderListItems();
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
  { name: "Option 5" },
];

// Independent dropdown functionality
const customDropdownTitle = document.querySelector(".custom-dropdown-title");
const customDropdownList = document.querySelector(".custom-dropdown-list");
const customMainButton = document.querySelector(".custom-dropdown-button");
const customFloatingIcon = document.querySelector(".custom-floating-icon");

const customListItemTemplate = (text, translateValue, index) => {
  if (index === -1) {
    index = 0;
  }

  return `
    <li class="custom-dropdown-list-item">
      <button class="custom-dropdown-button list-button" data-translate-value="${translateValue}%" data-value="${index}">
        <span class="text-truncate">${text}</span>
      </button>
    </li>
  `;
};

const customRenderListItems = () => {
  const selected_subject = localStorage.getItem("subject");

  customDropdownList.innerHTML = topicData
    .map((item, index) => {
      const topic = parseInt(localStorage.getItem("topic")) || 1;

      if (topic == item.topicId || topic == 0) {
        customDropdownTitle.innerHTML = item.topic;
        localStorage.setItem("topic", topic);
      }
      setCustomDropdownProps(0, 0, 0);
      return customListItemTemplate(item.topic, 100 * index, item.topicId);
    })
    .join("");

  customDropdownList.innerHTML += customListItemTemplate(
    "User Data",
    100 * 0,
    -1
  );
};

const setTopicData = () => {
  try {
    if (!topicDB) {
      console.log("Topic Database is not open yet");
      showToast("Topic Database is not open yet !!");
      return;
    }

    topicData = [];

    const selected_subject = localStorage.getItem("subject") || 1;

    // Access the object store
    const transaction = topicDB.transaction(topicStoreName, "readonly");
    const objectStore = transaction.objectStore(topicStoreName);

    const request = objectStore.getAll();
    request.onsuccess = (event) => {
      console.log(event.target.result);
      event.target.result.forEach((item) => {
        if (item.subjectId == selected_subject) {
          topicData.push(item);
        }
      });
      customRenderListItems();
    };
  } catch (error) {
    console.log(error);
  }
};

const setCustomDropdownProps = (deg, ht, opacity) => {
  root.style.setProperty("--custom-arrow", deg !== 0 ? deg + "deg" : 0);
  root.style.setProperty("--custom-dropdown-height", ht !== 0 ? ht + "rem" : 0);
  root.style.setProperty("--custom-list-opacity", opacity);
};

// Initialize the second dropdown

customMainButton.addEventListener("click", () => {
  const listWrapperSizes = 3.5; // margins, paddings & borders
  const dropdownOpenHeight = 4.6 * (topicData.length + 1) + listWrapperSizes;
  const currDropdownHeight =
    root.style.getPropertyValue("--custom-dropdown-height") || "0";

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
  const translateValue = e.target.getAttribute("data-value");
  customDropdownTitle.innerHTML = clickedItemText;

  console.log(translateValue);
  setCustomDropdownProps(0, 0, 0);
  localStorage.setItem("topic", translateValue);
});

customDropdownList.addEventListener("mousemove", (e) => {
  const iconSize =
    root.style.getPropertyValue("--custom-floating-icon-size") || 0;
  const x = e.clientX - customDropdownList.getBoundingClientRect().x;
  const y = e.clientY - customDropdownList.getBoundingClientRect().y;
  root.style.setProperty(
    "--custom-floating-icon-left",
    x - iconSize / 2 + "px"
  );
  root.style.setProperty("--custom-floating-icon-top", y - iconSize / 2 + "px");
});

$(document).ready(function () {
  $("#modal-loading").on("show.bs.modal", function () {
    // Do something when the modal is shown
    console.log("Modal is shown");
    if (!isShowLoading) {
      $("#modal-loading").modal("hide");
    }
  });

  $("#modal-loading").on("hide.bs.modal", function () {
    // Do something when the modal is hidden
    console.log("Modal is hidden");
  });
});
