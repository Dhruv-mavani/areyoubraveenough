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
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.FogExp2(0x050505, 0.007);

        this.textureLoader = new THREE.TextureLoader();
        this.textures = {};

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 50, 0); // Average eye height

        // Renderer Optimization for Mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        this.renderer = new THREE.WebGLRenderer({
            antialias: !isMobile, // Disable AA on mobile for performance
            precision: isMobile ? 'mediump' : 'highp' // Lower precision on mobile
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Cap pixel ratio on mobile to prevent sub-pixel rendering overkill
        const maxPixelRatio = isMobile ? 2.0 : window.devicePixelRatio;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 1.0;

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
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Increased intensity
        this.scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0); // Better overall scene visibility
        this.scene.add(hemiLight);

        // Flashlight attached to camera
        this.flashlight = new THREE.SpotLight(0xfff5ee, 50, 600, Math.PI / 4, 0.3, 1);
        this.flashlight.castShadow = true;
        this.flashlight.shadow.mapSize.width = 1024;
        this.flashlight.shadow.mapSize.height = 1024;
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
    },

    loadTexture: function (name, url) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(url,
                (tex) => {
                    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                    this.textures[name] = tex;
                    resolve(tex);
                },
                undefined,
                (err) => {
                    console.error(`Failed to load texture: ${url}`, err);
                    resolve(null); // Resolve with null instead of hanging
                }
            );
        });
    }
};
