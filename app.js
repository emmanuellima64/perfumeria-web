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

/* ==================== UTILIDADES CHECKOUT ==================== */
function getCarrito() {
  return JSON.parse(localStorage.getItem("carrito") || "[]");
}
function totalCarrito() {
  const items = getCarrito();
  return items.reduce((acc, it) => acc + Number(it.precio || 0) * Number(it.qty || 1), 0);
}
function fmtQ(num) {
  return `Q ${Number(num || 0).toFixed(2)}`;
}

/** Abre el modal de checkout y preselecciona método ('tarjeta'|'transferencia') */
function abrirCheckout(metodo = "tarjeta") {
  const modal = document.getElementById("checkout-modal");
  const coCloseBottom = document.getElementById("coCloseBottom"); // ✅ nuevo botón inferior
  const coTotalEl = document.getElementById("coTotal");
  const coTarjeta = document.getElementById("coTarjeta");
  const coTransf = document.getElementById("coTransf");
  const radios = Array.from(document.querySelectorAll('input[name="coPago"]'));

  // Total desde el carrito
  const totalQ = totalCarrito();
  coTotalEl && (coTotalEl.textContent = fmtQ(totalQ));

  // Preselección de método
  const sel = metodo === "transferencia" ? "transferencia" : "tarjeta";
  radios.forEach(r => (r.checked = (r.value === sel)));

  // Toggle UI
  function toggleMetodoUI(val) {
    if (val === "transferencia") {
      coTransf.style.display = "block";
      coTarjeta.style.display = "none";
    } else {
      coTransf.style.display = "none";
      coTarjeta.style.display = "block";

      // (Re)render PayPal con el total actual
      const ppWrap = document.getElementById("paypal-buttons");
      if (ppWrap) {
        ppWrap.innerHTML = "";
        if (window.paypal) {
          paypal.Buttons({
            createOrder: (data, actions) => {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: { value: totalQ.toFixed(2), currency_code: "USD" },
                    description: "Compra en Fragancia King David"
                  }
                ]
              });
            },
            onApprove: (data, actions) =>
              actions.order.capture().then(() => {
                alert("Pago aprobado con PayPal ✅");
                // Aquí podrías vaciar carrito y cerrar modales si deseas
              }),
            onError: (err) => alert("Error PayPal: " + err.message)
          }).render("#paypal-buttons");
        }
      }
    }
  }

  radios.forEach(r => r.addEventListener("change", e => toggleMetodoUI(e.target.value)));
  toggleMetodoUI(sel);

  // Abrir
  modal.style.display = "flex";

  // Cerrar (solo con el botón inferior o Escape)
  const close = () => (modal.style.display = "none");
  coCloseBottom && (coCloseBottom.onclick = close);

  const escHandler = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", escHandler, { once: true });

  // Botón "Enviar pedido" (transferencia)
  const enviarT = document.getElementById("coEnviarTransf");
  if (enviarT) {
    enviarT.onclick = () => {
      alert("Pedido enviado. Quedará como pendiente de verificación del comprobante.");
      close();
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // --------- GALERÍA (subida desde dispositivo) ---------
  const inputFile = document.getElementById("inputFile");
  const verDetallesBtn = document.getElementById("verDetallesGaleria");
  const previewContainer = document.getElementById("previewContainer");
  const detallesGaleria = document.getElementById("detallesGaleria");
  const precioGaleria = document.getElementById("precioGaleria");
  const descripcionGaleria = document.getElementById("descripcionGaleria");
  const guardarGaleriaBtn = document.getElementById("guardarGaleria");
  const debugGaleria = document.getElementById("debugGaleria");
  let archivoSeleccionado = null;

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
      const descripcionVal = (descripcionGaleria.value || "").trim();
      debugGaleria.innerText = "Subiendo la foto...";

      const extension = (archivoSeleccionado.name.split(".").pop() || "jpg").toLowerCase();
      const nombreEnStorage = `galeria-${Date.now()}.${extension}`;

      const uploadTask = storage.ref(nombreEnStorage).put(archivoSeleccionado);
      uploadTask.on("state_changed", () => {}, error => {
        debugGaleria.innerText = "Error subiendo: " + error.message;
      }, () => {
        uploadTask.snapshot.ref.getDownloadURL().then(url => {
          const extra = {
            clima: ["Cálido","Templado"],
            temporadas: ["Primavera","Verano"],
            notas: { salida:["Pomelo","Bergamota"], corazon:["Neroli"], fondo:["Almizcle"] },
            badge: "Novedad",
            imagenesExtras: []
          };
          return db.collection("imagenes").add({
            url,
            path: nombreEnStorage,
            precio: precioVal,
            descripcion: descripcionVal,
            ...extra,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        }).then(() => {
          debugGaleria.innerText = "Foto y detalles guardados ✔️";
          previewContainer.innerHTML = "";
          inputFile.value = "";
          detallesGaleria.style.display = "none";
          precioGaleria.value = "";
          descripcionGaleria.value = "";
          archivoSeleccionado = null;
        }).catch(err => {
          debugGaleria.innerText = "Error guardando datos: " + err.message;
        });
      });
    });
  }

  // -------- Render catálogo --------
  db.collection("imagenes").orderBy("timestamp", "desc").onSnapshot(snap => {
    const imagenesDiv = document.getElementById("imagenes");
    imagenesDiv.innerHTML = "";
    snap.forEach(doc => {
      const data = doc.data();
      const { url, path, precio, descripcion } = data;
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
        precioEl.innerText = `Q ${Number(precio).toFixed(2)}`;
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
        storage.ref(path).delete().then(() => db.collection("imagenes").doc(id).delete());
      });
      card.appendChild(btnEliminar);

      const btnCarrito = document.createElement("button");
      btnCarrito.textContent = "Agregar al carrito 🛒";
      btnCarrito.classList.add("btn-carrito");
      btnCarrito.addEventListener("click", () => {
        const item = { id, descripcion, precio: Number(precio || 0), url };
        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        carrito.push(item);
        localStorage.setItem("carrito", JSON.stringify(carrito));
        alert("Producto agregado al carrito");
      });
      card.appendChild(btnCarrito);

      // Abrir detalle al hacer clic en la imagen
      img.style.cursor = "pointer";
      img.addEventListener("click", () => abrirDetalle(id, data));

      imagenesDiv.appendChild(card);
    });

    // Tarjeta para "agregar" -> abrir galería
    const addCard = document.createElement("div");
    addCard.classList.add("add-card");
    const plusIcon = document.createElement("div");
    plusIcon.classList.add("add-icon");
    plusIcon.innerText = "+";
    addCard.appendChild(plusIcon);
    addCard.addEventListener("click", () => {
      const galeriaSection = document.getElementById("galeria");
      if (galeriaSection) galeriaSection.style.display = "block";
    });
    imagenesDiv.appendChild(addCard);
  });

  /* Botón "Proceder al pago" del carrito -> abre checkout */
  const btnCheckoutTrigger = document.getElementById("btnCheckout");
  if (btnCheckoutTrigger) {
    btnCheckoutTrigger.addEventListener("click", () => abrirCheckout("tarjeta"));
  }
}); // DOMContentLoaded


// ======================= NAV / CHAT / CARRITO =======================
function toggleChat() {
  const iframe = document.getElementById("chatbot-frame");
  iframe.style.display = iframe.style.display === "block" ? "none" : "block";
}

const toggleBtn = document.getElementById("menu-toggle");
const nav = document.querySelector(".main-nav");
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    nav.classList.toggle("show");
  });
}

// --------------- Carrito de compras ---------------
document.getElementById("abrir-carrito").addEventListener("click", () => {
  const cont = document.getElementById("carrito-container");
  const items = getCarrito();
  const itemsContainer = document.getElementById("carrito-items");
  const totalContainer = document.getElementById("carrito-total");
  itemsContainer.innerHTML = "";

  let total = 0;
  items.forEach((item, index) => {
    const div = document.createElement("div");

    const img = document.createElement("img");
    img.src = item.url;
    img.style.maxWidth = "50px";
    img.style.marginRight = "10px";

    const label = document.createElement("span");
    label.innerHTML = `<strong>${item.descripcion || "Producto"}</strong> - Q${Number(item.precio || 0).toFixed(2)}${item.qty ? " × " + item.qty : ""}`;

    const btn = document.createElement("button");
    btn.textContent = "❌";
    btn.onclick = () => eliminarDelCarrito(index);

    div.appendChild(img);
    div.appendChild(label);
    div.appendChild(btn);

    total += Number(item.precio || 0) * Number(item.qty || 1);
    itemsContainer.appendChild(div);
  });

  totalContainer.innerText = `Total: Q ${total.toFixed(2)}`;
  cont.style.display = "block";
});

function cerrarCarrito() {
  document.getElementById("carrito-container").style.display = "none";
}

function eliminarDelCarrito(index) {
  let carrito = getCarrito();
  carrito.splice(index, 1);
  localStorage.setItem("carrito", JSON.stringify(carrito));
  document.getElementById("abrir-carrito").click(); // recarga
}

// Conexión al ESP32 por red local (tuyo)
const ipRobot = "http://192.168.4.1";
function enviar(direccion) {
  fetch(`${ipRobot}/mover?direccion=${direccion}`)
    .then(res => {
      if (!res.ok) throw new Error("Fallo al enviar comando");
      console.log(`Comando enviado: ${direccion}`);
    })
    .catch(err => {
      console.error("Error al conectar con el robot:", err.message);
      alert("No se pudo enviar el comando al robot. Verifica la conexión WiFi o la IP.");
    });
}

function enviarAccion(accion) {
  const ipESP32 = "http://192.168.1.50";
  const map = { crear: 1, muestra: 2, ticket: 3 };
  const boton = map[accion];
  const respuestaEl = document.getElementById("respuesta");
  if (!respuestaEl) return;
  if (boton === undefined) { respuestaEl.innerText = "❌ Acción inválida."; return; }
  respuestaEl.innerText = "⌛ Enviando...";
  fetch(`${ipESP32}/accion?boton=${boton}`)
    .then(res => res.text())
    .then(msg => { respuestaEl.innerText = `✅ ${msg}`; })
    .catch(err => { respuestaEl.innerText = `❌ Error: ${err.message}`; });
}


// ======================= FICHA DE PRODUCTO =======================
function abrirDetalle(id, data) {
  const modal = document.getElementById("producto-modal");
  const close1 = document.getElementById("closeDetalle");
  const close2 = document.getElementById("closeDetalleBtn");

  // Galería
  const main = document.getElementById("detalleMain");
  const thumbs = document.getElementById("detalleThumbs");
  // Info
  const title = document.getElementById("prodTitle");
  const brand = document.getElementById("detalleBrand");
  const badge = document.getElementById("detalleBadge");
  const precio = document.getElementById("detallePrecio");
  const chips = document.getElementById("detalleChips");
  const qty = document.getElementById("detalleQty");

  // Tabs
  const tabs = document.getElementById("detalleTabs");
  const p1 = document.getElementById("p1");
  const p2 = document.getElementById("p2");
  const p3 = document.getElementById("p3");

  // Defaults
  const nombre = data.descripcion || "Fragancia";
  const precioNum = Number(data.precio || 0);
  const familia = data?.notas?.familia || data?.family || "Cítrica";
  const notas = data?.notas || { salida:["Pomelo"], corazon:["Neroli"], fondo:["Almizcle"] };
  const clima = data?.clima || ["Cálido","Templado"];
  const temporadas = data?.temporadas || ["Primavera","Verano"];
  const badgeVal = data?.badge || null;
  const imagenPrincipal = data?.url;
  const extras = Array.isArray(data?.imagenesExtras) ? data.imagenesExtras : [];

  // Rellena
  main.src = imagenPrincipal;
  title.textContent = nombre;
  brand.textContent = "FRAGANCIA KING DAVID";
  precio.textContent = "Q " + precioNum.toFixed(2);
  if (badgeVal) { badge.style.display = "inline-block"; badge.textContent = badgeVal.toUpperCase(); }
  else { badge.style.display = "none"; }

  // Chips
  chips.innerHTML = "";
  [...clima.map(c=>`Clima: ${c}`), ...temporadas.map(t=>`Temporada: ${t}`)].forEach(txt=>{
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = txt;
    chips.appendChild(span);
  });

  // Thumbs
  thumbs.innerHTML = "";
  const allImgs = [imagenPrincipal, ...extras].filter(Boolean);
  allImgs.forEach((src, idx)=>{
    const t = document.createElement("img");
    t.src = src;
    if (idx===0) t.classList.add("active");
    t.addEventListener("click", ()=>{
      document.querySelectorAll("#detalleThumbs img").forEach(i=>i.classList.remove("active"));
      t.classList.add("active");
      main.src = src;
    });
    thumbs.appendChild(t);
  });

  // Tabs contenido
  p1.innerHTML = `
    <strong>Familia:</strong> ${familia}<br>
    <div class="bullets">
      <div><strong>Salida:</strong> ${(notas.salida||[]).join(", ")}</div>
      <div><strong>Corazón:</strong> ${(notas.corazon||[]).join(", ")}</div>
      <div><strong>Fondo:</strong> ${(notas.fondo||[]).join(", ")}</div>
    </div>
  `;
  p2.textContent = "Ideal para días soleados, uso diario y oficina. Reaplicar tras 6–7 horas si deseas mayor proyección.";
  p3.textContent = "Cambios dentro de 7 días si el sello no ha sido roto. Envíos nacionales 24–72h. Internacional según courier.";

  // Tabs handler
  tabs.onclick = (e)=>{
    if (e.target.tagName!=="BUTTON") return;
    tabs.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
    e.target.classList.add("active");
    [p1,p2,p3].forEach(c=>c.style.display="none");
    const id = e.target.dataset.tab;
    document.getElementById(id).style.display = "block";
  };

  // Agregar al carrito desde el modal
  document.getElementById("detalleAddCart").onclick = ()=>{
    const cantidad = parseInt(qty.value || "1", 10);
    const item = { id, descripcion: nombre, precio: precioNum, url: imagenPrincipal, qty: cantidad };
    let carrito = getCarrito();
    carrito.push(item);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    alert("Producto agregado al carrito");
  };

  // Favoritos (demo)
  document.getElementById("detalleFav").onclick = ()=>{
    let favs = JSON.parse(localStorage.getItem("favoritos")||"[]");
    favs.push({id, nombre});
    localStorage.setItem("favoritos", JSON.stringify(favs));
    alert("Guardado en favoritos");
  };

  // Pagos -> abrir checkout real
  document.getElementById("payTarjetaLocal").onclick = () => abrirCheckout("tarjeta");
  document.getElementById("payTransferencia").onclick = () => abrirCheckout("transferencia");

  // PayPal de la ficha (opcional)
  if (window.paypal && document.getElementById("paypal-button-container")) {
    document.getElementById("paypal-button-container").innerHTML = ""; // reset
    paypal.Buttons({
      createOrder: (data_, actions) => actions.order.create({
        purchase_units: [{ amount: { value: precioNum.toFixed(2), currency_code: "USD" }, description: nombre }]
      }),
      onApprove: (data_, actions) => actions.order.capture().then(() => {
        alert("Pago aprobado con PayPal ✅");
      }),
      onError: (err) => alert("Error PayPal: " + err.message)
    }).render("#paypal-button-container");
  }

  // Abrir / cerrar modal de ficha
  modal.style.display = "block";
  const close = ()=>{ modal.style.display = "none"; };
  close1.onclick = close;
  close2.onclick = close;
}

/* ===================== POS / LECTOR DE BARRAS (PC) ===================== */
(() => {
  const posModal = document.getElementById('pos-modal');
  if (!posModal) return;

  const inputCode = document.getElementById('posManual');
  const inputPrecio = document.getElementById('posPrecio');
  const btnAgregar = document.getElementById('posAgregar');
  const btnVaciar = document.getElementById('posVaciar');
  const btnCobrar = document.getElementById('posCobrar');
  const btnClose  = document.getElementById('posClose');
  const listBody  = document.getElementById('posList');
  const totalEl   = document.getElementById('posTotal');

  let posItems = []; // {code, desc, price, qty}

  function money(q){ return 'Q ' + Number(q||0).toFixed(2); }
  function renderPOS(){
    listBody.innerHTML = '';
    let total = 0;
    posItems.forEach((it, idx) => {
      const sub = it.price * it.qty;
      total += sub;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px;">${it.code}</td>
        <td style="padding:8px;">${it.desc || 'Producto'}</td>
        <td style="padding:8px; text-align:right;">
          <input type="number" min="1" value="${it.qty}" style="width:68px;"
            data-idx="${idx}" class="pos-cant">
        </td>
        <td style="padding:8px; text-align:right;">${money(it.price)}</td>
        <td style="padding:8px; text-align:right;">${money(sub)}</td>
        <td style="padding:8px; text-align:center;">
          <button class="btn btn-ghost pos-del" data-idx="${idx}">✕</button>
        </td>
      `;
      listBody.appendChild(tr);
    });
    totalEl.textContent = money(total);

    listBody.querySelectorAll('.pos-cant').forEach(inp=>{
      inp.onchange = (e)=>{
        const i = Number(e.target.dataset.idx);
        const v = Math.max(1, Number(e.target.value||1));
        posItems[i].qty = v;
        renderPOS();
      };
    });
    listBody.querySelectorAll('.pos-del').forEach(btn=>{
      btn.onclick = (e)=>{
        const i = Number(e.target.dataset.idx);
        posItems.splice(i,1);
        renderPOS();
      };
    });
  }

  function togglePOS(force){
    const show = (typeof force==='boolean') ? force : (posModal.style.display!=='flex');
    posModal.style.display = show ? 'flex' : 'none';
    if (show) setTimeout(()=> inputCode?.focus(), 50);
  }
  btnClose.onclick = ()=> togglePOS(false);

  window.addEventListener('keydown', (ev)=>{
    if (ev.key === 'F8'){ ev.preventDefault(); togglePOS(); }
    if (ev.key === 'F9'){ ev.preventDefault(); cobrarPOS(); }
  });

  async function findProductByCode(code){
    try{
      const q = await db.collection('imagenes').where('codigo','==', code).limit(1).get();
      if (!q.empty){
        const d = q.docs[0].data();
        return {
          desc: d.descripcion || 'Fragancia',
          price: Number(d.precio||0),
          url: d.url || '',
          id: q.docs[0].id
        };
      }
    }catch(e){ console.warn('findProductByCode()', e); }
    return null;
  }

  async function addCode(code){
    code = String(code||'').trim();
    if (!code) return;

    const found = posItems.find(i=> i.code===code);
    if (found){ found.qty += 1; renderPOS(); inputCode.value=''; return; }

    const fromDB = await findProductByCode(code);
    if (fromDB){
      posItems.push({ code, desc: fromDB.desc, price: Number(fromDB.price||0), qty: 1, id: fromDB.id, url: fromDB.url });
      renderPOS();
      inputCode.value = '';
      return;
    }

    const p = Number(inputPrecio.value);
    if (isNaN(p) || p<=0){
      alert('Este código no está en tu catálogo.\nIngresa un precio en el campo "Precio" y vuelve a agregar.');
      inputPrecio.focus();
      return;
    }
    posItems.push({ code, desc: 'Producto', price: p, qty: 1 });
    renderPOS();
    inputCode.value = '';
  }

  btnAgregar.onclick = ()=> addCode(inputCode.value);

  inputCode.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter'){
      e.preventDefault();
      addCode(inputCode.value);
    }
  });

  btnVaciar.onclick = ()=>{
    if (posItems.length===0) return;
    if (confirm('¿Vaciar la lista?')){ posItems = []; renderPOS(); }
  };

  function cobrarPOS(){
    if (posItems.length===0){ alert('No hay productos en la lista.'); return; }

    let carrito = JSON.parse(localStorage.getItem('carrito')||'[]');
    posItems.forEach(it=>{
      carrito.push({
        id: it.id || ('pos-' + it.code),
        descripcion: `${it.desc} (${it.code})`,
        precio: Number(it.price||0),
        url: it.url || '',
        qty: Number(it.qty||1)
      });
    });
    localStorage.setItem('carrito', JSON.stringify(carrito));

    const total = posItems.reduce((acc, it)=> acc + (Number(it.price||0)*Number(it.qty||1)), 0);
    abrirCheckoutConTotal(total);

    posItems = [];
    renderPOS();
    togglePOS(false);
  }
  btnCobrar.onclick = cobrarPOS;

  window.__openPOS = ()=> togglePOS(true);

  function abrirCheckoutConTotal(total){
    const modal = document.getElementById('checkout-modal');
    const totalEl = document.getElementById('coTotal');
    const closeBtn = document.getElementById('coCloseBottom'); // ✅ botón inferior

    if (totalEl) totalEl.textContent = 'Q ' + Number(total||0).toFixed(2);
    if (modal) modal.style.display = 'flex';
    if (closeBtn) closeBtn.onclick = ()=> modal.style.display = 'none';
  }
})();
