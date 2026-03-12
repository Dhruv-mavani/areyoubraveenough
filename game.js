import { Engine3D } from './engine3d.js';
import { World3D } from './world3d.js';
import { InputSys } from './input.js';
import { Player } from './player.js';
import { AudioSys } from './audio.js';
import { EventsSys } from './events.js';
import { HackingEffects } from './hackingEffects.js';
import { Ghoul } from './ghoul.js';
import { Fragments } from './fragments.js';
import * as THREE from 'three';

export const Game = {
    state: 'menu',
    level: 1,
    survivalTimer: 0,
    survivalGoal: 60, // seconds
    hasLifeline: false,
    lastTime: 0,
    startTime: 0,
    timeSurvivedTotal: 0,
    micVolume: 0,

    saveProgress: function () {
        localStorage.setItem('areyoubrave_level', this.level);
    },

    loadProgress: function () {
        const saved = localStorage.getItem('areyoubrave_level');
        return saved ? parseInt(saved) : 1;
    },

    start: async function (startingLevel = 1) {
        try {
            console.log("GAME: Step 1 - Engine3D.init()...");
            Engine3D.init();

            // Phase 2.0 Textures - with timeout and error protection
            console.log("GAME: Step 2 - Preloading textures...");
            const texPromise = Promise.all([
                Engine3D.loadTexture('floor', './assets/tex_wood_floor_1773142823871.png'),
                Engine3D.loadTexture('wall', './assets/tex_dirty_wall_1773142848053.png'),
                Engine3D.loadTexture('concrete', './assets/tex_concrete_1773142870684.png')
            ]);

            await Promise.race([
                texPromise,
                new Promise(resolve => setTimeout(() => {
                    console.warn("GAME: Texture preloading timed out, proceeding anyway.");
                    resolve();
                }, 5000))
            ]);

            console.log("GAME: Step 3 - World3D.init()...");
            World3D.init(startingLevel);

            console.log("GAME: Step 4 - InputSys.init()...");
            InputSys.init();

            console.log("GAME: Step 5 - HackingEffects.init()...");
            HackingEffects.init();

            this.initLevel(startingLevel);

            console.log("GAME: Step 6 - AudioSys.init()...");
            await Promise.race([
                AudioSys.init(),
                new Promise(r => setTimeout(r, 5000))
            ]);
            AudioSys.startAmbient();
            AudioSys.startHeartbeatLoop(1500);

            console.log("GAME: Step 7 - setupMicrophoneListener()...");
            this.setupMicrophoneListener();

            this.startTime = Date.now();
            this.state = 'play';
            this.lastTime = performance.now();

            console.log("GAME: Step 8 - Starting animation loop...");
            Engine3D.renderer.setAnimationLoop(() => this.loop());

            document.addEventListener('click', () => {
                if (this.state === 'play') {
                    try {
                        InputSys.lock();
                    } catch (e) {
                        console.warn("Pointer lock failed on click:", e);
                    }
                }
            });

            try {
                InputSys.lock();
            } catch (e) {
                console.warn("Pointer lock failed on start:", e);
            }
            console.log("GAME: Initialization complete.");

        } catch (e) {
            console.error("GAME START CRITICAL ERROR:", e.stack || e);
            alert("Game failed to start. See console for details.");
        }
    },

    initLevel: function (num) {
        const levelNum = num || 1;
        this.level = levelNum;
        this.saveProgress();
        this.survivalTimer = 0;
        this.survivalGoal = 60 + (levelNum - 1) * 60; // 1 min, 2 min, 3 min...
        this.hasLifeline = false;

        Fragments.reset();

        // Dynamic World Scaling
        World3D.init(levelNum);
        Ghoul.init();

        Player.init(100, 100);

        // Ghoul gets more aggressive: base speed starts at ~93% of player (800)
        Ghoul.baseSpeed = 750 + (levelNum * 20);

        // Spawn Ghoul much further away to prevent instant death given high speed
        if (levelNum === 1) {
            Ghoul.pos.set(1200, 0, 0); // Further down the hallway
        } else {
            // Distance increased to 1500 to ensure visibility/chase in Level 2 fog
            Ghoul.pos.set(1500, 0, 0);
        }

        // Reset Ghoul state and speed
        Ghoul.state = 'wander';
        Ghoul.speed = Ghoul.baseSpeed;

        // Reset mesh position immediately
        if (Ghoul.mesh) Ghoul.mesh.position.set(Ghoul.pos.x, 55, Ghoul.pos.z);

        // Reset fragment state (don't carry over)
        this.hasLifeline = false;
        Fragments.reset();

        // Spawn exactly one fragment per level
        Fragments.spawnRandom(1);

        // Add a larger "peace" window at start for fast ghouls
        this.peaceWindow = 5.0;

        HackingEffects.triggerFakeNotification(
            `LEVEL ${levelNum}`,
            `SURVIVE FOR ${this.survivalGoal / 60} MINUTE(S).`
        );
    },


    setupMicrophoneListener: async function () {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = AudioSys.ctx || new (window.AudioContext || window.webkitAudioContext)();
            if (!AudioSys.ctx) AudioSys.ctx = audioCtx; // Share the context
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            this.micAnalyser = analyser;
            this.micDataArray = new Uint8Array(analyser.frequencyBinCount);
            console.log("Mic initialized for tracking...");

        } catch (err) {
            console.warn("No mic access for Ghost tracking.");
        }
    },

    loop: function () {
        try {
            if (this.state !== 'play') return;
            const dt = Engine3D.clock.getDelta();

            if (this.micAnalyser) {
                this.micAnalyser.getByteFrequencyData(this.micDataArray);
                let sum = 0;
                for (let i = 0; i < this.micDataArray.length; i++) sum += this.micDataArray[i];
                this.micVolume = sum / this.micDataArray.length;
            }

            this.update(dt);
            Engine3D.render();
        } catch (e) {
            console.error(e.stack || e);
            Engine3D.renderer.setAnimationLoop(null);
        }
    },

    update: function (dt) {
        const pPos = Player.update(dt);
        if (!pPos) return;

        // Survival Timer
        this.survivalTimer += dt;
        let killed = false;
        if (this.peaceWindow <= 0) {
            // Check if player is moving/running based on velocity
            const isRunning = (InputSys.velocity.x * InputSys.velocity.x + InputSys.velocity.z * InputSys.velocity.z) > 10000;
            killed = Ghoul.update(dt, pPos, this.micVolume, isRunning);
        } else {
            // Static position update without AI processing/movement
            if (Ghoul.mesh) Ghoul.mesh.position.set(Ghoul.pos.x, 55, Ghoul.pos.z);
            this.peaceWindow -= dt;
        }
        if (killed) {
            if (this.hasLifeline) {
                this.consumeLifeline(pPos);
            } else {
                this.endGame(false, "The Stalker stole your face.");
                return;
            }
        }

        const collected = Fragments.update(dt, pPos);
        if (collected) {
            AudioSys.playPickup();
            if (!this.hasLifeline) {
                this.hasLifeline = true;
                HackingEffects.triggerFakeNotification("SOUL FRAGMENT", "LIFELINE ACQUIRED. You have one more chance.");
            }
        }

        this.timeSurvivedTotal = Math.floor((Date.now() - this.startTime) / 1000);

        // Random Scares periodically
        if (Math.random() < 0.002) { // Significantly reduced frequency
            AudioSys.playScareSound('random');
        }

        // Phantom Footsteps (sounds like someone is behind you)
        if (Math.random() < 0.0005) { // Significantly reduced frequency
            AudioSys.playPhantomFootsteps();
        }

        // Stats Bar Update
        const fragmentHUD = document.getElementById('fragmentCount');
        const timerHUD = document.getElementById('levelTimer');
        const levelHUD = document.getElementById('gameLevel');
        const statsBar = document.getElementById('statsBar');

        if (fragmentHUD) fragmentHUD.innerText = Fragments.collectedCount;
        if (levelHUD) levelHUD.innerText = this.level;
        if (timerHUD) {
            const min = Math.floor(this.survivalTimer / 60);
            const sec = Math.floor(this.survivalTimer % 60);
            timerHUD.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        }
        if (statsBar) statsBar.classList.remove('hidden');

        // Boundary Protection: If player escapes walls somehow, teleport back to hub
        const bounds = World3D.getMapBounds ? World3D.getMapBounds() : null;
        if (bounds) {
            if (pPos.x < bounds.minX - 50 || pPos.x > bounds.maxX + 50 ||
                pPos.z < bounds.minZ - 50 || pPos.z > bounds.maxZ + 50) {
                console.warn("GAME: Player escaped boundaries! Resetting to hub...");
                Player.init(100, 100);
            }
        }
    },

    consumeLifeline: function (pPos) {
        this.hasLifeline = false;
        AudioSys.playJumpscare(); // Brief scare sound
        HackingEffects.triggerFakeNotification("CLOSE CALL", "LIFELINE CONSUMED. The darkness retreats... for now.");

        // Teleport Ghoul away for a breather
        Ghoul.pos.set(pPos.x + 500, 0, pPos.z + 500);
    },

    endGame: async function (escaped, deathMessage = "The darkness consumed you.") {
        InputSys.suppressInstructions = true;
        InputSys.unlock();

        // Explicitly hide instructions just in case
        const instructions = document.getElementById('engine-instructions');
        if (instructions) instructions.classList.add('hidden');

        this.state = 'end';
        AudioSys.stopAmbient();
        AudioSys.stopHeartbeatLoop();

        if (!escaped) {
            // SUDDEN DEATH JUMPSCARE
            const js = document.getElementById('jumpscareScreen');
            js.classList.remove('hidden');
            js.classList.add('active');
            AudioSys.playJumpscare();
            await new Promise(r => setTimeout(r, 1200));
            js.classList.remove('active');
            js.classList.add('hidden');
        }

        const resultScreen = document.getElementById('resultScreen');
        const gameUI = document.getElementById('gameUI');
        const statsBar = document.getElementById('statsBar');
        const uiLayer = document.getElementById('uiLayer');

        console.log("GAME: Conclusion Sequence Started.");

        // Disable game UI
        gameUI.classList.add('hidden');
        statsBar.classList.add('hidden');

        // FORCE UI LAYER ACTIVE FOR CURSOR
        if (uiLayer) {
            uiLayer.classList.remove('hidden');
            uiLayer.classList.add('active');
            uiLayer.style.pointerEvents = "auto";
        }

        // Show result screen
        resultScreen.classList.remove('hidden');
        resultScreen.classList.add('active');
        resultScreen.style.zIndex = "1000";
        resultScreen.style.pointerEvents = "auto";

        InputSys.unlock();
        // Fallback unlock to be sure
        setTimeout(() => InputSys.unlock(), 500);

        gameUI.classList.add('hidden');
        resultScreen.classList.remove('hidden');
        resultScreen.classList.add('active');

        const statTime = document.getElementById('statTime');
        const statRooms = document.getElementById('statRooms');
        const statRating = document.getElementById('statRating');
        const endingMessage = document.getElementById('endingMessage');

        const minutes = Math.floor(this.timeSurvivedTotal / 60);
        const seconds = this.timeSurvivedTotal % 60;
        if (statTime) statTime.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (statRooms) statRooms.innerText = `LEVEL ${this.level}`;
        if (statRating) statRating.innerText = escaped ? "SURVIVOR" : "LOST";

        if (endingMessage) {
            if (escaped) {
                endingMessage.innerText = "You escaped... But are you still you?";
            } else {
                endingMessage.innerText = deathMessage;
            }
            endingMessage.style.opacity = 1;
        }
    }
};
