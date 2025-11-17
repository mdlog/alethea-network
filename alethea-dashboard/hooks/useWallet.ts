import { useState, useEffect } from 'react';
import { walletManager, WalletState } from '@/lib/wallet';

export function useWallet() {
  const [state, setState] = useState<WalletState>(walletManager.getState());
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const unsubscribe = walletManager.subscribe(setState);
    return unsubscribe;
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    try {
      await walletManager.connectMetaMask();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    await walletManager.disconnect();
  };

  const signMessage = async (message: string) => {
    return await walletManager.signMessage(message);
  };

  return {
    ...state,
    isConnecting,
    connect,
    disconnect,
    signMessage,
  };
}