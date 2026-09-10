const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
const topbar = document.getElementById('topbar');
const year = document.getElementById('year');
const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];

if (year) year.textContent = new Date().getFullYear();

menuBtn?.addEventListener('click', () => {
  const open = nav?.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(Boolean(open)));
});

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    nav?.classList.remove('open');
    menuBtn?.setAttribute('aria-expanded', 'false');
  });
});

window.addEventListener('scroll', () => {
  topbar?.classList.toggle('scrolled', window.scrollY > 28);
}, { passive: true });

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.11, rootMargin: '0px 0px -5% 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const sections = [...document.querySelectorAll('main section[id]')];
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

sections.forEach(section => sectionObserver.observe(section));

document.addEventListener('click', event => {
  if (!nav?.classList.contains('open')) return;
  if (nav.contains(event.target) || menuBtn?.contains(event.target)) return;
  nav.classList.remove('open');
  menuBtn?.setAttribute('aria-expanded', 'false');
});
