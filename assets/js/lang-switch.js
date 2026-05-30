(function () {
  'use strict';

  document.querySelectorAll('.language-selector').forEach(function (selector) {
    selector.addEventListener('change', function () {
      var option = selector.options[selector.selectedIndex];
      var url = option && option.getAttribute('data-url');
      if (url) {
        window.location.href = url;
      }
    });
  });
})();
