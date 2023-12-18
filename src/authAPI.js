function logInFunction() {
  try {
    var form = document.getElementById("loginForm");
    if (form.checkValidity()) {
      var email = document.getElementById("loginEmail").value;
      var password = document.getElementById("loginPassword").value;

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
            toggleNavIcon();
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
            $("#signUp").modal("hide"); // hide login modal
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
  
        const token = localStorage.getItem('token');
        
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
              toggleNavIcon();
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
