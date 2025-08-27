/**
 * Depth Tour - Three.js Panorama with DIBR
 * 
 * A production-ready Three.js application for rendering equirectangular panoramas
 * with depth-based parallax effects and interactive hotspots.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { 
    createDepthMaterial, 
    createPickingMaterial, 
    uvDepthToWorld, 
    worldToUvDepth 
} from './shaders.js';

/**
 * Main DepthTour class
 */
class DepthTour {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.css2dRenderer = null;
        this.controls = null;
        
        // Scene management
        this.scenesData = null;
        this.currentScene = null;
        this.currentMaterial = null;
        this.currentMesh = null;
        this.pickingMesh = null;
        this.hotspots = [];
        
        // State
        this.isAuthoringMode = false;
        this.depthScale = 3.0;
        this.depthBias = 0.0;
        this.depthFlip = false;
        this.debugDepth = false;
        this.seamFix = 0.0;
        this.exposure = 1.0;
        
        // UI elements
        this.hudElements = {};
        this.loadingOverlay = null;
        this.instructionsOverlay = null;
        this.infoPopup = null;
        
        // Raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Loaders
        this.textureLoader = new THREE.TextureLoader();
        this.exrLoader = new EXRLoader();
        
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            this.setupRenderer();
            this.setupScene();
            this.setupCamera();
            this.setupControls();
            this.setupUI();
            this.setupEventListeners();
            
            // Load scenes configuration
            await this.loadScenesConfig();
            
            // Load initial scene
            await this.loadScene(this.scenesData.start);
            
            // Start render loop
            this.animate();
            
            // Hide loading overlay
            this.hideLoading();
            
            console.log('Depth Tour initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Depth Tour:', error);
            this.showError('Failed to initialize application');
        }
    }
    
    /**
     * Setup WebGL and CSS2D renderers
     */
    setupRenderer() {
        const container = document.getElementById('container');
        
        // WebGL renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        container.appendChild(this.renderer.domElement);
        
        // CSS2D renderer for hotspots
        this.css2dRenderer = new CSS2DRenderer();
        this.css2dRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css2dRenderer.domElement.style.position = 'absolute';
        this.css2dRenderer.domElement.style.top = '0';
        this.css2dRenderer.domElement.style.pointerEvents = 'none';
        document.getElementById('css2d-container').appendChild(this.css2dRenderer.domElement);
    }
    
    /**
     * Setup Three.js scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
    }
    
    /**
     * Setup camera
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.01, 
            1000
        );
        // Position camera slightly off center to ensure controls work
        this.camera.position.set(0, 0, 0.001);
        this.camera.lookAt(0, 0, -1); // Look forward
    }
    
    /**
     * Setup orbit controls
     */
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // Basic settings
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = false;
        this.controls.enablePan = false;
        this.controls.autoRotate = false;
        
        // Rotation limits
        this.controls.minPolarAngle = Math.PI * 0.1; // 10 degrees from top
        this.controls.maxPolarAngle = Math.PI * 0.9; // 10 degrees from bottom
        
        // Sensitivity
        this.controls.rotateSpeed = 1.0;
        this.controls.enableRotate = true;
        
        // Target and position
        this.controls.target.set(0, 0, -1); // Look forward into the sphere
        // Camera position is already set in setupCamera
        
        // Force update
        this.controls.update();
        
        console.log('OrbitControls setup complete. Enabled:', this.controls.enabled, 'Rotate enabled:', this.controls.enableRotate);
    }
    
    /**
     * Setup UI elements and references
     */
    setupUI() {
        this.hudElements = {
            sceneName: document.getElementById('scene-name'),
            depthScale: document.getElementById('depth-scale'),
            authoringStatus: document.getElementById('authoring-status')
        };
        
        this.loadingOverlay = document.getElementById('loading');
        this.instructionsOverlay = document.getElementById('instructions');
        this.infoPopup = document.getElementById('info-popup');
        
        // Create hotkeys display
        this.createHotkeysDisplay();
        
        // Setup info popup close button
        document.getElementById('info-close').addEventListener('click', () => {
            this.hideInfoPopup();
        });
        
        // Setup instructions close button
        document.getElementById('instructions-close').addEventListener('click', () => {
            this.hideInstructions();
        });
        
        this.updateHUD();
    }
    
    /**
     * Create hotkeys display in bottom right
     */
    createHotkeysDisplay() {
        const hotkeysDiv = document.createElement('div');
        hotkeysDiv.id = 'hotkeys-display';
        hotkeysDiv.innerHTML = `
            <div class="hotkeys-title">Controls:</div>
            <div class="hotkey-item"><span class="key">Mouse</span> Look around</div>
            <div class="hotkey-item"><span class="key">A</span> Authoring mode</div>
            <div class="hotkey-item"><span class="key">D</span> Debug depth</div>
            <div class="hotkey-item"><span class="key">F</span> Flip depth</div>
            <div class="hotkey-item"><span class="key">K/L</span> Depth scale</div>
            <div class="hotkey-item"><span class="key">O/P</span> Exposure</div>
            <div class="hotkey-item"><span class="key">E</span> Export hotspots</div>
            <div class="hotkey-item"><span class="key">T</span> Test controls</div>
            <div class="hotkey-item"><span class="key">ESC</span> Close overlays</div>
        `;
        document.body.appendChild(hotkeysDiv);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Mouse events for hotspot interaction and authoring
        // Use separate canvas for these to avoid conflicts with OrbitControls
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event), false);
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event), false);
        
        // Keyboard controls
        document.addEventListener('keydown', (event) => this.onKeyDown(event), false);
        
        // Prevent context menu on canvas only
        this.renderer.domElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        }, false);
        
        // Debug: Check if controls are working
        console.log('Event listeners setup. OrbitControls enabled:', this.controls.enabled);
    }
    
    /**
     * Load scenes configuration from JSON
     */
    async loadScenesConfig() {
        try {
            const response = await fetch('scenes.json');
            if (!response.ok) {
                throw new Error(`Failed to load scenes.json: ${response.status}`);
            }
            this.scenesData = await response.json();
            console.log('Scenes configuration loaded:', this.scenesData);
        } catch (error) {
            console.error('Error loading scenes configuration:', error);
            throw error;
        }
    }
    
    /**
     * Load a scene by name
     */
    async loadScene(sceneName) {
        if (!this.scenesData || !this.scenesData.scenes[sceneName]) {
            throw new Error(`Scene "${sceneName}" not found`);
        }
        
        this.showLoading();
        
        try {
            const sceneConfig = this.scenesData.scenes[sceneName];
            const scenePath = sceneConfig.path;
            
            console.log(`Loading scene: ${sceneName} from ${scenePath}`);
            
            // Dispose old resources
            this.disposeCurrentScene();
            
            // Load textures
            const { colorTexture, depthTexture } = await this.loadSceneTextures(scenePath);
            
            // Create depth material and mesh
            this.createSceneMesh(colorTexture, depthTexture);
            
            // Load hotspots
            await this.loadHotspots(scenePath);
            
            // Update state
            this.currentScene = sceneName;
            this.updateHUD();
            
            console.log(`Scene "${sceneName}" loaded successfully`);
        } catch (error) {
            console.error(`Error loading scene "${sceneName}":`, error);
            throw error;
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Load color and depth textures for a scene
     */
    async loadSceneTextures(scenePath) {
        const loadPromises = [];
        
        // Load color texture (try PNG first, then JPG)
        const colorPromise = this.loadColorTexture(scenePath);
        loadPromises.push(colorPromise);
        
        // Try to load EXR depth first, fallback to PNG
        const depthPromise = this.loadDepthTexture(scenePath);
        loadPromises.push(depthPromise);
        
        const [colorTexture, depthTexture] = await Promise.all(loadPromises);
        
        return { colorTexture, depthTexture };
    }
    
    /**
     * Load color texture (PNG or JPG fallback)
     */
    async loadColorTexture(scenePath) {
        // Try PNG first
        try {
            const pngTexture = await new Promise((resolve, reject) => {
                this.textureLoader.load(
                    `${scenePath}/pano.png`,
                    (texture) => {
                        texture.colorSpace = THREE.SRGBColorSpace;
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        texture.minFilter = THREE.LinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                        resolve(texture);
                    },
                    undefined,
                    () => reject(new Error('PNG load failed'))
                );
            });
            console.log('Loaded PNG panorama texture');
            return pngTexture;
        } catch (pngError) {
            console.log('PNG not found, trying JPG panorama...');
            
            // Fallback to JPG
            try {
                const jpgTexture = await new Promise((resolve, reject) => {
                    this.textureLoader.load(
                        `${scenePath}/pano.jpg`,
                        (texture) => {
                            texture.colorSpace = THREE.SRGBColorSpace;
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.ClampToEdgeWrapping;
                            texture.minFilter = THREE.LinearFilter;
                            texture.magFilter = THREE.LinearFilter;
                            resolve(texture);
                        },
                        undefined,
                        reject
                    );
                });
                console.log('Loaded JPG panorama texture');
                return jpgTexture;
            } catch (jpgError) {
                throw new Error('No panorama texture found (tried PNG and JPG)');
            }
        }
    }
    
    /**
     * Load depth texture (EXR or PNG fallback)
     */
    async loadDepthTexture(scenePath) {
        // Try EXR first
        try {
            const exrTexture = await new Promise((resolve, reject) => {
                this.exrLoader.load(
                    `${scenePath}/depth.exr`,
                    (texture) => {
                        texture.type = THREE.FloatType;
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        texture.minFilter = THREE.NearestFilter;
                        texture.magFilter = THREE.NearestFilter;
                        resolve(texture);
                    },
                    undefined,
                    () => reject(new Error('EXR load failed'))
                );
            });
            console.log('Loaded EXR depth texture');
            return exrTexture;
        } catch (exrError) {
            console.log('EXR not found, trying PNG depth...');
            
            // Fallback to PNG
            try {
                const pngTexture = await new Promise((resolve, reject) => {
                    this.textureLoader.load(
                        `${scenePath}/depth.png`,
                        (texture) => {
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.ClampToEdgeWrapping;
                            texture.minFilter = THREE.NearestFilter;
                            texture.magFilter = THREE.NearestFilter;
                            resolve(texture);
                        },
                        undefined,
                        reject
                    );
                });
                console.log('Loaded PNG depth texture');
                return pngTexture;
            } catch (pngError) {
                console.warn('No depth texture found, using flat panorama');
                // Create a flat white texture as fallback
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 1;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 1, 1);
                
                const fallbackTexture = new THREE.CanvasTexture(canvas);
                fallbackTexture.minFilter = THREE.NearestFilter;
                fallbackTexture.magFilter = THREE.NearestFilter;
                return fallbackTexture;
            }
        }
    }
    
    /**
     * Create the scene mesh with depth material
     */
    createSceneMesh(colorTexture, depthTexture) {
        // Create sphere geometry (inverted so camera is inside)
        const geometry = new THREE.SphereGeometry(1, 64, 32);
        
        // Create depth material
        this.currentMaterial = createDepthMaterial(colorTexture, depthTexture, {
            depthScale: this.depthScale,
            depthBias: this.depthBias,
            depthFlip: this.depthFlip,
            debugDepth: this.debugDepth,
            seamFix: this.seamFix,
            exposure: this.exposure
        });
        
        // Create mesh
        this.currentMesh = new THREE.Mesh(geometry, this.currentMaterial);
        this.scene.add(this.currentMesh);
        
        // Create picking mesh for authoring mode
        const pickingMaterial = createPickingMaterial();
        this.pickingMesh = new THREE.Mesh(geometry.clone(), pickingMaterial);
        this.scene.add(this.pickingMesh);
    }
    
    /**
     * Load hotspots for the current scene
     */
    async loadHotspots(scenePath) {
        try {
            const response = await fetch(`${scenePath}/hotspots.json`);
            if (!response.ok) {
                console.log('No hotspots.json found for this scene');
                return;
            }
            
            const hotspotsData = await response.json();
            
            // Clear existing hotspots
            this.clearHotspots();
            
            // Create hotspot objects
            hotspotsData.forEach(hotspotData => {
                this.createHotspot(hotspotData);
            });
            
            console.log(`Loaded ${hotspotsData.length} hotspots`);
        } catch (error) {
            console.log('No hotspots found for this scene:', error.message);
        }
    }
    
    /**
     * Create a hotspot from data
     */
    createHotspot(hotspotData) {
        // Determine 3D position
        let position;
        if (hotspotData.position) {
            // World coordinates provided - use directly
            position = new THREE.Vector3(...hotspotData.position);
        } else if (hotspotData.uv && hotspotData.d !== undefined) {
            // UV + depth provided - convert to world coordinates
            position = uvDepthToWorld(
                hotspotData.uv[0], 
                hotspotData.uv[1], 
                hotspotData.d,
                this.depthScale,
                this.depthBias,
                this.depthFlip
            );
        } else {
            console.warn('Hotspot missing position data:', hotspotData);
            return;
        }
        
        // Create DOM element
        const element = document.createElement('div');
        element.className = `hotspot ${hotspotData.type || 'info'}`;
        element.textContent = hotspotData.title || 'Untitled';
        element.addEventListener('click', () => this.onHotspotClick(hotspotData));
        
        // Create CSS2D object
        const css2dObject = new CSS2DObject(element);
        css2dObject.position.copy(position);
        
        // Store hotspot data with original UV/depth info for recalculation
        const hotspot = {
            data: hotspotData,
            position: position,
            css2dObject: css2dObject,
            element: element,
            // Store original parameters for updates
            originalUV: hotspotData.uv ? [...hotspotData.uv] : null,
            originalDepth: hotspotData.d !== undefined ? hotspotData.d : null,
            isWorldCoords: !!hotspotData.position // Flag to know if using world coords
        };
        
        this.hotspots.push(hotspot);
        this.scene.add(css2dObject);
    }
    
    /**
     * Handle hotspot click
     */
    onHotspotClick(hotspotData) {
        switch (hotspotData.type) {
            case 'link':
                if (hotspotData.target && this.scenesData.scenes[hotspotData.target]) {
                    this.loadScene(hotspotData.target);
                } else {
                    console.warn('Invalid link target:', hotspotData.target);
                }
                break;
                
            case 'info':
                this.showInfoPopup(hotspotData.title, hotspotData.content || 'No additional information available.');
                break;
                
            default:
                console.warn('Unknown hotspot type:', hotspotData.type);
        }
    }
    
    /**
     * Clear all hotspots
     */
    clearHotspots() {
        this.hotspots.forEach(hotspot => {
            this.scene.remove(hotspot.css2dObject);
        });
        this.hotspots = [];
    }
    
    /**
     * Update hotspot positions when depth parameters change
     */
    updateHotspotPositions() {
        this.hotspots.forEach(hotspot => {
            // Only update hotspots that were created from UV+depth coordinates
            if (!hotspot.isWorldCoords && hotspot.originalUV && hotspot.originalDepth !== null) {
                // Recalculate position with current depth parameters
                const newPosition = uvDepthToWorld(
                    hotspot.originalUV[0],
                    hotspot.originalUV[1], 
                    hotspot.originalDepth,
                    this.depthScale,
                    this.depthBias,
                    this.depthFlip
                );
                
                // Update the CSS2D object position
                hotspot.css2dObject.position.copy(newPosition);
                hotspot.position.copy(newPosition);
            }
            // World coordinate hotspots stay fixed in their absolute positions
        });
    }
    
    /**
     * Dispose current scene resources
     */
    disposeCurrentScene() {
        if (this.currentMesh) {
            this.scene.remove(this.currentMesh);
            this.currentMesh.geometry.dispose();
            this.currentMesh = null;
        }
        
        if (this.pickingMesh) {
            this.scene.remove(this.pickingMesh);
            this.pickingMesh.geometry.dispose();
            this.pickingMesh = null;
        }
        
        if (this.currentMaterial) {
            // Dispose textures
            if (this.currentMaterial.uniforms.tColor.value) {
                this.currentMaterial.uniforms.tColor.value.dispose();
            }
            if (this.currentMaterial.uniforms.tDepth.value) {
                this.currentMaterial.uniforms.tDepth.value.dispose();
            }
            this.currentMaterial.dispose();
            this.currentMaterial = null;
        }
        
        this.clearHotspots();
    }
    
    /**
     * Handle mouse click events
     */
    onMouseClick(event) {
        // Only handle clicks in authoring mode to avoid interfering with controls
        if (this.isAuthoringMode) {
            // Small delay to ensure it's a click, not a drag
            setTimeout(() => {
                this.handleAuthoringClick(event);
            }, 100);
        }
        // In normal mode, let OrbitControls handle everything
    }
    
    /**
     * Handle mouse move events
     */
    onMouseMove(event) {
        // Update mouse coordinates for raycasting
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    /**
     * Handle authoring mode click
     */
    handleAuthoringClick(event) {
        if (!this.pickingMesh) return;
        
        // Update mouse coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Raycast against the displaced mesh (not picking mesh) for accurate positioning
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.currentMesh);
        
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const position = intersection.point;
            const uv = intersection.uv;
            
            // Sample depth at the intersection point for accurate placement
            let depth = 0.5; // Default depth
            if (this.currentMaterial && this.currentMaterial.uniforms.tDepth.value) {
                // This is an approximation - in a real implementation you'd sample the depth texture
                // For now, we'll use the distance from center as depth
                const distance = position.length();
                depth = Math.max(0, Math.min(1, (distance - 1.0) / this.depthScale));
            }
            
            // Create new hotspot with both world coordinates and UV+depth
            const hotspotData = {
                id: `hotspot_${Date.now()}`,
                title: 'New Hotspot',
                type: 'info',
                content: 'This is a new hotspot created in authoring mode.',
                position: [position.x, position.y, position.z],
                uv: uv ? [uv.x, uv.y] : [0.5, 0.5],
                d: depth
            };
            
            this.createHotspot(hotspotData);
            console.log('Created hotspot at world position:', position, 'UV:', uv, 'Depth:', depth);
        }
    }
    
    /**
     * Handle keyboard input
     */
    onKeyDown(event) {
        switch (event.code) {
            case 'KeyA':
                this.toggleAuthoringMode();
                break;
                
            case 'KeyD':
                this.toggleDebugDepth();
                break;
                
            case 'KeyF':
                this.toggleDepthFlip();
                break;
                
            case 'KeyK':
                this.adjustDepthScale(-0.5);
                break;
                
            case 'KeyL':
                this.adjustDepthScale(0.5);
                break;
                
            case 'KeyO':
                this.adjustExposure(-0.2);
                break;
                
            case 'KeyP':
                this.adjustExposure(0.2);
                break;
                
            case 'KeyT':
                this.testControls();
                break;
                
            case 'KeyE':
                if (this.isAuthoringMode) {
                    this.exportHotspots();
                }
                break;
                
            case 'Escape':
                this.hideInstructions();
                this.hideInfoPopup();
                break;
                
            case 'F1':
                event.preventDefault();
                this.showInstructions();
                break;
        }
    }
    
    /**
     * Toggle authoring mode
     */
    toggleAuthoringMode() {
        this.isAuthoringMode = !this.isAuthoringMode;
        this.updateHUD();
        console.log('Authoring mode:', this.isAuthoringMode ? 'ON' : 'OFF');
    }
    
    /**
     * Toggle debug depth view
     */
    toggleDebugDepth() {
        this.debugDepth = !this.debugDepth;
        if (this.currentMaterial) {
            this.currentMaterial.uniforms.debugDepth.value = this.debugDepth;
        }
        console.log('Debug depth:', this.debugDepth ? 'ON' : 'OFF');
    }
    
    /**
     * Toggle depth flip
     */
    toggleDepthFlip() {
        this.depthFlip = !this.depthFlip;
        if (this.currentMaterial) {
            this.currentMaterial.uniforms.depthFlip.value = this.depthFlip;
        }
        // Update hotspot positions to match new depth flip state
        this.updateHotspotPositions();
        console.log('Depth flip:', this.depthFlip ? 'ON' : 'OFF');
    }
    
    /**
     * Adjust depth scale
     */
    adjustDepthScale(delta) {
        this.depthScale = Math.max(0.5, this.depthScale + delta);
        if (this.currentMaterial) {
            this.currentMaterial.uniforms.depthScale.value = this.depthScale;
        }
        // Update hotspot positions to match new depth scale
        this.updateHotspotPositions();
        this.updateHUD();
        console.log('Depth scale:', this.depthScale);
    }
    
    /**
     * Adjust exposure
     */
    adjustExposure(delta) {
        this.exposure = Math.max(0.01, this.exposure + delta); // Remove upper limit, keep minimum at 0.01
        if (this.currentMaterial) {
            this.currentMaterial.uniforms.exposure.value = this.exposure;
        }
        this.updateHUD();
        console.log('Exposure:', this.exposure.toFixed(2));
    }
    
    /**
     * Test controls functionality
     */
    testControls() {
        console.log('=== Controls Debug Info ===');
        console.log('Controls enabled:', this.controls.enabled);
        console.log('Rotate enabled:', this.controls.enableRotate);
        console.log('Camera position:', this.camera.position);
        console.log('Controls target:', this.controls.target);
        console.log('Mouse buttons:', this.controls.mouseButtons);
        console.log('DOM element:', this.controls.domElement);
        
        // Try to manually rotate the camera
        this.camera.rotation.y += 0.1;
        console.log('Manual rotation applied');
    }
    
    /**
     * Export hotspots to console
     */
    exportHotspots() {
        const exportData = this.hotspots.map(hotspot => {
            const data = { ...hotspot.data };
            
            // Always include world coordinates with high precision
            data.position = [
                parseFloat(hotspot.position.x.toFixed(6)), 
                parseFloat(hotspot.position.y.toFixed(6)), 
                parseFloat(hotspot.position.z.toFixed(6))
            ];
            
            // Include UV+depth if available
            if (hotspot.originalUV && hotspot.originalDepth !== null) {
                data.uv = [
                    parseFloat(hotspot.originalUV[0].toFixed(6)),
                    parseFloat(hotspot.originalUV[1].toFixed(6))
                ];
                data.d = parseFloat(hotspot.originalDepth.toFixed(6));
            } else {
                // Calculate UV+depth from world position if not available
                const uvDepth = worldToUvDepth(
                    hotspot.position,
                    this.depthScale,
                    this.depthBias,
                    this.depthFlip
                );
                data.uv = [parseFloat(uvDepth.u.toFixed(6)), parseFloat(uvDepth.v.toFixed(6))];
                data.d = parseFloat(uvDepth.d.toFixed(6));
            }
            
            return data;
        });
        
        console.log('Hotspots export (enhanced precision):');
        console.log(JSON.stringify(exportData, null, 2));
        
        // Also copy to clipboard if possible
        if (navigator.clipboard) {
            navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
            console.log('Hotspots copied to clipboard');
        }
    }
    
    /**
     * Update HUD display
     */
    updateHUD() {
        if (this.hudElements.sceneName && this.currentScene && this.scenesData) {
            const sceneTitle = this.scenesData.scenes[this.currentScene]?.title || this.currentScene;
            this.hudElements.sceneName.textContent = `Scene: ${sceneTitle}`;
        }
        
        if (this.hudElements.depthScale) {
            this.hudElements.depthScale.textContent = `Depth Scale: ${this.depthScale.toFixed(1)} | Exposure: ${this.exposure.toFixed(1)}`;
        }
        
        if (this.hudElements.authoringStatus) {
            this.hudElements.authoringStatus.textContent = this.isAuthoringMode ? 
                'AUTHORING MODE - Click to place hotspots, Press E to export' : '';
        }
    }
    
    /**
     * Show loading overlay
     */
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
        }
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
    }
    
    /**
     * Show instructions overlay
     */
    showInstructions() {
        if (this.instructionsOverlay) {
            this.instructionsOverlay.classList.remove('hidden');
        }
    }
    
    /**
     * Hide instructions overlay
     */
    hideInstructions() {
        if (this.instructionsOverlay) {
            this.instructionsOverlay.classList.add('hidden');
        }
    }
    
    /**
     * Show info popup
     */
    showInfoPopup(title, content) {
        if (this.infoPopup) {
            const contentElement = document.getElementById('info-content');
            contentElement.innerHTML = `<h3>${title}</h3><p>${content}</p>`;
            this.infoPopup.classList.remove('hidden');
        }
    }
    
    /**
     * Hide info popup
     */
    hideInfoPopup() {
        if (this.infoPopup) {
            this.infoPopup.classList.add('hidden');
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // Could implement a proper error UI here
        alert(message);
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.css2dRenderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Render
        this.renderer.render(this.scene, this.camera);
        this.css2dRenderer.render(this.scene, this.camera);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DepthTour();
});
