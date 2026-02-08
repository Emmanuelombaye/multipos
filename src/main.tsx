
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { AuthProvider } from "./app/api/auth.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        // Listen for updates
        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New update available
                  const updateToast = document.createElement('div');
                  updateToast.style.position = 'fixed';
                  updateToast.style.bottom = '24px';
                  updateToast.style.left = '50%';
                  updateToast.style.transform = 'translateX(-50%)';
                  updateToast.style.background = '#7f1d1d';
                  updateToast.style.color = '#fff';
                  updateToast.style.padding = '12px 24px';
                  updateToast.style.borderRadius = '8px';
                  updateToast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                  updateToast.style.zIndex = '9999';
                  updateToast.innerHTML = 'A new version is available. <button style="margin-left:8px;background:#fff;color:#7f1d1d;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;">Refresh</button>';
                  document.body.appendChild(updateToast);
                  updateToast.querySelector('button')?.addEventListener('click', () => {
                    window.location.reload();
                  });
                }
              }
            };
          }
        };
      }).catch(() => {
        // Service worker registration failed, app will still work
      });
    });
  }
  