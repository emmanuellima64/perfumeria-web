// app.js
console.log("app.js cargado ✅");

const firebaseConfig = {
  apiKey: "AIzaSyAzGcRQmCvV8H6tL15ZBGjhIf2uWT6o-8A",
  authDomain: "perfumeria-web.firebaseapp.com",
  projectId: "perfumeria-web",
  storageBucket: "perfumeria-web.appspot.com",     // asegúrate que coincida con tu bucket real
  messagingSenderId: "148592337011",
  appId: "1:148592337011:web:2a38a47df445fc850eca06",
  measurementId: "G-G5RR20PJ7Z"
};

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  // ------------ VARIABLES EXISTENTES ------------
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const captureButton = document.getElementById("tomarFoto");
  const saveButton = document.getElementById("guardarFoto");
  const imagenesDiv = document.getElementById("imagenes");
  const debugDiv = document.getElementById("debug");
  const ctx = canvas.getContext("2d");

  // ------------ INICIALIZAR CÁMARA EXISTENTE ------------
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      console.log("Cámara activa");
      debugDiv.innerText = "Cámara activa ✔️";
    })
    .catch(err => {
      console.error("Error al acceder a la cámara:", err.name, err.message);
      debugDiv.innerText = `Error al activar cámara: ${err.name} — ${err.message}`;
    });

  // ------------ EVENTO “Tomar Foto” EXISTENTE ------------
  captureButton.addEventListener("click", () => {
    console.log("Botón ‘Tomar Foto’ clicado");
    debugDiv.innerText = "Botón clicado";

    if (!video.videoWidth || !video.videoHeight) {
      console.warn("Vídeo no listo");
      debugDiv.innerText = "Vídeo no listo, espera un momento...";
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.style.display = "block";
    debugDiv.innerText = "Foto tomada ✔️";
  });

  // ------------ EVENTO “Guardar Foto” EXISTENTE ------------
  if (saveButton) {
    saveButton.addEventListener("click", () => {
      console.log("Guardando foto...");
      debugDiv.innerText = "Guardando foto...";

      // Si quieres combinar precio/descr con cámara, lee los valores:
      const precioVal = Number(document.getElementById("precio")?.value || 0);
      const descripcionVal = document.getElementById("descripcion")?.value || "";

      // Subir la imagen del canvas
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
          })
          .catch(err => {
            console.error("Error guardando foto y detalles:", err);
            debugDiv.innerText = "Error: " + err.message;
          });
      }, "image/jpeg");
    });
  }

    // ------------ NUEVA SECCIÓN: SUBIR FOTO DESDE GALERÍA (sin pop-ups) ------------
    const inputFile = document.getElementById("inputFile");
    const verDetallesBtn = document.getElementById("verDetallesGaleria");
    const previewContainer = document.getElementById("previewContainer");
    const detallesGaleria = document.getElementById("detallesGaleria");
    const precioGaleria = document.getElementById("precioGaleria");
    const descripcionGaleria = document.getElementById("descripcionGaleria");
    const guardarGaleriaBtn = document.getElementById("guardarGaleria");
    const debugGaleria = document.getElementById("debugGaleria");

    let archivoSeleccionado = null;

    // 1) Cuando el usuario elige un archivo, guardamos el File y limpiamos estados
    inputFile.addEventListener("change", () => {
    previewContainer.innerHTML = "";
    debugGaleria.innerText = "";
    detallesGaleria.style.display = "none";
    precioGaleria.value = "";
    descripcionGaleria.value = "";
    archivoSeleccionado = inputFile.files[0] || null;
    });

    // 2) Al hacer clic en “Ver Detalles”, mostramos la miniatura y los campos
    verDetallesBtn.addEventListener("click", () => {
    previewContainer.innerHTML = "";
    debugGaleria.innerText = "";

    if (!archivoSeleccionado) {
        debugGaleria.innerText = "Primero selecciona una imagen.";
        return;
    }
    // Solo imágenes
    if (!archivoSeleccionado.type.startsWith("image/")) {
        debugGaleria.innerText = "Por favor selecciona un archivo de imagen.";
        return;
    }

    // 2.1) Mostrar miniatura
    const imgPrev = document.createElement("img");
    imgPrev.style.maxWidth = "200px";
    imgPrev.style.marginTop = "0.5rem";
    imgPrev.src = URL.createObjectURL(archivoSeleccionado);
    previewContainer.appendChild(imgPrev);

    // 2.2) Hacer visible el bloque de precio y descripción
    detallesGaleria.style.display = "block";
    });

    // 3) Al hacer clic en “Guardar Foto” (galería), subimos con precio/descr
    guardarGaleriaBtn.addEventListener("click", () => {
    if (!archivoSeleccionado) {
        debugGaleria.innerText = "No hay imagen seleccionada.";
        return;
    }

    // 3.1) Leer precio y descripción
    const precioVal = Number(precioGaleria.value);
    if (isNaN(precioVal) || precioVal < 0) {
        debugGaleria.innerText = "Precio inválido (>= 0).";
        return;
    }
    const descripcionVal = descripcionGaleria.value.trim();

    debugGaleria.innerText = "Subiendo la foto...";

    // 3.2) Generar nombre único y subir a Storage
    const extension = archivoSeleccionado.name.split(".").pop();
    const nombreEnStorage = `galeria-${Date.now()}.${extension}`;

    const uploadTask = storage.ref(nombreEnStorage).put(archivoSeleccionado);

    uploadTask.on(
        "state_changed",
        () => {
        // (opcional) aquí podrías mostrar progreso si quisieras
        },
        error => {
        console.error("Error subiendo desde galería:", error);
        debugGaleria.innerText = "Error subiendo: " + error.message;
        },
        () => {
        // 3.3) Una vez subido, obtener URL y guardar en Firestore
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
            // Limpiar todo y ocultar campos
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


  // ------------ RENDERIZAR TODAS LAS IMÁGENES (CAMARA + GALERÍA) ------------
  db.collection("imagenes")
    .orderBy("timestamp", "desc")
    .onSnapshot(snap => {
      imagenesDiv.innerHTML = "";

      snap.forEach(doc => {
        const { url, path, precio, descripcion } = doc.data();
        const id = doc.id;

        // Crear tarjeta
        const card = document.createElement("div");
        card.classList.add("producto-card");

        // Imagen
        const img = document.createElement("img");
        img.src = url;
        img.alt = descripcion || "Foto de producto";
        img.style.maxWidth = "100%";

        // Si la URL falla (imagen borrada directamente en Storage), borramos doc
        img.onerror = () => {
          console.warn(`URL inválida, borrando doc ${id}`);
          card.remove();
          db.collection("imagenes").doc(id).delete().catch(console.error);
        };

        card.appendChild(img);

        // Precio (si existe)
        if (precio != null) {
          const precioEl = document.createElement("p");
          precioEl.classList.add("producto-precio");
          precioEl.innerText = `Q ${precio.toFixed(2)}`;
          card.appendChild(precioEl);
        }

        // Descripción (si existe)
        if (descripcion) {
          const descEl = document.createElement("p");
          descEl.classList.add("producto-desc");
          descEl.innerText = descripcion;
          card.appendChild(descEl);
        }

        // Botón Eliminar
        const btnEliminar = document.createElement("button");
        btnEliminar.textContent = "Eliminar";
        btnEliminar.classList.add("btn-eliminar");
        btnEliminar.addEventListener("click", () => {
          storage.ref(path).delete()
            .then(() => db.collection("imagenes").doc(id).delete())
            .catch(err => console.error("Error al eliminar foto:", err));
        });
        card.appendChild(btnEliminar);

        // Insertar tarjeta
        imagenesDiv.appendChild(card);
      });
      
    // 2) Al final, creas la tarjeta “add-card”:
    const addCard = document.createElement("div");
    addCard.classList.add("add-card");
    const plusIcon = document.createElement("div");
    plusIcon.classList.add("add-icon");
    plusIcon.innerText = "+";
    addCard.appendChild(plusIcon);

    // 3) Aquí vamos a añadir el listener para mostrar cámara/galería:
    addCard.addEventListener("click", () => {
      // Desocultar la sección de cámara
      const camaraSection = document.getElementById("camara");
      if (camaraSection) {
        camaraSection.style.display = "block";
      }

      // Desocultar la sección de galería
      const galeriaSection = document.getElementById("galeria");
      if (galeriaSection) {
        galeriaSection.style.display = "block";
      }

      // (Opcional) Hacer scroll hasta la sección de cámara/galería
      // por ejemplo:
      galeriaSection?.scrollIntoView({ behavior: "smooth" });
    });

    // 4) Insertas la tarjeta “+” al final
    imagenesDiv.appendChild(addCard);
  });
});

// Subir foto desde galería (sin pop-ups)
  const extension = archivoSeleccionado.name.split(".").pop();
  const nombreEnStorage = `galeria-${Date.now()}.${extension}`;

  const uploadTask = storage.ref(nombreEnStorage).put(archivoSeleccionado);

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log("Progreso:", progress + "%");
    },
    (error) => {
      console.error("Error subiendo desde galería:", error);
      debugGaleria.innerText = "Error subiendo: " + error.message;
    },
    () => {
      console.log("Subida completada ✅");
  
      uploadTask.snapshot.ref.getDownloadURL()
        .then(url => {
          console.log("URL obtenida:", url);
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
  