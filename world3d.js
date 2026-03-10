import * as THREE from 'three';
import { Engine3D } from './engine3d.js';

export const World3D = {
    colliders: [], // For AABB physics against walls

    // Map layout matching the 2D version
    // Bedroom 200x200, Bathroom 180x180, Storage 180x180, Basement 220x220, Exit 200x200, Hallway 300x120
    rooms: [
        { id: 'bedroom', x: 200, z: 410, w: 200, d: 200 },
        { id: 'bathroom', x: 790, z: 410, w: 180, d: 180 },
        { id: 'storage', x: 500, z: 210, w: 180, d: 180 },
        { id: 'basement', x: 200, z: 670, w: 220, d: 220 },
        { id: 'exit', x: 790, z: 670, w: 200, d: 200 },
        { id: 'hallway', x: 400, z: 450, w: 300, d: 120 }
    ],

    init: function () {
        this.colliders = [];
        this.generateMap();
        this.addDecorations();
    },

    generateMap: function () {
        const wallHeight = 100;

        // Materials for different rooms
        const materials = {
            bedroom: { floor: 0x5c4033, wall: 0x8b7d6b }, // Dark wood / Warm wall
            bathroom: { floor: 0xadd8e6, wall: 0xf0f8ff }, // Blue tile / White wall
            storage: { floor: 0x4a4a4a, wall: 0x696969 }, // Concrete
            basement: { floor: 0x2b2b2b, wall: 0x3d3d3d }, // Dark stone
            exit: { floor: 0x3b2f2f, wall: 0x4a3c3c },     // Dark wood
            hallway: { floor: 0x800000, wall: 0x5c4033 }   // Red carpet / Wood walls
        };

        // Create Floors and Ceilings
        this.rooms.forEach(room => {
            const mat = materials[room.id] || { floor: 0xaaaaaa, wall: 0x888888 };
            const floorMaterial = new THREE.MeshLambertMaterial({ color: mat.floor });
            const ceilingMaterial = new THREE.MeshLambertMaterial({ color: mat.wall });

            const floorGeo = new THREE.PlaneGeometry(room.w, room.d);
            const floor = new THREE.Mesh(floorGeo, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(room.x + room.w / 2, 0, room.z + room.d / 2);
            Engine3D.scene.add(floor);

            const grid = new THREE.GridHelper(Math.max(room.w, room.d), 10, 0x000000, 0x111111);
            grid.position.set(room.x + room.w / 2, 0.1, room.z + room.d / 2);
            grid.material.opacity = 0.2;
            grid.material.transparent = true;
            Engine3D.scene.add(grid);

            const ceiling = new THREE.Mesh(floorGeo, ceilingMaterial);
            ceiling.rotation.x = Math.PI / 2;
            ceiling.position.set(room.x + room.w / 2, wallHeight, room.z + room.d / 2);
            Engine3D.scene.add(ceiling);
        });

        // We can create walls by taking the bounding box of the whole area and inverting the rooms, 
        // or just build explicit walls like the 2D version. Let's use the explicit walls from map.js.

        const walls2D = [
            // Bedroom
            { x: 190, y: 400, w: 220, h: 10 },
            { x: 190, y: 610, w: 220, h: 10 },
            { x: 190, y: 400, w: 10, h: 220 },
            { x: 400, y: 400, w: 10, h: 50 },
            { x: 400, y: 570, w: 10, h: 50 },

            // Bathroom
            { x: 780, y: 400, w: 200, h: 10 },
            { x: 780, y: 590, w: 200, h: 10 },
            { x: 970, y: 400, w: 10, h: 200 },
            { x: 780, y: 400, w: 10, h: 50 },
            { x: 780, y: 550, w: 10, h: 50 },

            // Storage
            { x: 490, y: 200, w: 200, h: 10 },
            { x: 490, y: 390, w: 200, h: 10 },
            { x: 490, y: 200, w: 10, h: 200 },
            { x: 680, y: 200, w: 10, h: 200 },

            // Basement
            { x: 190, y: 660, w: 240, h: 10 },
            { x: 190, y: 890, w: 240, h: 10 },
            { x: 190, y: 660, w: 10, h: 240 },
            { x: 420, y: 660, w: 10, h: 240 },

            // Exit
            { x: 780, y: 660, w: 220, h: 10 },
            { x: 780, y: 870, w: 220, h: 10 },
            { x: 990, y: 660, w: 10, h: 220 },
            { x: 780, y: 660, w: 10, h: 220 },

            // Hallway
            { x: 400, y: 440, w: 380, h: 10 },
            { x: 400, y: 570, w: 380, h: 10 },
            { x: 400, y: 440, w: 10, h: 140 },
            { x: 770, y: 440, w: 10, h: 140 }
        ];

        walls2D.forEach(w => {
            const wallGeo = new THREE.BoxGeometry(w.w, wallHeight, w.h);
            const wall = new THREE.Mesh(wallGeo, wallMaterial);
            // Three.js Box is centered at its origin, our map.js was top-left.
            wall.position.set(w.x + w.w / 2, wallHeight / 2, w.y + w.h / 2);
            Engine3D.scene.add(wall);

            // Add to colliders
            this.colliders.push({
                minX: w.x, maxX: w.x + w.w,
                minZ: w.y, maxZ: w.y + w.h
            });
        });

        // Add Exit Door
        const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
        const doorGeo = new THREE.BoxGeometry(60, wallHeight, 10);
        this.exitDoorMesh = new THREE.Mesh(doorGeo, doorMaterial);
        this.exitDoorMesh.position.set(850 + 30, wallHeight / 2, 870 + 5);
        Engine3D.scene.add(this.exitDoorMesh);

        // Add visual doorframes to the gaps so the player knows where to walk
        const trimMat = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
        const trimGeo = new THREE.BoxGeometry(12, wallHeight, 12);

        // Hallway entrances
        const trims = [
            { x: 400, z: 450 }, { x: 400, z: 570 }, // Bedroom to Hallway
            { x: 770, z: 450 }, { x: 770, z: 570 }, // Hallway to Bathroom side
            { x: 490, z: 390 }, { x: 680, z: 390 }, // Storage entrance
            { x: 420, z: 660 }, { x: 780, z: 660 }  // Basement to Exit
        ];

        trims.forEach(pos => {
            const t = new THREE.Mesh(trimGeo, trimMat);
            t.position.set(pos.x, wallHeight / 2, pos.z);
            Engine3D.scene.add(t);
        });
    },

    addDecorations: function () {
        // Bedroom: Bed, Side Table, Rug, and a 'TV'
        this.addBox(220, 0, 430, 80, 20, 120, 0x4b3621); // Bed Frame
        this.addBox(220, 20, 430, 80, 10, 120, 0xffffff); // Mattress
        this.addBox(350, 0, 430, 30, 30, 30, 0x4b3621); // Side Table
        this.addBox(210, 0, 420, 180, 2, 180, 0x3d2b1f); // Rug
        this.addBox(380, 40, 480, 5, 50, 80, 0x111111); // TV (black box on wall)

        // Bathroom: Toilet, Sink, and Cabinet
        this.addBox(900, 0, 430, 40, 40, 40, 0xffffff); // Toilet base
        this.addBox(900, 40, 410, 40, 40, 15, 0xffffff); // Toilet tank
        this.addBox(820, 0, 550, 30, 60, 30, 0xffffff); // Sink
        this.addBox(940, 0, 500, 20, 80, 60, 0xdddddd); // Bathroom Cabinet

        // Storage/Kitchen: Shelves, Crates, and a Fridge
        this.addBox(510, 0, 220, 10, 80, 160, 0x3d2b1f); // Shelf
        this.addBox(530, 0, 250, 40, 40, 40, 0x8b4513); // Crate 1
        this.addBox(580, 0, 260, 30, 30, 30, 0x8b4513); // Crate 2
        this.addBox(640, 0, 300, 40, 90, 40, 0xeeeeee); // Fridge

        // Hallway: Bench and a long carpet
        this.addBox(500, 0, 460, 100, 15, 30, 0x4b3621); // Bench
        this.addBox(410, 0, 480, 280, 2, 60, 0x660000); // Hallway runner rug

        // Basement: Old Boiler and Pipes
        this.addBox(250, 0, 800, 60, 80, 60, 0x2f4f4f); // Boiler
        this.addBox(310, 80, 800, 10, 10, 100, 0x555555); // Pipe 1
        this.addBox(220, 90, 820, 100, 10, 10, 0x555555); // Pipe 2

        // Add some local point lights for mood
        const light1 = new THREE.PointLight(0xffaa00, 5000, 300);
        light1.position.set(300, 80, 510); // Bedroom
        Engine3D.scene.add(light1);

        const light2 = new THREE.PointLight(0x00aaff, 3000, 250);
        light2.position.set(880, 80, 500); // Bathroom
        Engine3D.scene.add(light2);

        const light3 = new THREE.PointLight(0xffffff, 4000, 400);
        light3.position.set(550, 80, 510); // Hallway
        Engine3D.scene.add(light3);

        const light4 = new THREE.PointLight(0xff3300, 6000, 350);
        light4.position.set(310, 80, 780); // Basement
        Engine3D.scene.add(light4);
    },

    addBox: function (x, y, z, w, h, d, color) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x + w / 2, y + h / 2, z + d / 2);
        Engine3D.scene.add(mesh);

        // Add to colliders if it's tall enough to be a blockage
        if (h > 40) {
            this.colliders.push({
                minX: x, maxX: x + w,
                minZ: z, maxZ: z + d
            });
        }
    },

    checkCollision: function (x, z, radius) {
        for (let w of this.colliders) {
            // simple AABB circle collision
            let testX = x;
            let testZ = z;

            if (x < w.minX) testX = w.minX;
            else if (x > w.maxX) testX = w.maxX;

            if (z < w.minZ) testZ = w.minZ;
            else if (z > w.maxZ) testZ = w.maxZ;

            let distX = x - testX;
            let distZ = z - testZ;
            let distance = Math.sqrt((distX * distX) + (distZ * distZ));

            if (distance <= radius) return true;
        }
        return false;
    }
};
