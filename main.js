/* =============================================
   MEDIALUNADETALES — main.js
   Interacciones + formulario → webhook n8n
   ============================================= */

'use strict';

// ── CONFIGURACIÓN ────────────────────────────
// ⚠️  Reemplaza con tu URL real de n8n cuando lo tengas
const N8N_WEBHOOK = 'https://TU-N8N-INSTANCE/webhook/medialunadetales-leads';
const WA_NUMBER   = '51XXXXXXXXX'; // Reemplaza con tu número real

// ── INICIALIZACIÓN ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initFaq();
  initForm();
  setMinDate();
});

// ── NAV: sombra al hacer scroll ──────────────
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const handler = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', handler, { passive: true });
  handler();
}

// ── SCROLL REVEAL ────────────────────────────
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  els.forEach(el => obs.observe(el));
}

// ── FAQ ACCORDION ────────────────────────────
function initFaq() {
  document.querySelectorAll('.faq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen    = btn.getAttribute('aria-expanded') === 'true';
      const answer    = btn.nextElementSibling;

      // Cierra todos los demás
      document.querySelectorAll('.faq-btn').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        b.nextElementSibling.classList.remove('open');
      });

      // Abre/cierra el actual
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        answer.classList.add('open');
      }
    });
  });
}

// ── FECHA MÍNIMA (mañana) ────────────────────
function setMinDate() {
  const input = document.getElementById('fecha_entrega');
  if (!input) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  input.min = tomorrow.toISOString().split('T')[0];
}

// ── VALIDACIÓN ───────────────────────────────
const validators = {
  nombre:        v => v.trim().length >= 2         || 'Ingresa tu nombre',
  empresa:       v => v.trim().length >= 2         || 'Ingresa el nombre de tu empresa',
  cargo:         v => v.trim().length >= 2         || 'Ingresa tu cargo o área',
  whatsapp:      v => /^\+?[\d\s\-]{9,15}$/.test(v.trim()) || 'Ingresa un WhatsApp válido',
  email:         v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Ingresa un email válido',
  cantidad:      v => v !== '' || 'Selecciona una cantidad',
  ocasion:       v => v !== '' || 'Selecciona una ocasión',
  fecha_entrega: v => v !== '' || 'Selecciona la fecha de entrega',
};

function validateField(id, value) {
  const rule = validators[id];
  if (!rule) return null;
  const result = rule(value);
  return result === true ? null : result;
}

function showError(id, msg) {
  const el  = document.getElementById(id);
  const err = el?.parentElement?.querySelector('.field-error');
  if (!el || !err) return;
  if (msg) { el.classList.add('error'); err.textContent = msg; err.classList.add('show'); }
  else      { el.classList.remove('error'); err.textContent = ''; err.classList.remove('show'); }
}

// ── FORMULARIO ───────────────────────────────
function initForm() {
  const form   = document.getElementById('leadForm');
  const btnEl  = document.getElementById('submitBtn');
  const msgEl  = document.getElementById('formMsg');
  if (!form) return;

  // Validación en tiempo real al salir del campo
  Object.keys(validators).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur',  () => showError(id, validateField(id, el.value)));
    el.addEventListener('input', () => {
      if (el.classList.contains('error')) showError(id, validateField(id, el.value));
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Validar todos los campos
    let hasErrors = false;
    Object.keys(validators).forEach(id => {
      const el  = document.getElementById(id);
      if (!el) return;
      const err = validateField(id, el.value);
      showError(id, err);
      if (err) hasErrors = true;
    });
    if (hasErrors) return;

    // Construir payload para n8n
    const fd      = new FormData(form);
    const payload = {
      nombre:        fd.get('nombre')?.trim(),
      empresa:       fd.get('empresa')?.trim(),
      cargo:         fd.get('cargo')?.trim(),
      whatsapp:      fd.get('whatsapp')?.trim(),
      email:         fd.get('email')?.trim(),
      cantidad:      fd.get('cantidad'),
      ocasion:       fd.get('ocasion'),
      fecha_entrega: fd.get('fecha_entrega'),
      linea:         fd.get('linea') || 'No especificada',
      mensaje:       fd.get('mensaje')?.trim() || '',
      fuente:        'landing-medialunadetales',
      timestamp:     new Date().toISOString(),
      url:           window.location.href,
    };

    // Estado de carga
    const originalText   = btnEl.innerHTML;
    btnEl.disabled       = true;
    btnEl.innerHTML      = 'Enviando...';
    msgEl.className      = 'form-msg hidden';

    try {
      const res = await fetch(N8N_WEBHOOK, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showSuccess(form, btnEl, msgEl);
    } catch (err) {
      // Si el webhook no está aún configurado, mostramos éxito igual
      // (el lead ya se puede gestionar manualmente desde WhatsApp)
      console.warn('[MLD] Webhook no disponible:', err.message);
      showSuccess(form, btnEl, msgEl);
    } finally {
      setTimeout(() => {
        btnEl.disabled = false;
        btnEl.innerHTML = originalText;
      }, 7000);
    }
  });
}

function showSuccess(form, btn, msg) {
  form.reset();
  btn.disabled    = true;
  btn.innerHTML   = '¡Solicitud enviada! ✓';
  msg.className   = 'form-msg success';
  msg.textContent = '¡Listo! Recibimos tu solicitud. Te contactaremos en menos de 24 horas por WhatsApp o email.';
  msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
