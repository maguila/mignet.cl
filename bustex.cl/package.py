#!/usr/bin/env python3
"""
Comercial Bustex - Empaquetador de Despliegue para cPanel
Genera paquetes .zip optimizados en la carpeta 'dist/'.

Soporta 2 modos de empaquetado:
- MODO DEMO (Por defecto): python package.py --demo
  Genera dist/bustex_demo.zip (Protegido por Apache .htaccess + PHP para carpeta /demo/).

- MODO LIBERACIÓN (Post-Pago): python package.py --release
  Genera dist/bustex_production_RELEASE.zip (Liberado con IS_RELEASED = true para raíz).
"""

import os
import sys
import zipfile

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
CONFIG_FILE = os.path.join(PROJECT_ROOT, "api", "config.php")
HTACCESS_FILE = os.path.join(PROJECT_ROOT, ".htaccess")

EXCLUDE_DIRS = {
    ".git",
    ".agents",
    ".vscode",
    ".idea",
    "__pycache__",
    "labs",
    "dist",
    "scratch",
}

EXCLUDE_FILES = {
    "Dockerfile",
    "docker-compose.yml",
    "router.php",
    "package.py",
    ".rate_limits.json",
    ".gitignore",
    ".DS_Store",
    "Thumbs.db",
}

EXCLUDE_EXTENSIONS = {
    ".py",
    ".pyc",
    ".log",
    ".tmp",
    ".bak",
    ".swp",
}


def should_include(relative_path: str) -> bool:
    """Determina si un archivo debe incluirse en el paquete ZIP."""
    parts = relative_path.replace("\\", "/").split("/")

    for part in parts[:-1]:
        if part in EXCLUDE_DIRS:
            return False

    filename = parts[-1]

    if "uploads" in parts and filename.startswith("cot_"):
        return False

    if filename in EXCLUDE_FILES:
        return False

    ext = os.path.splitext(filename)[1].lower()
    if ext in EXCLUDE_EXTENSIONS:
        return False

    return True


def set_release_mode(is_released: bool):
    """Ajusta la constante IS_RELEASED en api/config.php y las reglas de Apache en .htaccess."""
    # 1. Ajustar api/config.php
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            content = f.read()

        target_val = "define('IS_RELEASED', true);" if is_released else "define('IS_RELEASED', false);"
        
        if "define('IS_RELEASED', true);" in content:
            content = content.replace("define('IS_RELEASED', true);", target_val)
        elif "define('IS_RELEASED', false);" in content:
            content = content.replace("define('IS_RELEASED', false);", target_val)

        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            f.write(content)

    # 2. Ajustar .htaccess para bloqueo a nivel de servidor web Apache
    if is_released:
        htaccess_content = """# ============================================================
# Comercial Bustex - Configuración de Servidor Apache / cPanel
# ============================================================

RewriteEngine On

# Establecer la página predeterminada
DirectoryIndex index.html index.php

# Prevenir el listado de directorios
Options -Indexes

# Cabeceras de Seguridad Básicas
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>
"""
    else:
        htaccess_content = """# ============================================================
# Comercial Bustex - Protección Modo Demo (.htaccess)
# Si intentan descomprimir o mover estos archivos a la raíz principal,
# Apache redirigirá cualquier petición a la pantalla de mantenimiento.
# ============================================================

RewriteEngine On

# Si la petición NO está dentro de /demo/, bloquear y redirigir a mantenimiento.html
RewriteCond %{REQUEST_URI} !^/demo/ [NC]
RewriteCond %{REQUEST_URI} !^/mantenimiento\\.html$ [NC]
RewriteCond %{REQUEST_URI} !^/(css|js|img|uploads)/ [NC]
RewriteRule ^(.*)$ /mantenimiento.html [R=302,L]

DirectoryIndex index.html index.php
Options -Indexes

<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>
"""

    with open(HTACCESS_FILE, "w", encoding="utf-8") as f:
        f.write(htaccess_content)


def create_package():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    is_release = "--release" in sys.argv
    
    zip_name = "bustex_production_RELEASE.zip" if is_release else "bustex_demo.zip"
    zip_path = os.path.join(DIST_DIR, zip_name)

    # Ajustar la constante en config.php y .htaccess según el modo elegido
    set_release_mode(is_release)

    print("=" * 65)
    if is_release:
        print(" 🚀 MODO LIBERACIÓN PRODUCCIÓN OFICIAL (--release)")
        print("    Constante IS_RELEASED activada en true. Reglas .htaccess limpias.")
    else:
        print(" 🔒 MODO DEMO PROTEGIDO (--demo)")
        print("    Constante IS_RELEASED en false + Regla Apache .htaccess activa (Solo /demo/).")
    print("=" * 65)

    if not os.path.exists(DIST_DIR):
        os.makedirs(DIST_DIR, exist_ok=True)

    if os.path.exists(zip_path):
        os.remove(zip_path)

    files_count = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(PROJECT_ROOT):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, PROJECT_ROOT)

                if should_include(rel_path):
                    zip_arcname = rel_path.replace("\\", "/")
                    zipf.write(full_path, arcname=zip_arcname)

                    file_size = os.path.getsize(full_path)
                    total_uncompressed_bytes += file_size
                    files_count += 1
                    print(f"  [+] {zip_arcname:<45} ({file_size / 1024:.1f} KB)")

    compressed_size = os.path.getsize(zip_path)

    # Restaurar estado demo localmente
    set_release_mode(is_release)

    print("\n" + "-" * 65)
    print(" ✅ EMPAQUETADO COMPLETADO CON ÉXITO")
    print("-" * 65)
    print(f" 📄 Archivos procesados   : {files_count} archivos")
    print(f" 💾 Tamaño sin comprimir : {total_uncompressed_bytes / (1024 * 1024):.2f} MB")
    print(f" 🗜️ Tamaño archivo ZIP   : {compressed_size / (1024 * 1024):.2f} MB")
    print(f" 📍 Ubicación del paquete : {os.path.relpath(zip_path, PROJECT_ROOT)}")
    print("-" * 65)
    if is_release:
        print(" 🌟 Este paquete está LIBERADO para la raíz public_html de producción.")
    else:
        print(" 🔒 Este paquete está PROTEGIDO en .htaccess y PHP.")
        print("    Si se extrae en la raíz redirigirá a mantenimiento.html.")
        print("    Para liberar la versión de producción oficial usa: python package.py --release")
    print("=" * 65)


if __name__ == "__main__":
    create_package()
