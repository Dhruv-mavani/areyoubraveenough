// Audio subsystem
export const AudioSys = {
    ctx: null,
    ambientOscillator: null,
    ambientGain: null,
    heartbeatOsc: null,
    heartbeatGain: null,
    heartbeatInterval: null,
    enabled: true,
    audioBuffers: {},

    init: function () {
        if (!this.enabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            // Load user-provided scary sounds
            this.loadSound('scream', 'scarysounds/ghost-screaming.mp3');
            this.loadSound('creature', 'scarysounds/creepy-little-creature.mp3');
            this.loadSound('iseeyou', 'scarysounds/iSeeYou.mp3');
            this.loadSound('ambience', 'scarysounds/backgroundambience.mp3');
            this.loadSound('gasp', 'scarysounds/surprise-gasp-female.mp3');

        } catch (e) {
            console.error("Web Audio API not supported", e);
            this.enabled = false;
        }
    },

    loadSound: async function (name, url) {
        if (!this.ctx) return;
        try {
            const resp = await fetch(url);
            const arrayBuffer = await resp.arrayBuffer();
            const decoded = await this.ctx.decodeAudioData(arrayBuffer);
            this.audioBuffers[name] = decoded;
        } catch (e) {
            console.error("Failed loading sound:", name, e);
        }
    },

    playSoundBuffer: function (name, volume = 1.0) {
        if (!this.ctx || !this.enabled || !this.audioBuffers[name]) return;
        this.resume();

        const source = this.ctx.createBufferSource();
        source.buffer = this.audioBuffers[name];

        const gain = this.ctx.createGain();
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
    },

    resume: function () {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    startAmbient: function () {
        if (!this.ctx || !this.enabled || !this.audioBuffers['ambience']) return;
        this.resume();

        this.ambientSource = this.ctx.createBufferSource();
        this.ambientSource.buffer = this.audioBuffers['ambience'];
        this.ambientSource.loop = true;

        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.value = 0.5; // low volume

        this.ambientSource.connect(this.ambientGain);
        this.ambientGain.connect(this.ctx.destination);
        this.ambientSource.start(0);
    },

    stopAmbient: function () {
        if (this.ambientSource) {
            try { this.ambientSource.stop(); } catch (e) { }
            this.ambientSource.disconnect();
            this.ambientSource = null;
        }
    },

    playHeartbeat: function (speedRatio = 1) {
        if (!this.ctx || !this.enabled) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(50, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.1);

        filter.type = 'lowpass';
        filter.frequency.value = 200;

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.4);

        // double thump
        setTimeout(() => {
            if (!this.ctx) return;
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            const filter2 = this.ctx.createBiquadFilter();

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(45, this.ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.1);
            filter2.type = 'lowpass';
            filter2.frequency.value = 200;

            gain2.gain.setValueAtTime(0, this.ctx.currentTime);
            gain2.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

            osc2.connect(filter2);
            filter2.connect(gain2);
            gain2.connect(this.ctx.destination);

            osc2.start(this.ctx.currentTime);
            osc2.stop(this.ctx.currentTime + 0.5);
        }, 300); // 300ms gap
    },

    startHeartbeatLoop: function (speedMs = 1500) {
        this.stopHeartbeatLoop();
        this.playHeartbeat();
        this.heartbeatInterval = setInterval(() => this.playHeartbeat(), speedMs);
    },

    stopHeartbeatLoop: function () {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    },

    playScareSound: function (type) {
        if (!this.ctx || !this.enabled) return;
        this.resume();

        if (type === 'slam') {
            this.createNoiseBurst(0.5, 0.8, -100); // sharp loud noise
        } else if (type === 'whisper') {
            if (this.audioBuffers['iseeyou']) {
                this.playSoundBuffer('iseeyou', 3.0);
            } else if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance("Don't turn around");
                utterance.volume = 0.5;
                utterance.rate = 0.8;
                utterance.pitch = 0.2;
                window.speechSynthesis.speak(utterance);
            } else {
                this.createNoiseBurst(1.0, 0.2, 500); // hiss
            }
        } else if (type === 'drop') {
            if (this.audioBuffers['creature']) {
                this.playSoundBuffer('creature', 3.0);
            } else {
                this.createNoiseBurst(0.7, 0.6, -150);
            }
        }
    },

    createNoiseBurst: function (duration, volume, detune) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = detune > 0 ? 3000 : 500;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    },

    playJumpscare: function () {
        if (!this.ctx || !this.enabled) return;
        this.resume();

        if (this.audioBuffers['scream']) {
            // Play the downloaded scream very loud
            this.playSoundBuffer('scream', 5.0);
        } else {
            // Fallback: Massive noise burst, volume severely clipped to be as loud as hardware allows
            this.createNoiseBurst(1.5, 5.0, 0);

            // Piercing scream frequency sweep
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(2000, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 1.5);

            gain.gain.setValueAtTime(5.0, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 1.5);
        }
    },

    playPickup: function () {
        if (!this.ctx || !this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
};
