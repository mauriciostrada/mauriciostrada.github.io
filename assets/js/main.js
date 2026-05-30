(function () {
  'use strict';

  var menuToggle = document.getElementById('menu-toggle');
  var siteNav = document.getElementById('site-nav');
  var siteHeader = document.getElementById('site-header');
  var goTop = document.getElementById('go-top');
  var contactForm = document.getElementById('contact-form');

  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', function () {
      var isOpen = siteNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuToggle.innerHTML = isOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
    });

    siteNav.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        siteNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
      });
    });
  }

  if (siteHeader) {
    window.addEventListener('scroll', function () {
      siteHeader.classList.toggle('scrolled', window.scrollY > 10);
      if (goTop) {
        goTop.hidden = window.scrollY < 300;
      }
    });
  }

  if (goTop) {
    goTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
      var spam = document.getElementById('contact-spam');
      if (spam && parseInt(spam.value, 10) !== 6) {
        event.preventDefault();
        alert('Por favor, resuelve la operación anti-spam correctamente.');
      }
    });
  }
})();
