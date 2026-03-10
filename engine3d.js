import * as THREE from 'three';

export const Engine3D = {
    scene: null,
    camera: null,
    renderer: null,
    clock: null,
    initialized: false,

    init: function () {
        if (this.initialized) return;

        // Container
        const container = document.getElementById('gameCanvasContainer') || document.body;

        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.012);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 50, 0); // Average eye height

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: false }); // low-poly style
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // limit pixel ratio for performance/retro look

        // Ensure absolute positioning
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '1';

        // Hide original 2d canvas if still there
        const oldCanvas = document.getElementById('gameCanvas');
        if (oldCanvas) oldCanvas.style.display = 'none';

        container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x222222);
        this.scene.add(ambientLight);

        // Flashlight attached to camera
        this.flashlight = new THREE.SpotLight(0xffffff, 50, 400, Math.PI / 4, 0.5, 1);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.target.position.set(0, 0, -1);
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
        this.scene.add(this.camera);

        this.clock = new THREE.Clock();

        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.initialized = true;
    },

    onWindowResize: function () {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    render: function () {
        if (!this.initialized) return;
        this.renderer.render(this.scene, this.camera);
    }
};
