(function () {
  'use strict';

  var PLACEHOLDER =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  function loadImage(img) {
    var src = img.getAttribute('data-src');
    if (!src) return;

    img.addEventListener(
      'load',
      function () {
        img.classList.add('is-loaded');
        img.removeAttribute('data-src');
      },
      { once: true }
    );

    img.src = src;
  }

  function initLazyImages(root) {
    root = root || document;
    var images = root.querySelectorAll('img[data-src]');
    if (!images.length) return;

    if (!('IntersectionObserver' in window)) {
      images.forEach(loadImage);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          loadImage(entry.target);
          obs.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0.01
      }
    );

    images.forEach(function (img) {
      if (!img.getAttribute('src') && !img.getAttribute('width')) {
        img.src = PLACEHOLDER;
      }
      observer.observe(img);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initLazyImages();
    });
  } else {
    initLazyImages();
  }
})();
