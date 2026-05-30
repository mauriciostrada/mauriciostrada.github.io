(function () {
  'use strict';

  var dataEl = document.getElementById('video-lightbox-data');
  var lightbox = document.getElementById('video-lightbox');
  if (!dataEl || !lightbox) return;

  var videos = JSON.parse(dataEl.textContent);
  var iframeEl = document.getElementById('video-lightbox-iframe');
  var titleEl = document.getElementById('video-lightbox-title');
  var current = -1;

  function embedUrl(id) {
    return 'https://www.youtube.com/embed/' + id + '?rel=0&autoplay=1';
  }

  function open(index) {
    if (index < 0 || index >= videos.length) return;
    current = index;
    var video = videos[index];
    iframeEl.src = embedUrl(video.youtube_id);
    iframeEl.title = video.title;
    titleEl.textContent = video.title;
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-lightbox-open');
  }

  function close() {
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    iframeEl.src = '';
    document.body.classList.remove('gallery-lightbox-open');
    current = -1;
  }

  document.querySelectorAll('[data-video-index]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      open(parseInt(trigger.getAttribute('data-video-index'), 10));
    });
  });

  lightbox.querySelector('[data-video-close]').addEventListener('click', close);

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', function (e) {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') close();
  });
})();
