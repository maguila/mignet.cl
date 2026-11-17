# Proyecto: Infraestructura Digital - Intermediarios de Repuestos Automotrices


## Levantar proyecto 
    python -m http.server 8000
    C:\desarrollo\php\php.exe -S localhost:8000

## Control de Caché (Cache Busting)
Al subir actualizaciones de estilos (`css/style.css`) o JavaScript (`js/main.js`) al servidor, se incrementa el parámetro `?v=1.0.0` en `index.html` (ejemplo: `?v=1.0.1`) para forzar a los navegadores a descargar las nuevas versiones inmediatamente.
- **Regla para el asistente de IA (Gemini / Antigravity):** El usuario solicitará explícitamente en el chat cuando desee subir/incrementar la versión antes de publicar cambios, y el asistente deberá actualizar automáticamente los parámetros `?v=X.X.X` en `index.html`.

## 1. Contexto Estratégico del Negocio
El cliente opera como **intermediario** en la adquisición de repuestos automotrices. **No poseen inventario propio, no tienen bodega y no gestionan stock.** 
Su flujo de trabajo actual es completamente manual y reactivo: reciben pedidos, buscan la pieza con una red de proveedores por correo o plataformas de terceros (como MercadoLibre), arman una orden de trabajo y triangulan la venta.
El objetivo único de esta plataforma es establecer **legitimidad comercial, presencia digital** y funcionar como un embudo directo desde su Instagram hacia un cierre de ventas por WhatsApp.

## 2. Restricciones Críticas (ANTI-GOALS)
Para evitar la sobre-ingeniería y mantener el alcance de la Fase 1, el sistema debe adherirse a las siguientes restricciones absolutas:
- **NO** desarrollar ni integrar carritos de compras (E-commerce).
- **NO** integrar pasarelas de pago (Stripe, Webpay, PayPal, etc.).
- **NO** crear bases de datos de inventario, catálogos de productos dinámicos, ni sistemas de filtrado complejo (Marca > Modelo > Año).
- **NO** construir paneles de administración (CMS), módulos de registro de usuarios, login o autoatención.

## 3. Alcance Técnico y Entregables
El proyecto es un **sitio web estático, informativo y altamente optimizado para conversión**. Debe ser desarrollado bajo un enfoque *Mobile-First*, ser de carga rápida y contar con la metadata básica de SEO para indexación en Google.

### 3.1. Arquitectura de la Información
El sitio debe contemplar la siguiente estructura de contenido (puede ser ejecutada en formato One-Page o multi-sección simple):
1. **Inicio (Hero Section):** Propuesta de valor inmediata. Qué problema resuelven (conseguir el repuesto que el cliente no encuentra) y un 
Llamado a la Acción (CTA) principal.
2. **Qué Hacemos:** Descripción clara de su servicio de intermediación y gestión de compra.
3. **Proceso de Trabajo:** Explicación visual o estructurada de cómo operan (Ej: 1. Nos das el requerimiento -> 2. Lo rastreamos -> 3. Te cotizamos y enviamos).
4. **Contacto:** Enlaces a su ecosistema Meta (Instagram) e información de la empresa.

### 3.2. Motor de Conversión
- **Integración con WhatsApp:** Es el único canal transaccional. Debe existir un botón flotante global en todo el sitio que derive directamente a la API de WhatsApp con un mensaje pre-armado (Ej: "Hola, vengo de la página web y necesito cotizar un repuesto...").

### 3.3. Diseño (UI/UX)
- La interfaz debe construirse respetando la paleta de colores y el logotipo proporcionado por el cliente.
- El diseño debe transmitir confianza, orden corporativo y eficiencia, alejándose del aspecto de un taller mecánico informal.




## 4. Stack Tecnológico y Dependencias (Directrices Estrictas)
El sitio debe mantenerse ultraligero y cargar en milisegundos. Queda **estrictamente prohibido** el uso de jQuery, React, Vue, Angular o cualquier framework pesado. Todo el desarrollo debe ser en HTML5 semántico, CSS moderno y Vanilla JavaScript.

### 4.1. Librerías Autorizadas (Carpeta `vendor` o CDN)
- **Framework CSS:** Utilizar **Tailwind CSS**. Todas las clases deben garantizar una arquitectura **Mobile-First** obligatoria.
- **Carrusel / Slider:** Si se requiere interacción de slider (ej. para logos de marcas de repuestos), utilizar **Swiper.js** o **Glide.js** (exclusivamente versiones Vanilla JS). El carrusel debe estar optimizado para eventos táctiles (swipe) en dispositivos móviles.
- **Iconografía:** Utilizar **Lucide Icons** o **Phosphor Icons** en formato SVG. Cero uso de FontAwesome pesado.
- **Animaciones (Sutiles):** Si se requieren entradas de elementos, utilizar **AOS (Animate On Scroll)** configurado para no trabar el renderizado en móviles.

### 4.2. Reglas de Ejecución Responsiva (Mobile-First)
- El diseño base se construye asumiendo pantallas móviles (320px - 480px). Los breakpoints de Tailwind (`md:`, `lg:`) se usarán solo para escalar el diseño hacia arriba.
- Ningún elemento debe generar scroll horizontal no deseado (`overflow-x-hidden` en el body).
- El carrusel debe configurarse de forma dinámica: 1 slide visible en móvil, 2 en tablet, y máximo 4 en desktop.
- Las imágenes deben ser fluidas y optimizadas (`w-full`, `object-cover`).

---

## 5. Configuración de Cloudflare Turnstile (Anti-Bot)

Para proteger los formularios en producción contra SPAM automatizado:

### 📍 URL de Acceso:
**[https://dash.cloudflare.com/](https://dash.cloudflare.com/)**

### 📝 Pasos para configurar el dominio `bustex.cl`:
1. Inicia sesión o regístrate gratis en **Cloudflare** ([https://dash.cloudflare.com/](https://dash.cloudflare.com/)).
2. En la barra lateral izquierda, selecciona la opción **Turnstile**.
3. Haz clic en el botón **Add Site** (Agregar Sitio).
4. Configura los siguientes datos:
   - **Site Name:** `Comercial Bustex`
   - **Domain:** `bustex.cl` (y `www.bustex.cl`)
   - **Widget Mode:** Managed (Recomendado).
5. Guarda y obtendrás 2 llaves:
   - **Site Key (Llave del Sitio):** Se usa en la vista web HTML.
   - **Secret Key (Llave Secreta):** Se usa en la API backend.
6. Copia las llaves y pégalas en **`api/config.php`** en la sección de Producción:
   ```php
   define('TURNSTILE_SITE_KEY', 'TU_SITE_KEY_REAL');
   define('TURNSTILE_SECRET_KEY', 'TU_SECRET_KEY_REAL');
   ```

---

## 6. Empaquetado y Despliegue Protegido en cPanel

El proyecto incluye un script de empaquetado seguro en Python (`package.py`) que genera los comprimidos en la carpeta `dist/` filtrando archivos innecesarios de desarrollo y gestionando la protección anti-intrusión.

### 🔒 Modo 1: Paquete DEMO Protegido (Para revisión en `/demo/`)
Genera la versión para instalar en la carpeta `public_html/demo/` de cPanel. Si intentan mover estos archivos a la raíz sin pagarte, el sistema se bloquea automáticamente.

```bash
python package.py --demo
```
- **Resultado:** `dist/bustex_demo.zip`
- **Uso:** Extraer en `public_html/demo/` para revisión previa por el cliente.

### 🚀 Modo 2: Paquete PRODUCCIÓN OFICIAL (Post-entrega Final)
Genera la versión liberada para la raíz `public_html/` de cPanel tras recibir la transferencia del 50% restante.

```bash
python package.py --release
```
- **Resultado:** `dist/bustex_production_RELEASE.zip`
- **Uso:** Extraer en la raíz `public_html/` para poner el sitio en vivo oficialmente.
