import { AudioSys } from './audio.js';
import { Player } from './player.js';
import { HackingEffects } from './hackingEffects.js';
import { InputSys } from './input.js';

export const EventsSys = {
    visitedRooms: new Set(),
    activeEvent: null,

    reset: function () {
        this.visitedRooms.clear();
        this.activeEvent = null;
    },

    checkRoomTrigger: function (roomId) {
        if (!roomId) return;
        if (this.visitedRooms.has(roomId)) return;

        this.visitedRooms.add(roomId);

        // 30% chance for an event
        if (Math.random() < 0.3) {
            this.triggerRandomEvent(roomId);
        }
    },

    triggerRandomEvent: function (roomId) {
        if (this.activeEvent) return;
        this.activeEvent = true;

        const events = ['slam', 'whisper', 'bsod', 'download', 'message'];
        const selected = events[Math.floor(Math.random() * events.length)];

        switch (roomId) {
            case 'hallway': this.playFakeMessage(); break;
            case 'bathroom': this.playBSODEvent(); break;
            case 'bedroom': this.playWhisperEvent(); break;
            case 'storage': this.playDownloadEvent(); break;
            case 'basement': this.playSlamEvent(); break;
            default:
                if (selected === 'slam') this.playSlamEvent();
                else if (selected === 'whisper') this.playWhisperEvent();
                else if (selected === 'bsod') this.playBSODEvent();
                else if (selected === 'download') this.playDownloadEvent();
                else this.playFakeMessage();
        }
    },

    playSlamEvent: function () {
        AudioSys.playScareSound('slam');
        HackingEffects.triggerFakeNotification("Security", "Motion detected in Basement.");

        setTimeout(() => {
            this.activeEvent = null;
        }, 500);
    },

    playWhisperEvent: function () {
        if (window.lastHeardPhrase && window.speechSynthesis) {
            const msg = new SpeechSynthesisUtterance(window.lastHeardPhrase);
            msg.pitch = 0.1; // deepest pitch
            msg.rate = 0.5; // very slow
            msg.volume = 1.0;
            window.speechSynthesis.speak(msg);

            HackingEffects.triggerFakeNotification("Unknown Entity", `Did you say... "${window.lastHeardPhrase}"?`);
            window.lastHeardPhrase = null; // consume
        } else {
            HackingEffects.triggerFakeNotification("Microphone", "Device is being accessed by unknown source.");
        }

        setTimeout(() => AudioSys.playSoundBuffer('gasp'), 1000);

        setTimeout(() => {
            this.activeEvent = null;
        }, 3000);
    },

    playBSODEvent: function () {
        AudioSys.createNoiseBurst(0.1, 0.3, 100);
        InputSys.unlock(); // force unlock to really mess with them
        HackingEffects.triggerBSOD(2500);

        setTimeout(() => {
            this.activeEvent = null;
        }, 3000);
    },

    playDownloadEvent: function () {
        AudioSys.startHeartbeatLoop(600); // fast heartbeat
        HackingEffects.triggerFakeDownload("DONT_OPEN_THIS.txt");

        setTimeout(() => {
            AudioSys.startHeartbeatLoop(1500); // return to normal
            this.activeEvent = null;
        }, 3000);
    },

    playFakeMessage: function () {
        HackingEffects.triggerFakeNotification("System Warning", "Unusual CPU activity detected. Attempting to isolate.");
        AudioSys.playScareSound('drop');

        setTimeout(() => {
            this.activeEvent = null;
        }, 1500);
    }
};
