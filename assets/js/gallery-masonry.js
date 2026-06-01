/*
 * Galería masonry — sin dependencias externas.
 *
 * Responsabilidades:
 *   1. Repartir las imágenes en N columnas (1/2/3 según breakpoints configurables)
 *      usando el algoritmo "shortest column first" en el orden original.
 *   2. Recalcular SOLO cuando cambia el nº efectivo de columnas (no en cada scroll
 *      ni en cada resize), reconstruyendo el layout desde cero.
 *   3. Cargar las imágenes de forma diferida con IntersectionObserver, empezando
 *      poco antes de que entren en pantalla. `loading="lazy"` actúa de refuerzo.
 *
 * El servidor (plugin Jekyll) ya renderiza el reparto de escritorio con el mismo
 * algoritmo, así que en pantallas grandes no se toca el DOM en el primer pintado.
 */
(function () {
  'use strict';

  var PLACEHOLDER =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  var PRELOAD_MARGIN = '400px 0px';
  var RESIZE_DEBOUNCE = 150;

  function toInt(value, fallback) {
    var n = parseInt(value, 10);
    return isNaN(n) ? fallback : n;
  }

  function readConfig(grid) {
    return {
      desktop: toInt(grid.getAttribute('data-cols-desktop'), 3),
      tablet: toInt(grid.getAttribute('data-cols-tablet'), 2),
      mobile: toInt(grid.getAttribute('data-cols-mobile'), 1),
      bpTablet: toInt(grid.getAttribute('data-bp-tablet'), 1000),
      bpMobile: toInt(grid.getAttribute('data-bp-mobile'), 600)
    };
  }

  function effectiveColumns(cfg, width) {
    if (width <= cfg.bpMobile) return cfg.mobile;
    if (width <= cfg.bpTablet) return cfg.tablet;
    return cfg.desktop;
  }

  // Peso = relación de aspecto (alto/ancho). Como cada imagen ocupa el 100% del
  // ancho de su columna, ese ratio es proporcional a la altura que ocupará.
  function itemWeight(item) {
    var frame = item.querySelector('.masonry__frame');
    var ratio = frame && frame.style.aspectRatio;
    if (ratio) {
      var parts = ratio.split('/');
      var w = parseFloat(parts[0]);
      var h = parseFloat(parts[1]);
      if (w > 0 && h > 0) return h / w;
    }
    var img = item.querySelector('img');
    if (img) {
      var iw = toInt(img.getAttribute('width'), 0);
      var ih = toInt(img.getAttribute('height'), 0);
      if (iw > 0 && ih > 0) return ih / iw;
    }
    return 1;
  }

  function orderedItems(grid) {
    var items = Array.prototype.slice.call(
      grid.querySelectorAll('.masonry__item')
    );
    items.sort(function (a, b) {
      return (
        toInt(a.getAttribute('data-gallery-index'), 0) -
        toInt(b.getAttribute('data-gallery-index'), 0)
      );
    });
    return items;
  }

  // Reparte todos los items en `count` columnas. Cada item va a la columna con
  // menor altura acumulada en ese instante (nunca a una más alta si hay una más
  // baja). Mover los nodos no recrea las <img>, por lo que el lazy loading y sus
  // observadores siguen siendo válidos tras un recálculo.
  function buildColumns(grid, count) {
    var items = orderedItems(grid);
    if (!items.length) return;

    var columns = [];
    var heights = [];
    var i;
    for (i = 0; i < count; i++) {
      var col = document.createElement('div');
      col.className = 'masonry__col';
      columns.push(col);
      heights.push(0);
    }

    items.forEach(function (item) {
      var target = 0;
      for (var c = 1; c < count; c++) {
        if (heights[c] < heights[target]) target = c;
      }
      columns[target].appendChild(item);
      heights[target] += itemWeight(item);
    });

    var fragment = document.createDocumentFragment();
    columns.forEach(function (col) {
      fragment.appendChild(col);
    });
    grid.textContent = '';
    grid.appendChild(fragment);
    grid.setAttribute('data-rendered-cols', String(count));
  }

  /* ---------------------- Carga diferida ---------------------- */

  function revealImage(img) {
    if (img.dataset.lazyState === 'loaded' || img.dataset.lazyState === 'loading') {
      return;
    }
    img.dataset.lazyState = 'loading';

    var picture = img.parentNode;
    if (picture && picture.tagName === 'PICTURE') {
      Array.prototype.forEach.call(
        picture.querySelectorAll('source[data-srcset]'),
        function (source) {
          source.srcset = source.getAttribute('data-srcset');
          source.removeAttribute('data-srcset');
        }
      );
    }

    var srcset = img.getAttribute('data-srcset');
    if (srcset) {
      img.srcset = srcset;
      img.removeAttribute('data-srcset');
    }

    img.addEventListener(
      'load',
      function () {
        img.classList.add('is-loaded');
        img.dataset.lazyState = 'loaded';
      },
      { once: true }
    );
    img.addEventListener(
      'error',
      function () {
        img.dataset.lazyState = 'error';
      },
      { once: true }
    );

    var src = img.getAttribute('data-src');
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }
  }

  function setupLazyLoading(grid) {
    var images = Array.prototype.slice.call(
      grid.querySelectorAll('img[data-src]')
    );
    if (!images.length) return;

    images.forEach(function (img) {
      if (!img.getAttribute('src')) img.src = PLACEHOLDER;
    });

    if (!('IntersectionObserver' in window)) {
      images.forEach(revealImage);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          revealImage(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: PRELOAD_MARGIN, threshold: 0.01 }
    );

    images.forEach(function (img) {
      observer.observe(img);
    });
  }

  /* ---------------------- Orquestación ---------------------- */

  var grids = [];

  function syncColumns(grid) {
    var width = window.innerWidth;
    var next = effectiveColumns(grid._cfg, width);
    if (next === grid._cols) return;
    grid._cols = next;
    buildColumns(grid, next);
  }

  function initGrid(grid) {
    grid._cfg = readConfig(grid);
    grid._cols = effectiveColumns(grid._cfg, window.innerWidth);

    var rendered = toInt(grid.getAttribute('data-rendered-cols'), grid._cfg.desktop);
    if (grid._cols !== rendered) {
      buildColumns(grid, grid._cols);
    }

    setupLazyLoading(grid);
    grids.push(grid);
  }

  function init() {
    document.querySelectorAll('[data-masonry]').forEach(initGrid);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      grids.forEach(syncColumns);
    }, RESIZE_DEBOUNCE);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
