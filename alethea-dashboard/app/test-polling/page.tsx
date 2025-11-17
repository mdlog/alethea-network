'use client';

import { TestnetBanner } from '@/components/TestnetBanner';
import { VoterRegistrationWithPolling } from '@/components/VoterRegistrationWithPolling';

export default function TestPollingPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <TestnetBanner />

            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Voter Registration Test
                    </h1>
                    <p className="text-gray-600">
                        Test the new polling system for voter registration on testnet
                    </p>
                </div>

                <VoterRegistrationWithPolling
                    onSuccess={() => {
                        console.log('Registration successful!');
                    }}
                />

                <div className="mt-8 bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold mb-4">Test Instructions</h2>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>Enter a valid wallet address (0x followed by 64 hex characters)</li>
                        <li>Set stake amount (minimum 100 tokens)</li>
                        <li>Enter your name</li>
                        <li>Click &quot;Register&quot;</li>
                        <li>Watch the polling progress (may take 5 minutes)</li>
                        <li>Expected result: &quot;Still Pending&quot; (normal on testnet)</li>
                    </ol>

                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> On testnet, operations are submitted successfully
                            but may not execute immediately due to slow block creation. The certificate
                            hash proves your operation was submitted. On mainnet, this will work instantly.
                        </p>
                    </div>
                </div>

                <div className="mt-6 bg-gray-100 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Environment Info:</h3>
                    <div className="text-xs font-mono space-y-1">
                        <div>Backend: {process.env.NEXT_PUBLIC_BACKEND_URL}</div>
                        <div>GraphQL: {process.env.NEXT_PUBLIC_GRAPHQL_URL?.slice(0, 80)}...</div>
                        <div>Chain ID: {process.env.NEXT_PUBLIC_CHAIN_ID}</div>
                        <div>App ID: {process.env.NEXT_PUBLIC_APP_ID}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
