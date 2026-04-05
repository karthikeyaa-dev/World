// ===== drag.js =====
let globeGroup;
let camera;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotationSpeed = 0.005;
let targetRotation = { x: 0, y: 0 };

// Initialize drag controls (NO AUTO-ROTATION)
export function initDrag(globeGroupRef, cameraRef, options = {}) {
  globeGroup = globeGroupRef;
  camera = cameraRef;
  rotationSpeed = options.rotationSpeed || 0.005;
  
  // Store initial rotations
  targetRotation.x = globeGroup.rotation.x;
  targetRotation.y = globeGroup.rotation.y;
  
  // Mouse events
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  
  // Touch events for mobile
  window.addEventListener('touchstart', onTouchStart);
  window.addEventListener('touchmove', onTouchMove);
  window.addEventListener('touchend', onTouchEnd);
  
  // Start smooth animation loop
  startSmoothAnimation();
  
  console.log('✅ Drag controls initialized - Smooth drag to rotate globe');
}

// Start smooth animation loop
function startSmoothAnimation() {
  function animate() {
    if (globeGroup) {
      // Apply smooth interpolation
      globeGroup.rotation.x += (targetRotation.x - globeGroup.rotation.x) * 0.15;
      globeGroup.rotation.y += (targetRotation.y - globeGroup.rotation.y) * 0.15;
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// Mouse down event
function onMouseDown(event) {
  isDragging = true;
  previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
  
  // Set cursor style
  document.body.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none';
}

// Mouse move event with smooth interpolation
function onMouseMove(event) {
  if (!isDragging) return;
  
  const deltaX = event.clientX - previousMousePosition.x;
  const deltaY = event.clientY - previousMousePosition.y;
  
  // Update target rotations
  targetRotation.y += deltaX * rotationSpeed;
  targetRotation.x += deltaY * rotationSpeed;
  
  // Limit vertical rotation to prevent flipping
  targetRotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotation.x));
  
  previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
}

// Mouse up event
function onMouseUp() {
  isDragging = false;
  document.body.style.cursor = 'default';
  document.body.style.userSelect = '';
}

// Touch events for mobile with smooth dragging
function onTouchStart(event) {
  if (event.touches.length === 1) {
    isDragging = true;
    previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
    event.preventDefault();
  }
}

function onTouchMove(event) {
  if (!isDragging || event.touches.length !== 1) return;
  
  const deltaX = event.touches[0].clientX - previousMousePosition.x;
  const deltaY = event.touches[0].clientY - previousMousePosition.y;
  
  targetRotation.y += deltaX * rotationSpeed;
  targetRotation.x += deltaY * rotationSpeed;
  
  targetRotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotation.x));
  
  previousMousePosition = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY
  };
  event.preventDefault();
}

function onTouchEnd() {
  isDragging = false;
}

// No auto-rotation
export function updateAutoRotate(currentTime) {
  // Auto-rotation disabled
  return;
}

// Reset rotation to default smoothly
export function resetRotation(duration = 500) {
  const startY = targetRotation.y;
  const startX = targetRotation.x;
  const startTime = performance.now();
  
  function animateReset(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / duration);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    targetRotation.y = startY * (1 - easeProgress);
    targetRotation.x = startX * (1 - easeProgress);
    
    if (progress < 1) {
      requestAnimationFrame(animateReset);
    }
  }
  
  requestAnimationFrame(animateReset);
}

// Get current rotation
export function getRotation() {
  return {
    x: targetRotation.x,
    y: targetRotation.y,
    z: globeGroup?.rotation.z || 0
  };
}

// Set rotation instantly
export function setRotation(x, y) {
  targetRotation.x = x;
  targetRotation.y = y;
  if (globeGroup) {
    globeGroup.rotation.x = x;
    globeGroup.rotation.y = y;
  }
}

// Clean up
export function removeDragControls() {
  window.removeEventListener('mousedown', onMouseDown);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('touchstart', onTouchStart);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);
  document.body.style.cursor = 'default';
  document.body.style.userSelect = '';
}
