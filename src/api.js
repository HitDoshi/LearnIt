apiDBName = "user";
apiDBVersion = 1;
apiStoreName = "userData";
apiIndex = "subjectIndex";

var apiIndexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

let apiDB; // Reference to the IndexedDB database

function logInFunction() {
  try {
    var form = document.getElementById("loginForm");
    if (form.checkValidity()) {
      var email = document.getElementById("loginEmail").value.trim();
      var password = document.getElementById("loginPassword").value.trim();

      var button = document.getElementById("loginButton");
      var spinner = document.getElementById("spinner");
      var buttonText = document.getElementById("loginButtonText");

      button.disabled = true;
      spinner.classList.remove("d-none");
      buttonText.textContent = "Logging in...";

      console.log(form);
      fetch("https://learnit123.000webhostapp.com/api/login.php", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data?.success) {
            showToast(data?.message);
            $("#loginModal").modal("hide"); // hide login modal
            localStorage.setItem("token", data?.data.token);
            localStorage.setItem("username", data?.data.userName);
            localStorage.setItem("useremail", email);
            toggleNavIcon();
            isTokenChange();
          } else {
            showToast(data?.message);
          }
          button.disabled = false;
          spinner.classList.add("d-none");
          buttonText.textContent = "Login";
        })
        .catch((error) => {
          // console.error('Error:', error);
          showToast(error?.message);
          button.disabled = false;
          spinner.classList.add("d-none");
          buttonText.textContent = "Login";
        });
    } else {
      form.reportValidity();
    }
  } catch (error) {
    console.log(error);
  }
}

function signUpFunction() {
  try {
    var form = document.getElementById("signUpForm");
    if (form.checkValidity()) {
      var email = document.getElementById("signUpEmail").value;

      var button = document.getElementById("signUpButton");
      var spinner = document.getElementById("spinner");
      var buttonText = document.getElementById("signUpButtonText");

      button.disabled = true;
      spinner.classList.remove("d-none");
      buttonText.textContent = "Signing up...";

      console.log(form);
      fetch("https://learnit123.000webhostapp.com/api/signup.php", {
        method: "POST",
        body: JSON.stringify({
          email,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data?.success) {
            showToast(data?.message);
            $("#signUpModal").modal("hide"); // hide login modal
            email.value = "";
          } else {
            showToast(data?.message);
          }
          console.log(data);
          button.disabled = false;
          spinner.classList.add("d-none");
          buttonText.textContent = "SignUp";
        })
        .catch((error) => {
          // console.error('Error:', error);
          showToast(error?.message);
          button.disabled = false;
          spinner.classList.add("d-none");
          buttonText.textContent = "SignUp";
        });
    } else {
      form.reportValidity();
    }
  } catch (error) {
    console.log(error);
  }
}

function forgotPassFunction() {
  try {
    var form = document.getElementById("forgotPassForm");
    if (form.checkValidity()) {
      var email = document.getElementById("forgotPassEmail").value;

      var button = document.getElementById("forgotPassButton");
      var spinner = document.getElementById("spinner");
      var buttonText = document.getElementById("forgotPassButtonText");

      button.disabled = true;
      spinner.classList.remove("d-none");
      buttonText.textContent = "Sending...";

      console.log(form);
      fetch(
        "https://learnit123.000webhostapp.com/api/requestForgotPassword.php",
        {
          method: "POST",
          body: JSON.stringify({
            email,
          }),
        }
      )
        .then((response) => response.json())
        .then((data) => {
          if (data?.success) {
            showToast(data?.message);
            $("#forgotPassModal").modal("hide"); // hide login modal
          } else {
            showToast(data?.message);
          }
          console.log(data);
          button.disabled = false;
          spinner.classList.add("d-none");
          buttonText.textContent = "Send password reset link";
        })
        .catch((error) => {
          // console.error('Error:', error);
          showToast(error?.message);
          button.disabled = false;
          spinner.classList.add("d-none");
          buttonText.textContent = "Send password reset link";
        });
    } else {
      form.reportValidity();
    }
  } catch (error) {
    console.log(error);
  }
}

function deleteUserFunction() {
  try {
    var button = document.getElementById("deleteUserButton");
    var spinner = document.getElementById("spinner");
    var buttonText = document.getElementById("deleteUserButtonText");

    button.disabled = true;
    spinner.classList.remove("d-none");
    buttonText.textContent = "Deleting...";

    const token = localStorage.getItem("token");

    fetch(
      `https://learnit123.000webhostapp.com/api/deleteAccount.php?token=${token}`,
      {
        method: "GET",
      }
    )
      .then((response) => response.json())
      .then((data) => {
        if (data?.success) {
          showToast(data?.message);
          $("#deleteAccountModal").modal("hide"); // hide login modal
          localStorage.removeItem("token");
          localStorage.removeItem("username");
          localStorage.removeItem("useremail");
          toggleNavIcon();
          isTokenChange();
        } else {
          showToast(data?.message);
        }
        console.log(data);
        button.disabled = false;
        spinner.classList.add("d-none");
        buttonText.textContent = "Delete";
      })
      .catch((error) => {
        // console.error('Error:', error);
        showToast(error?.message);
        button.disabled = false;
        spinner.classList.add("d-none");
        buttonText.textContent = "Delete";
      });
  } catch (error) {
    console.log(error);
  }
}

function feedbackFunction() {
  try {
    var form = document.getElementById("feedbackForm");
    if (form.checkValidity()) {
      var button = document.getElementById("feedbackButton");
      var spinner = document.getElementById("spinner");
      var buttonText = document.getElementById("feedbackButtonText");

      var username = document.getElementById("feedback-username").value.trim();
      var subject = document.getElementById("feedback-subject").value.trim();
      var message = document.getElementById("feedback-message").value.trim();

      button.disabled = true;
      spinner.classList.remove("d-none");
      buttonText.textContent = "Submitting...";

      const token = localStorage.getItem("token");

      fetch(
        `https://learnit123.000webhostapp.com/api/feedback.php?token=${token}`,
        {
          method: "post",
          body: JSON.stringify({
            username: username,
            subject: subject,
            message: message,
          }),
        }
      )
        .then((response) => response.json())
        .then((data) => {
          if (data?.success) {
            showToast(data?.message);
            username.value = "";
            subject.value = "";
            message.value = "";
            $("#feedbackModal").modal("hide"); // hide login modal
          } else {
            showToast(data?.message);
          }
          console.log(data);
          button.disabled = false;
          spinner.classList.add("d-none");
          buttonText.textContent = "Submit";
        })
        .catch((error) => {
          console.error("Error:", error);
          showToast(error?.message);
          button.disabled = false;
          spinner.classList.add("d-none");
          buttonText.textContent = "Submit";
        });
    } else {
      form.reportValidity();
    }
  } catch (error) {
    console.log(error);
  }
}

// Open a connection to the database
const openDB = () => {
  return new Promise((resolve, reject) => {
    const apiRequest = apiIndexedDB.open("user", 1);

    apiRequest.onerror = (event) => {
      reject("Error opening database");
    };

    apiRequest.onupgradeneeded = (event) => {
      const apiDB = event.target.result;
      if (!apiDB.objectStoreNames.contains("userData")) {
        const apiObjectStore = apiDB.createObjectStore("userData", {
          keyPath: "id",
        });
        // Create a compound index for subjectId and topicId
        apiObjectStore.createIndex("subjectIndex", ["subjectId"]);
      }
    };

    apiRequest.onsuccess = (event) => {
      apiDB = event.target.result;
      console.log(apiDB);
      resolve(apiDB);
    };
  });
};

// Retrieve data from the database
const getDataFromDB = () => {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const apiTransaction = db.transaction("userData", "readonly");
      const apiObjectStore = apiTransaction.objectStore("userData");

      const apiRequest = apiObjectStore.getAll();

      apiRequest.onerror = (event) => {
        reject("Error fetching data from object store");
      };

      apiRequest.onsuccess = (event) => {
        const apiData = event.target.result;
        resolve(apiData);
      };
    });
  });
};

async function uploadUserDataFunction(showLogs = true) {
  try {
    const token = localStorage.getItem("token");
    var button = document.getElementById("uploadUserDataButton");
    var spinner = document.getElementById("spinner");
    var buttonText = document.getElementById("uploadUserDataButtonText");

    button.disabled = true;
    spinner.classList.remove("d-none");
    buttonText.textContent = "Uploading...";

    getDataFromDB()
      .then((data) => {
        console.log("Data retrieved from IndexedDB:", data);

        // Continue with the fetch request inside the .then block
        fetch(
          `https://learnit123.000webhostapp.com/api/uploadUserData.php?token=${token}`,
          {
            method: "POST",
            body: JSON.stringify({
              data: data, // Use the retrieved data directly
              timestamp: new Date().toLocaleString()
            }),
          }
        )
          .then((response) => response.json())
          .then((data) => {
            if (data?.success) {
              if (showLogs) {
                showToast(data?.message);
              }
              $("#uploadUserDataModal").modal("hide");
              // const transaction = db.transaction('userData', "readwrite");
              // const objectStore = transaction.objectStore('userData');
              // const clearRequest = objectStore.clear();
            } else {
              if (showLogs) {
                showToast(data?.message);
              }
            }
            console.log(data);
            button.disabled = false;
            spinner.classList.add("d-none");
            buttonText.textContent = "Upload";
          })
          .catch((error) => {
            console.error("Error:", error);
            if (showLogs) {
              showToast(error?.message);
            }
            button.disabled = false;
            spinner.classList.add("d-none");
            buttonText.textContent = "Upload";
          });
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  } catch (error) {
    console.log(error);
  }
}

async function uploadDailyUserDataFunction() {
  try {
    const token = localStorage.getItem("token");    

    getDataFromDB()
      .then((data) => {
        console.log("Data retrieved from IndexedDB:", data);
        fetch(
          `https://learnit123.000webhostapp.com/api/uploadUserData.php?token=${token}`,
          {
            method: "POST",
            body: JSON.stringify({
              data: data, // Use the retrieved data directly
              timestamp: new Date().toLocaleString()
            }),
          }
        )
          .then((response) => response.json())
          .then((data) => {            
            console.log(data);            
          })
          .catch((error) => {
            console.error("Error:", error);                       
          });
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  } catch (error) {
    console.log(error);
  }
}

function isTokenChange() {
  var isLoggedIn = localStorage.getItem("token"); // or false depending on your authentication logic

  if (isLoggedIn) {
    document.getElementById("notLogInContainer").style.display = "none";
    document.getElementById("logInContainer").style.display = "block";
    const userNameText = localStorage.getItem("username") || "-";
    const userEmailText = localStorage.getItem("useremail") || "";
    document.getElementById("userNameText").innerText = userNameText;
    document.getElementById("userEmailText").innerText = userEmailText;
  } else {
    document.getElementById("notLogInContainer").style.display = "block";
    document.getElementById("logInContainer").style.display = "none";
  }
}

async function uploadUserActivity() {
  try {
    const token = localStorage.getItem("token");
    const totalRightAns = parseInt(localStorage.getItem("totalRightAns")) || 0;
    var date = localStorage.getItem("date");

    fetch(
      `https://learnit123.000webhostapp.com/api/uploadUserActivity.php?token=${token}`,
      {
        method: "post",
        body: JSON.stringify({
          totalRightAns: totalRightAns,
          date: date
        }),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("uploadUserActivity", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  } catch (error) {
    console.log(error);
  }
}
