// Global type declarations

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      chainId?: string;
    };
    __REACT_ERROR_OVERLAY_GLOBAL_HOOK__?: {
      onError?: (error: any) => void;
    };
  }
}

export {};
