'use client';

export default function TestEnv() {
    const env = {
        CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
        REGISTRY_ID: process.env.NEXT_PUBLIC_REGISTRY_ID,
        SERVICE_URL: process.env.NEXT_PUBLIC_LINERA_SERVICE,
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Environment Variables Test</h1>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Current Environment</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-600">NEXT_PUBLIC_CHAIN_ID:</label>
                            <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1 break-all">
                                {env.CHAIN_ID || '❌ Not set'}
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">NEXT_PUBLIC_REGISTRY_ID:</label>
                            <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1 break-all">
                                {env.REGISTRY_ID || '❌ Not set'}
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">NEXT_PUBLIC_LINERA_SERVICE:</label>
                            <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1">
                                {env.SERVICE_URL || '❌ Not set'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                        <h3 className="font-semibold mb-2">Status:</h3>
                        {env.CHAIN_ID && env.REGISTRY_ID && env.SERVICE_URL ? (
                            <p className="text-green-600">✅ All environment variables are set</p>
                        ) : (
                            <p className="text-red-600">❌ Some environment variables are missing</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Note:</h3>
                    <p className="text-sm text-blue-800">
                        If variables are missing, check <code className="bg-blue-100 px-1 rounded">.env.local</code> file
                        and restart the development server.
                    </p>
                </div>
            </div>
        </div>
    );
}
