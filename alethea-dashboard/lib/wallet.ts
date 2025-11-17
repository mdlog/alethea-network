import { ethers } from 'ethers';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
}

export class WalletManager {
  private state: WalletState = {
    address: null,
    isConnected: false,
    provider: null,
    signer: null,
  };

  private listeners: ((state: WalletState) => void)[] = [];

  async connectMetaMask(): Promise<WalletState> {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      this.state = {
        address,
        isConnected: true,
        provider,
        signer,
      };

      this.notifyListeners();
      return this.state;
    } catch (error) {
      throw new Error(`Failed to connect: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.state = {
      address: null,
      isConnected: false,
      provider: null,
      signer: null,
    };
    this.notifyListeners();
  }

  async signMessage(message: string): Promise<string> {
    if (!this.state.signer) {
      throw new Error('Wallet not connected');
    }
    return await this.state.signer.signMessage(message);
  }

  getState(): WalletState {
    return { ...this.state };
  }

  subscribe(listener: (state: WalletState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

export const walletManager = new WalletManager();