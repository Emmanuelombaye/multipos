// Auto cache clearing utility
export const initCacheManager = () => {
  const CURRENT_VERSION = '1.0.4';
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

    // Clear localStorage except auth and offline data
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const userName = localStorage.getItem('userName');
    const cachedEmail = localStorage.getItem('cachedEmail');
    const cachedPassword = localStorage.getItem('cachedPassword');
    const lastOnlineTime = localStorage.getItem('lastOnlineTime');
    const offlineQueue = localStorage.getItem('offlineQueueV1');
    
    localStorage.clear();
    
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', user);
    if (userName) localStorage.setItem('userName', userName);
    if (cachedEmail) localStorage.setItem('cachedEmail', cachedEmail);
    if (cachedPassword) localStorage.setItem('cachedPassword', cachedPassword);
    if (lastOnlineTime) localStorage.setItem('lastOnlineTime', lastOnlineTime);
    if (offlineQueue) localStorage.setItem('offlineQueueV1', offlineQueue);
    
    localStorage.setItem('app_version', CURRENT_VERSION);
    
    console.log('Cache cleared successfully');
  }
};
