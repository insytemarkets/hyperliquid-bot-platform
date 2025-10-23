-- Enable Row Level Security
ALTER TABLE IF EXISTS public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bot_instances ENABLE ROW LEVEL SECURITY;

-- Create strategies table
CREATE TABLE IF NOT EXISTS public.strategies (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    pairs TEXT[] NOT NULL,
    enabled BOOLEAN DEFAULT true,
    mode TEXT DEFAULT 'paper' CHECK (mode IN ('paper', 'live')),
    position_size NUMERIC NOT NULL,
    max_positions INTEGER NOT NULL,
    stop_loss_percent NUMERIC NOT NULL,
    take_profit_percent NUMERIC NOT NULL,
    parameters JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bot_instances table
CREATE TABLE IF NOT EXISTS public.bot_instances (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_id TEXT REFERENCES public.strategies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'paused', 'stopped')),
    mode TEXT DEFAULT 'paper' CHECK (mode IN ('paper', 'live')),
    deployed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS strategies_user_id_idx ON public.strategies(user_id);
CREATE INDEX IF NOT EXISTS strategies_created_at_idx ON public.strategies(created_at DESC);
CREATE INDEX IF NOT EXISTS bot_instances_user_id_idx ON public.bot_instances(user_id);
CREATE INDEX IF NOT EXISTS bot_instances_strategy_id_idx ON public.bot_instances(strategy_id);
CREATE INDEX IF NOT EXISTS bot_instances_deployed_at_idx ON public.bot_instances(deployed_at DESC);

-- Row Level Security Policies
-- Users can only see their own strategies
CREATE POLICY "Users can view own strategies" ON public.strategies
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies" ON public.strategies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies" ON public.strategies
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies" ON public.strategies
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only see their own bot instances
CREATE POLICY "Users can view own bot instances" ON public.bot_instances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot instances" ON public.bot_instances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot instances" ON public.bot_instances
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bot instances" ON public.bot_instances
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON public.strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_instances_updated_at BEFORE UPDATE ON public.bot_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
