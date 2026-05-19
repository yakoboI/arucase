/** Load Font Awesome styles once (public routes defer until idle). */
let loadPromise;

export function loadFontAwesome({ includeBrands = false } = {}) {
  if (!loadPromise) {
    loadPromise = Promise.all([
      import('@fortawesome/fontawesome-free/css/fontawesome.css'),
      import('@fortawesome/fontawesome-free/css/solid.css'),
    ]);
  }
  const brands = includeBrands
    ? import('@fortawesome/fontawesome-free/css/brands.css')
    : Promise.resolve();
  return Promise.all([loadPromise, brands]);
}

export function loadFontAwesomeWhenIdle(options = {}) {
  const run = () => loadFontAwesome(options).catch(() => {});
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 2000);
  }
}
