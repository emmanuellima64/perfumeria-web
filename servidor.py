from flask import Flask, request, send_from_directory, jsonify, send_file, render_template_string
import serial
import threading
import time
import os
from datetime import datetime
import qrcode
import io
import socket

app = Flask(__name__)

# ==================== CONFIGURACIÓN DE ARDUINO ====================

PORT_ARDUINO1 = os.environ.get("PORT_ARDUINO1", "COM4")
PORT_ARDUINO2 = os.environ.get("PORT_ARDUINO2", "COM3")
BAUDRATE = int(os.environ.get("BAUDRATE", "9600"))

# Si la detección automática falla, ingresa tu IP manualmente aquí.
# Si lo dejas vacío (""), el programa intentará detectarla de forma automática.
MANUAL_IP = "" # <<-- INGRESA TU IP REAL AQUÍ, ejemplo: "192.168.1.10"

# Si usas ngrok, ingresa la URL que te dio aquí.
NGROK_URL = "" # <<-- INGRESA TU URL DE NGROK AQUÍ, ejemplo: "https://1a2b-3c4d-5e6f-7890.ngrok-free.app"

# Función para obtener la IP local de forma automática o usar la IP manual/ngrok
def get_server_url():
    if NGROK_URL:
        return NGROK_URL
    if MANUAL_IP:
        return f"http://{MANUAL_IP}:5000"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return f"http://{local_ip}:5000"
    except Exception:
        return "http://127.0.0.1:5000"

SERVER_URL = get_server_url()

def open_serial(port):
    while True:
        try:
            s = serial.Serial(port, BAUDRATE, timeout=1)
            time.sleep(2)
            print(f"Conectado a {port} @ {BAUDRATE} bps")
            return s
        except serial.SerialException as e:
            print(f"No se pudo abrir {port}: {e}. Reintentando en 2s...")
            time.sleep(2)

try:
    ser1 = open_serial(PORT_ARDUINO1)
    lock1 = threading.Lock()
except Exception as e:
    print(f"No se pudo inicializar Arduino 1: {e}")
    ser1 = None
    lock1 = None

try:
    ser2 = open_serial(PORT_ARDUINO2)
    lock2 = threading.Lock()
except Exception as e:
    print(f"No se pudo inicializar Arduino 2: {e}")
    ser2 = None
    lock2 = None

# ==================== INVENTARIO Y VENTAS ====================

INVENTARIO = {
    "P123": {"nombre":"Café Premium","precio":5000,"stock":10},
    "P124": {"nombre":"Galleta","precio":1000,"stock":20},
    "P125": {"nombre":"Jugo Natural","precio":2500,"stock":15},
}

VENTAS = []

# ==================== RUTAS ====================

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

# -------- Arduino 1: Botones --------
@app.route("/btn", methods=["POST"])
def press_button():
    if not ser1:
        return jsonify(ok=False, error="Arduino 1 no conectado"), 503
    
    if request.is_json:
        data = request.get_json(silent=True) or {}
        pin = data.get("pin")
    else:
        pin = request.form.get("pin", type=int)

    try:
        pin = int(pin)
    except (TypeError, ValueError):
        return jsonify(ok=False, error="pin faltante o inválido"), 400

    if pin not in [8, 9, 10, 11]:
        return jsonify(ok=False, error="pin debe ser 8, 9, 10 o 11"), 400

    cmd = f"BTN:{pin}\n"
    try:
        with lock1:
            ser1.write(cmd.encode("utf-8"))
            ser1.flush()
            try:
                resp = ser1.readline().decode("utf-8", errors="ignore").strip()
            except Exception:
                resp = ""
        return jsonify(ok=True, sent=cmd.strip(), resp=resp)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

# -------- Arduino 2: Motores --------
@app.route("/motor", methods=["POST"])
def press_motor():
    if not ser2:
        return jsonify(ok=False, error="Arduino 2 no conectado"), 503

    if request.is_json:
        data = request.get_json(silent=True) or {}
        motor = data.get("motor")
    else:
        motor = request.form.get("motor")

    # Validación adicional para asegurar que el motor es un valor válido
    if motor not in ["2", "3", "4"]:
        return jsonify(ok=False, error="motor debe ser 2, 3 o 4"), 400

    cmd = motor + "\n"
    try:
        with lock2:
            ser2.write(cmd.encode("utf-8"))
            ser2.flush()
            try:
                resp = ser2.readline().decode("utf-8", errors="ignore").strip()
            except Exception:
                resp = ""
        return jsonify(ok=True, sent=cmd.strip(), resp=resp)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

# -------- POS: Escaneo de QR (con texto) --------
@app.route("/scan_qr", methods=["POST"])
def scan_qr():
    data = request.get_json() or {}
    product_code = data.get("productCode")
    
    if not product_code:
        return jsonify(ok=False, error="No se recibió código de producto"), 400
    
    producto = INVENTARIO.get(product_code)
    if producto and producto["stock"] > 0:
        return jsonify(ok=True, producto=producto)
    
    return jsonify(ok=False, error="Producto no encontrado o sin stock")

# -------- Generar QR de pago --------
@app.route("/checkout", methods=["POST"])
def checkout():
    data = request.get_json() or {}
    cart = data.get("cart")
    
    if not cart:
        return jsonify(ok=False, error="Carrito vacío"), 400

    total = sum(p["precio"] for p in cart)
    hora_venta = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for p in cart:
        INVENTARIO[p["codigo"]]["stock"] -= 1
        VENTAS.append({"codigo":p["codigo"], "nombre":p["nombre"], "precio":p["precio"], "hora":hora_venta})

    link_pago = f"{SERVER_URL}/pagar?total={total}"
    img = qrcode.make(link_pago)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

# -------- Ruta para la página de pago --------
@app.route("/pagar")
def pagar():
    total = request.args.get("total")
    # Genera una página HTML simple para la pantalla de pago.
    html_content = """
    <!doctype html>
    <html lang="es">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Página de Pago</title>
        <style>
            body {
                font-family: sans-serif;
                text-align: center;
                padding: 20px;
                background-color: #f0f0f0;
                color: #333;
            }
            .card {
                background-color: #fff;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                margin: auto;
                max-width: 400px;
            }
            h1 {
                color: green;
            }
            .total {
                font-size: 2em;
                font-weight: bold;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>¡Pago exitoso!</h1>
            <p>Se ha cobrado un total de:</p>
            <div class="total">${total_con_puntos}</div>
        </div>
    </body>
    </html>
    """
    total_con_puntos = f"{int(total) / 100:.2f}"
    return render_template_string(html_content, total_con_puntos=total_con_puntos)


# -------- Ver ventas --------
@app.route("/ventas")
def ver_ventas():
    return jsonify(VENTAS)

# ===========================================
if __name__ == "__main__":
    print(f"El servidor está corriendo en {SERVER_URL}")
    try:
        app.run(debug=True, host='0.0.0.0')
    except Exception as e:
        print(f"Error al iniciar el servidor: {e}")
        print("Puede que el puerto 5000 esté en uso. Intente cerrar otras aplicaciones que lo utilicen.")
