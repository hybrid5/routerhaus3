/* home.js — page-specific interactions */

// Particle system
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const particleCount = 15;
  for (let i = 0; i < particleCount; i++) {
    setTimeout(() => createParticle(container), i * 1000);
  }
}
function createParticle(container) {
  const particle = document.createElement('div');
  particle.className = 'particle';
  particle.style.left = Math.random() * 100 + '%';
  particle.style.animationDelay = Math.random() * 15 + 's';
  particle.style.animationDuration = (15 + Math.random() * 10) + 's';
  container.appendChild(particle);
  setTimeout(() => particle.remove(), 25000);
}

// Persona chips
function initPersonaChips() {
  const chips = document.querySelectorAll('.persona-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      chip.style.transform = 'scale(0.95)';
      chip.style.background = 'var(--surface-elevated)';
      chip.style.borderColor = 'var(--border-accent)';
      setTimeout(() => { chip.style.transform = 'translateY(-2px)'; }, 100);
      const persona = chip.dataset.persona;
      console.log('Selected persona:', persona);
      showNotification("Preference saved! We'll customize your recommendations.", 'success');
    });
    chip.addEventListener('mouseenter', () => {
      chip.style.transform = 'translateY(-4px) rotateY(5deg)'; chip.style.boxShadow = 'var(--shadow-medium)';
    });
    chip.addEventListener('mouseleave', () => {
      if (!chip.classList.contains('active')) {
        chip.style.transform = 'translateY(-2px) rotateY(0deg)'; chip.style.boxShadow = 'var(--shadow-soft)';
      }
    });
  });
}

// FAQ
function toggleFaq(button) {
  const item = button.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach((i) => i !== item && i.classList.remove('open'));
  item.classList.toggle('open');
  if (!isOpen) setTimeout(() => item.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
}
window.toggleFaq = toggleFaq;

// CTA loading
function startRecommendation() {
  const buttons = document.querySelectorAll('.btn-primary');
  buttons.forEach((btn) => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.style.pointerEvents = 'none';
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.pointerEvents = 'auto';
      showNotification('Redirecting to recommendation quiz...', 'info');
      // location.href = '/quiz.html'; // enable when ready
    }, 2000);
  });
}
window.startRecommendation = startRecommendation;

// Product & Feature card hover effects
function initInteractiveCards() {
  document.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-8px) rotateX(5deg) rotateY(2deg)';
      card.style.boxShadow = 'var(--shadow-strong)';
    });
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const rotateX = (y - r.height / 2) / 10, rotateY = (r.width / 2 - x) / 10;
      card.style.transform = `translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) rotateX(0deg) rotateY(0deg)';
      card.style.boxShadow = 'var(--shadow-soft)';
    });
  });

  document.querySelectorAll('.feature-card').forEach((card) => {
    card.addEventListener('click', () => {
      card.style.transform = 'scale(0.98)';
      setTimeout(() => { card.style.transform = 'translateY(-8px) scale(1)'; }, 100);
      showNotification('Learn more about this feature...', 'info');
    });
  });
}

// Trust logo shimmer kick
function initTrustLogoShimmer() {
  const logos = document.querySelectorAll('.trust-logo');
  logos.forEach((logo, i) => setTimeout(() => { logo.style.animation = 'shimmer 2s ease-in-out'; }, i * 200));
}

window.addEventListener('DOMContentLoaded', () => {
  createParticles();
  initPersonaChips();
  initInteractiveCards();
  initTrustLogoShimmer();
});
