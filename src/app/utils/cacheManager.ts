// Auto cache clearing utility
export const initCacheManager = () => {
  const CURRENT_VERSION = '1.0.6';
  const STORED_VERSION = localStorage.getItem('app_version');

  if (!STORED_VERSION) {
    console.log('First time setup');
    localStorage.setItem('app_version', CURRENT_VERSION);
  } else if (STORED_VERSION !== CURRENT_VERSION) {
    console.log('Version updated:', STORED_VERSION, '->', CURRENT_VERSION);
    localStorage.setItem('app_version', CURRENT_VERSION);
  }
};
