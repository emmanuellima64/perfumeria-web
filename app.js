// app.js modificado para permitir múltiples imágenes por producto con Promise.all

console.log("app.js cargado ✅");

const firebaseConfig = {
  apiKey: "AIzaSyAzGcRQmCvV8H6tL15ZBGjhIf2uWT6o-8A",
  authDomain: "perfumeria-web.firebaseapp.com",
  projectId: "perfumeria-web",
  storageBucket: "perfumeria-web.appspot.com",
  messagingSenderId: "148592337011",
  appId: "1:148592337011:web:2a38a47df445fc850eca06",
  measurementId: "G-G5RR20PJ7Z"
};

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const db = firebase.firestore();

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
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

  const inputFile = document.getElementById("inputFile");
  const verDetallesBtn = document.getElementById("verDetallesGaleria");
  const previewContainer = document.getElementById("previewContainer");
  const detallesGaleria = document.getElementById("detallesGaleria");
  const precioGaleria = document.getElementById("precioGaleria");
  const descripcionGaleria = document.getElementById("descripcionGaleria");
  const guardarGaleriaBtn = document.getElementById("guardarGaleria");
  const debugGaleria = document.getElementById("debugGaleria");
  let archivosSeleccionados = [];

  if (inputFile) {
    inputFile.addEventListener("change", () => {
      previewContainer.innerHTML = "";
      debugGaleria.innerText = "";
      detallesGaleria.style.display = "none";
      precioGaleria.value = "";
      descripcionGaleria.value = "";
      archivosSeleccionados = Array.from(inputFile.files);
      archivosSeleccionados.forEach(file => {
        const imgPrev = document.createElement("img");
        imgPrev.style.maxWidth = "100px";
        imgPrev.style.marginRight = "0.5rem";
        imgPrev.src = URL.createObjectURL(file);
        previewContainer.appendChild(imgPrev);
      });
      if (archivosSeleccionados.length > 0) {
        detallesGaleria.style.display = "block";
      }
    });
  }

  if (guardarGaleriaBtn) {
    guardarGaleriaBtn.addEventListener("click", () => {
  if (archivosSeleccionados.length === 0) {
    debugGaleria.innerText = "No hay imágenes seleccionadas.";
    return;
  }

  const precioVal = Number(precioGaleria.value);
  if (isNaN(precioVal) || precioVal < 0) {
    debugGaleria.innerText = "Precio inválido (>= 0).";
    return;
  }

  const descripcionVal = descripcionGaleria.value.trim();
  debugGaleria.innerText = "Subiendo las fotos...";

  const uploadPromises = archivosSeleccionados.map(file => {
    const extension = file.name.split(".").pop();
    const nombreEnStorage = `galeria-${Date.now()}-${Math.floor(Math.random() * 10000)}.${extension}`;
    return storage.ref(nombreEnStorage).put(file).then(snapshot =>
      snapshot.ref.getDownloadURL().then(url => {
        return db.collection("imagenes").add({
          url,
          path: nombreEnStorage,
          precio: precioVal,
          descripcion: descripcionVal,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
    );
  });

  Promise.all(uploadPromises)
    .then(() => {
      debugGaleria.innerText = "Todas las fotos fueron guardadas ✔️";
      previewContainer.innerHTML = "";
      inputFile.value = "";
      detallesGaleria.style.display = "none";
      precioGaleria.value = "";
      descripcionGaleria.value = "";
      archivosSeleccionados = [];
    })
    .catch(error => {
      debugGaleria.innerText = "Error subiendo o guardando: " + error.message;
    });
});

  }

  db.collection("imagenes").orderBy("timestamp", "desc").onSnapshot(snap => {
  imagenesDiv.innerHTML = "";

  // Agrupar imágenes por descripción + precio
  const grupos = {};

  snap.forEach(doc => {
    const { url, path, precio, descripcion } = doc.data();
    const id = doc.id;
    const key = `${descripcion}||${precio}`;

    if (!grupos[key]) {
      grupos[key] = {
        descripcion,
        precio,
        docs: []
      };
    }

    grupos[key].docs.push({ id, url, path });
  });

  Object.values(grupos).forEach(grupo => {
    const card = document.createElement("div");
    card.classList.add("producto-card");

    const galeria = document.createElement("div");
    galeria.style.display = "flex";
    galeria.style.gap = "0.5rem";
    galeria.style.overflowX = "auto";

    grupo.docs.forEach(imgData => {
      const img = document.createElement("img");
      img.src = imgData.url;
      img.alt = grupo.descripcion || "Foto de producto";
      img.style.width = "120px";
      img.style.height = "150px";
      img.style.objectFit = "cover";
      galeria.appendChild(img);
    });

    card.appendChild(galeria);

    const precioEl = document.createElement("p");
    precioEl.classList.add("producto-precio");
    precioEl.innerText = `Q ${grupo.precio.toFixed(2)}`;
    card.appendChild(precioEl);

    const descEl = document.createElement("p");
    descEl.classList.add("producto-desc");
    descEl.innerText = grupo.descripcion;
    card.appendChild(descEl);

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.classList.add("btn-eliminar");
    btnEliminar.addEventListener("click", () => {
      Promise.all(grupo.docs.map(img => storage.ref(img.path).delete()))
        .then(() => {
          return Promise.all(grupo.docs.map(img => db.collection("imagenes").doc(img.id).delete()));
        });
    });
    card.appendChild(btnEliminar);

    imagenesDiv.appendChild(card);
  });

  const addCard = document.createElement("div");
  addCard.classList.add("add-card");
  const plusIcon = document.createElement("div");
  plusIcon.classList.add("add-icon");
  plusIcon.innerText = "+";
  addCard.appendChild(plusIcon);
  addCard.addEventListener("click", () => {
    const camaraSection = document.getElementById("camara");
    if (camaraSection) {
      camaraSection.style.display = "block";
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          streamCamara = stream;
          video.srcObject = stream;
          debugDiv.innerText = "Cámara activa ✔️";
          canvas.style.display = "none";
          detallesCamara.style.display = "none";
        })
        .catch(err => {
          debugDiv.innerText = `Error al activar cámara: ${err.name} — ${err.message}`;
        });
    }
    const galeriaSection = document.getElementById("galeria");
    if (galeriaSection) galeriaSection.style.display = "block";
  });
  imagenesDiv.appendChild(addCard);
});

});
