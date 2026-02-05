import { useState } from 'react';
import { X, Bell, Mail, Check, AlertCircle } from 'lucide-react';

interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    queryId: string;
    queryDescription: string;
}

export default function ReminderModal({ isOpen, onClose, queryId, queryDescription }: ReminderModalProps) {
    const [email, setEmail] = useState('');
    const [reminderTimes, setReminderTimes] = useState<string[]>(['24h', '1h']);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reminderOptions = [
        { value: '24h', label: '24 hours before' },
        { value: '12h', label: '12 hours before' },
        { value: '6h', label: '6 hours before' },
        { value: '3h', label: '3 hours before' },
        { value: '1h', label: '1 hour before' },
        { value: '30m', label: '30 minutes before' },
        { value: '15m', label: '15 minutes before' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3001/api/reminders/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    queryId,
                    reminderTimes
                })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                    setEmail('');
                }, 2000);
            } else {
                setError(data.error || 'Failed to subscribe');
            }
        } catch (err) {
            setError('Failed to connect to reminder service');
        } finally {
            setLoading(false);
        }
    };

    const toggleReminderTime = (time: string) => {
        if (reminderTimes.includes(time)) {
            setReminderTimes(reminderTimes.filter(t => t !== time));
        } else {
            setReminderTimes([...reminderTimes, time]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-grey-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-alethea-100 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-alethea-600" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-semibold text-black">Set Reminder</h2>
                            <p className="text-xs sm:text-sm text-grey-600">Get notified before deadlines</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-grey-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-success" />
                            </div>
                            <h3 className="text-lg font-semibold text-black mb-2">Reminder Set!</h3>
                            <p className="text-sm text-grey-600">
                                You'll receive email notifications at your selected times.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                            {/* Query Info */}
                            <div className="bg-grey-50 rounded-lg p-3 sm:p-4">
                                <p className="text-xs font-medium text-grey-600 mb-1">Query #{queryId}</p>
                                <p className="text-sm text-black line-clamp-2">{queryDescription}</p>
                            </div>

                            {/* Email Input */}
                            <div>
                                <label className="block text-sm font-medium text-grey-700 mb-2">
                                    <Mail className="w-4 h-4 inline mr-1" />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    className="input"
                                />
                                <p className="text-xs text-grey-600 mt-1">
                                    We'll send reminders to this email address
                                </p>
                            </div>

                            {/* Reminder Times */}
                            <div>
                                <label className="block text-sm font-medium text-grey-700 mb-3">
                                    When to remind me
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {reminderOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => toggleReminderTime(option.value)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${reminderTimes.includes(option.value)
                                                    ? 'bg-alethea-500 text-white'
                                                    : 'bg-grey-100 text-grey-700 hover:bg-grey-200'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-grey-600 mt-2">
                                    Select one or more reminder times
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                                    <p className="text-sm text-error">{error}</p>
                                </div>
                            )}

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-800">
                                    <strong>Note:</strong> You'll receive reminders for both commit and reveal phases.
                                    Make sure to check your spam folder if you don't see our emails.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="btn-secondary flex-1"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1"
                                    disabled={loading || reminderTimes.length === 0}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Setting...
                                        </>
                                    ) : (
                                        <>
                                            <Bell className="w-4 h-4" />
                                            Set Reminder
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
