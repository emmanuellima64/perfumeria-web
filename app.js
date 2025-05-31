// app.js
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
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const saveButton = document.getElementById("guardarFoto");
  const captureButton = document.getElementById("tomarFoto");
  const imagenesDiv = document.getElementById("imagenes");
  const debugDiv = document.getElementById("debug");
  const ctx = canvas.getContext("2d");

  console.log("DOM listo:", { video, canvas, captureButton });

  // Inicializar cámara
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

  // Evento de captura
  captureButton.addEventListener("click", () => {
    console.log("Botón clicado");
    debugDiv.innerText = "Botón clicado";

    if (!video.videoWidth || !video.videoHeight) {
      console.warn("Vídeo no listo");
      debugDiv.innerText = "Vídeo no listo, espera un momento...";
      return;
    }

    // Dibujar en canvas y mostrarlo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.style.display = "block";
    debugDiv.innerText = "Foto tomada ✔️";

          
  });

  saveButton.addEventListener("click", () => {
    console.log("Guardando foto...");
    debugDiv.innerText = "Guardando foto...";
  
    // 1️⃣ Leer los detalles del formulario
    const precioVal = Number(document.getElementById("precio").value);
    const descripcionVal = document.getElementById("descripcion").value;
  
    // 2️⃣ Subir la imagen a Storage
    canvas.toBlob(blob => {
      const name = `foto-${Date.now()}.jpg`;
      storage.ref(name).put(blob)
        // 3️⃣ Obtener URL tras subir
        .then(snap => snap.ref.getDownloadURL().then(url => ({ snap, url })))
        .then(({ snap, url }) => {
          // 4️⃣ Crear el documento con URL, path, precio y descripción
          return db.collection("imagenes").add({
            url,
            path: name,
            precio: precioVal,           // <-- guardas aquí
            descripcion: descripcionVal, // <-- y aquí
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
  

  // Mostrar imágenes en tiempo real
  db.collection("imagenes")
  .orderBy("timestamp", "desc")
  .onSnapshot(snap => {
    imagenesDiv.innerHTML = "";

    snap.forEach(doc => {
      const { url, path, precio, descripcion } = doc.data();
      const id = doc.id;

      // 1) crear tarjeta (antes de usar "card")
      const card = document.createElement("div");
      card.classList.add("producto-card");

      // 2) crear imagen
      const img = document.createElement("img");
      img.src = url;
      img.alt = descripcion || "Foto de producto";

      // 3) onerror para URLs rotas
      img.onerror = () => {
        console.warn(`URL inválida, borrando doc ${id}`);
        card.remove();  // elimina la tarjeta del DOM
        db.collection("imagenes").doc(id).delete().catch(console.error);
      };

      // 4) añadir la imagen a la tarjeta
      card.appendChild(img);

      // 5) precio y descripción debajo de la foto
      const precioEl = document.createElement("p");
      precioEl.classList.add("producto-precio");
      precioEl.innerText = precio != null
        ? `Q ${precio.toFixed(2)}`
        : "Sin precio";
      card.appendChild(precioEl);

      const descEl = document.createElement("p");
      descEl.classList.add("producto-desc");
      descEl.innerText = descripcion || "";
      card.appendChild(descEl);

      // 6) Crear y agregar el botón Eliminar
      const btnEliminar = document.createElement("button");
      btnEliminar.textContent = "Eliminar";
      btnEliminar.classList.add("btn-eliminar");
      btnEliminar.addEventListener("click", () => {
        // Primero borramos el archivo en Storage
        storage.ref(path).delete()
          .then(() => {
            // Luego borramos el documento en Firestore
            return db.collection("imagenes").doc(id).delete();
          })
          .catch(err => {
            console.error("Error al eliminar foto:", err);
          });
      });
      card.appendChild(btnEliminar);

      // 7) insertar la tarjeta en el DOM
      imagenesDiv.appendChild(card);
    });
  });


});
