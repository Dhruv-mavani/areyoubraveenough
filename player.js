import * as THREE from 'three';
import { Engine3D } from './engine3d.js';
import { InputSys } from './input.js';
import { World3D } from './world3d.js';

export const Player = {
    speed: 1200.0, // increased for faster walking
    mass: 100.0,
    hasKey: false,
    radius: 10,

    init: function (startX, startZ) {
        if (!InputSys.controls) return;
        Engine3D.camera.position.set(startX, 50, startZ);
        this.hasKey = false;
        InputSys.velocity.set(0, 0, 0);
        InputSys.direction.set(0, 0, 0);
    },

    update: function (dt) {
        if (!InputSys.controls || !InputSys.controls.isLocked) return;

        InputSys.velocity.x -= InputSys.velocity.x * 10.0 * dt;
        InputSys.velocity.z -= InputSys.velocity.z * 10.0 * dt;

        InputSys.direction.z = Number(InputSys.moveForward) - Number(InputSys.moveBackward);
        InputSys.direction.x = Number(InputSys.moveRight) - Number(InputSys.moveLeft);
        InputSys.direction.normalize();

        if (InputSys.moveForward || InputSys.moveBackward) InputSys.velocity.z -= InputSys.direction.z * this.speed * dt;
        if (InputSys.moveLeft || InputSys.moveRight) InputSys.velocity.x -= InputSys.direction.x * this.speed * dt;

        const controlsObj = Engine3D.camera;

        // Predict next position
        const nextX = controlsObj.position.x + (InputSys.velocity.x * dt);
        const nextZ = controlsObj.position.z + (InputSys.velocity.z * dt);

        // Simple collision (Check X and Z separately to allow sliding against walls)
        if (!World3D.checkCollision(nextX, controlsObj.position.z, this.radius)) {
            controlsObj.translateX(InputSys.velocity.x * dt);
        } else {
            InputSys.velocity.x = 0;
        }

        if (!World3D.checkCollision(controlsObj.position.x, nextZ, this.radius)) {
            controlsObj.translateZ(InputSys.velocity.z * dt);
        } else {
            InputSys.velocity.z = 0;
        }

        // Clamp to map bounds just in case
        if (controlsObj.position.y < 50) {
            InputSys.velocity.y = 0;
            controlsObj.position.y = 50;
        }

        return { x: controlsObj.position.x, z: controlsObj.position.z };
    }
};
