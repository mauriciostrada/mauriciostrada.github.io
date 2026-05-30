(function () {
  'use strict';

  function initSlideshow() {
    var slideshow = document.getElementById('slideshow');
    if (!slideshow || slideshow.dataset.initialized === 'true') return;

    var slides = slideshow.querySelectorAll('.slideshow-slide');
    if (slides.length <= 1) return;

    slideshow.dataset.initialized = 'true';

    var interval = parseInt(slideshow.getAttribute('data-interval'), 10) || 4000;
    var current = 0;

    function showSlide(index) {
      slides[current].classList.remove('is-active');
      current = index;
      slides[current].classList.add('is-active');
    }

    function nextSlide() {
      showSlide((current + 1) % slides.length);
    }

    setInterval(nextSlide, interval);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSlideshow);
  } else {
    initSlideshow();
  }
})();
