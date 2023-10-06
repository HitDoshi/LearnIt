const toastContainer = document.getElementById("toastContainer");

      function createToast(message, className, duration) {
        const toast = document.createElement("div");
        toast.className = `toast ${className}`;
        toast.textContent = message;

        // Close icon
        const closeIcon = document.createElement("span");
        closeIcon.innerHTML = "&#10006;"; // Close symbol (✖)
        closeIcon.className = "close-icon";
        closeIcon.addEventListener("click", () => {
          toast.style.opacity = "0";
          setTimeout(() => {
            toastContainer.removeChild(toast);
          }, 300); // Remove the toast element after the fade-out animation
        });

        // Progress bar
        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar";

        toast.appendChild(progressBar);
        toast.appendChild(closeIcon);
        toastContainer.insertBefore(toast, toastContainer.firstChild);

        // Trigger a reflow to apply the initial opacity transition
        toast.offsetWidth;

        // Add animation class
        toast.style.opacity = "1";

        // Auto-close the toast after the specified duration
        setTimeout(() => {
          toast.style.opacity = "0";
          setTimeout(() => {
            toastContainer.removeChild(toast);
          }, 300); // Remove the toast element after the fade-out animation
        }, duration);
      }
