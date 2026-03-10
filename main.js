import { Game } from './game.js';
import { AudioSys } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const btnStart = document.getElementById('btnStart');
    const btnFullscreen = document.getElementById('btnFullscreen');
    const btnReplay = document.getElementById('btnReplay');
    const btnShare = document.getElementById('btnShare');

    const landingScreen = document.getElementById('landingScreen');
    const introScreen = document.getElementById('introScreen');
    const gameUI = document.getElementById('gameUI');
    const resultScreen = document.getElementById('resultScreen');
    const introText = document.getElementById('introText');

    async function toggleFullScreen() {
        try {
            const elem = document.documentElement;
            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
                if (elem.requestFullscreen) {
                    await elem.requestFullscreen();
                } else if (elem.webkitRequestFullscreen) {
                    await elem.webkitRequestFullscreen();
                } else if (elem.mozRequestFullScreen) {
                    await elem.mozRequestFullScreen();
                } else if (elem.msRequestFullscreen) {
                    await elem.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    await document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    await document.msExitFullscreen();
                }
            }
        } catch (err) {
            console.error("Fullscreen toggle failed:", err);
        }
    }

    btnFullscreen.addEventListener('click', toggleFullScreen);

    const permissionScreen = document.getElementById('permissionScreen');
    const btnGrantAccess = document.getElementById('btnGrantAccess');
    const permError = document.getElementById('permError');

    btnGrantAccess.addEventListener('click', async () => {
        try {
            // Request microphone and camera per user request to maximize psychological horror
            await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            permissionScreen.classList.remove('active');
            permissionScreen.classList.add('hidden');

            landingScreen.classList.remove('hidden');
            landingScreen.classList.add('active');
        } catch (err) {
            permError.style.display = 'block';
            console.warn("Permissions denied.", err);
        }
    });

    btnStart.addEventListener('click', () => {
        // Force Fullscreen if not already
        toggleFullScreen();

        // Initialize Audio Context on user gesture
        if (AudioSys.enabled && !AudioSys.ctx) {
            AudioSys.init();
        }

        // Transition to Intro sequence
        landingScreen.classList.remove('active');
        landingScreen.classList.add('hidden');
        introScreen.classList.remove('hidden');
        introScreen.classList.add('active');

        playIntroSequence();
    });

    async function playIntroSequence() {
        const typeText = async (text, delay = 50) => {
            introText.innerText = "";
            for (let i = 0; i < text.length; i++) {
                introText.innerText += text.charAt(i);
                await new Promise(r => setTimeout(r, delay));
            }
        };

        const pause = (ms) => new Promise(r => setTimeout(r, ms));

        introText.classList.add('blink-caret');

        await typeText("Initializing fear test...");
        await pause(1000);
        await typeText("Analyzing player courage...");
        await pause(1000);
        await typeText("Entering experiment...");
        await pause(800);

        // --- LOUD JUMPSCARE ---
        const jumpscareScreen = document.getElementById('jumpscareScreen');
        jumpscareScreen.classList.remove('hidden');
        jumpscareScreen.classList.add('active');
        AudioSys.playJumpscare();

        await pause(1500); // Wait for jumpscare to finish

        jumpscareScreen.classList.remove('active');
        jumpscareScreen.classList.add('hidden');

        // Start Game
        introScreen.classList.remove('active');
        introScreen.classList.add('hidden');

        gameUI.classList.remove('hidden');
        gameUI.classList.add('active');

        Game.start();
    }

    btnReplay.addEventListener('click', () => {
        window.location.reload();
    });

    btnShare.addEventListener('click', () => {
        const time = document.getElementById('statTime').innerText;
        const rating = document.getElementById('statRating').innerText;
        const text = `I survived ${time} with a "${rating}" rating in ARE YOU BRAVE ENOUGH. Can you do better?`;

        if (navigator.share) {
            navigator.share({
                title: 'ARE YOU BRAVE ENOUGH',
                text: text,
                url: window.location.href
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(text);
            btnShare.innerText = "COPIED TO CLIPBOARD!";
            setTimeout(() => btnShare.innerText = "SHARE RESULT", 2000);
        }
    });
});
