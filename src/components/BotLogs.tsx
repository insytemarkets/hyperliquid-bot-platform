import React, { useState, useEffect } from 'react';
import * as BotAPI from '../services/api/botApi';
import { supabase } from '../services/supabase/supabaseClient';

interface BotLog {
  id: string;
  bot_id: string;
  log_type: 'info' | 'trade' | 'signal' | 'error' | 'market_data';
  message: string;
  data?: any;
  created_at: string;
}

interface BotLogsProps {
  botId: string;
  isOpen: boolean;
}

const BotLogs: React.FC<BotLogsProps> = ({ botId, isOpen }) => {
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      console.log('🔄 BotLogs: Fetching logs for bot:', botId);
      const fetchedLogs = await BotAPI.getBotLogs(botId, 50);
      console.log('📋 BotLogs: Received', fetchedLogs.length, 'logs');
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('❌ BotLogs: Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial logs when opened
  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, botId]);

  // 🔥 REAL-TIME SUBSCRIPTION with Supabase Realtime
  useEffect(() => {
    if (!isOpen) return;

    console.log('🔥 BotLogs: Setting up Realtime subscription for bot:', botId);

    // Subscribe to new logs for this bot
    const channel = supabase
      .channel(`bot_logs_${botId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bot_logs',
          filter: `bot_id=eq.${botId}`,
        },
        (payload) => {
          console.log('🔥 REALTIME: New log received!', payload.new);
          const newLog = payload.new as BotLog;
          
          // Add new log to the top of the list
          setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 50)); // Keep only 50 most recent
          
          setRealtimeConnected(true);
        }
      )
      .subscribe((status) => {
        console.log('🔥 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
        } else if (status === 'CLOSED') {
          setRealtimeConnected(false);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🛑 BotLogs: Cleaning up Realtime subscription');
      supabase.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [isOpen, botId]);

  if (!isOpen) return null;

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'trade': return '💰';
      case 'signal': return '📊';
      case 'error': return '❌';
      case 'market_data': return '📈';
      default: return 'ℹ️';
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'trade': return 'text-green-600 bg-green-50';
      case 'signal': return 'text-blue-600 bg-blue-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'market_data': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Bot Activity Logs</h3>
          {realtimeConnected && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            {loading ? 'Loading logs...' : 'No logs yet. Bot will start logging activity soon.'}
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded text-xs ${getLogColor(log.log_type)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base">{getLogIcon(log.log_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium">{log.message}</span>
                      <span className="text-xs opacity-75 whitespace-nowrap">
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                    {log.data && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                          View details
                        </summary>
                        <pre className="mt-1 text-xs bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BotLogs;

