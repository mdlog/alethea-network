'use client';

import { UserPlus } from 'lucide-react';
import { useUserVoter } from '@/lib/hooks/useUserVoter';

interface BecomeVoterButtonProps {
    readonly onOpenModal: () => void;
    readonly disabled?: boolean;
}

export function BecomeVoterButton({ onOpenModal, disabled = false }: Readonly<BecomeVoterButtonProps>) {
    const { isUserVoter, loading } = useUserVoter();

    const isDisabled = disabled || loading || isUserVoter;

    // Determine button text based on state
    let buttonText = 'Become a Voter';
    if (loading) {
        buttonText = 'Checking...';
    } else if (isUserVoter) {
        buttonText = 'Already a Voter';
    }

    return (
        <button
            onClick={onOpenModal}
            disabled={isDisabled}
            className={`
        flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white
        transition-all duration-200 transform
        ${isDisabled
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
                }
      `}
            aria-label={isUserVoter ? 'You are already a voter' : 'Become a voter'}
        >
            <UserPlus className="w-5 h-5" />
            <span>{buttonText}</span>
        </button>
    );
}
