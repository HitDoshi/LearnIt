function replaceStateWithHistory(page) {
  history.replaceState(null, '', page);
  window.location.href = page;
}

const backButton = document.getElementById('backButton');
backButton.onclick = function() {
  window.location.href = 'main.html';
};

document.addEventListener("DOMContentLoaded", () => {
  const askButton = document.getElementById("ask-button");
  const promptInput = document.getElementById("prompt");
  const outputDiv = document.getElementById("output");

  askButton.addEventListener("click", async () => {
    const prompt = promptInput.value.trim();

    if (!prompt) {
      showToast("Please enter a prompt before asking.");
      return;
    }

    outputDiv.innerText = "Thinking...";

    try {
      const response = await fetch(`${API_URL}/api/generate_text.php`, {
        method: "post",
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data?.success) {
        const text = data.data?.response || "No response from AI.";
        outputDiv.innerText = text;
      } else {
        outputDiv.innerText = "";
        showToast(data.message || "Something went wrong.");
      }
    } catch (error) {
      console.error("Error:", error);
      outputDiv.innerText = "";
      showToast("Error: " + error.message);
    }
  });
});
