// Production error handler
export const initErrorHandler = () => {
  // Suppress all console errors in production
  if (import.meta.env.PROD) {
    const noop = () => {};
    console.error = noop;
    console.warn = noop;
  }

  // Handle unhandled promise rejections - silent
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
  });

  // Handle global errors - silent except chunk errors
  window.addEventListener('error', (event) => {
    // Auto-reload on chunk load errors
    if (event.message?.includes('Loading chunk') || event.message?.includes('Failed to fetch')) {
      setTimeout(() => window.location.reload(), 1000);
    }
    event.preventDefault();
  });
};
