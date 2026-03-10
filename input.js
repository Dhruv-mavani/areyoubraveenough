import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Engine3D } from './engine3d.js';
import * as THREE from 'three';

export const InputSys = {
    keys: {},
    controls: null,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    interactPressed: false,
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),

    init: function () {
        this.controls = new PointerLockControls(Engine3D.camera, document.body);

        const instructions = document.getElementById('engine-instructions'); // We'll need to create this

        this.controls.addEventListener('lock', function () {
            if (instructions) instructions.style.display = 'none';
        });

        this.controls.addEventListener('unlock', function () {
            if (instructions) instructions.style.display = 'block';
        });

        Engine3D.scene.add(Engine3D.camera);

        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'KeyE':
                    this.interactPressed = true;
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    break;
                case 'KeyE':
                    this.interactPressed = false;
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Handle touch controls later if needed, but for Ragebait 3D fps, cursor lock is king.
    },

    lock: function () {
        if (this.controls) this.controls.lock();
    },

    unlock: function () {
        if (this.controls) this.controls.unlock();
    }
};
