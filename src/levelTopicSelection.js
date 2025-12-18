var isShowLoading = false;
var topicData = [];
var filterTopicData = [];
var levelData = [];
var selectedTopic = null;
var selectedLevel = null;
const sourceLang = JSON.parse(localStorage.getItem("source-language") || "{}");
const targetLang = JSON.parse(localStorage.getItem("target-language") || "{}");
const backButton = document.getElementById("backButton");

function replaceStateWithHistory(page) {
  const token = localStorage.getItem("token");
  if (!token) {
    showToast(
      "Access to this section requires a login.\nPlease login first !!"
    );
  } else {
    history.replaceState(null, "", page);
    // window.location.reload();
    window.location.href = page;
  }
}

async function getData() {
  $("#modal-loading").modal("show");
  isShowLoading = true;

  // Wait for a short delay to ensure the modal is fully shown
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const url = `${API_URL}/api/get_level_topic_data.php`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log(responseData);

    if (!responseData.success) {
      showToast(responseData.message);
    }
    topicData = responseData?.data?.topics || [];
    levelData = responseData?.data?.levels || [];

    customLevelRenderSelectOptions();
    $("#modal-loading").modal("hide");
    isShowLoading = false;
  } catch (error) {
    console.error("Request failed", error);
    $("#modal-loading").modal("hide");
    isShowLoading = false;
    showToast(error.message);
  }
}

const root = document.documentElement;

const customTopicDropdownSelect = document.querySelector(
  ".topic-list-custom-dropdown-select"
);

const customTopicOptionTemplate = (
  text,
  translateValue,
  index,
  selected = false
) => {
  return `<option value="${index}" data-translate-value="${translateValue}%" ${
    selected ? "selected" : ""
  }>${text}</option>`;
};

const customTopicRenderSelectOptions = () => {
  filterTopicData = topicData.filter((item) => item.levelID == selectedLevel?.levelID);
  filterTopicData.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  selectedTopic = null;

  if (!selectedTopic) {
    selectedTopic = filterTopicData[0];
    localStorage.setItem("dialogue-topic", JSON.stringify(selectedTopic));
  }

  const options = filterTopicData
    .map((item, index) => {
      const isSelected = selectedTopic === parseInt(item.id);
      return customTopicOptionTemplate(
        item.topic_desc,
        100 * index,
        item.id,
        isSelected
      );
    })
    .join("");

  customTopicDropdownSelect.innerHTML = options;
};

const handleSelectTopicChange = (event) => {
  const selectedValue = event.target.value;
  const selectedOption = event.target.options[event.target.selectedIndex].text;

  console.log(`Selected Value: ${selectedValue}`);
  console.log(`Selected Option: ${selectedOption}`);

  selectedTopic = topicData?.find((item) => item?.id == selectedValue);
  localStorage.setItem("dialogue-topic", JSON.stringify(selectedTopic));
};

customTopicDropdownSelect.addEventListener("change", handleSelectTopicChange);

const customLevelDropdownSelect = document.querySelector(
  ".level-list-custom-dropdown-select"
);

const customLevelOptionTemplate = (
  text,
  translateValue,
  index,
  selected = false
) => {
  return `<option value="${index}" data-translate-value="${translateValue}%" ${
    selected ? "selected" : ""
  }>${text}</option>`;
};

const customLevelRenderSelectOptions = () => {
  levelData.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  if (!selectedLevel) {
    selectedLevel = levelData[0];
    localStorage.setItem("dialogue-level", JSON.stringify(selectedLevel));
  }

  const options = levelData
    .map((item, index) => {
      const isSelected = selectedLevel === parseInt(item.id);
      return customLevelOptionTemplate(
        item.level_desc,
        100 * index,
        item.id,
        isSelected
      );
    })
    .join("");

  customLevelDropdownSelect.innerHTML = options;

  customTopicRenderSelectOptions();
};

const handleSelectLevelChange = (event) => {
  const selectedValue = event.target.value;
  const selectedOption = event.target.options[event.target.selectedIndex].text;

  selectedLevel = levelData?.find((item) => item?.id == selectedValue);
  localStorage.setItem("dialogue-level", JSON.stringify(selectedLevel));

  customTopicRenderSelectOptions();
};

customLevelDropdownSelect.addEventListener("change", handleSelectLevelChange);

const setDropdownProps = (deg, ht, opacity) => {
  root.style.setProperty("--rotate-arrow", deg !== 0 ? deg + "deg" : 0);
  root.style.setProperty("--dropdown-height", ht !== 0 ? ht + "rem" : 0);
  root.style.setProperty("--list-opacity", opacity);
};

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

backButton.onclick = function () {
  window.location.href = "ai.html";
};
