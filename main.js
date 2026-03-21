/* ============================================
   MEDIA LUNA DETALLES — main.js
   Interactions, form handling, webhook POST
   ============================================ */

'use strict';

// ── CONFIG ──────────────────────────────────────
const WEBHOOK_URL = 'https://YOUR-N8N-INSTANCE/webhook/media-luna-leads';
const WA_NUMBER  = '51923145678';

// ── DOM READY ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initRevealOnScroll();
  initForm();
  setMinDate();
});

// ── SMOOTH SCROLL ───────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ── SCROLL REVEAL ───────────────────────────────
function initRevealOnScroll() {
  const els = document.querySelectorAll(
    '.product-card, .testimonial-card, .date-card, .step-item, .faq-item'
  );
  els.forEach(el => el.classList.add('reveal'));

  const obs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  els.forEach(el => obs.observe(el));
}

// ── MIN DATE (tomorrow) ─────────────────────────
function setMinDate() {
  const dateInput = document.getElementById('fecha_entrega');
  if (!dateInput) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = tomorrow.toISOString().split('T')[0];
}

// ── PRODUCT SELECTION ───────────────────────────
function selectProduct(product) {
  const radio = document.querySelector(`input[name="tipo_box"][value="${product}"]`);
  if (radio) radio.checked = true;
  const formSection = document.getElementById('form');
  if (formSection) formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── FAQ ACCORDION ───────────────────────────────
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const icon   = btn.querySelector('.faq-icon');
  const isOpen = answer.classList.contains('open');

  // Close all others
  document.querySelectorAll('.faq-answer.open').forEach(a => {
    a.classList.remove('open');
    a.previousElementSibling.querySelector('.faq-icon').classList.remove('open');
  });

  if (!isOpen) {
    answer.classList.add('open');
    icon.classList.add('open');
  }
}

// ── FORM VALIDATION ─────────────────────────────
const validators = {
  nombre:        v => v.trim().length >= 2         || 'Ingresa tu nombre completo',
  empresa:       v => v.trim().length >= 2         || 'Ingresa el nombre de tu empresa',
  cargo:         v => v.trim().length >= 2         || 'Ingresa tu cargo o área',
  whatsapp:      v => /^\+51[9][0-9]{8}$/.test(v.replace(/\s/g, '')) || 'Formato: +51 9XX XXX XXX',
  email:         v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Ingresa un email válido',
  cantidad:      v => v !== ''                     || 'Selecciona una cantidad',
  fecha_entrega: v => v !== ''                     || 'Selecciona una fecha de entrega',
  ocasion:       v => v !== ''                     || 'Selecciona una ocasión',
};

function validateField(id, value) {
  const rule = validators[id];
  if (!rule) return null;
  const result = rule(value);
  return result === true ? null : result;
}

function showFieldError(id, msg) {
  const input = document.getElementById(id);
  const errEl = input?.parentElement?.querySelector('.field-error');
  if (!input || !errEl) return;
  if (msg) {
    input.classList.add('error');
    errEl.textContent = msg;
    errEl.classList.add('visible');
  } else {
    input.classList.remove('error');
    errEl.textContent = '';
    errEl.classList.remove('visible');
  }
}

// ── FORM HANDLER ────────────────────────────────
function initForm() {
  const form      = document.getElementById('leadForm');
  const submitBtn = document.getElementById('submitBtn');
  const msgEl     = document.getElementById('formMessage');
  if (!form) return;

  // Live validation
  Object.keys(validators).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => showFieldError(id, validateField(id, el.value)));
    el.addEventListener('input', () => { if (el.classList.contains('error')) showFieldError(id, validateField(id, el.value)); });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Full validation pass
    let hasErrors = false;
    Object.keys(validators).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const err = validateField(id, el.value);
      showFieldError(id, err);
      if (err) hasErrors = true;
    });
    if (hasErrors) return;

    // Build payload
    const formData = new FormData(form);
    const payload  = {
      nombre:         formData.get('nombre')?.trim(),
      empresa:        formData.get('empresa')?.trim(),
      cargo:          formData.get('cargo')?.trim(),
      whatsapp:       formData.get('whatsapp')?.replace(/\s/g, ''),
      email:          formData.get('email')?.trim(),
      cantidad:       formData.get('cantidad'),
      fecha_entrega:  formData.get('fecha_entrega'),
      ocasion:        formData.get('ocasion'),
      tipo_box:       formData.get('tipo_box') || 'No especificado',
      mensaje:        formData.get('mensaje')?.trim() || '',
      timestamp:      new Date().toISOString(),
      fuente:         'landing-media-luna',
    };

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Enviando...';
    msgEl.className     = 'form-message hidden';

    try {
      const res = await fetch(WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Log error but still show success (UX requirement)
      console.error('[Media Luna] Webhook error:', err);
    } finally {
      // Always show success
      showSuccess(form, submitBtn, msgEl);
    }
  });
}

function showSuccess(form, btn, msgEl) {
  form.reset();
  btn.disabled  = true;
  btn.innerHTML = '✅ Solicitud enviada';
  msgEl.className   = 'form-message success';
  msgEl.textContent = '¡Listo! Recibimos tu solicitud. Te contactaremos pronto por WhatsApp o email. 🎉';
  msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Reset button after 6 s
  setTimeout(() => {
    btn.disabled  = false;
    btn.innerHTML = 'Enviar solicitud de cotización →';
  }, 6000);
}
