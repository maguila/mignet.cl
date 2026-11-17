// Comercial Bustex - Main JS File

// Configuración Global (se sincroniza con los valores de api/config.php si están presentes)
const CONFIG = {
  whatsappPhone: window.APP_CONFIG?.whatsappPhone || '56961689241',
  emailContact: window.APP_CONFIG?.emailContact || 'alfonso.iturra@bustex.cl',
  defaultMessage: 'Hola, vengo de la página web de Comercial Bustex y necesito cotizar un repuesto.'
};

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initMobileMenu();
  initFaqAccordion();
  initQuoteForm();
  initFloatingWhatsapp();
  initBrandSlider();
  initSmoothScroll();
  initActiveNavSpy();
});

/**
 * Control del cambio de Tema (Claro / Oscuro)
 */
function initThemeToggle() {
  const desktopBtn = document.getElementById('theme-toggle-desktop');
  const mobileBtn = document.getElementById('theme-toggle-mobile');
  const htmlEl = document.documentElement;

  const updateIcons = (isLight) => {
    document.querySelectorAll('.theme-icon-sun').forEach(el => {
      el.classList.toggle('hidden', isLight);
    });
    document.querySelectorAll('.theme-icon-moon').forEach(el => {
      el.classList.toggle('hidden', !isLight);
    });
    document.querySelectorAll('.theme-text-label').forEach(el => {
      el.textContent = isLight ? 'Modo Oscuro' : 'Modo Claro';
    });
  };

  const toggleTheme = () => {
    const isCurrentlyLight = htmlEl.classList.contains('light');
    const newIsLight = !isCurrentlyLight;

    if (newIsLight) {
      htmlEl.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      htmlEl.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }

    updateIcons(newIsLight);
  };

  // Sincronizar iconos iniciales según el estado actual del HTML
  updateIcons(htmlEl.classList.contains('light'));

  if (desktopBtn) desktopBtn.addEventListener('click', toggleTheme);
  if (mobileBtn) mobileBtn.addEventListener('click', toggleTheme);
}

/**
 * Control del menú móvil de navegación
 */
function initMobileMenu() {
  const menuBtn = document.getElementById('menu-toggle');
  const closeOverlay = document.getElementById('menu-close');
  const closeBtn = document.getElementById('menu-close-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuLinks = mobileMenu?.querySelectorAll('a');

  if (!menuBtn || !mobileMenu) return;

  const toggleMenu = (open) => {
    if (open) {
      mobileMenu.classList.remove('translate-x-full');
      document.body.classList.add('overflow-hidden');
    } else {
      mobileMenu.classList.add('translate-x-full');
      document.body.classList.remove('overflow-hidden');
    }
  };

  menuBtn.addEventListener('click', () => toggleMenu(true));
  if (closeOverlay) closeOverlay.addEventListener('click', () => toggleMenu(false));
  if (closeBtn) closeBtn.addEventListener('click', () => toggleMenu(false));

  // Cerrar menú al hacer clic en cualquier enlace
  menuLinks?.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });
}

/**
 * Control del acordeón interactivo de FAQs
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    const content = item.querySelector('.faq-content');
    const icon = item.querySelector('.faq-icon');

    if (!trigger || !content) return;

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');

      // Cerrar todos los acordeones
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        const otherContent = otherItem.querySelector('.faq-content');
        const otherIcon = otherItem.querySelector('.faq-icon');
        if (otherContent) otherContent.style.maxHeight = null;
        if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
      });

      // Abrir el actual si estaba cerrado
      if (!isOpen) {
        item.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });
}

/**
 * Sistema de Notificaciones Toast Profesional (Auto-desaparece en 30s por defecto)
 */
function showToast({ type = 'success', title, message, duration = 30000, actionUrl = null, actionText = null }) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-6 left-4 sm:left-6 z-[60] flex flex-col space-y-3 max-w-[calc(100vw-2rem)] sm:max-w-md w-full pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const isSuccess = type === 'success';

  const bgBorderClasses = isSuccess
    ? 'bg-brand-darkCard/95 border-brand-yellow/40 text-slate-100'
    : 'bg-brand-darkCard/95 border-red-500/40 text-slate-100';

  const iconSvg = isSuccess
    ? `<div class="w-10 h-10 rounded-xl bg-brand-yellow/15 border border-brand-yellow/30 text-brand-yellow flex items-center justify-center flex-shrink-0 shadow-md">
         <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
       </div>`
    : `<div class="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center flex-shrink-0 shadow-md">
         <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
       </div>`;

  const barColor = isSuccess ? 'bg-brand-yellow' : 'bg-red-500';

  let actionBtnHtml = '';
  if (actionUrl && actionText) {
    actionBtnHtml = `
      <a href="${actionUrl}" target="_blank" class="inline-flex items-center space-x-1.5 mt-2.5 px-3.5 py-1.5 rounded-lg bg-brand-yellow hover:bg-brand-yellowHover text-black text-xs font-bold transition-all shadow-sm">
        <span>${actionText}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
      </a>
    `;
  }

  toast.className = `toast-card p-4 rounded-2xl border shadow-2xl ${bgBorderClasses} flex flex-col`;
  toast.innerHTML = `
    <div class="flex items-start justify-between space-x-3">
      <div class="flex items-start space-x-3">
        ${iconSvg}
        <div class="text-left pr-2">
          <h4 class="text-sm font-extrabold ${isSuccess ? 'text-white' : 'text-red-400'} leading-snug">${title}</h4>
          <p class="text-xs text-slate-300 font-light leading-relaxed mt-0.5">${message}</p>
          ${actionBtnHtml}
        </div>
      </div>
      <button type="button" class="toast-close p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0" aria-label="Cerrar notificación">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
    <div class="w-full bg-slate-700/30 h-1 rounded-full overflow-hidden mt-3">
      <div class="toast-progress-bar h-full ${barColor}" style="animation-duration: ${duration}ms;"></div>
    </div>
  `;

  container.appendChild(toast);

  const dismiss = () => {
    if (toast.classList.contains('toast-hiding')) return;
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  };

  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', dismiss);
  }

  setTimeout(dismiss, duration);
}

/**
 * Formulario de cotización con adjunto de imagen y redirección a WhatsApp / Correo
 */
function initQuoteForm() {
  const form = document.getElementById('quote-form');
  const emailBtn = document.getElementById('btn-quote-email');
  const dropzone = document.getElementById('image-dropzone');
  const fileInput = document.getElementById('part-image');
  const dropzonePrompt = document.getElementById('dropzone-prompt');
  const filePreview = document.getElementById('file-preview');
  const previewImg = document.getElementById('preview-img');
  const fileNameEl = document.getElementById('file-name');
  const fileSizeEl = document.getElementById('file-size');
  const removeFileBtn = document.getElementById('remove-file-btn');

  if (!form) return;

  // Configurar sitekey dinámica de Cloudflare Turnstile si se configuró en api/config.php
  const turnstileEl = form.querySelector('.cf-turnstile');
  if (turnstileEl && window.APP_CONFIG?.turnstileSiteKey) {
    turnstileEl.setAttribute('data-sitekey', window.APP_CONFIG.turnstileSiteKey);
  }

  let selectedFile = null;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast({
        type: 'error',
        title: 'Archivo no permitido',
        message: 'Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).',
        duration: 10000
      });
      return;
    }

    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      dropzonePrompt.classList.add('hidden');
      filePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  };

  const clearFileSelect = () => {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    previewImg.src = '';
    filePreview.classList.add('hidden');
    dropzonePrompt.classList.remove('hidden');
  };

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#remove-file-btn')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('border-brand-yellow', 'bg-brand-yellow/10');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('border-brand-yellow', 'bg-brand-yellow/10');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files[0]) {
        handleFileSelect(files[0]);
      }
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearFileSelect();
    });
  }

  // Manejar el proceso de envío de cotización vía AJAX al backend PHP
  const submitForm = async (channel) => {
    const name = document.getElementById('client-name')?.value.trim();
    const phone = document.getElementById('client-phone')?.value.trim();
    const vehicle = document.getElementById('vehicle-info')?.value.trim();
    const description = document.getElementById('part-description')?.value.trim();

    if (!name || !phone || !vehicle || !description) {
      showToast({
        type: 'error',
        title: 'Campos Incompletos',
        message: 'Por favor completa todos los campos obligatorios (*) antes de enviar.',
        duration: 10000
      });
      return;
    }

    // Configurar canal preferido
    const channelInput = document.getElementById('preferred_channel');
    if (channelInput) channelInput.value = channel;

    // Elementos UI de los botones
    const whatsappBtn = form.querySelector('button[type="submit"]');
    const activeBtn = (channel === 'email' && emailBtn) ? emailBtn : whatsappBtn;
    
    const origWhatsappHtml = whatsappBtn ? whatsappBtn.innerHTML : '';
    const origEmailHtml = emailBtn ? emailBtn.innerHTML : '';

    if (whatsappBtn) whatsappBtn.disabled = true;
    if (emailBtn) emailBtn.disabled = true;

    if (activeBtn) {
      const spinnerColor = channel === 'email' ? 'text-current' : 'text-black';
      activeBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 ${spinnerColor} inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-xs sm:text-sm uppercase tracking-wider">Procesando...</span>
      `;
    }

    const formData = new FormData(form);

    try {
      const response = await fetch('api/cotizar.php', {
        method: 'POST',
        body: formData
      });

      const rawText = await response.text();
      let result;
      try {
        result = JSON.parse(rawText);
      } catch (jsonErr) {
        throw new Error('El servidor no devolvió una respuesta válida. Verifica los permisos de la carpeta uploads o reintenta.');
      }

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Ocurrió un error al procesar la cotización.');
      }

      const quoteId = result.quote_id;
      const vin = document.getElementById('vin-number')?.value.trim() || 'No especificado';

      if (channel === 'whatsapp') {
        let imageNote = '';
        if (selectedFile) {
          imageNote = `%0A%0A📷 *Imagen Referencial:* Guardada en sistema (${encodeURIComponent(selectedFile.name)})`;
        }

        const message = `*Solicitud de Cotización - Comercial Bustex*%0A%0A` +
          `👤 *Datos de Contacto:*%0A` +
          `• *Nombre:* ${encodeURIComponent(name)}%0A` +
          `• *WhatsApp:* ${encodeURIComponent(phone)}%0A%0A` +
          `🚗 *Datos del Vehículo:*%0A` +
          `• *Vehículo:* ${encodeURIComponent(vehicle)}%0A` +
          `• *Nº Chasis / VIN:* ${encodeURIComponent(vin)}%0A%0A` +
          `🔧 *Repuestos Solicitados:*%0A` +
          `${encodeURIComponent(description)}` + imageNote;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=${CONFIG.whatsappPhone}&text=${message}`;
        window.open(whatsappUrl, '_blank');

        showToast({
          type: 'success',
          title: '¡Solicitud Registrada!',
          message: 'Tu consulta e imagen quedaron guardadas exitosamente. Si el chat no abrió automáticamente, puedes ingresar con el botón.',
          duration: 30000,
          actionUrl: whatsappUrl,
          actionText: 'Abrir Chat de WhatsApp'
        });

      } else {
        showToast({
          type: 'success',
          title: '¡Solicitud Guardada!',
          message: 'Hemos recibido tu consulta y enviado una notificación al equipo de ventas. Te contactaremos a la brevedad.',
          duration: 30000
        });
      }

      // Limpiar formulario
      form.reset();
      clearFileSelect();
      if (typeof turnstile !== 'undefined') {
        turnstile.reset();
      }

    } catch (err) {
      showToast({
        type: 'error',
        title: 'Atención',
        message: err.message,
        duration: 15000
      });
    } finally {
      if (whatsappBtn) {
        whatsappBtn.disabled = false;
        whatsappBtn.innerHTML = origWhatsappHtml;
      }
      if (emailBtn) {
        emailBtn.disabled = false;
        emailBtn.innerHTML = origEmailHtml;
      }
    }
  };

  // Enviar por WhatsApp (Submit por defecto)
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm('whatsapp');
  });

  // Enviar por Email
  if (emailBtn) {
    emailBtn.addEventListener('click', (e) => {
      e.preventDefault();
      submitForm('email');
    });
  }
}

/**
 * Inicialización dinámica del botón flotante de WhatsApp
 */
function initFloatingWhatsapp() {
  const floatingBtn = document.getElementById('whatsapp-floating');
  if (!floatingBtn) return;

  const url = `https://api.whatsapp.com/send?phone=${CONFIG.whatsappPhone}&text=${encodeURIComponent(CONFIG.defaultMessage)}`;
  floatingBtn.setAttribute('href', url);
}

/**
 * Inicialización de Swiper para el slider de marcas
 */
function initBrandSlider() {
  if (typeof Swiper === 'undefined') return;
  new Swiper('.brand-swiper', {
    slidesPerView: 2,
    spaceBetween: 20,
    loop: true,
    autoplay: {
      delay: 2000,
      disableOnInteraction: false,
    },
    breakpoints: {
      480: {
        slidesPerView: 3,
        spaceBetween: 20,
      },
      768: {
        slidesPerView: 4,
        spaceBetween: 30,
      },
      1024: {
        slidesPerView: 5,
        spaceBetween: 40,
      },
    }
  });
}

/**
 * Helper de desplazamiento suave compatible con todos los motores (Edge, Chrome, Firefox, Safari)
 */
function smoothScrollTo(targetY, duration = 450) {
  const startY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  const distance = targetY - startY;
  let startTime = null;

  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);

    // Easing easeInOutQuad para aceleración y desaceleración fluida
    const ease = progress < 0.5 
      ? 2 * progress * progress 
      : -1 + (4 - 2 * progress) * progress;

    const nextY = startY + distance * ease;
    window.scrollTo(0, nextY);

    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

// Estado global para evitar parpadeos de ScrollSpy durante scroll por clic
let isClickScrolling = false;
let clickScrollTimer = null;

/**
 * Control de desplazamiento suave (Smooth Scroll) para todos los enlaces internos (#)
 */
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const cleanId = targetId.substring(1);

        // 1. Bloquear ScrollSpy temporalmente para evitar parpadeos
        isClickScrolling = true;
        if (clickScrollTimer) clearTimeout(clickScrollTimer);
        clickScrollTimer = setTimeout(() => {
          isClickScrolling = false;
        }, 550);

        // 2. Marcar de forma limpia la opción seleccionada inmediatamente
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
        navLinks.forEach(l => {
          if (l.getAttribute('href') === targetId) {
            l.classList.add('active');
          } else {
            l.classList.remove('active');
          }
        });

        // 3. Asegurar que el menú móvil se cierre y se desbloquee el body
        document.body.classList.remove('overflow-hidden');
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
          mobileMenu.classList.add('translate-x-full');
        }

        // 4. Calcular la posición destino exacta compensando la barra superior (80px)
        const headerHeight = 80;
        const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const elementRectTop = targetElement.getBoundingClientRect().top;
        const targetY = Math.max(0, Math.floor(currentScroll + elementRectTop - headerHeight));

        // 5. Iniciar scroll animado garantizado en Edge y demás navegadores
        smoothScrollTo(targetY, 450);

        // 6. Actualizar la URL de forma limpia
        if (history.pushState) {
          history.pushState(null, null, targetId);
        }
      }
    });
  });
}

/**
 * Control del estado activo del menú de navegación (Active Link & ScrollSpy)
 */
function initActiveNavSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

  if (!sections.length || !navLinks.length) return;

  const setActiveLink = (currentId) => {
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${currentId}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  };

  const headerOffset = 120;

  const onScroll = () => {
    // Si la navegación fue iniciada por un clic, no sobreescribir el enlace activo mientras se desplaza
    if (isClickScrolling) return;

    let currentSectionId = 'inicio';
    const scrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    // Si el usuario está al final de la página, activar la última sección
    if ((window.innerHeight + Math.ceil(scrollPosition)) >= document.body.offsetHeight - 50) {
      const lastSection = sections[sections.length - 1];
      if (lastSection) currentSectionId = lastSection.getAttribute('id');
    } else {
      sections.forEach(section => {
        const sectionTop = section.offsetTop - headerOffset;
        const sectionHeight = section.offsetHeight;
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          currentSectionId = section.getAttribute('id');
        }
      });
    }

    setActiveLink(currentSectionId);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}



