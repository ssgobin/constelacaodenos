import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
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

const memoriesRef = collection(db, "memorias");
const memoriesQuery = query(memoriesRef, orderBy("data", "asc"));

const state = {
  memories: [],
  editingMemory: null,
  toastTimer: null,
};

const els = {
  modal: document.querySelector("#memory-modal"),
  form: document.querySelector("#memory-form"),
  memoryId: document.querySelector("#memory-id"),
  title: document.querySelector("#title-input"),
  date: document.querySelector("#date-input"),
  text: document.querySelector("#text-input"),
  quote: document.querySelector("#quote-input"),
  image: document.querySelector("#image-input"),
  imageHelp: document.querySelector("#image-help"),
  imagePreview: document.querySelector("#image-preview"),
  saveButton: document.querySelector("#save-button"),
  modalTitle: document.querySelector("#modal-title"),
  timeline: document.querySelector("#timeline"),
  template: document.querySelector("#memory-template"),
  emptyState: document.querySelector("#empty-state"),
  toast: document.querySelector("#toast"),
  count: document.querySelector("#memory-count"),
  retroTotal: document.querySelector("#retro-total"),
  retroFirst: document.querySelector("#retro-first"),
  retroLast: document.querySelector("#retro-last"),
  retroMonth: document.querySelector("#retro-month"),
  retroGallery: document.querySelector("#retro-gallery"),
  retrospective: document.querySelector("#retrospectiva"),
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

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => openModal());
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", closeModal);
});

document.querySelectorAll("[data-scroll-retrospective]").forEach((button) => {
  button.addEventListener("click", () => {
    els.retrospective.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

els.image.addEventListener("change", () => {
  const [file] = els.image.files;
  if (!file) return;
  els.imagePreview.src = URL.createObjectURL(file);
  els.imagePreview.classList.add("has-image");
});

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = els.image.files[0];
  const isEditing = Boolean(state.editingMemory);

  if (!file && !isEditing) {
    showToast("Escolha uma foto para acender essa memória.");
    return;
  }

  setSaving(true);

  try {
    const payload = {
      titulo: els.title.value.trim(),
      texto: els.text.value.trim(),
      fraseEspecial: els.quote.value.trim(),
      data: els.date.value,
      criadoEm: state.editingMemory?.criadoEm || serverTimestamp(),
    };

    if (file) {
      const imageData = await uploadImage(file);
      payload.imagemUrl = imageData.url;
      payload.imagemPath = imageData.path;
    }

    if (isEditing) {
      await updateDoc(doc(db, "memorias", state.editingMemory.id), payload);
      showToast("Memória atualizada com carinho.");
    } else {
      await addDoc(memoriesRef, payload);
      showToast("Memória salva na constelação.");
    }

    closeModal();
  } catch (error) {
    console.error(error);
    showToast("Não foi possível salvar agora. Confira Firebase, Cloudinary e tente novamente.");
  } finally {
    setSaving(false);
  }
});

onSnapshot(
  memoriesQuery,
  (snapshot) => {
    state.memories = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderMemories();
    renderRetrospective();
  },
  (error) => {
    console.error(error);
    showToast("Não foi possível carregar as memórias. Verifique as regras do Firestore.");
  }
);

function openModal(memory = null) {
  state.editingMemory = memory;
  els.form.reset();
  els.imagePreview.removeAttribute("src");
  els.imagePreview.classList.remove("has-image");

  if (memory) {
    els.modalTitle.textContent = "Editar memória";
    els.memoryId.value = memory.id;
    els.title.value = memory.titulo || "";
    els.date.value = memory.data || "";
    els.text.value = memory.texto || "";
    els.quote.value = memory.fraseEspecial || "";
    els.imageHelp.textContent = "Escolha uma nova foto apenas se quiser substituir a atual.";
    if (memory.imagemUrl) {
      els.imagePreview.src = memory.imagemUrl;
      els.imagePreview.classList.add("has-image");
    }
  } else {
    els.modalTitle.textContent = "Inserir memória";
    els.memoryId.value = "";
    els.imageHelp.textContent = "Escolha uma imagem para criar a memória.";
    els.date.valueAsDate = new Date();
  }

  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setTimeout(() => els.title.focus(), 80);
}

function closeModal() {
  els.modal.classList.remove("is-open");
  els.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  state.editingMemory = null;
}

async function uploadImage(file) {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("A imagem precisa ter ate 8 MB.");
  }

  const response = await fetch("/.netlify/functions/upload-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      image: await fileToDataUrl(file),
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Falha no upload da imagem.");
  }

  return {
    url: result.secureUrl,
    path: result.publicId,
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function renderMemories() {
  els.timeline.innerHTML = "";
  els.count.textContent = state.memories.length;
  els.emptyState.hidden = state.memories.length > 0;

  state.memories.forEach((memory) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
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

    node.querySelector("[data-edit]").addEventListener("click", () => openModal(memory));
    node.querySelector("[data-delete]").addEventListener("click", () => deleteMemory(memory));

    els.timeline.appendChild(node);
    observer.observe(node);
  });
}

async function deleteMemory(memory) {
  const shouldDelete = confirm(`Excluir "${memory.titulo || "esta memória"}"?`);
  if (!shouldDelete) return;

  try {
    await deleteDoc(doc(db, "memorias", memory.id));
    showToast("Memória removida da linha do tempo.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível excluir agora.");
  }
}

function renderRetrospective() {
  const memories = state.memories;
  els.retroTotal.textContent = memories.length;
  els.retroFirst.textContent = memories[0] ? formatDate(memories[0].data, true) : "-";
  els.retroLast.textContent = memories.at(-1) ? formatDate(memories.at(-1).data, true) : "-";
  els.retroMonth.textContent = getMostActiveMonth(memories);

  els.retroGallery.innerHTML = "";
  memories.forEach((memory) => {
    if (!memory.imagemUrl) return;
    const img = document.createElement("img");
    img.src = memory.imagemUrl;
    img.alt = memory.titulo ? `Foto de ${memory.titulo}` : "Foto da retrospectiva";
    img.loading = "lazy";
    els.retroGallery.appendChild(img);
  });
}

function getMostActiveMonth(memories) {
  if (!memories.length) return "-";
  const counts = memories.reduce((acc, memory) => {
    if (!memory.data) return acc;
    const month = memory.data.slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const [month] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  if (!month) return "-";
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-02T00:00:00Z`)
  );
}

function formatDate(value, compact = false) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: compact ? undefined : "2-digit",
    month: compact ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function setSaving(isSaving) {
  els.saveButton.disabled = isSaving;
  els.saveButton.textContent = isSaving ? "Salvando..." : "Salvar";
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  state.toastTimer = setTimeout(() => {
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

/*
  Regras basicas para testes no Firebase:

  Firestore:
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /memorias/{document} {
        allow read, write: if true;
      }
    }
  }

  Imagens:
  O upload vai para o Cloudinary pela funcao Netlify
  /.netlify/functions/upload-image, mantendo o API secret fora do navegador.

  Para uso real, adicione login, senha compartilhada ou App Check antes de
  publicar as regras acima. O ponto natural para autenticar fica antes do
  onSnapshot e antes de salvar/excluir documentos.
*/
