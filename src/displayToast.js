function showToast(msg) {
  const x = document.getElementById("snackbar");

  x.innerHTML = "";
  x.innerHTML = msg;

  x.className = "show";
  setTimeout(function(){ x.className = x.className.replace("show", ""); }, 5000);
}