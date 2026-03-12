console.log("MAIN.JS: Top-level execution started.");
window.onerror = function (msg, url, line) {
    console.error("GLOBAL ERROR caught in main.js:", msg, "at", url, ":", line);
};

import { Game } from './game.js';
import { AudioSys } from './audio.js';
import { InputSys } from './input.js';

console.log("MAIN.JS: Imports completed.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("MAIN.JS: DOMContentLoaded fired.");
    const btnStart = document.getElementById('btnStart');
    const btnContinue = document.getElementById('btnContinue');
    const btnFullscreen = document.getElementById('btnFullscreen');
    const btnReplay = document.getElementById('btnReplay');
    const btnShare = document.getElementById('btnShare');

    const menuScreen = document.getElementById('menuScreen');
    const mainMenu = document.getElementById('mainMenu');
    const settingsMenu = document.getElementById('settingsMenu');

    const introScreen = document.getElementById('introScreen');
    const gameUI = document.getElementById('gameUI');
    const uiLayer = document.getElementById('uiLayer');
    const resultScreen = document.getElementById('resultScreen');
    const introText = document.getElementById('introText');

    const btnShowSettings = document.getElementById('btnShowSettings');
    const btnBack = document.querySelectorAll('.btnBack');

    const volumeSlider = document.getElementById('volumeSlider');
    const brightnessSlider = document.getElementById('brightnessSlider');

    async function requestFullScreen() {
        try {
            const elem = document.documentElement;
            const request = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
            if (request) {
                await request.call(elem);
            }
        } catch (err) {
            console.error("FS Error:", err);
            // Fallback for Safari/iOS which often requires specific interaction
        }
    }

    async function toggleFullScreen() {
        const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        if (isFull) {
            if (document.exitFullscreen) await document.exitFullscreen();
            else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        } else {
            await requestFullScreen();
        }
    }

    btnFullscreen.addEventListener('click', toggleFullScreen);

    const permissionScreen = document.getElementById('permissionScreen');
    const btnGrantAccess = document.getElementById('btnGrantAccess');
    const permError = document.getElementById('permError');

    btnGrantAccess.addEventListener('click', async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            // Initialize audio immediately on gesture
            await AudioSys.init();
        } catch (err) {
            console.warn("Media access denied, but proceeding for development/test purposes.", err);
        }
        permissionScreen.classList.add('hidden');
        menuScreen.classList.remove('hidden');
        menuScreen.classList.add('active');
        uiLayer.classList.add('active');

        // Check for saved progress
        const savedLevel = Game.loadProgress();
        if (savedLevel > 1) {
            btnContinue.classList.remove('hidden');
            btnContinue.innerText = `CONTINUE (LEVEL ${savedLevel})`;
        }
    });

    // Menu Navigation
    btnShowSettings.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        mainMenu.classList.remove('active');
        settingsMenu.classList.remove('hidden');
        settingsMenu.classList.add('active');
    });

    btnBack.forEach(btn => {
        btn.addEventListener('click', () => {
            settingsMenu.classList.add('hidden');
            settingsMenu.classList.remove('active');
            mainMenu.classList.remove('hidden');
            mainMenu.classList.add('active');
        });
    });

    // Settings Logic
    volumeSlider.addEventListener('input', (e) => {
        if (AudioSys.ambientGain) AudioSys.ambientGain.gain.value = e.target.value * 0.5;
    });

    brightnessSlider.addEventListener('input', (e) => {
        import('./engine3d.js').then(m => {
            if (m.Engine3D.renderer) m.Engine3D.renderer.toneMappingExposure = e.target.value;
        });
    });

    btnStart.addEventListener('click', async () => {
        console.log("Start Test button clicked!");
        try {
            await requestFullScreen();
        } catch (e) {
            console.warn("Fullscreen request failed", e);
        }

        // AudioSys.init() is now called within Game.start() more robustly.
        // We ensure a resume here just in case.
        if (!AudioSys.ctx) await AudioSys.init();
        if (AudioSys.ctx) AudioSys.resume();

        console.log("Transitioning from menu to intro...");
        menuScreen.classList.remove('active');
        menuScreen.classList.add('hidden');
        uiLayer.classList.remove('active');
        introScreen.classList.remove('hidden');
        introScreen.classList.add('active');

        playIntroSequence();
    });

    btnContinue.addEventListener('click', async () => {
        console.log("Continue button clicked!");
        try { await requestFullScreen(); } catch (e) { }

        const savedLevel = Game.loadProgress();

        console.log("Transitioning from menu to intro (Continue)...");
        menuScreen.classList.remove('active');
        menuScreen.classList.add('hidden');
        uiLayer.classList.remove('active');
        introScreen.classList.remove('hidden');
        introScreen.classList.add('active');

        // PRELOAD GAME AT SAVED LEVEL
        Game.start(savedLevel);

        // playIntroSequence but without the Game.start(1) part inside
        playIntroSequence(true);
    });

    // Global click debugger
    document.addEventListener('click', (e) => {
        console.log("Global Click at:", e.clientX, e.clientY, "Target:", e.target);
    }, true);

    async function playIntroSequence(isContinue = false) {
        try {
            // PRELOAD GAME WHILE TYPING
            // If it takes more than 10s, we proceed anyway
            const gameStartPromise = isContinue ? Promise.resolve() : Game.start(1);

            const gameWaitTimeout = new Promise(r => setTimeout(r, 10000));
            const safeGameStart = Promise.race([gameStartPromise, gameWaitTimeout]);

            if (InputSys.isMobile) {
                const mc = document.getElementById('mobileControls');
                if (mc) mc.classList.remove('hidden');
            }

            const typeText = async (text, delay = 25) => {
                const line = document.createElement('div');
                line.style.marginBottom = "5px";
                introText.appendChild(line);
                for (let i = 0; i < text.length; i++) {
                    line.textContent += text.charAt(i);
                    await new Promise(r => setTimeout(r, delay));
                }
            };
            const pause = (ms) => new Promise(r => setTimeout(r, ms));

            introText.innerHTML = "";
            introText.classList.add('blink-caret');

            await typeText("System initialization... [STABLE]");
            await pause(300);
            await typeText("Analyzing sensory input... [OK]");
            await pause(300);
            await typeText("EXPERIMENT PROTOCOL 7: STARTING");
            await pause(200);

            // SUDDEN JUMPSCARE (Screamer)
            const js = document.getElementById('jumpscareScreen');
            if (js) {
                js.classList.remove('hidden');
                js.classList.add('active');
            }
            AudioSys.playJumpscare();

            await pause(1000);

            if (js) {
                js.classList.remove('active');
                js.classList.add('hidden');
                js.style.display = 'none'; // Nuclear option
            }

            // WAIT FOR GAME LOAD (Safe)
            await safeGameStart;

            // ENSURE EVERYTHING IS HIDDEN
            introScreen.classList.remove('active');
            introScreen.classList.add('hidden');
            introScreen.style.display = 'none';

            gameUI.classList.remove('hidden');
            gameUI.classList.add('active');
            gameUI.style.display = 'block';

            // Start 3D rendering loop if not already
            import('./engine3d.js').then(m => {
                if (m.Engine3D.renderer && m.Engine3D.scene && m.Engine3D.camera) {
                    m.Engine3D.render();
                }
            });

            // Wire up mobile buttons
            const btnInteract = document.getElementById('btnInteract');
            const btnLookBehind = document.getElementById('btnLookBehind');

            if (btnInteract) {
                btnInteract.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    InputSys.keys['KeyE'] = true;
                });
                btnInteract.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    InputSys.keys['KeyE'] = false;
                });
            }

            if (btnLookBehind) {
                btnLookBehind.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    InputSys.keys['KeyQ'] = true;
                });
                btnLookBehind.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    InputSys.keys['KeyQ'] = false;
                });
            }
        } catch (e) {
            console.error("Intro Sequence Error:", e);
            // Emergency Recovery: Show game anyway
            introScreen.style.display = 'none';
            document.getElementById('jumpscareScreen').style.display = 'none';
            gameUI.classList.remove('hidden');
            gameUI.classList.add('active');
        }
    }

    btnReplay.addEventListener('click', () => { window.location.reload(); });

    btnShare.addEventListener('click', () => {
        const time = document.getElementById('statTime').innerText;
        const levelText = document.getElementById('statRooms').innerText;
        const rating = document.getElementById('statRating').innerText;
        const text = `☠️ ARE YOU BRAVE ENOUGH? ☠️\n\nI survived the experiment for Time:${time} and reached ${levelText}!\nFinal Status: ${rating}\n\nCan you face the darkness? Challenge your fears here: ${window.location.href}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    });
});
