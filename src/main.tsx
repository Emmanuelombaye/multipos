import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AuthProvider } from "./app/api/auth.tsx";
import { ErrorBoundary } from "./app/components/ErrorBoundary.tsx";
import { Toaster } from "sonner";
import { initCacheManager } from "./app/utils/cacheManager.ts";
import { initErrorHandler } from "./app/utils/errorHandler.ts";
import "./styles/index.css";

// Initialize error handler first
initErrorHandler();

// Initialize cache manager
initCacheManager();

// Register service worker with auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, activate immediately
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            });
          }
        });
      },
      (err) => {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
    
    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  </ErrorBoundary>
);

