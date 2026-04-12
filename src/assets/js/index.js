import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../scss/styles.scss';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Task Manager app loaded');
  
  // Добавить активный класс для текущей ссылки
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
});