# Placeholder Images

This directory contains placeholder files. You need to replace these with actual content:

## Required Files for Each Scene:

### pano.png
- Equirectangular panorama image (2:1 aspect ratio)
- Recommended resolution: 4096x2048 or higher
- Format: PNG or JPG
- Color space: sRGB

### depth.png or depth.exr
- Depth map corresponding to the panorama
- Same resolution as panorama
- **depth.exr**: 32-bit float EXR (preferred for highest quality)
- **depth.png**: 16-bit grayscale PNG (good alternative)
- Black = closest distance, White = farthest distance
- Values should be normalized [0,1]

## How to Generate Depth Maps:

1. **From 3D Software**: If you rendered the panorama from 3D software (Blender, Maya, 3ds Max), render a depth pass
2. **AI-based**: Use AI depth estimation tools like MiDaS or DPT
3. **Photogrammetry**: From depth data if captured with LIDAR or structured light
4. **Manual**: Paint depth information in Photoshop (less accurate but possible)

## Example Workflow with Blender:

1. Set up equirectangular camera
2. Render color pass to get pano.png
3. Set up depth pass (use normalized depth, 0-1 range)
4. Render depth pass to get depth.exr
5. Place both files in the scene directory

## Testing:

- Start with simple test images to verify the pipeline works
- Use debug mode (press 'D') to visualize depth maps
- Adjust depthScale (K/L keys) to fine-tune parallax effect

Replace these placeholder files with your actual panorama content!
