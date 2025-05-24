let voices = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();

  if (voices.length === 0) {
    console.warn("No voices loaded. Trying again...");
    setTimeout(loadVoices, 100);
  } else {
    console.log(
      "Loaded voices:",
      voices.map((v) => `${v.name} (${v.lang})`)
    );
  }
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

function speakText(text) {
  try {
    const lang = localStorage.getItem("language") || languageList[0].value;

    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const matchedVoice = voices.find((voice) => voice.lang.startsWith(lang));

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      console.log(`Using voice: ${matchedVoice.name} (${matchedVoice.lang})`);
    } else {
      console.warn("No matching voice found for language:", lang);
    }

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  } catch (error) {
    console.log(error?.message);
  }
}

function stopSpeech() {
  try {
    speechSynthesis.cancel();
  } catch (error) {
    console.log(error?.message)
  }
}
