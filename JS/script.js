// --- 1. Audio Configuration ---

// Array of sound objects. 
// 'src' points to the local file in the 'sounds' folder.
const soundsData = [
    { 
        id: 'rain', 
        name: 'Rainy Day', 
        icon: '🌧️', 
        src: 'sounds/rain.mp3' 
    },
    { 
        id: 'beach', 
        name: 'Ocean Waves', 
        icon: '🌊', 
        src: 'sounds/beach.mp3' 
    },
    { 
        id: 'forest', 
        name: 'Forest Life', 
        icon: '🌲', 
        src: 'sounds/forest.mp3' 
    },
    { 
        id: 'river', 
        name: 'River Flow', 
        icon: '💧', 
        src: 'sounds/river.mp3' 
    },
    { 
        id: 'fire', 
        name: 'Campfire', 
        icon: '🔥', 
        src: 'sounds/fire.mp3' 
    }, 
    { 
        id: 'keyboard', 
        name: 'Typing', 
        icon: '⌨️', 
        src: 'sounds/keyboard.mp3' 
    }
];

// --- 2. Setup Variables & DOM Elements ---
const audioPlayers = {};
const circle = document.getElementById('progress-ring');
// SVG calculation
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

// Configure SVG stroke
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

// Helper to update ring progress
function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// --- 3. Timer Logic ---
let timerInterval = null;
let totalTime = 25 * 60;
let timeLeft = totalTime;
let isRunning = false;

const display = document.getElementById('time-display');
const toggleBtn = document.getElementById('toggle-btn');
const resetBtn = document.getElementById('reset-btn');
const modeBtns = document.querySelectorAll('.mode-btn');

function updateDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    display.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    
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
        toggleBtn.innerText = "▶";
        toggleBtn.style.background = "#ff6b6b";
    } else {
        // Start
        isRunning = true;
        toggleBtn.innerText = "⏸";
        toggleBtn.style.background = "#feca57"; // Yellow indicates pause state
        
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay();
            } else {
                // Time's up
                clearInterval(timerInterval);
                isRunning = false;
                // Simple beep sound or alert
                toggleBtn.innerText = "▶";
                alert("Focus Session Complete!");
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    timeLeft = totalTime;
    toggleBtn.innerText = "▶";
    toggleBtn.style.background = "#ff6b6b";
    updateDisplay();
}

// Timer Event Listeners
toggleBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Switch Active UI
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update Time logic
        totalTime = parseInt(btn.dataset.time) * 60;
        resetTimer();
    });
});

// --- 4. Mixer Logic & Audio Handling ---
const grid = document.getElementById('sounds-grid');
// Load state from LocalStorage
const savedState = JSON.parse(localStorage.getItem('focusMixerState')) || {};

function initMixer() {
    soundsData.forEach(sound => {
        // Create Audio object with local path
        const audio = new Audio(sound.src);
        audio.loop = true;
        audioPlayers[sound.id] = audio;

        // Restore user settings
        const userSetting = savedState[sound.id] || { vol: 0.5, active: false };
        audio.volume = userSetting.vol;

        // Create HTML Card
        const card = document.createElement('div');
        card.className = `sound-card ${userSetting.active ? 'active' : ''}`;
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-icon">${sound.icon}</span>
                <span class="card-name">${sound.name}</span>
            </div>
            <input type="range" class="volume-slider" min="0" max="1" step="0.01" value="${userSetting.vol}">
        `;

        // Handle Autoplay policy
        if (userSetting.active) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented. User interaction required.");
                    card.classList.remove('active');
                });
            }
        }

        // Toggle Sound on Card Click
        card.addEventListener('click', (e) => {
            // Ignore click if target is the slider
            if (e.target.type === 'range') return;

            const isActive = card.classList.toggle('active');
            if (isActive) {
                audio.play();
            } else {
                audio.pause();
            }
            saveState();
        });

        // Handle Volume Slider
        const slider = card.querySelector('input');
        slider.addEventListener('input', (e) => {
            const vol = e.target.value;
            audio.volume = vol;
            saveState();
        });
        
        // Stop bubbling
        slider.addEventListener('click', (e) => e.stopPropagation());

        grid.appendChild(card);
    });
}

function saveState() {
    const state = {};
    soundsData.forEach(sound => {
        const index = soundsData.indexOf(sound);
        const card = document.querySelectorAll('.sound-card')[index];
        const slider = card.querySelector('input');
        
        state[sound.id] = {
            active: card.classList.contains('active'),
            vol: slider.value
        };
    });
    localStorage.setItem('focusMixerState', JSON.stringify(state));
}

// --- Init Application ---
setProgress(100);
initMixer();