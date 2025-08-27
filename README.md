# Depth Tour - Three.js Panorama with DIBR

A production-ready Three.js application for rendering equirectangular panoramas with depth-based parallax effects (DIBR - Depth Image Based Rendering) and interactive hotspots.

## Features

- **Depth-based Parallax**: Uses depth maps to create realistic parallax effects when viewing panoramas
- **Interactive Hotspots**: Place and interact with hotspots that stay fixed in 3D space
- **Multiple Scenes**: Support for multiple panorama scenes with seamless transitions
- **Authoring Mode**: Click-to-place hotspots and export configurations
- **Debug Controls**: Real-time depth visualization and parameter adjustment
- **WebGL Performance**: Optimized shaders and resource management

## Quick Start

### Option 1: Simple HTTP Server
```bash
# Install a simple HTTP server
npm install -g http-server

# Run the server
http-server . -p 8080 -o
```

### Option 2: Using Vite (Recommended for development)
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Option 3: Using any static file server
Just serve the files from any static web server (Apache, Nginx, etc.)

## Controls

- **Mouse**: Look around the panorama
- **A**: Toggle authoring mode (click to place hotspots)
- **D**: Toggle depth debug view (shows depth map as grayscale)
- **F**: Flip depth direction
- **K/L**: Decrease/Increase depth scale
- **E**: Export hotspots (in authoring mode)
- **ESC**: Close overlays
- **F1**: Show help

## File Structure

```
depth-tour/
├── index.html          # Main entry point
├── main.css           # UI and styling
├── depthTour.js       # Main application logic
├── shaders.js         # WebGL shaders for depth displacement
├── scenes.json        # Scene configuration
└── scenes/
    ├── lobby/
    │   ├── pano.png       # Equirectangular panorama image
    │   ├── depth.png      # Depth map (16-bit grayscale preferred)
    │   └── hotspots.json  # Hotspot definitions
    └── hall/
        ├── pano.png
        ├── depth.png
        └── hotspots.json
```

## Adding Your Own Content

### 1. Panorama Images
- Format: Equirectangular (2:1 aspect ratio)
- Resolution: 4K+ recommended (4096x2048 or higher)
- Format: PNG or JPG
- Color space: sRGB

### 2. Depth Maps
- Format: 16-bit grayscale PNG (preferred) or EXR
- Same resolution as panorama
- Black = closest, White = farthest
- Normalized depth values [0,1]

### 3. Scene Configuration
Edit `scenes.json`:
```json
{
  "start": "your-scene",
  "scenes": {
    "your-scene": {
      "title": "Your Scene Title",
      "path": "scenes/your-scene"
    }
  }
}
```

### 4. Hotspots
Use authoring mode or manually edit `hotspots.json`:
```json
[
  {
    "id": "unique-id",
    "title": "Hotspot Label",
    "type": "link|info",
    "target": "scene-name",
    "content": "Info text...",
    "uv": [0.5, 0.5],
    "d": 0.6,
    "position": [x, y, z]
  }
]
```

## Technical Details

### Depth Processing
- EXR files are loaded with FloatType for maximum precision
- PNG depth maps are treated as normalized [0,1] values
- Vertex displacement is applied along view direction from sphere center
- Depth can be flipped, scaled, and biased in real-time

### Shader Pipeline
- **Vertex Shader**: Samples depth texture and displaces vertices
- **Fragment Shader**: Samples panorama color or displays debug depth
- **Uniforms**: Real-time control of depth parameters

### Performance Optimizations
- SRGBColorSpace for color textures
- NearestFilter for depth textures to avoid blurring
- Proper GPU resource disposal on scene changes
- Efficient sphere geometry with appropriate subdivision

## Browser Support

- Modern browsers with WebGL 2.0 support
- Chrome 56+, Firefox 51+, Safari 10+, Edge 79+

## Troubleshooting

### Common Issues

1. **Black screen**: Check browser console for errors, ensure textures are loading
2. **No parallax effect**: Verify depth map is loading and depthScale > 0
3. **Hotspots not appearing**: Check hotspots.json format and file paths
4. **Performance issues**: Reduce panorama resolution or sphere geometry subdivision

### Debug Tips

- Press 'D' to view depth map directly
- Check browser developer tools Network tab for failed resource loads
- Use the HUD to monitor current depth scale and scene name
- Console logs provide detailed loading information

## License

MIT License - feel free to use in commercial and personal projects.

## Credits

Based on the official Three.js WebXR VR Panorama Depth example:
https://github.com/mrdoob/three.js/blob/master/examples/webxr_vr_panorama_depth.html
