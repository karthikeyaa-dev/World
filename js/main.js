// ===== main.js =====
// Minimalist Black & Grey Globe - No Effects, Just Clean Visualization

// Get container
const container = document.getElementById('globe-container');

// Scene and camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Simple lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 0.5);
mainLight.position.set(5, 10, 7);
scene.add(mainLight);

// Colors
const COLORS = {
  sea: 0x1a1a1a,
  countryDefault: 0x2a2a2a,
  outline: 0x3a3a3a
};

const HIGHLIGHTS = {
  low: 0x4ade80,
  medium: 0xfacc15,
  high: 0xfb923c,
  critical: 0xef4444
};

// Store countries
const countryMeshes = new Map();

// Globe sphere
const globeRadius = 5;
const globeGeometry = new THREE.SphereGeometry(globeRadius, 128, 128);
const globeMaterial = new THREE.MeshStandardMaterial({ color: COLORS.sea });
const globe = new THREE.Mesh(globeGeometry, globeMaterial);
scene.add(globe);

// Helper: convert lat/lon to 3D position
function latLonToVector3(lat, lon, radiusOffset = 0) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  const radius = globeRadius + radiusOffset;
  
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

// Draw country mesh
function drawCountryMesh(ring, countryId, status = null) {
  if (!ring || ring.length < 3) return null;
  
  const points3D = ring.map(coord => latLonToVector3(coord[1], coord[0], 0.01));
  
  const positions = [];
  for (let i = 1; i < points3D.length - 1; i++) {
    positions.push(points3D[0].x, points3D[0].y, points3D[0].z);
    positions.push(points3D[i].x, points3D[i].y, points3D[i].z);
    positions.push(points3D[i+1].x, points3D[i+1].y, points3D[i+1].z);
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.computeVertexNormals();
  
  let color = COLORS.countryDefault;
  if (status && HIGHLIGHTS[status]) {
    color = HIGHLIGHTS[status];
  }
  
  const material = new THREE.MeshStandardMaterial({ color: color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { countryId, status };
  scene.add(mesh);
  
  // Outline
  const outlinePoints = ring.map(coord => latLonToVector3(coord[1], coord[0], 0.015));
  const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const outlineMat = new THREE.LineBasicMaterial({ color: COLORS.outline });
  const outline = new THREE.Line(outlineGeo, outlineMat);
  scene.add(outline);
  
  return { mesh, outline };
}

// Draw country
function drawCountry(feature, countryId) {
  const geom = feature.geometry;
  const status = feature.properties?.status || null;
  const meshes = [];
  
  if (geom.type === "Polygon") {
    geom.coordinates.forEach(ring => {
      const result = drawCountryMesh(ring, countryId, status);
      if (result) meshes.push(result);
    });
  } else if (geom.type === "MultiPolygon") {
    geom.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        const result = drawCountryMesh(ring, countryId, status);
        if (result) meshes.push(result);
      });
    });
  }
  
  if (meshes.length > 0) {
    countryMeshes.set(countryId, meshes);
  }
}

// Update country highlight
function updateCountryHighlight(countryId, status) {
  const meshes = countryMeshes.get(countryId);
  if (!meshes) return;
  
  const color = status && HIGHLIGHTS[status] ? HIGHLIGHTS[status] : COLORS.countryDefault;
  
  meshes.forEach(({ mesh }) => {
    mesh.material.color.setHex(color);
    mesh.userData.status = status;
  });
}

// Batch update
function updateCountriesHighlights(highlightsData) {
  highlightsData.forEach(({ countryId, status }) => {
    updateCountryHighlight(countryId, status);
  });
}

// Load GeoJSON
fetch('assets/countries.geo.json')
  .then(res => res.json())
  .then(data => {
    data.features.forEach((feature, index) => {
      const countryId = feature.properties?.ISO_A3 || 
                       feature.properties?.ADM0_A3 || 
                       feature.properties?.id || 
                       `country_${index}`;
      drawCountry(feature, countryId);
    });
    
    console.log(`Loaded ${countryMeshes.size} countries`);
    window.dispatchEvent(new CustomEvent('globeReady', { 
      detail: { countries: Array.from(countryMeshes.keys()) } 
    }));
  })
  .catch(err => console.error("Failed to load GeoJSON:", err));

// Mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove(event) {
  mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const allMeshes = Array.from(countryMeshes.values()).flatMap(meshes => meshes.map(m => m.mesh));
  const intersects = raycaster.intersectObjects(allMeshes);
  
  countryMeshes.forEach(meshes => {
    meshes.forEach(({ mesh }) => {
      const originalStatus = mesh.userData.status;
      const originalColor = originalStatus && HIGHLIGHTS[originalStatus] 
        ? HIGHLIGHTS[originalStatus] 
        : COLORS.countryDefault;
      mesh.material.color.setHex(originalColor);
    });
  });
  
  if (intersects.length > 0) {
    intersects[0].object.material.color.setHex(0x4a4a4a);
    renderer.domElement.style.cursor = 'pointer';
  } else {
    renderer.domElement.style.cursor = 'default';
  }
}

function onClick(event) {
  mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const allMeshes = Array.from(countryMeshes.values()).flatMap(meshes => meshes.map(m => m.mesh));
  const intersects = raycaster.intersectObjects(allMeshes);
  
  if (intersects.length > 0) {
    const clicked = intersects[0].object;
    window.dispatchEvent(new CustomEvent('countryClicked', { 
      detail: { countryId: clicked.userData.countryId, status: clicked.userData.status } 
    }));
  }
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onClick);

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// Public API
window.GlobeAPI = {
  setHighlight: (countryId, status) => updateCountryHighlight(countryId, status),
  setHighlights: (highlightsData) => updateCountriesHighlights(highlightsData),
  getCountries: () => Array.from(countryMeshes.keys()),
  getStatus: (countryId) => {
    const meshes = countryMeshes.get(countryId);
    return meshes?.[0]?.mesh.userData.status || null;
  },
  resetAll: () => {
    countryMeshes.forEach(meshes => {
      meshes.forEach(({ mesh }) => {
        mesh.material.color.setHex(COLORS.countryDefault);
        mesh.userData.status = null;
      });
    });
  }
};

console.log("Globe ready. Use window.GlobeAPI.setHighlight('countryId', 'status')");
console.log("Status options: 'low', 'medium', 'high', 'critical'");
