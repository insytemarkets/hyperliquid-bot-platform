import React, { useState, useEffect, useRef } from 'react';
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
  const [autoScroll, setAutoScroll] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (autoScroll && logsContainerRef.current) {
      // Scroll the container itself, not the page
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Use requestAnimationFrame to avoid layout thrashing
    if (autoScroll) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [logs, autoScroll]);

  const fetchLogs = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      
      const fetchedLogs = await BotAPI.getBotLogs(botId, 200);
      
      if (isInitial) {
        // Initial load: replace all logs
        setLogs(fetchedLogs.reverse());
      } else {
        // Incremental update: only add NEW logs
        setLogs(prevLogs => {
          const existingIds = new Set(prevLogs.map(log => log.id));
          const newLogs = fetchedLogs.filter(log => !existingIds.has(log.id));
          
          if (newLogs.length === 0) return prevLogs; // No new logs, no update
          
          // Add new logs to the end and keep only last 200
          return [...prevLogs, ...newLogs.reverse()].slice(-200);
        });
      }
      
      setLastFetchTime(new Date());
    } catch (error) {
      console.error('❌ BotLogs: Failed to fetch logs:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Load initial logs when opened
  useEffect(() => {
    if (isOpen) {
      fetchLogs(true); // Initial load with loading indicator
    }
  }, [isOpen, botId]);

  // Poll for new logs every 2 seconds (smooth incremental updates)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      fetchLogs(false); // Incremental update without loading indicator
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, botId]);

  // 🔥 REAL-TIME SUBSCRIPTION
  useEffect(() => {
    if (!isOpen) return;

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
          const newLog = payload.new as BotLog;
          
          // Add new log to bottom, keep only last 200
          setLogs((prevLogs) => [...prevLogs, newLog].slice(-200));
          setRealtimeConnected(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
        } else if (status === 'CLOSED') {
          setRealtimeConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [isOpen, botId]);

  // Handle manual scroll - disable auto-scroll if user scrolls up
  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  if (!isOpen) return null;

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'trade': return '▸';
      case 'signal': return '▸';
      case 'error': return '▸';
      case 'market_data': return '▸';
      default: return '▸';
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'trade': return 'text-green-600';
      case 'signal': return 'text-blue-600';
      case 'error': return 'text-red-600';
      case 'market_data': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
  };

  // Group consecutive market_data logs to reduce spam
  const shouldShowLog = (log: BotLog, index: number) => {
    // Always show non-market_data logs
    if (log.log_type !== 'market_data') return true;
    
    // Show important market_data (Multi-TF Analysis with highs/lows)
    if (log.message.includes('Multi-TF') || log.message.includes('High:') || log.message.includes('Low:')) {
      return true;
    }
    
    // Show other market_data every 10th log to reduce spam
    const marketDataLogs = logs.slice(0, index + 1).filter(l => l.log_type === 'market_data');
    return marketDataLogs.length % 10 === 0;
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4 overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Live Bot Activity</h3>
          {realtimeConnected && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              LIVE
            </span>
          )}
          <span className="text-xs text-gray-500">
            {logs.length} logs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              autoScroll 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {autoScroll ? 'Auto-scroll' : 'Paused'}
          </button>
          <button
            onClick={() => fetchLogs(true)}
            disabled={loading}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Terminal-style log viewer */}
      <div 
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-y-auto font-mono text-xs"
        style={{
          height: '384px', // Fixed height (h-96 = 24rem = 384px)
          minHeight: '384px',
          maxHeight: '384px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace'
        }}
      >
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            ) : (
              <span className="text-gray-600">Waiting for bot activity...</span>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => {
              // Skip some market_data logs to reduce spam
              if (!shouldShowLog(log, index) && log.log_type === 'market_data') {
                return null;
              }

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                >
                  <span className="text-gray-500 flex-shrink-0 w-20">
                    {formatTime(log.created_at)}
                  </span>
                  <span className={`flex-shrink-0 ${getLogColor(log.log_type)}`}>
                    {getLogIcon(log.log_type)}
                  </span>
                  <span className={`flex-1 ${getLogColor(log.log_type)}`}>
                    {log.message}
                  </span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom button (appears when not auto-scrolling) */}
      {!autoScroll && logs.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            scrollToBottom();
          }}
          className="mt-2 w-full text-xs py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
        >
          Jump to Latest
        </button>
      )}
    </div>
  );
};

export default BotLogs;
