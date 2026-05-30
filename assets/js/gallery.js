(function () {
  'use strict';

  var dataEl = document.getElementById('gallery-lightbox-data');
  var lightbox = document.getElementById('gallery-lightbox');
  if (!dataEl || !lightbox) return;

  var images = [];
  try {
    images = JSON.parse(dataEl.textContent);
  } catch (error) {
    return;
  }

  if (!images.length) return;

  var current = 0;
  var imageEl = document.getElementById('gallery-lightbox-image');
  var counterEl = document.getElementById('gallery-lightbox-counter');

  function show(index) {
    current = (index + images.length) % images.length;
    var item = images[current];
    if (!item || !imageEl) return;

    imageEl.loading = 'lazy';
    imageEl.decoding = 'async';
    imageEl.src = item.path;
    imageEl.alt = item.alt || '';
    if (counterEl) {
      counterEl.textContent = (current + 1) + ' / ' + images.length;
    }
  }

  function open(index) {
    show(index);
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-lightbox-open');
  }

  function close() {
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-lightbox-open');
    if (imageEl) imageEl.src = '';
  }

  document.querySelectorAll('[data-gallery-index]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      open(parseInt(trigger.getAttribute('data-gallery-index'), 10));
    });
  });

  lightbox.querySelector('[data-gallery-close]').addEventListener('click', close);
  lightbox.querySelector('[data-gallery-next]').addEventListener('click', function () {
    show(current + 1);
  });
  lightbox.querySelector('[data-gallery-prev]').addEventListener('click', function () {
    show(current - 1);
  });

  lightbox.addEventListener('click', function (event) {
    if (event.target === lightbox) close();
  });

  document.addEventListener('keydown', function (event) {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowRight') show(current + 1);
    if (event.key === 'ArrowLeft') show(current - 1);
  });
})();
