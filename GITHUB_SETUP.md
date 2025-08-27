# GitHub Repository Setup Guide

## Step 1: Create Repository on GitHub

1. **Go to GitHub**: https://github.com
2. **Sign in** to your GitHub account (or create one if needed)
3. **Click the "+" icon** in the top-right corner
4. **Select "New repository"**

## Step 2: Repository Settings

Fill out the form:
- **Repository name**: `depth-tour` (or any name you prefer)
- **Description**: `Three.js panorama viewer with depth-based parallax and interactive hotspots`
- **Visibility**: Choose Public or Private
- **DO NOT** initialize with README, .gitignore, or license (we already have these)

## Step 3: Connect Local Repository to GitHub

After creating the repository on GitHub, copy the repository URL and run these commands:

```bash
# Add GitHub as remote origin (replace YOUR_USERNAME and YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Verify Upload

1. **Refresh your GitHub repository page**
2. **Verify all files are uploaded**:
   - ✅ index.html
   - ✅ depthTour.js  
   - ✅ shaders.js
   - ✅ main.css
   - ✅ package.json
   - ✅ README.md
   - ✅ scenes.json
   - ✅ scenes/ folder with content

## Future Usage

### To save changes:
```bash
git add .
git commit -m "Description of your changes"
git push
```

### To revert to any previous version:
```bash
# See all commits
git log --oneline

# Revert to specific commit (replace COMMIT_HASH)
git reset --hard COMMIT_HASH
git push --force-with-lease
```

### To create branches for experiments:
```bash
# Create and switch to new branch
git checkout -b feature/experiment

# Make changes, commit them
git add .
git commit -m "Experimental changes"
git push -u origin feature/experiment

# Switch back to main
git checkout main
```

## Example Repository URLs

Replace these with your actual details:
- **Repository URL**: https://github.com/YOUR_USERNAME/depth-tour
- **Clone URL**: https://github.com/YOUR_USERNAME/depth-tour.git

## Current Repository Status

✅ **Git initialized**
✅ **Initial commit created** with all project files
✅ **.gitignore configured** to exclude node_modules
✅ **Ready to push to GitHub**

Your local repository is ready! Just follow the steps above to push it to GitHub.
