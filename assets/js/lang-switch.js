(function (window, document) {
  'use strict';

  var cfg = window.MSPH_I18N || {};
  var STORAGE_KEY = cfg.storageKey || 'msph-preferred-lang';
  var DEFAULT_LANG = cfg.defaultLang || 'es';
  var LANGS = Array.isArray(cfg.langs) ? cfg.langs : ['es', 'de', 'en', 'fr'];

  function readStoredLang() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return LANGS.indexOf(value) !== -1 ? value : null;
    } catch (e) {
      return null;
    }
  }

  function writeStoredLang(code) {
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {
      /* modo privado u otras restricciones */
    }
  }

  function langFromPath(pathname) {
    var segments = pathname.split('/').filter(Boolean);
    var first = segments[0];
    if (first && LANGS.indexOf(first) !== -1 && first !== DEFAULT_LANG) {
      return first;
    }
    return DEFAULT_LANG;
  }

  function pathWithoutLangPrefix(pathname) {
    var segments = pathname.split('/').filter(Boolean);
    var first = segments[0];
    if (first && LANGS.indexOf(first) !== -1 && first !== DEFAULT_LANG) {
      var rest = '/' + segments.slice(1).join('/');
      return rest === '/' ? '/' : rest;
    }
    return pathname || '/';
  }

  function pathForLang(pathname, lang) {
    var base = pathWithoutLangPrefix(pathname);
    if (lang === DEFAULT_LANG) {
      return base;
    }
    return '/' + lang + (base === '/' ? '/' : base);
  }

  function applyStoredLanguage() {
    var preferred = readStoredLang();
    if (!preferred) return;

    var pathname = window.location.pathname;
    var current = langFromPath(pathname);
    if (preferred === current) return;

    var target = pathForLang(pathname, preferred);
    var destination = target + window.location.search + window.location.hash;
    if (destination !== pathname + window.location.search + window.location.hash) {
      window.location.replace(destination);
    }
  }

  function bindSelectors() {
    document.querySelectorAll('.language-selector').forEach(function (selector) {
      selector.addEventListener('change', function () {
        var code = selector.value;
        if (LANGS.indexOf(code) === -1) return;

        writeStoredLang(code);

        var option = selector.options[selector.selectedIndex];
        var url = option && option.getAttribute('data-url');
        if (url) {
          window.location.href = url;
        }
      });
    });
  }

  applyStoredLanguage();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSelectors);
  } else {
    bindSelectors();
  }
})(window, document);
