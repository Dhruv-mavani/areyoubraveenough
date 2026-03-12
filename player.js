import * as THREE from 'three';
import { Engine3D } from './engine3d.js';
import { InputSys } from './input.js';
import { World3D } from './world3d.js';

export const Player = {
    speed: 2250.0, // reduced by 10% for balance
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

        const camera = Engine3D.camera;
        const velocity = InputSys.velocity;

        // 1. Snappier Friction / Damping
        const friction = 10.0;
        velocity.x -= velocity.x * friction * dt;
        velocity.z -= velocity.z * friction * dt;

        // 2. Get Camera-Relative Input Directions
        // We project the camera vectors onto the XZ plane to avoid flying/burying
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();

        // 3. SNAPPY ACCELERATION (GTA Style)
        const moveForce = 8000.0; // Sharp acceleration
        const inputDir = new THREE.Vector3();

        if (InputSys.keys['KeyW'] || InputSys.keys['ArrowUp']) inputDir.add(forward);
        if (InputSys.keys['KeyS'] || InputSys.keys['ArrowDown']) inputDir.sub(forward);
        if (InputSys.keys['KeyD'] || InputSys.keys['ArrowRight']) inputDir.add(right);
        if (InputSys.keys['KeyA'] || InputSys.keys['ArrowLeft']) inputDir.sub(right);

        if (inputDir.lengthSq() > 0) {
            inputDir.normalize();
            velocity.x += inputDir.x * moveForce * dt;
            velocity.z += inputDir.z * moveForce * dt;
        }

        // 4. Gravity & Jump
        velocity.y -= 9.8 * 80.0 * dt;
        const onGround = camera.position.y <= 50.1;
        if (InputSys.keys['Space'] && onGround) {
            velocity.y = 250.0;
        }

        // 5. Collision & Final Movement
        const prevPos = camera.position.clone();

        // Apply X movement
        camera.position.x += velocity.x * dt;
        if (World3D.checkCollision(camera.position.x, camera.position.z, this.radius)) {
            camera.position.x = prevPos.x;
            velocity.x = 0;
        }

        // Apply Z movement
        camera.position.z += velocity.z * dt;
        if (World3D.checkCollision(camera.position.x, camera.position.z, this.radius)) {
            camera.position.z = prevPos.z;
            velocity.z = 0;
        }

        // Apply Y movement
        camera.position.y += velocity.y * dt;
        if (camera.position.y < 50) {
            velocity.y = 0;
            camera.position.y = 50;
        }

        return { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    }
};
