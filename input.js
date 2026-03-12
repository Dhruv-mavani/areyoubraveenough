import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Engine3D } from './engine3d.js';
import * as THREE from 'three';

export const InputSys = {
    keys: {},
    controls: null,
    moveRight: false,
    interactPressed: false,
    jumpPressed: false,
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    suppressInstructions: false,

    init: function () {
        this.controls = new PointerLockControls(Engine3D.camera, document.body);

        const instructions = document.getElementById('engine-instructions');

        this.controls.addEventListener('lock', () => {
            this.suppressInstructions = false;
            if (instructions) {
                instructions.classList.add('hidden');
            }
        });

        this.controls.addEventListener('unlock', () => {
            if (this.suppressInstructions) return;
            if (instructions) {
                instructions.classList.remove('hidden');
            }
        });

        // Click on instructions to relock
        if (instructions) {
            instructions.addEventListener('click', () => {
                if (!this.suppressInstructions) this.lock();
            });
        }

        Engine3D.scene.add(Engine3D.camera);

        const onKeyDown = (event) => {
            console.log("KeyDown:", event.code);
            this.keys[event.code] = true;
        };

        const onKeyUp = (event) => {
            this.keys[event.code] = false;
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // Handle touch controls later if needed, but for Ragebait 3D fps, cursor lock is king.
    },

    lock: function () {
        console.log("Attempting to lock pointer...");
        try {
            if (this.controls) this.controls.lock();
        } catch (e) {
            console.warn("Pointer Lock failed:", e);
        }
    },

    unlock: function () {
        try {
            if (this.controls) this.controls.unlock();
            setTimeout(() => {
                document.exitPointerLock();
            }, 100);
        } catch (e) {
            console.error("Unlock error:", e);
        }
    }
};
