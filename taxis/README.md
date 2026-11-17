# 🚖 Taxis Futrono - Consulta de Tarifas Web Móvil

Aplicación web móvil interactiva diseñada para la consulta rápida y fácil de las tarifas oficiales del **Sindicato de Taxistas de Futrono**.

---

## 🌟 Características Principales

* 🔍 **Búsqueda Parcial Inteligente**: Encuentra destinos al instante escribiendo cualquier parte del nombre (ignora tildes y mayúsculas/minúsculas).
* 🔄 **Filtro Automático**: Al escribir en el buscador, cambia automáticamente la vista a la categoría **"Todos"** para ofrecer resultados completos.
* 🏠 **Recargo por Residencia (+$1.000)**: Interruptor para incluir automáticamente la salida desde el CESFAM, Los Castaños, Pedro de Valdivia u otras residencias.
* 🧮 **Calculadora de Kilómetros**: Modal interactivo para estimar costos de viajes por distancia ($750/km diurno y $900/km nocturno).
* 📱 **Optimizado para Móviles**: Diseño tipo app móvil con barra de navegación inferior, animaciones suaves y soporte para modo oscuro/claro.
* 📲 **Acciones Rápidas**: Copia la cotización en un clic o abre WhatsApp con un mensaje pre-llenado listo para consultar.

---

## 📂 Estructura del Proyecto

```text
taxis futrono/
├── data/
│   ├── Tarifario Los Andes 2026.pdf    # PDF de referencia oficial
│   └── tarifas_los_andes_2026.json     # Base de datos JSON con 255 destinos y tarifas
├── index.html           # Estructura principal de la aplicación web
├── style.css            # Estilos y sistema de diseño responsivo
├── app.js               # Lógica interactiva y motor de búsqueda
├── .gitignore           # Configuración para ignorar archivos temporales de Git
└── README.md            # Documentación del proyecto
```

---

## 🚀 Cómo Levantar el Proyecto

Tienes varias formas de ejecutar la aplicación localmente:

### Opción 1: Con Python (Recomendado)
Ejecuta el servidor HTTP incorporado en Python 3:

```bash
python -m http.server 8000
```

Luego abre tu navegador en:
👉 **[http://localhost:8000](http://localhost:8000)**

---

### Opción 2: Abrir directamente el archivo HTML
No requiere instalación ni comandos:
* Haz doble clic en `index.html` o arrástralo a tu navegador web.

---

### Opción 3: Con cualquier servidor estático
Si usas herramientas como `serve` o extensiones como Live Server en VS Code:

```bash
npx serve .
```

---

## 🌐 Despliegue en Producción con NGINX

Dado que este proyecto es un **sitio web estático** (HTML, CSS, JS y JSON), NGINX puede servir los archivos directamente con máxima velocidad y sin depender de Node.js.

### Pasos para desplegar:

1. **Copiar los archivos al servidor** (ejemplo `/var/www/taxis-futrono`):
   ```bash
   sudo mkdir -p /var/www/taxis-futrono
   sudo cp -r . /var/www/taxis-futrono/
   sudo chown -R www-data:www-data /var/www/taxis-futrono
   sudo chmod -R 755 /var/www/taxis-futrono
   ```

2. **Crear la configuración de NGINX** en `/etc/nginx/sites-available/taxis-futrono`:
   ```nginx
   server {
       listen 80;
       server_name tudominio.cl www.tudominio.cl; # O tu dirección IP

       root /var/www/taxis-futrono;
       index index.html;

       # Compresión Gzip activa para carga ultra rápida en móviles
       gzip on;
       gzip_types text/plain text/css application/json application/javascript image/svg+xml;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Caché de archivos estáticos
       location ~* \.(js|css|png|jpg|jpeg|ico|svg|json)$ {
           expires 7d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```

3. **Activar el sitio y recargar NGINX**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/taxis-futrono /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **HTTPS Gratis con Certbot (Let's Encrypt)**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d tudominio.cl
   ```

---

## 📊 Tarifas Base Referenciales

* **Tarifa Mínima Urbano**: $2.000
* **Tarifa Nocturna Base**: $2.500
* **Recargo Residencia / CESFAM**: +$500
* **Servicio Encargo**: +$1.500
* **Valor Km Diurno (07:00 - 22:00)**: $600 / km
* **Valor Km Nocturno (22:00 - 07:00)**: $850 / km
