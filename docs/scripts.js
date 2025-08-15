/* scripts.js - global site scripts */

// Inject partials (header/footer)
async function loadPartial(mountId, url) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  try {
    const res = await fetch(url, { cache: "no-cache" });
    mount.innerHTML = await res.text();
  } catch (e) {
    console.error(`Failed to load ${url}`, e);
  }
}

function initNavbarEffects() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const onScroll = () => {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  const links = document.querySelector('.nav-links');
  if (!(btn && links)) return;

  const toggle = () => {
    const active = links.classList.toggle('active');
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-expanded', String(active));
    document.body.style.overflow = active ? 'hidden' : '';
  };
  btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  document.addEventListener('click', (e) => {
    if (!links.contains(e.target) && !btn.contains(e.target)) {
      links.classList.remove('active'); btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
    }
  });
}

function initRevealObserver() {
  const options = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, options);

  document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right, .scale-in')
    .forEach((el) => observer.observe(el));
}

// Notification system (used across pages)
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `toast ${type}`;
  notification.innerHTML = `
    <i class="${{ success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', info: 'fas fa-info-circle' }[type] || 'fas fa-info-circle'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(notification);
  requestAnimationFrame(() => notification.classList.add('in'));
  setTimeout(() => {
    notification.classList.remove('in');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}
window.showNotification = showNotification;

window.addEventListener('DOMContentLoaded', async () => {
  // Load partials first, then init nav
  await Promise.all([
    loadPartial('header-include', document.getElementById('header-include')?.dataset.include || '/partials/header.html'),
    loadPartial('footer-include', document.getElementById('footer-include')?.dataset.include || '/partials/footer.html'),
  ]);
  initNavbarEffects();
  initMobileMenu();
  initRevealObserver();
});

window.addEventListener('load', () => {
  document.body.classList.add('loaded');
  // Stagger hero entrance
  const heroEls = document.querySelectorAll('.hero .fade-in, .hero .scale-in');
  heroEls.forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 100));
});

console.log('RouterHaus v3.0 - Ultra Modern Edition Loaded 🚀');
