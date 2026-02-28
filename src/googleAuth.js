function initGoogleSignIn() {
  if (typeof google === "undefined" || !google?.accounts?.id) {
    console.warn("[googleAuth] Google Identity Services SDK not loaded yet.");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  renderGoogleButton("google-login-btn");
  renderGoogleButton("google-signup-btn");
}

function renderGoogleButton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  google.accounts.id.renderButton(container, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    logo_alignment: "left",
    width: container.offsetWidth || 300,
  });
}

document.addEventListener("DOMContentLoaded", function () {
  ["loginModal", "signUpModal"].forEach(function (modalId) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      modalEl.addEventListener("shown.bs.modal", function () {
        initGoogleSignIn();
      });
    }
  });
});

function handleGoogleCredential(response) {
  if (!response || !response.credential) {
    showToast("Google sign-in failed. Please try again.");
    return;
  }

  setGoogleButtonsLoading(true);

  fetch(`${API_URL}/api/google_login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: response.credential }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data?.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("username", data.data.userName);
        localStorage.setItem("useremail", data.data.useremail || data.data.email || "");
        localStorage.setItem("EnableAudio", data.data.EnableAudio || "N");
        localStorage.setItem("user", JSON.stringify(data.data || {}));

        toggleNavIcon();
        isTokenChange();

        $("#loginModal").modal("hide");
        $("#signUpModal").modal("hide");

        showToast(data.message || "Signed in with Google successfully!");
      } else {
        showToast(data?.message || "Google sign-in failed. Please try again.");
      }
    })
    .catch((error) => {
      console.error("[googleAuth] handleGoogleCredential error:", error);
      showToast("Google sign-in error: " + (error?.message || "Unknown error"));
    })
    .finally(() => {
      setGoogleButtonsLoading(false);
    });
}

function setGoogleButtonsLoading(isLoading) {
  ["google-login-btn", "google-signup-btn"].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.opacity = isLoading ? "0.5" : "1";
    el.style.pointerEvents = isLoading ? "none" : "auto";
  });
}
