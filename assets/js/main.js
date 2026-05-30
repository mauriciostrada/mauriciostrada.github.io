(function () {
  'use strict';

  function enableLazyImages() {
    document.querySelectorAll('img:not([loading]):not([data-src])').forEach(function (img) {
      img.loading = 'lazy';
      if (!img.decoding) {
        img.decoding = 'async';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enableLazyImages);
  } else {
    enableLazyImages();
  }

  var menuToggle = document.getElementById('menu-toggle');
  var siteNav = document.getElementById('site-nav');
  var siteHeader = document.getElementById('site-header');
  var goTop = document.getElementById('go-top');
  var contactForm = document.getElementById('contact-form');

  function setMobileNavOpen(isOpen) {
    if (!siteNav || !menuToggle) return;
    siteNav.classList.toggle('open', isOpen);
    document.body.classList.toggle('mobile-nav-open', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    menuToggle.innerHTML = isOpen
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  }

  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', function () {
      setMobileNavOpen(!siteNav.classList.contains('open'));
    });

    siteNav.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        setMobileNavOpen(false);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && siteNav.classList.contains('open')) {
        setMobileNavOpen(false);
      }
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
