(function () {
  'use strict';

  var modal = document.getElementById('legal-modal');
  if (!modal) return;

  var tabs = modal.querySelectorAll('[data-legal-tab]');
  var panels = modal.querySelectorAll('[data-legal-panel]');
  var titleEl = document.getElementById('legal-modal-title');
  var tabTitles = {
    aviso: 'Aviso legal',
    cookies: 'Política de cookies',
    privacidad: 'Política de privacidad'
  };

  function showPanel(id) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-legal-tab') === id;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    panels.forEach(function (panel) {
      var active = panel.getAttribute('data-legal-panel') === id;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    if (titleEl && tabTitles[id]) {
      titleEl.textContent = tabTitles[id];
    }
  }

  function openModal(id) {
    showPanel(id || 'aviso');
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('legal-modal-open');
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('legal-modal-open');
  }

  document.querySelectorAll('[data-legal-open]').forEach(function (trigger) {
    trigger.addEventListener('click', function (event) {
      event.preventDefault();
      openModal(trigger.getAttribute('data-legal-open'));
    });
  });

  modal.querySelectorAll('[data-legal-close]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      showPanel(tab.getAttribute('data-legal-tab'));
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });
})();
