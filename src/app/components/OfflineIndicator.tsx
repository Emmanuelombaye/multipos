import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnline, setLastOnline] = useState<string | null>(null);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        localStorage.setItem('lastOnlineTime', Date.now().toString());
      }
    };

    const getLastOnlineTime = () => {
      const time = localStorage.getItem('lastOnlineTime');
      if (time) {
        const date = new Date(parseInt(time));
        const days = Math.floor((Date.now() - parseInt(time)) / (1000 * 60 * 60 * 24));
        if (days > 0) {
          setLastOnline(`${days} day${days > 1 ? 's' : ''} ago`);
        } else {
          setLastOnline('today');
        }
      }
    };

    updateOnlineStatus();
    getLastOnlineTime();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const interval = setInterval(getLastOnlineTime, 60000); // Update every minute

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium z-50 flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span>Offline Mode</span>
      {lastOnline && <span className="opacity-80">• Last online: {lastOnline}</span>}
    </div>
  );
};
