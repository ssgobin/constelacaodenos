import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAnalytics,
  isSupported,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBSRpmpJ21hmufo1Zc1pMwTfaXIXuK03Jw",
  authDomain: "projetodiario-56239.firebaseapp.com",
  projectId: "projetodiario-56239",
  storageBucket: "projetodiario-56239.firebasestorage.app",
  messagingSenderId: "781410508638",
  appId: "1:781410508638:web:bb8b970bafc51ef22af9cf",
  measurementId: "G-35PCL0KNER",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

isSupported().then((supported) => {
  if (supported) getAnalytics(app);
});

const els = {
  albumGrid: document.querySelector("#album-grid"),
  albumEmpty: document.querySelector("#album-empty"),
  albumTemplate: document.querySelector("#album-template"),
  toast: document.querySelector("#toast"),
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

const memoriesQuery = query(collection(db, "memorias"), orderBy("data", "asc"));

onSnapshot(
  memoriesQuery,
  (snapshot) => {
    const memories = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderAlbum(memories);
  },
  (error) => {
    console.error(error);
    showToast("Não foi possível carregar o álbum. Verifique as regras do Firestore.");
  }
);

function renderAlbum(memories) {
  els.albumGrid.innerHTML = "";
  els.albumEmpty.hidden = memories.length > 0;
  els.albumGrid.hidden = memories.length === 0;

  memories.forEach((memory) => {
    const node = els.albumTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector("img");
    const time = node.querySelector("time");
    const title = node.querySelector("h3");
    const text = node.querySelector(".memory-text");
    const quote = node.querySelector("blockquote");

    image.src = memory.imagemUrl || "";
    image.alt = memory.titulo ? `Foto da memória ${memory.titulo}` : "Foto da memória";
    time.dateTime = memory.data || "";
    time.textContent = formatDate(memory.data);
    title.textContent = memory.titulo || "Memória sem título";
    text.textContent = memory.texto || "";
    quote.textContent = memory.fraseEspecial || "";

    els.albumGrid.appendChild(node);
    observer.observe(node);
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 3600);
}

function initSpaceBackground() {
  const canvas = document.querySelector("#space-canvas");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const mouse = new THREE.Vector2(0, 0);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.position.z = 80;

  const stars = createStarField(900, 120, 0.22);
  const roseDust = createStarField(260, 70, 0.5, 0xd995a7);
  const planet = createPlanet(12, 0x8e3349, 0xd7b46a);
  const moon = createPlanet(5, 0xf2dca6, 0xfff2e3);

  planet.position.set(34, 12, -20);
  moon.position.set(-34, -18, -8);

  scene.add(stars, roseDust, planet, moon);

  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (event.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    stars.rotation.y += 0.0008;
    roseDust.rotation.y -= 0.001;
    planet.rotation.y += 0.002;
    moon.rotation.y -= 0.003;
    camera.position.x += (mouse.x * 4 - camera.position.x) * 0.025;
    camera.position.y += (-mouse.y * 3 - camera.position.y) * 0.025;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  }

  animate();
}

function createStarField(count, spread, opacity, color = 0xfff2e3) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * spread * 2;
    positions[i + 1] = (Math.random() - 0.5) * spread;
    positions[i + 2] = (Math.random() - 0.5) * spread * 2;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size: 0.42,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

function createPlanet(size, color, ringColor) {
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(size, 48, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.26 })
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(size * 1.35, 0.08, 16, 120),
    new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.45 })
  );

  ring.rotation.x = Math.PI * 0.64;
  ring.rotation.y = Math.PI * 0.12;
  group.add(sphere, ring);
  return group;
}

initSpaceBackground();
