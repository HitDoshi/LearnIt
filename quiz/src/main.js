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
    objectStore.createIndex("subjectIndex", ["sourceSubjectId", "targetSubjectId"]);
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

    subjectData.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    subjectData = subjectData?.map((item) => ({
      ...item,
      name: item.name?.trim() || "",
    }));

    const isLatestSubjectLoaded = localStorage.getItem("latestSubjectLoaded");
    if (isLatestSubjectLoaded === "true") {
      customSubjectRenderSelectOptions();
      // customNewSubjectRenderSelectOptions();
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
    // objectStore.createIndex(keyIndex, ["subjectId", "topicId"]);
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

function isSameLanguageSelected() {
  const source = JSON.parse(localStorage.getItem("source-language") || '{}');
  const target = JSON.parse(localStorage.getItem("target-language") || '{}');
  if (source?.id && target?.id && source?.id === target?.id) {
    showToast('Source and target language cannot be the same.\nPlease select different languages.');
    return true;
  }
  return false;
}

function replaceStateWithHistory(page) {
  const topicNumber = localStorage.getItem("topic");
  const token = localStorage.getItem("token");
  if (isSameLanguageSelected()) {
    return;
  }
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
            "sourceSubjectId",
            "targetSubjectId",
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
      const url = `${API_URL}/api/get_topic_data.php`;
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
      const url = `${API_URL}/api/get_subject_data.php`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log(responseData);

      if (responseData.success) {
        if (!subjectDB) {
          subjectData = responseData.data;

          subjectData =
            subjectData?.length > 0
              ? subjectData?.map((item) => ({
                ...item,
                name: item?.name?.trim() || "",
              }))
              : [];

          customSubjectRenderSelectOptions();
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

            customSubjectRenderSelectOptions();

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

const root = document.documentElement;

const customSubjectDropdownSelect = document.querySelector(
  ".subject-list-custom-dropdown-select"
);

const customSubjectOptionTemplate = (
  text,
  translateValue,
  index,
  selected = false
) => {
  return `<option value="${index}" data-translate-value="${translateValue}%" ${selected ? "selected" : ""
    }>${text}</option>`;
};

const customSubjectRenderSelectOptions = () => {

  customTargetSubjectRenderSelectOptions();
  customSecondaryLanguageRenderSelectOptions();
  const selectedSubject =
    parseInt(JSON.parse(localStorage.getItem("source-language") || "{}")?.id) ||
    1;

  subjectData.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  subjectData = subjectData?.map((item) => ({
    ...item,
    name: item.name?.trim() || "",
  }));

  const options = subjectData
    .map((item, index) => {
      const isSelected = selectedSubject === parseInt(item.id);
      return customSubjectOptionTemplate(item.name, 100 * index, item.id, isSelected);
    })
    .join("");

  customSubjectDropdownSelect.innerHTML = options;

  if (subjectData?.length > 0) {

    const source = JSON.parse(localStorage.getItem("source-language") || "{}");
    const target = JSON.parse(localStorage.getItem("target-language") || "{}");
    const secondary = JSON.parse(localStorage.getItem("secondary-language") || "{}");

    if (!source?.id) {
      localStorage.setItem("source-language", JSON.stringify(subjectData?.[0]));
    }

    if (!target?.id) {
      localStorage.setItem("target-language", JSON.stringify(subjectData?.[0]));
    }

    if (!secondary?.id) {
      localStorage.setItem(
        "secondary-language",
        JSON.stringify(subjectData?.[0])
      );
    }
  }
};

const handleSelectSubjectChange = (event) => {
  const selectedValue = event.target.value;
  const selectedOption = event.target.options[event.target.selectedIndex].text;

  console.log(`Selected Value: ${selectedValue}`);
  console.log(`Selected Option: ${selectedOption}`);

  const selectedData = subjectData?.find((item) => item?.id == selectedValue);

  localStorage.setItem("source-language", JSON.stringify(selectedData));
  setTopicData();
};

customSubjectDropdownSelect.addEventListener(
  "change",
  handleSelectSubjectChange
);

const setDropdownProps = (deg, ht, opacity) => {
  root.style.setProperty("--rotate-arrow", deg !== 0 ? deg + "deg" : 0);
  root.style.setProperty("--dropdown-height", ht !== 0 ? ht + "rem" : 0);
  root.style.setProperty("--list-opacity", opacity);
};

const customDropdownData = [
  { name: "Option 1" },
  { name: "Option 2" },
  { name: "Option 3" },
  { name: "Option 4" },
  { name: "Option 5" },
];

const customDropdownSelect = document.querySelector(".custom-dropdown-select");

const customOptionTemplate = (
  text,
  translateValue,
  index,
  selected = false
) => {
  if (index === -1) {
    index = 0;
  }

  return `<option value="${index}" data-translate-value="${translateValue}%" ${selected ? "selected" : ""
    }>${text}</option>`;
};

const customRenderSelectOptions = () => {
  const selectedTopic = parseInt(localStorage.getItem("topic") || 1);

  const options = topicData
    .map((item, index) => {
      const isSelected = selectedTopic === parseInt(item.id);
      return customOptionTemplate(
        item.name,
        100 * index,
        item.id,
        isSelected
      );
    })
    .join("");

  customDropdownSelect.innerHTML = options;
  customDropdownSelect.innerHTML += customOptionTemplate(
    "User Data",
    100 * 0,
    -1,
    selectedTopic === 0
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

    const transaction = topicDB.transaction(topicStoreName, "readonly");
    const objectStore = transaction.objectStore(topicStoreName);

    const request = objectStore.getAll();
    request.onsuccess = (event) => {
      console.log(event.target.result);
      event.target.result.forEach((item) => {
        topicData.push(item);
      });

      topicData.sort((a, b) => parseInt(a.id) - parseInt(b.id));

      if (localStorage.getItem("topic") == null && topicData?.length > 0) {
        localStorage.setItem("topic", topicData?.[0]?.id);
      }

      customRenderSelectOptions();
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

const handleSelectChange = (event) => {
  const selectedValue = event.target.value;
  const selectedOption = event.target.options[event.target.selectedIndex].text;

  console.log(`Selected Value: ${selectedValue}`);
  console.log(`Selected Option: ${selectedOption}`);

  localStorage.setItem("topic", selectedValue);
};

customDropdownSelect.addEventListener("change", handleSelectChange);

const customTargetSubjectDropdownSelect = document.querySelector(
  ".target-subject-list-custom-dropdown-select"
);

const customTargetSubjectOptionTemplate = (
  text,
  translateValue,
  index,
  selected = false
) => {
  return `<option value="${index}" data-translate-value="${translateValue}%" ${selected ? "selected" : ""
    }>${text}</option>`;
};

const customTargetSubjectRenderSelectOptions = () => {
  const selectedTargetSubject =
    parseInt(JSON.parse(localStorage.getItem("target-language") || "{}")?.id) ||
    1;

  subjectData.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  const options = subjectData
    .map((item, index) => {
      const isSelected = selectedTargetSubject === parseInt(item.id);

      return customTargetSubjectOptionTemplate(
        item.name,
        100 * item.id,
        item.id,
        isSelected
      );
    })
    .join("");

  customTargetSubjectDropdownSelect.innerHTML = options;
};

const handleSelectTargetSubjectChange = (event) => {
  const selectedValue = event.target.value;
  const selectedOption = event.target.options[event.target.selectedIndex].text;

  console.log(`Selected Value: ${selectedValue}`);
  console.log(`Selected Option: ${selectedOption}`);

  const selectedData = subjectData?.find((item) => item?.id == selectedValue);

  localStorage.setItem("target-language", JSON.stringify(selectedData));
};

customTargetSubjectDropdownSelect.addEventListener(
  "mousedown",
  function (event) { }
);

customTargetSubjectDropdownSelect.addEventListener(
  "change",
  handleSelectTargetSubjectChange
);

const customSecondaryLanguageDropdownSelect = document.querySelector(
  ".secondary-language-list-custom-dropdown-select"
);

const customSecondaryLanguageOptionTemplate = (
  text,
  translateValue,
  index,
  selected = false
) => {
  return `<option value="${index}" data-translate-value="${translateValue}%" ${selected ? "selected" : ""
    }>${text}</option>`;
};

const customSecondaryLanguageRenderSelectOptions = () => {
  const selectedSecondaryLanguage =
    parseInt(
      JSON.parse(localStorage.getItem("secondary-language") || "{}")?.id
    ) || 1;

  subjectData.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  const options = subjectData
    .map((item, index) => {
      const isSelected = selectedSecondaryLanguage == parseInt(item.id);

      return customSecondaryLanguageOptionTemplate(
        item.name,
        100 * item.id,
        item.id,
        isSelected
      );
    })
    .join("");

  customSecondaryLanguageDropdownSelect.innerHTML = options;
};

const handleSelectSecondaryLanguageChange = (event) => {
  const selectedValue = event.target.value;
  const selectedOption = event.target.options[event.target.selectedIndex].text;

  console.log(`Selected Value: ${selectedValue}`);
  console.log(`Selected Option: ${selectedOption}`);

  const selectedData = subjectData?.find((item) => item?.id == selectedValue);

  localStorage.setItem("secondary-language", JSON.stringify(selectedData));
};

customSecondaryLanguageDropdownSelect.addEventListener(
  "mousedown",
  function (event) { }
);

customSecondaryLanguageDropdownSelect.addEventListener(
  "change",
  handleSelectSecondaryLanguageChange
);

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

const redirectionToAI = () => {
  if (isSameLanguageSelected()) {
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (user?.userType != "1") {
    showToast('Coming soon...');
    return;
  }

  if (user?.AI_Enable == 'Y') {
    window.location.href = 'levelTopicSelection.html';
  } else {
    showToast('This feature is not available for your account.');
  }
};