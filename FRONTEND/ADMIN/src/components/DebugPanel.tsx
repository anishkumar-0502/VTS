import { useState, useEffect, ReactNode } from 'react';

interface DebugEvent {
  timestamp: string;
  type: 'connection' | 'location' | 'selection' | 'error' | 'info';
  message: string;
  data?: ReactNode;
}

export default function DebugPanel() {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [maxEvents] = useState(50);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    const captureLog = (...args: unknown[]) => {
      originalLog(...args);

      const message = String(args[0] || '');
      if (message.includes('🗺️') || message.includes('📍') || message.includes('✅') || 
          message.includes('Connecting') || message.includes('Socket connected') || 
          message.includes('Location update') || message.includes('Joined')) {
        
        let type: DebugEvent['type'] = 'info';
        if (message.includes('Socket') || message.includes('Connecting') || message.includes('Joined')) type = 'connection';
        if (message.includes('Location')) type = 'location';
        if (message.includes('📍') || message.includes('selected')) type = 'selection';

        const event: DebugEvent = {
          timestamp: new Date().toLocaleTimeString(),
          type,
          message: message.replace(/🗺️|📍|✅/g, '').trim(),
          data: args.length > 1 ? (args[1] as ReactNode) : undefined
        };

        setEvents(prev => [event, ...prev].slice(0, maxEvents));
      }
    };

    const captureError = (...args: unknown[]) => {
      originalError(...args);
      const event: DebugEvent = {
        timestamp: new Date().toLocaleTimeString(),
        type: 'error',
        message: String(args[0] || 'Unknown error'),
        data: args.length > 1 ? (args[1] as ReactNode) : undefined
      };
      setEvents(prev => [event, ...prev].slice(0, maxEvents));
    };

    console.log = captureLog;
    console.error = captureError;

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, [maxEvents]);

  const getTypeColor = (type: DebugEvent['type']) => {
    switch (type) {
      case 'connection':
        return 'bg-blue-50 border-l-4 border-blue-500 dark:bg-blue-900/20';
      case 'location':
        return 'bg-green-50 border-l-4 border-green-500 dark:bg-green-900/20';
      case 'selection':
        return 'bg-purple-50 border-l-4 border-purple-500 dark:bg-purple-900/20';
      case 'error':
        return 'bg-red-50 border-l-4 border-red-500 dark:bg-red-900/20';
      default:
        return 'bg-gray-50 border-l-4 border-gray-500 dark:bg-gray-900/20';
    }
  };

  const getTypeIcon = (type: DebugEvent['type']) => {
    switch (type) {
      case 'connection':
        return '🔌';
      case 'location':
        return '📍';
      case 'selection':
        return '✓';
      case 'error':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 z-50">
      <div className="rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            🐛 Debug Trace ({events.length})
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </button>

        {isExpanded && (
          <div className="max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Waiting for events...
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {events.map((event, idx) => (
                  <div
                    key={idx}
                    className={`p-3 text-xs ${getTypeColor(event.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base">{getTypeIcon(event.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-gray-900 dark:text-white truncate">
                          {event.message}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          {event.timestamp}
                        </div>
                        {event.data && (
                          <details className="mt-1 cursor-pointer">
                            <summary className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                              Show data
                            </summary>
                            <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto text-gray-900 dark:text-gray-100">
                              {JSON.stringify(event.data, null, 2).substring(0, 200)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
