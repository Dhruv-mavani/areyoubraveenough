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
    joystickVector: new THREE.Vector2(), // x, y from -1 to 1
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    hasTouch: (navigator.maxTouchPoints > 0),

    init: function () {
        const isMobileDevice = this.isMobile;
        const instructions = document.getElementById('engine-instructions');

        // Only use PointerLockControls on non-mobile devices
        if (!isMobileDevice) {
            this.controls = new PointerLockControls(Engine3D.camera, document.body);

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
        } else {
            this.controls = { isLocked: false, lock: () => { }, unlock: () => { } };
        }

        // Click on instructions to relock
        if (instructions) {
            instructions.addEventListener('click', () => {
                if (!this.suppressInstructions) this.lock();
            });
        }

        Engine3D.scene.add(Engine3D.camera);

        // Mobile Joystick Setup
        const joyBase = document.getElementById('joystickBase');
        const joyStick = document.getElementById('joystickStick');

        if (joyBase && joyStick) {
            let active = false;
            const size = 140 / 2; // matches CSS

            const handleJoy = (ex, ey) => {
                const rect = joyBase.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                let dx = ex - centerX;
                let dy = ey - centerY;

                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = size * 0.8;

                if (dist > maxDist) {
                    dx *= maxDist / dist;
                    dy *= maxDist / dist;
                }

                joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
                this.joystickVector.set(dx / maxDist, -dy / maxDist);
            };

            joyBase.addEventListener('touchstart', (e) => {
                active = true;
                handleJoy(e.touches[0].clientX, e.touches[0].clientY);
            });
            window.addEventListener('touchmove', (e) => {
                if (!active) return;
                handleJoy(e.touches[0].clientX, e.touches[0].clientY);
            });
            window.addEventListener('touchend', () => {
                active = false;
                joyStick.style.transform = `translate(0px, 0px)`;
                this.joystickVector.set(0, 0);
            });
        }

        // Mobile Camera Drag
        if (isMobileDevice) {
            let lastX = 0;
            let lastY = 0;
            let touchDown = false;

            window.addEventListener('touchstart', (e) => {
                if (e.target.closest('#joystickZone')) return;
                touchDown = true;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
            });

            window.addEventListener('touchmove', (e) => {
                if (!touchDown || e.target.closest('#joystickZone')) return;
                const dx = e.touches[0].clientX - lastX;
                const dy = e.touches[0].clientY - lastY;

                // Manually rotate camera since PointerLockControls might be disabled
                const sensitivity = 0.005;
                const euler = new THREE.Euler(0, 0, 0, 'YXZ');
                euler.setFromQuaternion(Engine3D.camera.quaternion);
                euler.y -= dx * sensitivity;
                euler.x -= dy * sensitivity;
                euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
                Engine3D.camera.quaternion.setFromEuler(euler);

                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
            });

            window.addEventListener('touchend', () => { touchDown = false; });
        }

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
