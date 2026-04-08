import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';
import { toast } from 'sonner';

export const OfflineSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState({ pending: 0, lastSync: null as string | null });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const status = apiClient.getSyncStatus();
      setSyncStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await apiClient.manualSync();
      if (result.success) {
        toast.success(`✅ Synced ${result.synced} items successfully`);
      } else {
        toast.warning(`⚠️ Synced ${result.synced} items, ${result.errors} failed`);
      }
      setSyncStatus(apiClient.getSyncStatus());
    } catch (error) {
      toast.error('Sync failed. Will retry when online.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (syncStatus.pending === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 bg-amber-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
      <CloudOff className="w-5 h-5" />
      <div className="text-sm">
        <p className="font-semibold">{syncStatus.pending} pending sync</p>
        <p className="text-xs opacity-90">Will sync when online</p>
      </div>
      {navigator.onLine && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="ml-2 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};
