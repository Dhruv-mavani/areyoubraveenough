import { Engine3D } from './engine3d.js';
import { World3D } from './world3d.js';
import { InputSys } from './input.js';
import { Player } from './player.js';
import { AudioSys } from './audio.js';
import { EventsSys } from './events.js';
import { HackingEffects } from './hackingEffects.js';
import * as THREE from 'three';

export const Game = {
    state: 'menu',
    lastTime: 0,
    startTime: 0,
    timeSurvived: 0,
    keyEntity: null,

    start: function () {
        try {
            Engine3D.init();
            World3D.init();
            InputSys.init();
            HackingEffects.init();

            // Spawn player in bedroom (center instead of wall corner)
            Player.init(300, 510);

            EventsSys.reset();

            // Spawn Key randomly (In 3D we'll represent it with a rotating box)
            const options = [
                { x: 880, z: 500 }, // bathroom
                { x: 590, z: 300 }, // storage
                { x: 310, z: 780 }  // basement
            ];
            const loc = options[Math.floor(Math.random() * options.length)];

            const keyGeo = new THREE.BoxGeometry(10, 10, 10);
            const keyMat = new THREE.MeshLambertMaterial({ color: 0xffff00 });
            this.keyMesh = new THREE.Mesh(keyGeo, keyMat);
            this.keyMesh.position.set(loc.x, 30, loc.z);
            Engine3D.scene.add(this.keyMesh);
            this.keyEntity = loc;

            this.startTime = Date.now();
            this.state = 'play';
            this.lastTime = performance.now();

            // Set up audio
            AudioSys.init();
            AudioSys.startAmbient();
            AudioSys.startHeartbeatLoop(1500);

            // Set up Microphone listener for "Microphone Monster"
            this.setupMicrophoneListener();

            // Setup initial interaction listener
            Engine3D.renderer.setAnimationLoop(() => this.loop());

            // Auto lock pointer when clicking in game
            document.addEventListener('click', () => {
                if (this.state === 'play') {
                    InputSys.lock();
                }
            });
            InputSys.lock(); // Try immediate lock

        } catch (e) {
            console.error(e.stack || e);
        }
    },

    setupMicrophoneListener: async function () {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = AudioSys.ctx || new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            this.micAnalyser = analyser;
            this.micDataArray = new Uint8Array(analyser.frequencyBinCount);
            console.log("Mic initialized for ragebait detection...");

            // Speech Recognition (Ragebait)
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = true;
                this.recognition.interimResults = false;

                this.recognition.onresult = (event) => {
                    const transcript = event.results[event.results.length - 1][0].transcript.trim();
                    if (transcript.length > 2) {
                        window.lastHeardPhrase = transcript; // Store globally for events.js to use

                        // Small chance to immediately acknowledge their speech
                        if (Math.random() < 0.25 && this.state === 'play') {
                            HackingEffects.triggerFakeNotification("Unknown Listener", `I heard you say: "${transcript}"`);
                        }
                    }
                };

                this.recognition.onend = () => {
                    // Try to restart if it stops
                    if (this.state === 'play') {
                        try { this.recognition.start(); } catch (e) { }
                    }
                };

                try { this.recognition.start(); } catch (e) { }
            }

        } catch (err) {
            console.warn("No mic access for Ragebait features.");
        }
    },

    loop: function () {
        try {
            if (this.state !== 'play') return;

            const dt = Engine3D.clock.getDelta();

            this.update(dt);
            Engine3D.render();

            if (this.keyMesh && this.keyEntity) {
                this.keyMesh.rotation.x += dt;
                this.keyMesh.rotation.y += dt;
            }

        } catch (e) {
            console.error(e.stack || e);
            Engine3D.renderer.setAnimationLoop(null); // stop loop on error to prevent cascading logs
        }
    },

    update: function (dt) {
        const pPos = Player.update(dt);
        if (!pPos) return;

        // (Microphone Death Feature removed per user request)


        // Room checking logic
        let currentRoom = null;
        World3D.rooms.forEach(r => {
            if (pPos.x >= r.x && pPos.x <= r.x + r.w && pPos.z >= r.z && pPos.z <= r.z + r.d) {
                currentRoom = r;
            }
        });

        if (currentRoom) {
            EventsSys.checkRoomTrigger(currentRoom.id);
        }

        // Check Interactions
        const prompt = document.getElementById('promptOverlay');
        let canInteract = false;

        // Key Interaction
        if (this.keyEntity) {
            const dist = Math.hypot(pPos.x - this.keyEntity.x, pPos.z - this.keyEntity.z);
            if (dist < 40) {
                prompt.innerText = "Press [E] to Pick Up Object";
                prompt.classList.remove('hidden');
                canInteract = true;

                if (InputSys.interactPressed) {
                    Player.hasKey = true;
                    Engine3D.scene.remove(this.keyMesh);
                    this.keyEntity = null; // consume
                    AudioSys.playPickup();
                    prompt.classList.add('hidden');
                    InputSys.interactPressed = false;
                    HackingEffects.triggerFakeNotification("Unknown Error", "Object picked up. Why did you do that?");
                }
            }
        }

        // Exit Door Interaction
        const dPos = World3D.exitDoorMesh.position;
        if (pPos.x > dPos.x - 40 && pPos.x < dPos.x + 40 && pPos.z > dPos.z - 40 && pPos.z < dPos.z + 40) {
            prompt.innerText = Player.hasKey ? "Press [E] to Escape" : "Locked. Find the key.";
            prompt.classList.remove('hidden');
            canInteract = true;

            if (InputSys.interactPressed && Player.hasKey) {
                this.endGame(true);
            }
        }

        if (!canInteract && !prompt.classList.contains('hidden')) {
            prompt.classList.add('hidden');
        }

        this.timeSurvived = Math.floor((Date.now() - this.startTime) / 1000);
    },



    endGame: function (escaped, deathMessage = "The darkness consumed you.") {
        this.state = 'end';
        InputSys.unlock();
        AudioSys.stopAmbient();
        AudioSys.stopHeartbeatLoop();

        const resultScreen = document.getElementById('resultScreen');
        const gameUI = document.getElementById('gameUI');
        const endingMsg = document.getElementById('endingMessage');
        const statTime = document.getElementById('statTime');
        const statRooms = document.getElementById('statRooms');
        const statRating = document.getElementById('statRating');

        gameUI.classList.add('hidden');
        resultScreen.classList.remove('hidden');
        resultScreen.classList.add('active');

        // Populate stats
        const minutes = Math.floor(this.timeSurvived / 60);
        const seconds = this.timeSurvived % 60;
        statTime.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        const roomsExplored = EventsSys.visitedRooms.size;
        statRooms.innerText = `${roomsExplored}/6`;

        // Calculate Fear Rating based on time vs explored
        if (this.timeSurvived < 60) statRating.innerText = "Fearless";
        else if (this.timeSurvived < 120) statRating.innerText = "Brave";
        else if (roomsExplored < 3) statRating.innerText = "Nervous";
        else statRating.innerText = "Paranoid";

        // Ending narrative
        if (escaped) {
            AudioSys.createNoiseBurst(3.0, 0.5, -200); // heavy rumble
            endingMsg.innerText = "You escaped... But something followed you.";
            document.title = "YOU ESCAPED";
        } else {
            endingMsg.innerText = deathMessage;
        }

        endingMsg.style.opacity = 1;

        // Save high score locally
        const bestTime = localStorage.getItem('AYBE_bestTime') || Infinity;
        if (this.timeSurvived < bestTime) localStorage.setItem('AYBE_bestTime', this.timeSurvived);
    }
};
