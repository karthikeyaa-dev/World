// ===== zoom.js =====
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

let camera;
let minZoom = 5;
let maxZoom = 25;
let zoomSpeed = 0.05;

// Initialize zoom controls
export function initZoom(cameraRef, options = {}) {
  camera = cameraRef;
  minZoom = options.minZoom || 5;
  maxZoom = options.maxZoom || 25;
  zoomSpeed = options.zoomSpeed || 0.05;
  
  // Add wheel event listener with proper options
  window.addEventListener('wheel', onWheel, { passive: false });
  
  console.log(`✅ Zoom controls initialized - Range: ${minZoom} to ${maxZoom}`);
  console.log(`Current camera Z: ${camera.position.z}`);
}

// Handle mouse wheel zoom
function onWheel(event) {
  event.preventDefault();
  event.stopPropagation();
  
  // Determine zoom direction
  const delta = event.deltaY > 0 ? 1 : -1;
  
  // Calculate new zoom level
  let newZ = camera.position.z + (delta * zoomSpeed);
  
  // Clamp to min/max
  newZ = Math.max(minZoom, Math.min(maxZoom, newZ));
  
  // Only update if value changed
  if (newZ !== camera.position.z) {
    camera.position.z = newZ;
    camera.updateProjectionMatrix();
    console.log(`Zoom level: ${newZ.toFixed(2)}`); // Debug log
  }
}

// Handle touch pinch zoom for mobile devices
let initialTouchDistance = 0;
let initialZoom = 0;

function onTouchMove(event) {
  if (event.touches.length === 2) {
    event.preventDefault();
    
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (initialTouchDistance === 0) {
      initialTouchDistance = distance;
      initialZoom = camera.position.z;
      return;
    }
    
    const zoomChange = initialZoom - (distance - initialTouchDistance) * 0.02;
    let newZ = Math.max(minZoom, Math.min(maxZoom, zoomChange));
    
    if (newZ !== camera.position.z) {
      camera.position.z = newZ;
      camera.updateProjectionMatrix();
    }
  }
}

window.addEventListener('touchmove', onTouchMove, { passive: false });
window.addEventListener('touchend', () => {
  initialTouchDistance = 0;
});

// Smooth zoom with damping
let targetZoom = null;
let zoomAnimationId = null;

export function enableSmoothZoom(damping = 0.1) {
  targetZoom = camera.position.z;
  
  function smoothZoomUpdate() {
    if (targetZoom !== null) {
      const currentZ = camera.position.z;
      const diff = targetZoom - currentZ;
      
      if (Math.abs(diff) > 0.01) {
        camera.position.z += diff * damping;
        camera.updateProjectionMatrix();
        zoomAnimationId = requestAnimationFrame(smoothZoomUpdate);
      } else {
        camera.position.z = targetZoom;
        camera.updateProjectionMatrix();
        targetZoom = null;
        if (zoomAnimationId) {
          cancelAnimationFrame(zoomAnimationId);
          zoomAnimationId = null;
        }
      }
    }
  }
  
  // Override wheel handler for smooth zoom
  window.removeEventListener('wheel', onWheel);
  window.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    let newZ = targetZoom !== null ? targetZoom : camera.position.z;
    newZ += delta * zoomSpeed;
    newZ = Math.max(minZoom, Math.min(maxZoom, newZ));
    targetZoom = newZ;
    
    if (!zoomAnimationId) {
      zoomAnimationId = requestAnimationFrame(smoothZoomUpdate);
    }
  }, { passive: false });
}

// Get current zoom level
export function getCurrentZoom() {
  return camera.position.z;
}

// Remove zoom controls
export function removeZoomControls() {
  window.removeEventListener('wheel', onWheel);
  window.removeEventListener('touchmove', onTouchMove);
  console.log('✅ Zoom controls removed');
}
