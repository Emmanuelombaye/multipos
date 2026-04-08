// Auto cache clearing utility
export const initCacheManager = () => {
  const CURRENT_VERSION = '1.0.5';
  const STORED_VERSION = localStorage.getItem('app_version');

  // Only clear cache on first install or major version change
  if (!STORED_VERSION) {
    console.log('First time setup, initializing cache...');
    localStorage.setItem('app_version', CURRENT_VERSION);
  }
  
  // Preserve offline credentials across updates
  const preserveKeys = [
    'token', 'user', 'userName',
    'cachedEmail', 'cachedPassword', 'cachedToken', 'cachedUserData',
    'lastOnlineTime', 'offlineQueueV1', 'app_version'
  ];
};
