// ===== main.js =====
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { initInteraction } from './interaction.js';
import { loadEvents, animateEvents } from './events.js';
import { initZoom, enableSmoothZoom } from './zoom.js';
import { initDrag, updateAutoRotate } from './drag.js';

const container = document.getElementById('globe-container');
const themeBtn = document.getElementById('theme-toggle');

// Scene
const scene = new THREE.Scene();

// Themes (keep colors for globe only)
const themes = {
  light: {
    oceanColor: '#8CCDEB',
    landColor: '#FCECDD',
    borderColor: '#8CCDEB',
  },
  dark: {
    oceanColor: '#1a1a2e',
    landColor: '#2a2a3e',
    borderColor: '#4a4a5e',
  }
};

let currentTheme = localStorage.getItem('theme') || 'dark';

// Sizes
const sizes = { width: window.innerWidth, height: window.innerHeight };

// Camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0, 0, 15);

// ✅ Renderer (GLASS ENABLED)
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true // ⭐ IMPORTANT
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ✅ Transparent background
renderer.setClearColor(0x000000, 0);
scene.background = null;

container.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
backLight.position.set(-5, -5, -7);
scene.add(backLight);

// Globe group
const globeGroup = new THREE.Group();
scene.add(globeGroup);

const globeRadius = 5.0;
let globeMesh = null;
let geoData = null;
let eventsInitialized = false;

// Controls
initDrag(globeGroup, camera, { rotationSpeed: 0.005 });
initZoom(camera, { minZoom: 1, maxZoom: 25, zoomSpeed: 0.08 });
enableSmoothZoom(0.15);

// ===== Load GeoJSON =====
async function loadGeoData() {
  const res = await fetch('assets/countries.geo.json');
  geoData = await res.json();
}

// ===== Load SVGs =====
let sunSVG = '', moonSVG = '';
async function loadSVGs() {
  sunSVG = await (await fetch('assets/sun.svg')).text();
  moonSVG = await (await fetch('assets/moon.svg')).text();
}

// ===== Create Globe Texture =====
function createTexture(theme) {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = theme.oceanColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = theme.landColor;
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 2;

  function drawRing(ring) {
    ctx.beginPath();
    ring.forEach(([lon, lat], i) => {
      const x = (lon + 180) * (canvas.width / 360);
      const y = (90 - lat) * (canvas.height / 180);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  geoData.features.forEach(f => {
    const g = f.geometry;
    if (g.type === 'Polygon') g.coordinates.forEach(drawRing);
    else g.coordinates.forEach(p => p.forEach(drawRing));
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// ===== Init Globe =====
async function initGlobe(themeName) {
  const texture = createTexture(themes[themeName]);

  if (globeMesh) {
    globeGroup.remove(globeMesh);
    globeMesh.geometry.dispose();
    globeMesh.material.dispose();
  }

  globeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(globeRadius, 128, 128),
    new THREE.MeshStandardMaterial({ map: texture })
  );

  globeGroup.add(globeMesh);

  if (!eventsInitialized) {
    await loadEvents(globeGroup, globeRadius, camera, renderer, scene);
    eventsInitialized = true;
  }

  initInteraction(scene, camera, globeMesh);
}

// ===== Button UI =====
function setButtonIcon(themeName) {
  if (themeName === 'light') {
    themeBtn.innerHTML = sunSVG;
    themeBtn.querySelectorAll('*').forEach(el => {
      el.setAttribute('fill', 'orange');
    });
  } else {
    themeBtn.innerHTML = moonSVG;
    themeBtn.querySelectorAll('*').forEach(el => {
      el.setAttribute('fill', 'white');
    });
  }
}

// ===== Apply Theme =====
function applyTheme(themeName) {
  initGlobe(themeName);

  currentTheme = themeName;
  localStorage.setItem('theme', themeName);
  setButtonIcon(themeName);
}

// Toggle
themeBtn.addEventListener('click', () => {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// ===== INIT =====
async function init() {
  await loadGeoData();
  await loadSVGs();
  await initGlobe(currentTheme);
  setButtonIcon(currentTheme);
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  updateAutoRotate(performance.now());
  if (animateEvents) animateEvents();
  renderer.render(scene, camera);
}

init();
