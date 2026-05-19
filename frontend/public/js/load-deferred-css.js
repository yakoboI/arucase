/**
 * Apply preloaded app stylesheet without inline onload (CSP-safe).
 */
(function () {
  var link = document.getElementById('app-deferred-styles');
  if (!link) return;

  function apply() {
    if (link.rel !== 'stylesheet') link.rel = 'stylesheet';
  }

  link.addEventListener('load', apply);
  if (document.readyState === 'complete') {
    apply();
  } else {
    window.addEventListener('load', apply, { once: true });
  }
})();
