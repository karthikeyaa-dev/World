// ===== interaction.js (GPU Picking Version) =====
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let globeMesh, camera;
let pickingCanvas, pickingCtx;
let colorMap = {};
let initialized = false;

// Tooltip
const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.padding = '8px 12px';
tooltip.style.background = 'rgba(0,0,0,0.7)';
tooltip.style.color = '#fff';
tooltip.style.borderRadius = '6px';
tooltip.style.pointerEvents = 'none';
tooltip.style.fontSize = '12px';
tooltip.style.display = 'none';
document.body.appendChild(tooltip);

// ===== Init =====
export async function initInteraction(_scene, _camera, _globeMesh) {
  camera = _camera;

  if (initialized) {
    globeMesh = _globeMesh;
    return;
  }

  initialized = true;
  globeMesh = _globeMesh;

  const res = await fetch('assets/countries.geo.json');
  const geoData = await res.json();

  createPickingTexture(geoData);

  window.addEventListener('mousemove', onMouseMove);
}

// ===== Create Picking Texture =====
function createPickingTexture(data) {
  pickingCanvas = document.createElement('canvas');
  pickingCanvas.width = 4096;
  pickingCanvas.height = 2048;
  pickingCtx = pickingCanvas.getContext('2d');

  let id = 1;

  function getColor(id) {
    const r = (id & 0xff0000) >> 16;
    const g = (id & 0x00ff00) >> 8;
    const b = (id & 0x0000ff);
    return `rgb(${r},${g},${b})`;
  }

  function drawRing(ring, color) {
    pickingCtx.beginPath();
    ring.forEach(([lon, lat], i) => {
      const x = (lon + 180) * (pickingCanvas.width / 360);
      const y = (90 - lat) * (pickingCanvas.height / 180);
      i === 0 ? pickingCtx.moveTo(x, y) : pickingCtx.lineTo(x, y);
    });
    pickingCtx.closePath();
    pickingCtx.fillStyle = color;
    pickingCtx.fill();
  }

  data.features.forEach(feature => {
    const color = getColor(id);
    colorMap[color] = feature.properties.name;

    const geom = feature.geometry;

    if (geom.type === 'Polygon') {
      geom.coordinates.forEach(r => drawRing(r, color));
    } else {
      geom.coordinates.forEach(p => p.forEach(r => drawRing(r, color)));
    }

    id++;
  });
}

// ===== Mouse Move =====
function onMouseMove(event) {
  if (!globeMesh) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(globeMesh);

  if (intersects.length > 0) {
    const hit = intersects[0];

    // ===== 🎯 1. COUNTRY (GPU picking) =====
    const uv = hit.uv;

    const px = Math.floor(uv.x * pickingCanvas.width);
    const py = Math.floor((1 - uv.y) * pickingCanvas.height);

    const pixel = pickingCtx.getImageData(px, py, 1, 1).data;
    const color = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;

    const country = colorMap[color] || 'Ocean';

    // ===== 📍 2. LAT / LON (raycast math) =====
    const point = hit.point.clone().normalize();

    const lat = 90 - (Math.acos(point.y) * 180 / Math.PI);
    const lon = (Math.atan2(point.z, point.x) * 180 / Math.PI);

    // ===== 🕒 3. TIME =====
    const time = getLocalTime(lon);

    // ===== UI =====
    tooltip.style.display = 'block';
    tooltip.style.left = event.clientX + 10 + 'px';
    tooltip.style.top = event.clientY + 10 + 'px';

    tooltip.innerHTML = `
      <strong>${country}</strong><br>
      📍 ${lat.toFixed(2)}, ${lon.toFixed(2)}<br>
      🕒 ${time}
    `;
  } else {
    tooltip.style.display = 'none';
  }
}
function getLocalTime(lon) {
  const offset = Math.round(lon / 15); // 15° = 1 hour
  const now = new Date();

  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const local = new Date(utc + (3600000 * offset));

  return local.toTimeString().slice(0, 8);
}
