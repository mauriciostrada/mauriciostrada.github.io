(function () {
  'use strict';

  var toggle = document.getElementById('visitas-form-toggle');
  var panel = document.getElementById('visitas-form-panel');
  var form = document.getElementById('visitas-form');

  if (!toggle || !panel) return;

  toggle.addEventListener('click', function () {
    var open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open
      ? (toggle.getAttribute('data-label-close') || toggle.textContent)
      : (toggle.getAttribute('data-label-open') || toggle.textContent);
    if (open) {
      var first = panel.querySelector('input, textarea');
      if (first) first.focus();
    }
  });

  if (!form) return;

  form.addEventListener('submit', function (event) {
    var answer = parseInt(document.getElementById('visitas-spam').value, 10);
    if (answer !== 8) {
      event.preventDefault();
      window.alert(document.body.getAttribute('data-spam-error-reviews') || 'Verification failed.');
    }
  });
})();
