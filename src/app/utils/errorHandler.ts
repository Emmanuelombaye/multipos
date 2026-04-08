// Production error handler
export const initErrorHandler = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Auto-reload on chunk load errors
    if (event.message?.includes('Loading chunk') || event.message?.includes('Failed to fetch')) {
      console.log('Chunk load error - reloading...');
      setTimeout(() => window.location.reload(), 1000);
    }
  });

  // Log console errors in production
  const originalError = console.error;
  console.error = (...args) => {
    originalError.apply(console, args);
    // Could send to error tracking service here
  };
};
