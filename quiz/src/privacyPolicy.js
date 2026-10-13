const privacyPolicyUrl = new URL("../privacyPolicy.html", document.currentScript.src).href;
let isPrivacyPolicyLoaded = false;

function createPrivacyPolicyModal() {
  const modal = document.createElement("div");
  modal.className = "modal fade privacy-policy-modal";
  modal.id = "privacyPolicyModal";
  modal.tabIndex = -1;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-labelledby", "privacyPolicyModalTitle");
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="privacyPolicyModalTitle">Privacy Policy</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body"></div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  return modal;
}

async function showPrivacyPolicyModal() {
  const modal = document.getElementById("privacyPolicyModal") || createPrivacyPolicyModal();
  const modalBody = modal.querySelector(".modal-body");

  $(modal).modal("show");

  if (isPrivacyPolicyLoaded) return;

  modalBody.innerHTML = `<div class="privacy-loading"><div class="loading-spinner"></div></div>`;

  try {
    const response = await fetch(privacyPolicyUrl);
    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }
    modalBody.innerHTML = await response.text();
    isPrivacyPolicyLoaded = true;
  } catch (error) {
    console.error("Error:", error);
    modalBody.innerHTML = `<p class="text-center text-muted my-4">Unable to load the Privacy Policy. Please try again.</p>`;
  }
}
