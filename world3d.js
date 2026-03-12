import * as THREE from 'three';
import { Engine3D } from './engine3d.js';

export const World3D = {
    colliders: [],
    wallHeight: 120,

    init: function (level) {
        this.colliders = [];
        // Clear previous world if any
        while (Engine3D.scene.children.length > 0) {
            const obj = Engine3D.scene.children[0];
            Engine3D.scene.remove(obj);
        }

        // Re-add camera
        Engine3D.scene.add(Engine3D.camera);
        Engine3D.scene.background = new THREE.Color(0x050505);
        Engine3D.scene.fog = new THREE.FogExp2(0x050505, 0.007);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        Engine3D.scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        Engine3D.scene.add(hemiLight);

        this.generateLevelMap(level);
        this.addAtmosphericLighting(level);
    },

    generateLevelMap: function (level) {
        // Textures
        const wallTex = Engine3D.textures['wall'];
        const floorTex = Engine3D.textures['floor'];
        const concreteTex = Engine3D.textures['concrete'];

        const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8 });
        const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6 });
        const concreteMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9 });

        const rooms = [];

        if (level % 2 === 1) {
            // Level 1, 3, 5: "House / Tight Corridors"
            this.wallHeight = 120;
            const scale = 1 + Math.floor(level / 2) * 0.5;

            // Central Hub
            rooms.push({ x: -300 * scale, z: -300 * scale, w: 600 * scale, d: 600 * scale, type: 'floor' });
            // Hallways
            rooms.push({ x: 300 * scale, z: -100 * scale, w: 1000 * scale, d: 200 * scale, type: 'floor' });
            rooms.push({ x: -1300 * scale, z: -100 * scale, w: 1000 * scale, d: 200 * scale, type: 'floor' });
            // Recursive Rooms
            rooms.push({ x: 1300 * scale, z: -400 * scale, w: 500 * scale, d: 800 * scale, type: 'concrete' });
            rooms.push({ x: -1800 * scale, z: -400 * scale, w: 500 * scale, d: 800 * scale, type: 'concrete' });
        } else {
            // Level 2, 4, 6: "The Labyrinth / Industrial Complex"
            this.wallHeight = 120; // Horizontal focus as requested
            const scale = 1 + (Math.floor(level / 2) - 1) * 0.5;

            // Grand Atrium / Large Industrial Hall
            rooms.push({ x: -1000 * scale, z: -1000 * scale, w: 2000 * scale, d: 2000 * scale, type: 'concrete' });

            // Branching sectors
            rooms.push({ x: 1000 * scale, z: -500 * scale, w: 800 * scale, d: 1000 * scale, type: 'floor' });
            rooms.push({ x: -1800 * scale, z: -500 * scale, w: 800 * scale, d: 1000 * scale, type: 'floor' });
        }

        rooms.forEach(room => {
            const mat = room.type === 'concrete' ? concreteMat : floorMat;
            const floorGeo = new THREE.PlaneGeometry(room.w, room.d);
            const floor = new THREE.Mesh(floorGeo, mat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(room.x + room.w / 2, 0, room.z + room.d / 2);
            floor.receiveShadow = true;
            Engine3D.scene.add(floor);

            const ceil = floor.clone();
            ceil.position.y = this.wallHeight;
            ceil.rotation.x = Math.PI / 2;
            Engine3D.scene.add(ceil);
        });

        // Walls
        // Exterior Boundary
        const minX = Math.min(...rooms.map(r => r.x));
        const maxX = Math.max(...rooms.map(r => r.x + r.w));
        const minZ = Math.min(...rooms.map(r => r.z));
        const maxZ = Math.max(...rooms.map(r => r.z + r.d));

        this.mapBounds = { minX, maxX, minZ, maxZ };

        // Exterior Boundary Walls - 100 units thick to prevent tunneling/escape
        const pad = 100;
        this.addThickWall(minX - pad, minZ - pad, (maxX - minX) + (pad * 2), pad, wallMat); // Top
        this.addThickWall(minX - pad, maxZ, (maxX - minX) + (pad * 2), pad, wallMat);       // Bottom
        this.addThickWall(minX - pad, minZ - pad, pad, (maxZ - minZ) + (pad * 2), wallMat); // Left
        this.addThickWall(maxX, minZ - pad, pad, (maxZ - minZ) + (pad * 2), wallMat);       // Right

        // Interior Walls
        if (level % 2 === 1) {
            // House: Many small walls
            const wallCount = 10 + level * 5;
            for (let i = 0; i < wallCount; i++) {
                const wx = minX + Math.random() * (maxX - minX - 200);
                const wz = minZ + Math.random() * (maxZ - minZ - 200);
                const isVert = Math.random() > 0.5;
                const ww = isVert ? 20 : 300;
                const wd = isVert ? 300 : 20;
                this.addThickWall(wx, wz, ww, wd, wallMat);
            }
        } else {
            // Labyrinth: Dense walls and narrow paths
            const wallCount = 15 + level * 5;
            for (let i = 0; i < wallCount; i++) {
                const wx = minX + Math.random() * (maxX - minX - 150);
                const wz = minZ + Math.random() * (maxZ - minZ - 150);
                const isVert = Math.random() > 0.5;
                const ww = isVert ? 30 : 400;
                const wd = isVert ? 400 : 30;
                this.addThickWall(wx, wz, ww, wd, concreteMat);
            }
            // Add some central pillars for orientation
            this.addThickWall(-50, -50, 100, 100, concreteMat);
        }
    },

    addThickWall: function (x, z, w, d, mat) {
        const geo = new THREE.BoxGeometry(w, this.wallHeight, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x + w / 2, this.wallHeight / 2, z + d / 2);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        Engine3D.scene.add(mesh);

        this.colliders.push({
            minX: x - 5, maxX: x + w + 5,
            minZ: z - 5, maxZ: z + d + 5
        });
    },

    addAtmosphericLighting: function (level) {
        const count = 3 + level * 2;
        for (let i = 0; i < count; i++) {
            const pl = new THREE.PointLight(0xffaa00, 10, 600);
            pl.position.set((Math.random() - 0.5) * 3000, 80, (Math.random() - 0.5) * 3000);
            pl.castShadow = true;
            Engine3D.scene.add(pl);
        }
    },

    checkCollision: function (x, z, radius) {
        for (let w of this.colliders) {
            let testX = x;
            let testZ = z;
            if (x < w.minX) testX = w.minX; else if (x > w.maxX) testX = w.maxX;
            if (z < w.minZ) testZ = w.minZ; else if (z > w.maxZ) testZ = w.maxZ;
            let distX = x - testX;
            let distZ = z - testZ;
            let distance = Math.sqrt((distX * distX) + (distZ * distZ));
            if (distance <= radius) return true;
        }
        return false;
    },

    getMapBounds: function () {
        return this.mapBounds || { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 };
    }
};
