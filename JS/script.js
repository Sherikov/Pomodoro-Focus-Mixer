import { soundsData } from "./db.js";

// --- 2. Setup Variables & DOM Elements ---
const audioPlayers = {};

const progressBar = document.querySelector(".progress-bar");

// Helper to update ring progress (CSS conic-gradient via --p variable)
function setProgress(percent) {
  progressBar.style.setProperty("--p", percent);
  progressBar.setAttribute("aria-valuenow", Math.round(percent));
}

// --- 3. Timer Logic ---
let timerInterval = null;
let totalTime = 25 * 60;
let timeLeft = totalTime;

let isRunning = false;

const display = document.querySelector(".time");
const modeLabel = document.querySelector(".mode");
const toggleBtn = document.querySelector(".btn-start");
const toggleBtnContent = document.querySelector(".btn-start-content");
const resetBtn = document.querySelector(".btn-restart");
const modeBtns = document.querySelectorAll(".btn-timer");
const variantBtns = document.querySelectorAll(
  ".timer-section > .variant-btn-container .variant-btn",
);
const closeModal = document.querySelector("#closeModal");
const modal = document.querySelector("#modal");
const increaseBtn = document.querySelector(".increase");
const decreaseBtn = document.querySelector(".decrease");
const modalInput = document.querySelector("#modal-input");
const acceptBtn = document.querySelector(".accept-btn");
const cancelBtn = document.querySelector(".cancel-btn");

// Mode configurations
const modes = {
  Focus: { time: 25 },
  "Short break": { time: 5 },
  "Long break": { time: 15 },
};

function updateDisplay() {
  const hasHours = totalTime >= 3600;
  if (hasHours) {
    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    display.innerText = `${h < 10 ? "0" : ""}${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    display.style.fontSize = "36px";
  } else {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    display.innerText = `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }

  // Calculate percentage for ring
  const percent = (timeLeft / totalTime) * 100;
  setProgress(percent);

  // Update browser tab title
  document.title = `${display.innerText} - Focus`;
}

function toggleTimer() {
  if (isRunning) {
    // Pause
    clearInterval(timerInterval);
    isRunning = false;
    toggleBtn.classList.remove("active");
    toggleBtnContent.innerText = "Start";
  } else {
    // Start
    isRunning = true;
    toggleBtnContent.innerText = "Pause";
    toggleBtn.classList.add("active");

    timerInterval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateDisplay();
      } else {
        // Time's up
        clearInterval(timerInterval);
        isRunning = false;
        toggleBtn.classList.remove("active");
        toggleBtnContent.innerText = "Start";
        alert("Focus Session Complete!");
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  toggleBtn.classList.remove("active");
  timeLeft = totalTime;
  toggleBtnContent.innerText = "Start";
  updateDisplay();
}

// Timer Event Listeners
toggleBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);

// Mode buttons (Focus / Short / Long)
modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Switch Active UI
    modeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const modeName = btn.textContent.trim();
    const mode = modes[modeName];
    if (mode) {
      totalTime = mode.time * 60;
      modeLabel.innerText = modeName.toUpperCase();
    }
    resetTimer();
  });
});

// Time variant buttons (15 min / 25 min / 45 min / Own time)
variantBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Switch Active UI
    variantBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const text = btn.textContent.trim();
    if (text === "Own time") {
      openModal();
      const input = modalInput.value;
      const mins = parseInt(input);
      if (!isNaN(mins) && mins > 0) {
        totalTime = mins * 60;
        resetTimer();
      }
    } else {
      const mins = parseInt(text);
      if (!isNaN(mins)) {
        totalTime = mins * 60;
        resetTimer();
      }
    }
  });
});

// Modal window
function close() {
  modal.classList.add("hidden");
}

function openModal() {
  modal.classList.remove("hidden");
}

closeModal.addEventListener("click", close);

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    close();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) {
    close();
  }
});

increaseBtn.addEventListener("click", () => {
  let val = parseInt(modalInput.value) || 25;
  modalInput.value = val + 5;
});

decreaseBtn.addEventListener("click", () => {
  let val = parseInt(modalInput.value) || 25;
  if (val > 5) {
    modalInput.value = val - 5;
  }
});

cancelBtn.addEventListener("click", close);

// --- 4. Mixer Logic & Audio Handling ---
const grid = document.getElementById("sounds-grid");
// Load state from LocalStorage
const savedState = JSON.parse(localStorage.getItem("focusMixerState")) || {};

function initMixer() {
  soundsData.forEach((sound) => {
    // Create Audio object with local path
    const audio = new Audio(sound.src);
    audio.loop = true;
    audioPlayers[sound.id] = audio;

    // Restore user settings
    const userSetting = savedState[sound.id] || { vol: 0.5, active: false };
    audio.volume = userSetting.vol;

    // Create HTML Card
    const card = document.createElement("div");
    card.className = `sound-card ${userSetting.active ? "active" : ""}`;

    // If icon is a file path, render as a masked div (colorable via CSS);
    // otherwise render as text (emoji)
    const isSvg = sound.icon.includes(".");
    const iconHtml = isSvg
      ? `<div class="card-icon" style="-webkit-mask: url('${sound.icon}') no-repeat center / contain; mask: url('${sound.icon}') no-repeat center / contain;"></div>`
      : `<span class="card-icon card-icon--emoji">${sound.icon}</span>`;

    card.innerHTML = `
            <div class="card-header">
                <div class="icon-container">
                    ${iconHtml}
                </div>
                <span class="card-name">${sound.name}</span>
            </div>
          
            <input type="range" class="volume-slider" min="0" max="1" step="0.01" value="${userSetting.vol}">
        `;

    // Handle Autoplay policy
    if (userSetting.active) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Autoplay prevented. User interaction required.");
          card.classList.remove("active");
        });
      }
    }

    // Toggle Sound on Card Click
    card.addEventListener("click", (e) => {
      // Ignore click if target is the slider
      if (e.target.type === "range") return;

      const isActive = card.classList.toggle("active");
      if (isActive) {
        audio.play();
      } else {
        audio.pause();
      }
      saveState();
    });

    // Handle Volume Slider
    const slider = card.querySelector("input");
    slider.addEventListener("input", (e) => {
      const vol = e.target.value;
      audio.volume = vol;
      saveState();
    });

    // Stop bubbling
    slider.addEventListener("click", (e) => e.stopPropagation());

    grid.appendChild(card);
  });
}

function saveState() {
  const state = {};
  soundsData.forEach((sound) => {
    const index = soundsData.indexOf(sound);
    const card = document.querySelectorAll(".sound-card")[index];
    const slider = card.querySelector("input");

    state[sound.id] = {
      active: card.classList.contains("active"),
      vol: slider.value,
    };
  });
  localStorage.setItem("focusMixerState", JSON.stringify(state));
}

// --- 5. Sound Preset Logic ---
const presetBtns = document.querySelectorAll(".sound-variants .variant-btn");
const resetSoundsBtn = document.querySelector(".variant-btn-reset");

const presets = {
  "Sunny Grove": ["forest", "river"],
  "Rainy Study": ["rain", "keyboard"],
  "Thunderstorm and Fireplace": ["rain", "fire"],
};

function activatePreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  // Stop all sounds first
  stopAllSounds();

  // Activate only sounds in the preset
  const cards = document.querySelectorAll(".sound-card");
  soundsData.forEach((sound, index) => {
    const card = cards[index];
    const audio = audioPlayers[sound.id];

    if (preset.includes(sound.id)) {
      card.classList.add("active");
      audio.play();
    }
  });
  saveState();
}

function stopAllSounds() {
  const cards = document.querySelectorAll(".sound-card");
  soundsData.forEach((sound, index) => {
    const card = cards[index];
    const audio = audioPlayers[sound.id];
    card.classList.remove("active");
    audio.pause();
    audio.currentTime = 0;
  });
  saveState();
}

presetBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    presetBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activatePreset(btn.textContent.trim());
  });
});

if (resetSoundsBtn) {
  resetSoundsBtn.addEventListener("click", () => {
    presetBtns.forEach((b) => b.classList.remove("active"));
    stopAllSounds();
  });
}

// --- Init Application ---
setProgress(100);
initMixer();
