var voices = [];
var utterance = new SpeechSynthesisUtterance();
function loadVoices() {
  voices = speechSynthesis.getVoices();

  if (voices.length === 0) {
    console.warn("No voices loaded. Trying again...");
    setTimeout(loadVoices, 100);
  } else {
    // console.log(
    //   "Loaded voices:",
    //   voices.map((v) => `${v.name} (${v.lang})`)
    // );
  }
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

// Mobile browsers may report voice languages as "es_ES" or "ES-es" instead of "es-ES"
function normalizeLangCode(lang) {
  return String(lang || "").trim().replace(/_/g, "-").toLowerCase();
}

// Exact locale match first (es-ES), then any voice of the same base language (es-MX, es-US...)
function findVoiceForLang(lang) {
  const availableVoices = voices.length ? voices : speechSynthesis.getVoices();
  const wanted = normalizeLangCode(lang);
  const baseLang = wanted.split("-")[0];

  return (
    availableVoices.find((voice) => normalizeLangCode(voice.lang) === wanted) ||
    availableVoices.find(
      (voice) => normalizeLangCode(voice.lang).split("-")[0] === baseLang,
    )
  );
}

function speakText(text, language) {
  try {
    console.log(language);

    const lang = String(language || "en-US").trim().replace(/_/g, "-");


    if (!text?.toString()?.trim()) return;

    utterance = new SpeechSynthesisUtterance(text);
    // Always set lang: without it mobile browsers fall back to the page language (English)
    // when the voice list is empty or the chosen voice is ignored
    utterance.lang = lang;
    const matchedVoice = findVoiceForLang(lang);

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
