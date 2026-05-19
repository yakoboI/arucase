let toastStylesPromise;

/** Load react-toastify CSS on first use (keeps homepage CSS bundle smaller). */
export function ensureToastStyles() {
  if (!toastStylesPromise) {
    toastStylesPromise = import('react-toastify/dist/ReactToastify.css');
  }
  return toastStylesPromise;
}
