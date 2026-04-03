// ===== main.js =====

// Get container
const container = document.getElementById('globe-container');

// Scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 15;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Lighting
const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);

// Base globe sphere
const globeRadius = 5;
const globeGeometry = new THREE.SphereGeometry(globeRadius, 64, 64);
const globeMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
const globe = new THREE.Mesh(globeGeometry, globeMaterial);

// ===== Create a group for the globe + country lines =====
const globeGroup = new THREE.Group();
globeGroup.add(globe);
scene.add(globeGroup);

// ===== Helper: convert lat/lon to 3D position on sphere =====
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

// ===== Draw a single polygon ring as a line =====
function drawRing(ring, color = 0x000000) {
  if (!ring || ring.length < 2) return;

  const points = ring.map(coord => latLonToVector3(coord[1], coord[0], globeRadius + 0.01));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: color });
  const line = new THREE.Line(geometry, material);
  globeGroup.add(line); // add to the globe group
}

// ===== Draw country (Polygon or MultiPolygon) =====
function drawCountry(feature, highlight = false) {
  const geom = feature.geometry;
  const color = highlight ? 0x00ff00 : 0x000000; // green if highlighted

  if (geom.type === "Polygon") {
    geom.coordinates.forEach(ring => drawRing(ring, color));
  } else if (geom.type === "MultiPolygon") {
    geom.coordinates.forEach(polygon => polygon.forEach(ring => drawRing(ring, color)));
  }
}

// ===== Load GeoJSON and draw all countries =====
fetch('assets/countries.geo.json')
  .then(response => response.json())
  .then(geoData => {
    geoData.features.forEach(feature => {
      // Example: highlight India (ISO_A3 code "IND")
      const highlight = feature.id === "IND";
      drawCountry(feature, highlight);
    });
  })
  .catch(err => console.error("Failed to load GeoJSON:", err));

// ===== Handle window resize =====
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== Animation loop =====
function animate() {
  requestAnimationFrame(animate);

  // Rotate the entire globe group
  globeGroup.rotation.y += 0.002;

  renderer.render(scene, camera);
}
animate();
