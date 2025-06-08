console.log("app.js cargado ✅");

const firebaseConfig = {
  apiKey: "AIzaSyAzGcRQmCvV8H6tL15ZBGjhIf2uWT6o-8A",
  authDomain: "perfumeria-web.firebaseapp.com",
  projectId: "perfumeria-web",
  storageBucket: "perfumeria-web.firebasestorage.app",
  messagingSenderId: "148592337011",
  appId: "1:148592337011:web:2a38a47df445fc850eca06",
  measurementId: "G-G5RR20PJ7Z"
};

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  // --------------- Variables Cámara ---------------
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const captureButton = document.getElementById("tomarFoto");
  const saveButton = document.getElementById("guardarFoto");
  const imagenesDiv = document.getElementById("imagenes");
  const debugDiv = document.getElementById("debug");
  const detallesCamara = document.getElementById("detallesCamara");
  const precioInput = document.getElementById("precio");
  const descripcionInput = document.getElementById("descripcion");
  const ctx = canvas.getContext("2d");
  let streamCamara = null;

  // --------------- Variables Galería ---------------
  const inputFile = document.getElementById("inputFile");
  const verDetallesBtn = document.getElementById("verDetallesGaleria");
  const previewContainer = document.getElementById("previewContainer");
  const detallesGaleria = document.getElementById("detallesGaleria");
  const precioGaleria = document.getElementById("precioGaleria");
  const descripcionGaleria = document.getElementById("descripcionGaleria");
  const guardarGaleriaBtn = document.getElementById("guardarGaleria");
  const debugGaleria = document.getElementById("debugGaleria");

  let archivoSeleccionado = null;

  // --------------- Galería: Subir imagen ---------------
  if (inputFile) {
    inputFile.addEventListener("change", () => {
      previewContainer.innerHTML = "";
      debugGaleria.innerText = "";
      detallesGaleria.style.display = "none";
      precioGaleria.value = "";
      descripcionGaleria.value = "";
      archivoSeleccionado = inputFile.files[0] || null;
    });
  }

  if (verDetallesBtn) {
    verDetallesBtn.addEventListener("click", () => {
      previewContainer.innerHTML = "";
      debugGaleria.innerText = "";

      if (!archivoSeleccionado) {
        debugGaleria.innerText = "Primero selecciona una imagen.";
        return;
      }
      if (!archivoSeleccionado.type.startsWith("image/")) {
        debugGaleria.innerText = "Por favor selecciona un archivo de imagen.";
        return;
      }
      const imgPrev = document.createElement("img");
      imgPrev.style.maxWidth = "200px";
      imgPrev.style.marginTop = "0.5rem";
      imgPrev.src = URL.createObjectURL(archivoSeleccionado);
      previewContainer.appendChild(imgPrev);
      detallesGaleria.style.display = "block";
    });
  }

  if (guardarGaleriaBtn) {
    guardarGaleriaBtn.addEventListener("click", () => {
      if (!archivoSeleccionado) {
        debugGaleria.innerText = "No hay imagen seleccionada.";
        return;
      }
      const precioVal = Number(precioGaleria.value);
      if (isNaN(precioVal) || precioVal < 0) {
        debugGaleria.innerText = "Precio inválido (>= 0).";
        return;
      }
      const descripcionVal = descripcionGaleria.value.trim();
      debugGaleria.innerText = "Subiendo la foto...";

      const extension = archivoSeleccionado.name.split(".").pop();
      const nombreEnStorage = `galeria-${Date.now()}.${extension}`;

      const uploadTask = storage.ref(nombreEnStorage).put(archivoSeleccionado);

      uploadTask.on(
        "state_changed",
        () => {},
        error => {
          console.error("Error subiendo desde galería:", error);
          debugGaleria.innerText = "Error subiendo: " + error.message;
        },
        () => {
          uploadTask.snapshot.ref.getDownloadURL()
            .then(url => {
              return db.collection("imagenes").add({
                url,
                path: nombreEnStorage,
                precio: precioVal,
                descripcion: descripcionVal,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
              });
            })
            .then(() => {
              debugGaleria.innerText = "Foto y detalles guardados ✔️";
              previewContainer.innerHTML = "";
              inputFile.value = "";
              detallesGaleria.style.display = "none";
              precioGaleria.value = "";
              descripcionGaleria.value = "";
              archivoSeleccionado = null;
            })
            .catch(err => {
              console.error("Error guardando en Firestore:", err);
              debugGaleria.innerText = "Error guardando datos: " + err.message;
            });
        }
      );
    });
  }

  // --------------- Cámara: Tomar Foto ---------------
  if (captureButton) {
    captureButton.addEventListener("click", () => {
      debugDiv.innerText = "Botón clicado";
      if (!video.videoWidth || !video.videoHeight) {
        debugDiv.innerText = "Vídeo no listo, espera un momento...";
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.style.display = "block";
      debugDiv.innerText = "Foto tomada ✔️";
      if (detallesCamara) detallesCamara.style.display = "block";
    });
  }

  // --------------- Cámara: Guardar Foto ---------------
  if (saveButton) {
    saveButton.addEventListener("click", () => {
      debugDiv.innerText = "Guardando foto...";
      const precioVal = Number(precioInput?.value || 0);
      const descripcionVal = descripcionInput?.value || "";
      canvas.toBlob(blob => {
        const name = `foto-${Date.now()}.jpg`;
        storage.ref(name).put(blob)
          .then(snap => snap.ref.getDownloadURL().then(url => ({ snap, url })))
          .then(({ url }) => {
            return db.collection("imagenes").add({
              url,
              path: name,
              precio: precioVal,
              descripcion: descripcionVal,
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
          })
          .then(() => {
            debugDiv.innerText = "Foto y detalles guardados ✔️";
            // Limpiar campos y ocultar sección
            if (precioInput) precioInput.value = "";
            if (descripcionInput) descripcionInput.value = "";
            if (detallesCamara) detallesCamara.style.display = "none";
            canvas.style.display = "none";
            // Opcional: apagar cámara
            if (streamCamara && streamCamara.getTracks) {
              streamCamara.getTracks().forEach(track => track.stop());
            }
            document.getElementById("camara").style.display = "none";
          })
          .catch(err => {
            debugDiv.innerText = "Error: " + err.message;
          });
      }, "image/jpeg");
    });
  }

  // --------------- Renderizar Imágenes ---------------
  db.collection("imagenes")
    .orderBy("timestamp", "desc")
    .onSnapshot(snap => {
      imagenesDiv.innerHTML = "";
      snap.forEach(doc => {
        const { url, path, precio, descripcion } = doc.data();
        const id = doc.id;
        const card = document.createElement("div");
        card.classList.add("producto-card");
        const img = document.createElement("img");
        img.src = url;
        img.alt = descripcion || "Foto de producto";
        img.style.maxWidth = "100%";
        img.onerror = () => {
          card.remove();
          db.collection("imagenes").doc(id).delete().catch(console.error);
        };
        card.appendChild(img);
        if (precio != null) {
          const precioEl = document.createElement("p");
          precioEl.classList.add("producto-precio");
          precioEl.innerText = `Q ${precio.toFixed(2)}`;
          card.appendChild(precioEl);
        }
        if (descripcion) {
          const descEl = document.createElement("p");
          descEl.classList.add("producto-desc");
          descEl.innerText = descripcion;
          card.appendChild(descEl);
        }
        const btnEliminar = document.createElement("button");
        btnEliminar.textContent = "Eliminar";
        btnEliminar.classList.add("btn-eliminar");
        btnEliminar.addEventListener("click", () => {
          storage.ref(path).delete()
            .then(() => db.collection("imagenes").doc(id).delete())
            .catch(err => console.error("Error al eliminar foto:", err));
        });
        card.appendChild(btnEliminar);
        imagenesDiv.appendChild(card);
      });

      // --- Botón "+" para agregar producto ---
      const addCard = document.createElement("div");
      addCard.classList.add("add-card");
      const plusIcon = document.createElement("div");
      plusIcon.classList.add("add-icon");
      plusIcon.innerText = "+";
      addCard.appendChild(plusIcon);
      addCard.addEventListener("click", () => {
        // Mostrar y activar cámara solo cuando se da click
        const camaraSection = document.getElementById("camara");
        if (camaraSection) {
          camaraSection.style.display = "block";
          // Pedir cámara SOLO aquí
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
              streamCamara = stream;
              video.srcObject = stream;
              debugDiv.innerText = "Cámara activa ✔️";
              canvas.style.display = "none";
              if (detallesCamara) detallesCamara.style.display = "none";
            })
            .catch(err => {
              debugDiv.innerText = `Error al activar cámara: ${err.name} — ${err.message}`;
            });
        }
        // Mostrar galería también si quieres (opcional)
        const galeriaSection = document.getElementById("galeria");
        if (galeriaSection) {
          galeriaSection.style.display = "block";
        }
      });
      imagenesDiv.appendChild(addCard);
    });
});

function toggleChat() {
    const iframe = document.getElementById("chatbot-frame");
    iframe.style.display = iframe.style.display === "block" ? "none" : "block";
  }

// --------------- Menú Responsive ---------------
  const toggleBtn = document.getElementById("menu-toggle");
  const nav = document.querySelector(".main-nav");

  toggleBtn.addEventListener("click", () => {
    nav.classList.toggle("show");
  });

