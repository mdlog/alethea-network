import { CheckCircle, Clock, AlertCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { CallbackEvent } from '../hooks/useCallbackEvents';

interface Props {
    events: CallbackEvent[];
    queryId?: string | null;
    loading?: boolean;
    onRefresh?: () => void;
}

export default function CallbackMonitor({ events, queryId, loading, onRefresh }: Props) {
    const getEventIcon = (event: CallbackEvent) => {
        switch (event.status) {
            case 'received':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
            case 'processed':
                return <CheckCircle className="w-5 h-5 text-blue-400" />;
            default:
                return <AlertCircle className="w-5 h-5 text-gray-400" />;
        }
    };

    const getEventColor = (event: CallbackEvent) => {
        switch (event.status) {
            case 'received':
                return 'border-green-500/30 bg-green-500/10';
            case 'pending':
                return 'border-yellow-500/30 bg-yellow-500/10';
            case 'processed':
                return 'border-blue-500/30 bg-blue-500/10';
            default:
                return 'border-gray-500/30 bg-gray-500/10';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch {
            return timestamp;
        }
    };

    const registryUrl = queryId 
        ? `http://localhost:4002/queries/${queryId}`
        : 'http://localhost:4002';

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Callback Events</h3>
                    <p className="text-sm text-gray-400">
                        Real-time monitoring of oracle callbacks
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                    {queryId && (
                        <a
                            href={registryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="View in Oracle Dashboard"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>

            {/* Events List */}
            {events.length === 0 ? (
                <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 mb-1">No callback events yet</p>
                    <p className="text-sm text-gray-500">
                        {queryId 
                            ? 'Waiting for callbacks from Oracle Registry...'
                            : 'Request resolution to start receiving callbacks'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((event, index) => (
                        <div
                            key={`${event.type}-${index}`}
                            className={`p-4 rounded-xl border ${getEventColor(event)} transition-all`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    {getEventIcon(event)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-semibold text-white">
                                            {event.type}
                                        </h4>
                                        <span className="text-xs text-gray-400">
                                            {formatTimestamp(event.timestamp)}
                                        </span>
                                    </div>
                                    
                                    {event.queryId && (
                                        <div className="text-xs text-gray-400 mb-1">
                                            Query ID: <span className="text-gray-300 font-mono">{event.queryId}</span>
                                        </div>
                                    )}
                                    
                                    {event.result && (
                                        <div className="text-sm text-gray-300 mb-1">
                                            Result: <span className="text-white font-medium">{event.result}</span>
                                        </div>
                                    )}
                                    
                                    {event.isFinal !== undefined && (
                                        <div className="text-xs mb-1">
                                            {event.isFinal ? (
                                                <span className="text-green-400">✓ Final (Safe to settle)</span>
                                            ) : (
                                                <span className="text-yellow-400">⏳ Not final (Dispute window active)</span>
                                            )}
                                        </div>
                                    )}
                                    
                                    {event.description && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            {event.description}
                                        </p>
                                    )}
                                    
                                    <div className="mt-2">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                            event.status === 'received' 
                                                ? 'bg-green-500/20 text-green-400'
                                                : event.status === 'pending'
                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Box */}
            {queryId && (
                <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-purple-400">
                        <strong>How it works:</strong> Oracle Registry sends callbacks when query status changes.
                        QueryResolved indicates voting completed. QueryFinalized means dispute window passed and result is final.
                    </p>
                </div>
            )}
        </div>
    );
}
