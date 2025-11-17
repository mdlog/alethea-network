'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';

export default function WalletConnect() {
  const { address, isConnected, isConnecting, connect, disconnect, signMessage } = useWallet();
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      alert(`Connection failed: ${error}`);
    }
  };

  const handleSign = async () => {
    if (!message) return;
    try {
      const sig = await signMessage(message);
      setSignature(sig);
    } catch (error) {
      alert(`Signing failed: ${error}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">MetaMask Wallet</h2>
      
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Connected Address:</p>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded">{address}</p>
          </div>
          
          <div>
            <input
              type="text"
              placeholder="Message to sign"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleSign}
              disabled={!message}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Sign Message
            </button>
          </div>
          
          {signature && (
            <div>
              <p className="text-sm text-gray-600">Signature:</p>
              <p className="font-mono text-xs bg-gray-100 p-2 rounded break-all">{signature}</p>
            </div>
          )}
          
          <button
            onClick={disconnect}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}