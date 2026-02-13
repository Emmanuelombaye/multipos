import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, isChunkError: false };
    }

    public static getDerivedStateFromError(error: Error): State {
        // Check if the error is a ChunkLoadError
        const isChunkError = error.message?.includes('Loading chunk') || error.message?.includes('import');
        return { hasError: true, isChunkError };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);

        // If it's a chunk loading error, force a reload to fetch new assets
        if (this.state.isChunkError) {
            console.log('🔄 Chunk load error suspected. Reloading app to fetch new version...');
            // Clear caches to be safe
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
        }
    }

    public render() {
        if (this.state.hasError) {
            if (this.state.isChunkError) {
                return (
                    <div className="flex items-center justify-center min-h-screen bg-gray-50">
                        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl animate-spin">🔄</span>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Updating App...</h2>
                            <p className="text-gray-600">Please wait while we refresh the application.</p>
                        </div>
                    </div>
                );
            }

            return this.props.fallback || (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                        <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
                        <p className="text-gray-600 mb-6">We encountered an unexpected error.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
