import React, { useState } from 'react';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: {
    id: number;
    description: string;
    outcomes: string[];
    result?: string;
    bondAmount: string;
  };
  onSubmit: (params: {
    queryId: number;
    disputedOutcome: string;
    disputeBond: string;
    reason: string;
  }) => Promise<void>;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  query,
  onSubmit,
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedOutcome) {
      setError('Please select the outcome you believe is correct');
      return;
    }

    if (selectedOutcome === query.result) {
      setError('You cannot dispute with the same outcome as the current result');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for your dispute');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        queryId: query.id,
        disputedOutcome: selectedOutcome,
        disputeBond: query.bondAmount, // Bond must equal original
        reason: reason.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-grey-200">
          <h2 className="text-xl font-bold text-black">Raise Dispute</h2>
          <button
            onClick={onClose}
            className="text-grey-600 hover:text-black"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-sm">
              <strong>Warning:</strong> You must stake a dispute bond of{' '}
              <strong>{query.bondAmount} ALTH</strong>. If your dispute is rejected,
              you will lose this bond. Only dispute if you have strong evidence.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Query Info */}
            <div className="bg-grey-50 rounded-lg p-4">
              <p className="text-sm text-grey-600">Query #{query.id}</p>
              <p className="text-black mt-1">{query.description}</p>
              <p className="text-sm text-grey-600 mt-2">
                Current Result: <span className="text-amber-600">{query.result || 'N/A'}</span>
              </p>
            </div>

            {/* Select Correct Outcome */}
            <div>
              <label className="block text-sm font-medium text-grey-600 mb-2">
                What is the correct outcome?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {query.outcomes.map((outcome) => (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => setSelectedOutcome(outcome)}
                    disabled={outcome === query.result}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedOutcome === outcome
                        ? 'border-blue-500 bg-blue-50 text-black'
                        : outcome === query.result
                        ? 'border-grey-200 bg-grey-100 text-grey-400 cursor-not-allowed'
                        : 'border-grey-200 bg-white text-grey-700 hover:border-grey-300'
                    }`}
                  >
                    {outcome}
                    {outcome === query.result && (
                      <span className="text-xs block text-grey-400">(Current)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-grey-600 mb-2">
                Reason for Dispute
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you believe the current result is incorrect..."
                rows={4}
                className="w-full px-4 py-3 bg-white border border-grey-200 rounded-lg text-black placeholder-grey-400 focus:outline-none focus:border-alethea-500"
              />
            </div>

            {/* Bond Info */}
            <div className="bg-grey-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-grey-600">Dispute Bond Required</span>
                <span className="text-xl font-bold text-black">{query.bondAmount} ALTH</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-grey-100 hover:bg-grey-200 text-black rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedOutcome || !reason.trim()}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-grey-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DisputeModal;
