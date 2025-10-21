import React, { useState, useEffect } from 'react';
import { KVService } from '../services/kv/KVService';

interface KVStatusProps {
  className?: string;
}

export const KVStatus: React.FC<KVStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<{ connected: boolean; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true);
      try {
        const kvStatus = await KVService.getStatus();
        setStatus(kvStatus);
      } catch (error) {
        setStatus({ 
          connected: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600">Checking KV...</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full ${
          status.connected ? 'bg-green-500' : 'bg-red-500'
        }`}
      ></div>
      <span className="text-sm text-gray-600">
        {status.connected ? 'KV Connected' : `KV Error: ${status.error}`}
      </span>
    </div>
  );
};
