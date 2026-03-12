import * as THREE from 'three';
import { Engine3D } from './engine3d.js';

export const Fragments = {
    entities: [],
    collectedCount: 0,

    spawn: function (x, z) {
        const geo = new THREE.IcosahedronGeometry(10, 0);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 2,
            transparent: true,
            opacity: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 40, z);
        Engine3D.scene.add(mesh);

        this.entities.push({ mesh, x, z });
    },

    spawnRandom: function (count) {
        // We use a range that covers the current map size roughly
        // The maps vary by level, so we just use a large enough range or query bounds
        const range = 4000;
        for (let i = 0; i < count; i++) {
            const rx = (Math.random() - 0.5) * range;
            const rz = (Math.random() - 0.5) * range;
            this.spawn(rx, rz);
        }
    },

    update: function (dt, playerPos) {
        let collectedIndex = -1;
        this.entities.forEach((f, i) => {
            f.mesh.rotation.y += dt * 2;
            f.mesh.position.y = 40 + Math.sin(Date.now() * 0.005) * 5;

            const dist = Math.hypot(playerPos.x - f.x, playerPos.z - f.z);
            if (dist < 40) {
                collectedIndex = i;
            }
        });

        if (collectedIndex !== -1) {
            const f = this.entities[collectedIndex];
            Engine3D.scene.remove(f.mesh);
            this.entities.splice(collectedIndex, 1);
            this.collectedCount++;
            return true; // collected!
        }
        return false;
    },

    reset: function () {
        this.entities.forEach(f => Engine3D.scene.remove(f.mesh));
        this.entities = [];
        this.collectedCount = 0;
    }
};
