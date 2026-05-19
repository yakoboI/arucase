/**
 * Early unhandledrejection filter (loads before the app bundle).
 * Keep in sync with src/utils/benignRejections.js
 */
(function () {
  var TOOLBAR_KEYS = {
    code: 1,
    data: 1,
    httpError: 1,
    httpStatus: 1,
    httpStatusText: 1,
    message: 1,
    name: 1,
    reqInfo: 1,
    stack: 1,
  };

  function isPlainToolbarRejection(reason) {
    if (!reason || typeof reason !== 'object') return false;
    if (reason instanceof Error) return false;
    if (reason.response || reason.request) return false;
    var keys = Object.keys(reason);
    if (keys.length === 0) return true;
    for (var i = 0; i < keys.length; i++) {
      if (!TOOLBAR_KEYS[keys[i]]) return false;
    }
    return true;
  }

  function isBenign(reason) {
    if (reason == null) return true;
    if (reason instanceof Error) return false;
    if (reason.response || reason.request) return false;
    if (reason.config && reason.config.url) return false;

    if (reason.httpError === false) return true;

    if (reason.code === 403 || reason.code === '403' || Number(reason.code) === 403) {
      return true;
    }

    if (reason.httpStatus === 200 && !reason.config) {
      if (reason.code === 403 || reason.code === '403' || Number(reason.code) === 403) {
        return true;
      }
    }

    if (isPlainToolbarRejection(reason)) return true;

    // Extensions / Vercel instrument.js: plain objects (not axios errors)
    if (typeof reason === 'object') {
      var keys = Object.keys(reason);
      if (keys.length > 0 && keys.length <= 24) return true;
    }

    return false;
  }

  window.addEventListener(
    'unhandledrejection',
    function (event) {
      if (isBenign(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
})();
