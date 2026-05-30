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
    toggle.textContent = open ? 'Ocultar formulario' : 'Añadir comentario';
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
      window.alert('La verificación no es correcta. 6 + 2 = 8');
    }
  });
})();
