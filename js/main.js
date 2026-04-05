import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const container = document.getElementById('globe-container');
const themeBtn = document.getElementById('theme-toggle');

// Scene
const scene = new THREE.Scene();

// Themes
const themes = {
  light: {
    background: '#000000',
    oceanColor: '#8CCDEB',
    landColor: '#FCECDD', // Off-white
    borderColor: '#8CCDEB',
  },
  dark: {
    background: 0x000000,
    oceanColor: '#696969',
    landColor: '#242424',
    borderColor: '#696969',
  }
};

let currentTheme = localStorage.getItem('theme') || 'dark';
const sizes = { width: window.innerWidth, height: window.innerHeight };

// Camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 1, 100);
camera.position.set(0, 0, 6);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
container.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Globe
const globeGroup = new THREE.Group();
scene.add(globeGroup);
const globeRadius = 2;
let globeMesh = null;

// Load SVGs
let sunSVG = '', moonSVG = '';
async function loadSVGs() {
  sunSVG = await (await fetch('assets/sun.svg')).text();
  moonSVG = await (await fetch('assets/moon.svg')).text();
}

// Globe texture creation
function createTexture(theme) {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = theme.oceanColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return fetch('assets/countries.geo.json')
    .then(res => res.json())
    .then(data => {
      ctx.fillStyle = theme.landColor;
      ctx.strokeStyle = theme.borderColor;
      ctx.lineWidth = 3;

      function drawRing(ring) {
        if (!ring || ring.length < 3) return;
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

      data.features.forEach(feature => {
        const geom = feature.geometry;
        if (geom.type === 'Polygon') geom.coordinates.forEach(drawRing);
        else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(p => p.forEach(drawRing));
      });

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    });
}

// Init globe
function initGlobe(themeName) {
  const theme = themes[themeName];
  createTexture(theme).then(texture => {
    if (globeMesh) {
      globeGroup.remove(globeMesh);
      globeMesh.geometry.dispose();
      globeMesh.material.dispose();
    }
    globeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius, 256, 256),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    globeGroup.add(globeMesh);
  });
}

// Set button icon with color, texture, and transparency
function setButtonIcon(themeName) {
  if (themeName === 'light') {
    themeBtn.innerHTML = sunSVG;
    themeBtn.querySelectorAll('*').forEach(el => {
      el.setAttribute('fill', 'orange');
      el.setAttribute('opacity', '0.8'); // transparency
    });
  } else {
    themeBtn.innerHTML = moonSVG;
    themeBtn.querySelectorAll('*').forEach(el => {
      el.setAttribute('fill', 'white');
      el.setAttribute('opacity', '0.8'); // transparency
    });
  }
}

// Apply theme
function applyTheme(themeName) {
  const theme = themes[themeName];
  scene.background = new THREE.Color(theme.background);
  renderer.setClearColor(theme.background, 1);
  initGlobe(themeName);
  currentTheme = themeName;
  localStorage.setItem('theme', themeName);
  setButtonIcon(themeName);
}

// Toggle
function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}
themeBtn.addEventListener('click', toggleTheme);

// Initialize
await loadSVGs();
applyTheme(currentTheme);

// Resize
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
});

// Animate globe
let rotationSpeed = 0.002;
function animate() {
  requestAnimationFrame(animate);
  globeGroup.rotation.y += rotationSpeed;
  renderer.render(scene, camera);
}
animate();
