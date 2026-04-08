// Auto cache clearing utility
export const initCacheManager = () => {
  const CURRENT_VERSION = '1.0.3';
  const STORED_VERSION = localStorage.getItem('app_version');

  if (STORED_VERSION !== CURRENT_VERSION) {
    console.log('New version detected, clearing caches...');
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }

    // Clear localStorage except auth
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const userName = localStorage.getItem('userName');
    
    localStorage.clear();
    
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', user);
    if (userName) localStorage.setItem('userName', userName);
    
    localStorage.setItem('app_version', CURRENT_VERSION);
    
    console.log('Cache cleared successfully');
  }
};
