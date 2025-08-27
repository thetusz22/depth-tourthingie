/**
 * Depth Tour Shaders
 * 
 * Vertex and fragment shaders for rendering equirectangular panoramas
 * with depth-based vertex displacement (DIBR - Depth Image Based Rendering)
 */

import * as THREE from 'three';

// Vertex shader for depth-displaced sphere
export const depthVertexShader = `
    // Uniforms
    uniform sampler2D tDepth;
    uniform float depthScale;
    uniform float depthBias;
    uniform bool depthFlip;
    uniform float seamFix;
    
    // Varyings to pass to fragment shader
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;
    
    // Helper function to convert UV coordinates to spherical coordinates
    vec3 uvToSphere(vec2 uv) {
        // Convert UV to spherical coordinates
        float phi = (uv.x - 0.5) * 2.0 * 3.14159265359; // longitude: -π to π
        float theta = (uv.y - 0.5) * 3.14159265359;     // latitude: -π/2 to π/2
        
        // Convert to Cartesian coordinates (unit sphere)
        float x = cos(theta) * sin(phi);
        float y = sin(theta);
        float z = cos(theta) * cos(phi);
        
        return vec3(x, y, z);
    }
    
    // Helper function to clamp UV coordinates and handle pole artifacts
    vec2 clampUV(vec2 uv) {
        // Clamp to valid range with small epsilon to avoid pole artifacts
        float epsilon = 0.001;
        return vec2(
            clamp(uv.x, epsilon, 1.0 - epsilon),
            clamp(uv.y, epsilon, 1.0 - epsilon)
        );
    }
    
    void main() {
        // Pass UV coordinates to fragment shader
        vUv = uv;
        
        // Apply seam fix to UV coordinates for depth sampling
        vec2 depthUV = clampUV(vec2(uv.x + seamFix, uv.y));
        
        // Sample depth value from depth texture
        vec4 depthSample = texture2D(tDepth, depthUV);
        float depth = depthSample.r; // Use red channel for grayscale depth
        
        // Apply depth flip if enabled
        if (depthFlip) {
            depth = 1.0 - depth;
        }
        
        // Apply depth bias and scale
        depth = (depth + depthBias) * depthScale;
        
        // Get the original vertex position (normalized sphere position)
        vec3 spherePos = normalize(position);
        
        // Calculate displacement along the view direction (from center to vertex)
        vec3 displacement = spherePos * depth;
        
        // Apply displacement to create parallax effect
        vec3 displacedPosition = spherePos + displacement;
        
        // Store world position and view direction for fragment shader
        vWorldPosition = displacedPosition;
        vViewDirection = normalize(displacedPosition);
        
        // Transform to clip space
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
    }
`;

// Fragment shader for panorama rendering
export const depthFragmentShader = `
    // Uniforms
    uniform sampler2D tColor;
    uniform sampler2D tDepth;
    uniform bool debugDepth;
    uniform float seamFix;
    uniform float exposure;
    
    // Varyings from vertex shader
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;
    
    // Helper function to convert 3D direction to UV coordinates
    vec2 directionToUV(vec3 dir) {
        // Normalize the direction vector
        vec3 normalized = normalize(dir);
        
        // Convert to spherical coordinates
        float phi = atan(normalized.x, normalized.z);    // longitude
        float theta = asin(normalized.y);                // latitude
        
        // Convert to UV coordinates [0,1]
        float u = (phi / (2.0 * 3.14159265359)) + 0.5;
        float v = (theta / 3.14159265359) + 0.5;
        
        return vec2(u, v);
    }
    
    // Helper function to clamp UV coordinates
    vec2 clampUV(vec2 uv) {
        float epsilon = 0.001;
        return vec2(
            clamp(uv.x, epsilon, 1.0 - epsilon),
            clamp(uv.y, epsilon, 1.0 - epsilon)
        );
    }
    
    void main() {
        // Use the original UV coordinates for color sampling
        vec2 colorUV = clampUV(vec2(vUv.x + seamFix, vUv.y));
        
        if (debugDepth) {
            // Debug mode: show depth map as grayscale
            vec4 depthSample = texture2D(tDepth, colorUV);
            float depth = depthSample.r;
            gl_FragColor = vec4(depth, depth, depth, 1.0);
        } else {
            // Normal mode: sample and display the panorama color
            vec4 colorSample = texture2D(tColor, colorUV);
            
            // Apply exposure adjustment
            vec3 exposedColor = colorSample.rgb * exposure;
            
            gl_FragColor = vec4(exposedColor, 1.0);
        }
    }
`;

// Simple vertex shader for hotspot picking geometry (no displacement)
export const pickingVertexShader = `
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Simple fragment shader for hotspot picking (invisible)
export const pickingFragmentShader = `
    varying vec2 vUv;
    
    void main() {
        // Make completely transparent for picking
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
`;

// Utility function to create a material with the depth displacement shaders
export function createDepthMaterial(colorTexture, depthTexture, options = {}) {
    const uniforms = {
        tColor: { value: colorTexture },
        tDepth: { value: depthTexture },
        depthScale: { value: options.depthScale || 3.0 },
        depthBias: { value: options.depthBias || 0.0 },
        depthFlip: { value: options.depthFlip || false },
        debugDepth: { value: options.debugDepth || false },
        seamFix: { value: options.seamFix || 0.0 },
        exposure: { value: options.exposure || 1.0 }
    };
    
    return new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: depthVertexShader,
        fragmentShader: depthFragmentShader,
        side: THREE.BackSide, // Render inside of sphere
        transparent: false,
        depthWrite: true,
        depthTest: true
    });
}

// Utility function to create a picking material for hotspot placement
export function createPickingMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: pickingVertexShader,
        fragmentShader: pickingFragmentShader,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        visible: false // Hidden by default
    });
}

// Helper function to convert UV and depth to world coordinates
// This matches the vertex shader displacement logic
export function uvDepthToWorld(u, v, depth, depthScale = 3.0, depthBias = 0.0, depthFlip = false) {
    // Apply depth transformations
    if (depthFlip) {
        depth = 1.0 - depth;
    }
    depth = (depth + depthBias) * depthScale;
    
    // Convert UV to spherical coordinates
    const phi = (u - 0.5) * 2.0 * Math.PI; // longitude: -π to π
    const theta = (v - 0.5) * Math.PI;     // latitude: -π/2 to π/2
    
    // Convert to Cartesian coordinates (unit sphere)
    const x = Math.cos(theta) * Math.sin(phi);
    const y = Math.sin(theta);
    const z = Math.cos(theta) * Math.cos(phi);
    
    // Create sphere position and apply displacement
    const spherePos = new THREE.Vector3(x, y, z).normalize();
    const displacement = spherePos.clone().multiplyScalar(depth);
    
    return spherePos.add(displacement);
}

// Helper function to approximate world coordinates back to UV and depth
// This is an approximation for the reverse transformation
export function worldToUvDepth(worldPos, depthScale = 3.0, depthBias = 0.0, depthFlip = false) {
    // Normalize to get direction
    const direction = worldPos.clone().normalize();
    
    // Convert to spherical coordinates
    const phi = Math.atan2(direction.x, direction.z);
    const theta = Math.asin(direction.y);
    
    // Convert to UV
    const u = (phi / (2.0 * Math.PI)) + 0.5;
    const v = (theta / Math.PI) + 0.5;
    
    // Estimate depth (this is approximate)
    const distance = worldPos.length();
    const unitSphereDistance = 1.0;
    let depth = (distance - unitSphereDistance) / depthScale - depthBias;
    
    // Apply depth flip if enabled
    if (depthFlip) {
        depth = 1.0 - depth;
    }
    
    // Clamp depth to valid range
    depth = Math.max(0.0, Math.min(1.0, depth));
    
    return { u, v, d: depth };
}
