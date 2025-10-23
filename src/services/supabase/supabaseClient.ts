import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://oqmaogkrkupqulcregpz.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xbWFvZ2tya3VwcXVsY3JlZ3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDc1NTksImV4cCI6MjA3NjY4MzU1OX0.aO6uBO8ttX8yzPlOwWan_sCMfrVj9t-mHORAZS55UAY';

console.log('🔧 Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length
});

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      strategies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          pairs: string[];
          enabled: boolean;
          mode: 'paper' | 'live';
          position_size: number;
          max_positions: number;
          stop_loss_percent: number;
          take_profit_percent: number;
          parameters: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          pairs: string[];
          enabled?: boolean;
          mode?: 'paper' | 'live';
          position_size: number;
          max_positions: number;
          stop_loss_percent: number;
          take_profit_percent: number;
          parameters: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: string;
          pairs?: string[];
          enabled?: boolean;
          mode?: 'paper' | 'live';
          position_size?: number;
          max_positions?: number;
          stop_loss_percent?: number;
          take_profit_percent?: number;
          parameters?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      bot_instances: {
        Row: {
          id: string;
          user_id: string;
          strategy_id: string;
          name: string;
          status: 'running' | 'paused' | 'stopped';
          mode: 'paper' | 'live';
          deployed_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          strategy_id: string;
          name: string;
          status?: 'running' | 'paused' | 'stopped';
          mode?: 'paper' | 'live';
          deployed_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          strategy_id?: string;
          name?: string;
          status?: 'running' | 'paused' | 'stopped';
          mode?: 'paper' | 'live';
          deployed_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
