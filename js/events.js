// ===== events.js =====
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

let eventMesh, eventData = [];
let tooltip;
let eventCanvas;
let blinkTimer = 0;

// Simple tooltip
function initTooltip() {
  if (tooltip) return;

  tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
  tooltip.style.color = 'white';
  tooltip.style.padding = '8px 12px';
  tooltip.style.borderRadius = '6px';
  tooltip.style.fontSize = '12px';
  tooltip.style.fontFamily = 'sans-serif';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.display = 'none';
  tooltip.style.zIndex = '1000';
  tooltip.style.borderLeft = '3px solid';
  document.body.appendChild(tooltip);
}

// Convert lat/lon to UV coordinates
function latLonToUV(lat, lon) {
  return {
    u: (lon + 180) / 360,
    v: (90 - lat) / 180
  };
}

// Get color based on actual event category ID from NASA EONET
function getEventColor(category) {
  const categoryTitle = category?.title || category || 'Unknown';
  
  const colors = {
    'wildfires': '#FF0000',      // Bright Red
    'earthquakes': '#FF6600',    // Bright Orange
    'floods': '#0066FF',         // Bright Blue
    'severe storms': '#00FF00',  // Bright Green
    'volcanoes': '#FF00FF',      // Bright Magenta
    'drought': '#FFFF00',        // Bright Yellow
    'icebergs': '#00FFFF',       // Bright Cyan
    'sea and lake ice': '#00CCFF', // Light Blue
    'landslides': '#FF4400',     // Orange-Red
    'manmade': '#FF0066'         // Pink
  };
  
  const lowerTitle = categoryTitle.toLowerCase();
  for (const [key, color] of Object.entries(colors)) {
    if (lowerTitle.includes(key)) {
      return color;
    }
  }
  
  return '#FF0066';
}

// Load events and create dots
export async function loadEvents(globeGroup, radius, camera, renderer, scene) {
  initTooltip();

  if (eventMesh) {
    globeGroup.remove(eventMesh);
  }

  try {
    const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?limit=50&status=open');
    const data = await response.json();
    eventData = data.events;

    // Create canvas
    eventCanvas = document.createElement('canvas');
    eventCanvas.width = 2048;
    eventCanvas.height = 1024;
    
    updateCanvasDots();
    
    const texture = new THREE.CanvasTexture(eventCanvas);
    const geometry = new THREE.SphereGeometry(radius + 0.02, 256, 256);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 1
    });
    
    eventMesh = new THREE.Mesh(geometry, material);
    globeGroup.add(eventMesh);
    
    setupHoverDetection(camera, renderer);
    
    console.log(`✅ Loaded ${eventData.length} events`);
    
  } catch (error) {
    console.error('Error loading events:', error);
  }
}

// Update canvas with small bright dots
function updateCanvasDots() {
  if (!eventCanvas) return;
  
  const ctx = eventCanvas.getContext('2d');
  ctx.clearRect(0, 0, eventCanvas.width, eventCanvas.height);
  
  eventData.forEach(event => {
    const latest = event.geometry[event.geometry.length - 1];
    if (!latest || !latest.coordinates) return;
    
    const [lon, lat] = latest.coordinates;
    const { u, v } = latLonToUV(lat, lon);
    const x = u * eventCanvas.width;
    const y = v * eventCanvas.height;
    
    const category = event.categories[0];
    const color = getEventColor(category);
    
    // Small outer glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 4);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.6, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Small core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Tiny white center
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, 0.8, 0, Math.PI * 2);
    ctx.fill();
  });
  
  if (eventMesh && eventMesh.material.map) {
    eventMesh.material.map.needsUpdate = true;
  }
}

// Blink animation with smaller dots
let lastTime = 0;
export function animateEvents(currentTime) {
  if (!eventCanvas) return;
  
  if (!lastTime || currentTime - lastTime > 400) {
    lastTime = currentTime;
    blinkTimer = (blinkTimer + 1) % 2;
    updateCanvasDotsBlink();
  }
  
  requestAnimationFrame(animateEvents);
}

// Blinking with small dots
function updateCanvasDotsBlink() {
  if (!eventCanvas) return;
  
  const ctx = eventCanvas.getContext('2d');
  ctx.clearRect(0, 0, eventCanvas.width, eventCanvas.height);
  
  eventData.forEach(event => {
    const latest = event.geometry[event.geometry.length - 1];
    if (!latest || !latest.coordinates) return;
    
    const [lon, lat] = latest.coordinates;
    const { u, v } = latLonToUV(lat, lon);
    const x = u * eventCanvas.width;
    const y = v * eventCanvas.height;
    
    const category = event.categories[0];
    const color = getEventColor(category);
    
    if (blinkTimer === 0) {
      // State 1: Slightly larger glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 5);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.6, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // State 2: Smaller glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 3);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.6, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x, y, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  if (eventMesh && eventMesh.material.map) {
    eventMesh.material.map.needsUpdate = true;
  }
}

// Setup hover detection
function setupHoverDetection(camera, renderer) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  window.addEventListener('mousemove', (event) => {
    if (!eventMesh || !eventCanvas) return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(eventMesh);
    
    if (intersects.length > 0 && intersects[0].uv) {
      const uv = intersects[0].uv;
      const px = Math.floor(uv.x * eventCanvas.width);
      const py = Math.floor((1 - uv.y) * eventCanvas.height);
      
      let found = null;
      let minDistance = 8; // Reduced detection radius for smaller dots
      
      for (const ev of eventData) {
        const latest = ev.geometry[ev.geometry.length - 1];
        if (!latest || !latest.coordinates) continue;
        
        const [lon, lat] = latest.coordinates;
        const { u, v } = latLonToUV(lat, lon);
        const dx = px - u * eventCanvas.width;
        const dy = py - v * eventCanvas.height;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          found = ev;
        }
      }
      
      if (found) {
        const latest = found.geometry[found.geometry.length - 1];
        const category = found.categories[0];
        const categoryName = category?.title || 'Unknown';
        const color = getEventColor(category);
        
        tooltip.style.display = 'block';
        tooltip.style.left = event.clientX + 15 + 'px';
        tooltip.style.top = event.clientY + 15 + 'px';
        tooltip.style.borderLeftColor = color;
        tooltip.innerHTML = `
          <strong>${found.title || 'Natural Event'}</strong><br>
          <span style="color: ${color}; font-size: 14px;">●</span> ${categoryName}<br>
          📅 ${new Date(latest.date).toLocaleDateString()}
        `;
      } else {
        tooltip.style.display = 'none';
      }
    } else {
      tooltip.style.display = 'none';
    }
  });
}

// Cleanup
export function cleanupEvents() {
  if (eventMesh && eventMesh.parent) {
    eventMesh.parent.remove(eventMesh);
  }
  if (tooltip) {
    tooltip.remove();
  }
}
