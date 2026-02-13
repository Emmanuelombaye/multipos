import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface VersionInfo {
    version: string;
    buildTime: string;
    timestamp: number;
}

export function VersionCheck() {
    const [currentVersion, setCurrentVersion] = useState<VersionInfo | null>(null);

    useEffect(() => {
        // Check immediately on mount
        checkVersion();

        // Check every 60 seconds
        const interval = setInterval(checkVersion, 60000);

        // Check on visibility change (when user comes back to tab/app)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const checkVersion = async () => {
        try {
            // Add timestamp to prevent caching of the version file itself
            const response = await fetch(`/version.json?t=${Date.now()}`);
            if (!response.ok) return;

            const serverVersion: VersionInfo = await response.json();

            const storedVersionStr = localStorage.getItem('app_version');

            if (!storedVersionStr) {
                // First load, save version and return
                localStorage.setItem('app_version', JSON.stringify(serverVersion));
                setCurrentVersion(serverVersion);
                return;
            }

            const storedVersion: VersionInfo = JSON.parse(storedVersionStr);

            // Check if server version is newer (by timestamp)
            if (serverVersion.timestamp > storedVersion.timestamp) {
                console.log('New version detected:', serverVersion);

                toast.custom((t) => (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg p-4 flex items-center gap-4 w-full max-w-sm">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin-slow" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Update Available</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">A new version of the app is ready.</p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => {
                                // Update local storage and reload
                                localStorage.setItem('app_version', JSON.stringify(serverVersion));

                                // Clear all caches to ensure fresh load
                                if ('caches' in window) {
                                    caches.keys().then((names) => {
                                        names.forEach((name) => {
                                            caches.delete(name);
                                        });
                                        window.location.reload();
                                    });
                                } else {
                                    window.location.reload();
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Update
                        </Button>
                    </div>
                ), { duration: Infinity }); // Keep looking until dismissed or clicked
            }
        } catch (error) {
            console.error('Failed to check version:', error);
        }
    };

    return null; // This component doesn't render anything visible by default
}
