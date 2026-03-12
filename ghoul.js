import * as THREE from 'three';
import { Engine3D } from './engine3d.js';
import { World3D } from './world3d.js';
import { AudioSys } from './audio.js';

export const Ghoul = {
    mesh: null,
    target: null, // usually player
    speed: 30.0,
    baseSpeed: 30.0,
    state: 'wander', // wander, hunt, aggro
    pos: new THREE.Vector3(800, 0, 800),
    velocity: new THREE.Vector3(),
    rotation: 0,
    faceMaterial: null,

    init: function () {
        if (this.mesh) {
            Engine3D.scene.add(this.mesh);
            return;
        }

        // 1. Create a disturbing skeletal mesh
        this.mesh = new THREE.Group();

        // Torso/Spine
        const torsoGeo = new THREE.BoxGeometry(15, 80, 10);
        const ghoulMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
        const torso = new THREE.Mesh(torsoGeo, ghoulMat);
        this.mesh.add(torso);

        // Scary Head with horror texture
        const headGeo = new THREE.BoxGeometry(35, 45, 30);
        this.faceMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x220000
        });

        // Load the terrifying face texture
        const loader = new THREE.TextureLoader();
        loader.load('./assets/tex_ghoul_face.png', (tex) => {
            this.faceMaterial.map = tex;
            this.faceMaterial.needsUpdate = true;
        });

        const head = new THREE.Mesh(headGeo, this.faceMaterial);
        head.position.y = 55;
        this.mesh.add(head);

        // Long, spindly claw-arms
        const armGeo = new THREE.BoxGeometry(5, 70, 5);
        const armL = new THREE.Mesh(armGeo, ghoulMat);
        armL.position.set(-15, 20, 0);
        armL.rotation.z = 0.2;
        const armR = new THREE.Mesh(armGeo, ghoulMat);
        armR.position.set(15, 20, 0);
        armR.rotation.z = -0.2;
        this.mesh.add(armL);
        this.mesh.add(armR);

        this.mesh.position.set(this.pos.x, 55, this.pos.z);
        Engine3D.scene.add(this.mesh);

        // Spooky red glow
        const light = new THREE.PointLight(0xff0000, 5, 400);
        light.position.set(0, 50, 20);
        this.mesh.add(light);
    },

    runTimer: 0,
    nextTeleportTime: 0,

    update: function (dt, playerPos, micVolume, isPlayerRunning) {
        if (!this.mesh) return;

        // 1. DYNAMIC PROXIMITY SPEED
        const dx = this.pos.x - playerPos.x;
        const dz = this.pos.z - playerPos.z;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);

        // Targeted speeds based on player speed (approx 800)
        const closeSpeed = 640; // 80%
        const farSpeed = 400;   // 50%

        // Transition distance: 600 units
        this.baseSpeed = horizontalDist < 600 ? closeSpeed : farSpeed;
        this.speed = this.baseSpeed;

        // 2. ANTI-EXPLOIT: Continuous Running Detection
        if (isPlayerRunning && horizontalDist > 400) {
            this.runTimer += dt;
        } else {
            this.runTimer = Math.max(0, this.runTimer - dt * 2); // Slow decay
        }

        // Teleport if player runs for >10s and ghost is far
        if (this.runTimer > 10.0 && horizontalDist > 600 && Date.now() > this.nextTeleportTime) {
            console.log("GHOUL: Anti-exploit teleport triggered!");
            // Teleport 300 units behind/near player
            const angle = Math.random() * Math.PI * 2;
            this.pos.set(
                playerPos.x + Math.cos(angle) * 350,
                0,
                playerPos.z + Math.sin(angle) * 350
            );
            this.runTimer = 0;
            this.nextTeleportTime = Date.now() + 5000; // Cooldown
            AudioSys.playScareSound('whisper'); // Auditory cue for teleport
        }

        // 3. MIC TRACKING: Ghost reacts to noise
        if (micVolume > 50) {
            this.state = 'hunt';
            this.speed = this.baseSpeed * (1 + (micVolume / 100));
        } else if (this.state === 'hunt' && micVolume < 10) {
            this.state = 'wander';
        }

        // 4. MOVEMENT: XZ-only
        const dir = new THREE.Vector3().subVectors(playerPos, this.pos);
        dir.y = 0;
        dir.normalize();

        if (this.state === 'hunt') {
            this.pos.add(dir.multiplyScalar(this.speed * dt));
        } else {
            this.pos.add(dir.multiplyScalar(this.speed * 0.4 * dt));
        }

        const renderPos = this.pos.clone();
        this.mesh.position.set(renderPos.x, 55, renderPos.z);
        this.mesh.lookAt(playerPos.x, 55, playerPos.z);

        // 5. KILL CHECK (2D only)
        if (horizontalDist < 45) {
            return true;
        }
        return false;
    },

    setFaceTexture: function (texture) {
        if (this.faceMaterial) {
            this.faceMaterial.map = texture;
            this.faceMaterial.needsUpdate = true;
        }
    }
};
