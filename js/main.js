// ===== main.js =====
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const container = document.getElementById('globe-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

const globeGroup = new THREE.Group();
scene.add(globeGroup);

const globeRadius = 5;

// Base ocean sphere
const ocean = new THREE.Mesh(
  new THREE.SphereGeometry(globeRadius, 128, 128),
  new THREE.MeshStandardMaterial({ color: 0x605F5E, roughness: 0.5, metalness: 0.1 })
);
globeGroup.add(ocean);

// Create a textured globe using canvas
function createTextureGlobe() {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Fill background with ocean color
  ctx.fillStyle = '#696969';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  fetch('assets/countries.geo.json')
    .then(res => res.json())
    .then(data => {
      ctx.fillStyle = '#242424';       // Land color
      ctx.strokeStyle = "#696969";     // Border color
      ctx.lineWidth = 3;                // Border thickness

      data.features.forEach(feature => {
        const geom = feature.geometry;

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

        if (geom.type === 'Polygon') {
          geom.coordinates.forEach(ring => drawRing(ring));
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach(polygon => polygon.forEach(ring => drawRing(ring)));
        }
      });

      const texture = new THREE.CanvasTexture(canvas);
      const globeMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0x605F5E,
        roughness: 0.5,
        metalness: 0.05
      });

      globeGroup.remove(ocean);
      const texturedGlobe = new THREE.Mesh(
        new THREE.SphereGeometry(globeRadius, 256, 256),
        globeMaterial
      );
      globeGroup.add(texturedGlobe);

      console.log('Texture globe created successfully');
    })
    .catch(err => console.error('Error loading GeoJSON:', err));
}

// Initialize textured globe
createTextureGlobe();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animate globe rotation
let rotationSpeed = 0.002;
function animate() {
  requestAnimationFrame(animate);
  globeGroup.rotation.y += rotationSpeed;
  renderer.render(scene, camera);
}
animate();

// API controls
window.GlobeAPI = {
  stopRotation: () => { rotationSpeed = 0; },
  startRotation: (s = 0.002) => { rotationSpeed = s; },
  setRotationSpeed: (s) => { rotationSpeed = s; }
};
