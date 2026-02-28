/**
 * googleAuth.js
 * -------------
 * Handles all Google OAuth (Sign In With Google) logic for LearnIt.
 *
 * Responsibilities:
 *  - Initialize the Google Identity Services (GIS) library
 *  - Handle the credential response (JWT) returned by Google
 *  - Send the credential to the backend for verification & session creation
 *  - Update localStorage and UI state after successful auth
 *
 * How to use:
 *  1. Set GOOGLE_CLIENT_ID in constant.js
 *  2. Include this file in main.html AFTER constant.js, api.js, and the GIS SDK
 *  3. The GIS SDK must have data-callback="handleGoogleCredential" on its meta/init
 */

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

/**
 * Called once the Google Identity Services SDK is ready.
 * Initializes google.accounts.id and renders buttons into both modals.
 */
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

// ─────────────────────────────────────────────────────────────
// Button Rendering
// ─────────────────────────────────────────────────────────────

/**
 * Renders a Google Sign-In button into a container element by ID.
 * @param {string} containerId - The id of the DOM element to render into
 */
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

// Re-render buttons when modals open (Bootstrap fires 'shown.bs.modal')
// This ensures the button width is calculated correctly after the modal is visible.
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

// ─────────────────────────────────────────────────────────────
// Credential Handler (Google → Backend → Session)
// ─────────────────────────────────────────────────────────────

/**
 * Called by the Google Identity Services SDK after the user selects an account.
 * Sends the Google credential (JWT id_token) to the backend for verification.
 *
 * Backend endpoint expected: POST ${API_URL}/api/google_login.php
 * Request body: { credential: "<google_id_token>" }
 * Expected success response: { success: true, message: "...", data: { token, userName, useremail, EnableAudio, ... } }
 *
 * @param {Object} response - The CredentialResponse from Google
 * @param {string} response.credential - The signed JWT ID token
 */
function handleGoogleCredential(response) {
  if (!response || !response.credential) {
    showToast("Google sign-in failed. Please try again.");
    return;
  }

  // Show loading state on whichever modal is open
  setGoogleButtonsLoading(true);

  fetch(`${API_URL}/api/google_login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: response.credential }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data?.success) {
        // ── Store session ──
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("username", data.data.userName);
        localStorage.setItem("useremail", data.data.useremail || data.data.email || "");
        localStorage.setItem("EnableAudio", data.data.EnableAudio || "N");
        localStorage.setItem("user", JSON.stringify(data.data || {}));

        // ── Update UI ──
        toggleNavIcon();
        isTokenChange();

        // ── Close both modals ──
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

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Shows/hides a loading overlay over the Google sign-in button containers.
 * @param {boolean} isLoading
 */
function setGoogleButtonsLoading(isLoading) {
  ["google-login-btn", "google-signup-btn"].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.opacity = isLoading ? "0.5" : "1";
    el.style.pointerEvents = isLoading ? "none" : "auto";
  });
}
