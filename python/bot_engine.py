"""
🔥 REAL-TIME BOT ENGINE - Python Edition
Runs 24/7 on Render, connects to Hyperliquid WebSocket, writes to Supabase
"""

import asyncio
import os
from datetime import datetime
from typing import Dict, List, Optional
import json
from loguru import logger
from supabase import create_client, Client
from hyperliquid.info import Info
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Hyperliquid
info = Info()

logger.info("🚀 Bot Engine Starting...")

class BotEngine:
    """Main bot engine orchestrator"""
    
    def __init__(self):
        self.running_bots: Dict[str, 'BotInstance'] = {}
        
    async def start(self):
        """Start the bot engine"""
        logger.info("🔥 Bot Engine: Initializing...")
        
        # Initialize Hyperliquid Info client for market data
        logger.info("📡 Connecting to Hyperliquid API...")
        
        # Main loop
        while True:
            try:
                await self.tick()
                await asyncio.sleep(1)  # Run every second
            except Exception as e:
                logger.error(f"❌ Bot Engine error: {e}")
                await asyncio.sleep(5)
    
    async def tick(self):
        """Run one tick of the bot engine"""
        # Fetch all running bots from Supabase
        result = supabase.table('bot_instances')\
            .select('*, strategies(*)')\
            .eq('status', 'running')\
            .execute()
        
        bots = result.data if result.data else []
        
        # Update last_tick_at for all bots
        for bot_data in bots:
            bot_id = bot_data['id']
            
            # Create bot instance if not exists
            if bot_id not in self.running_bots:
                self.running_bots[bot_id] = BotInstance(bot_data)
                logger.info(f"✅ Loaded bot: {bot_data['name']} ({bot_id})")
            
            # Update bot data
            self.running_bots[bot_id].update_config(bot_data)
            
            # Run bot tick
            try:
                await self.running_bots[bot_id].tick()
                
                # Update last_tick_at in database
                supabase.table('bot_instances')\
                    .update({'last_tick_at': datetime.now().isoformat()})\
                    .eq('id', bot_id)\
                    .execute()
                    
            except Exception as e:
                logger.error(f"❌ Error running bot {bot_id}: {e}")
                await self.log_bot_activity(
                    bot_id,
                    bot_data['user_id'],
                    'error',
                    f'Bot tick error: {str(e)}',
                    {'error': str(e)}
                )
        
        # Remove stopped bots
        active_bot_ids = {b['id'] for b in bots}
        stopped_bots = set(self.running_bots.keys()) - active_bot_ids
        for bot_id in stopped_bots:
            logger.info(f"🛑 Stopping bot: {bot_id}")
            del self.running_bots[bot_id]
    
    async def log_bot_activity(self, bot_id: str, user_id: str, log_type: str, message: str, data: dict):
        """Log bot activity to Supabase"""
        try:
            supabase.table('bot_logs').insert({
                'bot_id': bot_id,
                'user_id': user_id,
                'log_type': log_type,
                'message': message,
                'data': data,
                'created_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Failed to log activity: {e}")


class BotInstance:
    """Individual bot instance"""
    
    def __init__(self, bot_data: dict):
        self.bot_id = bot_data['id']
        self.user_id = bot_data['user_id']
        self.name = bot_data['name']
        self.mode = bot_data['mode']
        self.strategy = bot_data['strategies']
        self.positions: List[dict] = []
        self.last_prices: Dict[str, float] = {}
        
    def update_config(self, bot_data: dict):
        """Update bot configuration"""
        self.strategy = bot_data['strategies']
    
    async def tick(self):
        """Run one tick of this bot"""
        # Fetch current prices
        all_mids = info.all_mids()
        
        # Update last prices
        for pair in self.strategy['pairs']:
            if pair in all_mids:
                self.last_prices[pair] = float(all_mids[pair])
        
        # Log market snapshot
        await self.log(
            'market_data',
            f"📊 Market Snapshot: {len(self.last_prices)} pairs tracked",
            {'prices': self.last_prices}
        )
        
        # Load open positions
        result = supabase.table('bot_positions')\
            .select('*')\
            .eq('bot_id', self.bot_id)\
            .eq('status', 'open')\
            .execute()
        
        self.positions = result.data if result.data else []
        
        # Run strategy
        if self.strategy['type'] == 'orderbook_imbalance':
            await self.run_orderbook_imbalance_strategy()
        elif self.strategy['type'] == 'momentum_breakout':
            await self.run_momentum_breakout_strategy()
        else:
            await self.run_default_strategy()
        
        # Check existing positions
        await self.check_positions()
    
    async def run_orderbook_imbalance_strategy(self):
        """Order Book Imbalance Strategy"""
        if len(self.positions) >= self.strategy['max_positions']:
            await self.log('info', f"⚠️ Max positions reached ({self.strategy['max_positions']})", {})
            return
        
        for pair in self.strategy['pairs']:
            # Skip if already have position
            if any(p['symbol'] == pair for p in self.positions):
                continue
            
            # Get L2 order book
            try:
                l2_data = info.l2_snapshot(pair)
                
                if not l2_data or 'levels' not in l2_data:
                    continue
                
                bids = l2_data['levels'][0]  # [[price, size], ...]
                asks = l2_data['levels'][1]
                
                if not bids or not asks:
                    continue
                
                # Calculate order book imbalance
                bid_depth = sum(float(level[1]) for level in bids[:10])
                ask_depth = sum(float(level[1]) for level in asks[:10])
                
                total_depth = bid_depth + ask_depth
                if total_depth == 0:
                    continue
                
                imbalance_ratio = bid_depth / ask_depth if ask_depth > 0 else 0
                
                # Log order book analysis
                await self.log(
                    'market_data',
                    f"📊 {pair} Order Book | Bid: {bid_depth:.2f} ({bid_depth/total_depth*100:.1f}%) | Ask: {ask_depth:.2f} ({ask_depth/total_depth*100:.1f}%) | Ratio: {imbalance_ratio:.2f}x",
                    {
                        'pair': pair,
                        'bid_depth': bid_depth,
                        'ask_depth': ask_depth,
                        'imbalance_ratio': imbalance_ratio,
                        'best_bid': float(bids[0][0]),
                        'best_ask': float(asks[0][0])
                    }
                )
                
                # Entry signals
                if imbalance_ratio > 3.0:  # Strong buy pressure
                    await self.open_position(pair, 'long', float(asks[0][0]))
                    await self.log('signal', f"🟢 LONG signal: {pair} - Strong bid pressure ({imbalance_ratio:.2f}x)", {})
                elif imbalance_ratio < 0.33:  # Strong sell pressure
                    await self.open_position(pair, 'short', float(bids[0][0]))
                    await self.log('signal', f"🔴 SHORT signal: {pair} - Strong ask pressure ({imbalance_ratio:.2f}x)", {})
                else:
                    await self.log('info', f"👀 Monitoring {pair} - No signal (ratio: {imbalance_ratio:.2f}x)", {})
                    
            except Exception as e:
                logger.error(f"Error analyzing {pair}: {e}")
    
    async def run_momentum_breakout_strategy(self):
        """Momentum Breakout Strategy"""
        if len(self.positions) >= self.strategy['max_positions']:
            await self.log('info', f"⚠️ Max positions reached ({self.strategy['max_positions']})", {})
            return
        
        for pair in self.strategy['pairs']:
            if any(p['symbol'] == pair for p in self.positions):
                continue
            
            if pair not in self.last_prices:
                continue
            
            current_price = self.last_prices[pair]
            
            # Get recent candles
            try:
                candles = info.candles_snapshot(coin=pair, interval='1m', start_time=int((datetime.now().timestamp() - 300) * 1000), end_time=int(datetime.now().timestamp() * 1000))
                
                if not candles or len(candles) < 5:
                    continue
                
                # Calculate momentum
                old_price = float(candles[0]['c'])
                momentum = ((current_price - old_price) / old_price) * 100
                
                await self.log(
                    'market_data',
                    f"📈 {pair} Momentum: {momentum:+.2f}% | Current: ${current_price:.2f}",
                    {'pair': pair, 'momentum': momentum, 'price': current_price}
                )
                
                # Entry signals
                if momentum > 2.0:
                    await self.open_position(pair, 'long', current_price)
                    await self.log('signal', f"🚀 LONG BREAKOUT: {pair} ({momentum:+.2f}%)", {})
                elif momentum < -2.0:
                    await self.open_position(pair, 'short', current_price)
                    await self.log('signal', f"📉 SHORT BREAKOUT: {pair} ({momentum:.2f}%)", {})
                else:
                    await self.log('info', f"👀 {pair} - Watching (momentum: {momentum:+.2f}%)", {})
                    
            except Exception as e:
                logger.error(f"Error analyzing momentum for {pair}: {e}")
    
    async def run_default_strategy(self):
        """Default strategy (for testing)"""
        await self.log('info', f"🤖 Running default strategy for {len(self.strategy['pairs'])} pairs", {})
    
    async def open_position(self, pair: str, side: str, price: float):
        """Open a new position"""
        position_size = self.strategy['position_size']
        stop_loss_pct = self.strategy['stop_loss_percent']
        take_profit_pct = self.strategy['take_profit_percent']
        
        # Calculate SL/TP
        if side == 'long':
            stop_loss = price * (1 - stop_loss_pct / 100)
            take_profit = price * (1 + take_profit_pct / 100)
        else:
            stop_loss = price * (1 + stop_loss_pct / 100)
            take_profit = price * (1 - take_profit_pct / 100)
        
        # Insert position
        position_data = {
            'bot_id': self.bot_id,
            'symbol': pair,
            'side': side,
            'size': position_size,
            'entry_price': price,
            'current_price': price,
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'opened_at': datetime.now().isoformat(),
            'status': 'open'
        }
        
        result = supabase.table('bot_positions').insert(position_data).execute()
        position_id = result.data[0]['id']
        
        # Insert trade
        supabase.table('bot_trades').insert({
            'bot_id': self.bot_id,
            'position_id': position_id,
            'symbol': pair,
            'side': 'buy' if side == 'long' else 'sell',
            'size': position_size,
            'price': price,
            'executed_at': datetime.now().isoformat(),
            'mode': self.mode
        }).execute()
        
        await self.log(
            'trade',
            f"✅ Opened {side.upper()} {pair} @ ${price:.2f} | SL: ${stop_loss:.2f} | TP: ${take_profit:.2f}",
            {'position_id': position_id, 'side': side, 'price': price}
        )
    
    async def check_positions(self):
        """Check and manage open positions"""
        for position in self.positions:
            pair = position['symbol']
            
            if pair not in self.last_prices:
                continue
            
            current_price = self.last_prices[pair]
            entry_price = position['entry_price']
            side = position['side']
            
            # Calculate P&L
            if side == 'long':
                pnl = (current_price - entry_price) * position['size']
            else:
                pnl = (entry_price - current_price) * position['size']
            
            pnl_pct = (pnl / (entry_price * position['size'])) * 100
            
            # Update position in database
            supabase.table('bot_positions')\
                .update({'current_price': current_price, 'unrealized_pnl': pnl})\
                .eq('id', position['id'])\
                .execute()
            
            # Log position status
            emoji = '💚' if pnl >= 0 else '❤️'
            await self.log(
                'info',
                f"{emoji} {side.upper()} {pair} | Entry: ${entry_price:.2f} → ${current_price:.2f} | P&L: ${pnl:.2f} ({pnl_pct:+.2f}%)",
                {'position_id': position['id'], 'pnl': pnl, 'pnl_pct': pnl_pct}
            )
            
            # Check exit conditions
            should_close = False
            reason = ''
            
            if side == 'long':
                if current_price <= position['stop_loss']:
                    should_close = True
                    reason = 'Stop Loss'
                elif current_price >= position['take_profit']:
                    should_close = True
                    reason = 'Take Profit'
            else:
                if current_price >= position['stop_loss']:
                    should_close = True
                    reason = 'Stop Loss'
                elif current_price <= position['take_profit']:
                    should_close = True
                    reason = 'Take Profit'
            
            if should_close:
                await self.close_position(position, current_price, reason)
    
    async def close_position(self, position: dict, close_price: float, reason: str):
        """Close a position"""
        side = position['side']
        pnl = (close_price - position['entry_price']) * position['size'] if side == 'long' else (position['entry_price'] - close_price) * position['size']
        
        # Update position
        supabase.table('bot_positions')\
            .update({'status': 'closed', 'current_price': close_price, 'closed_at': datetime.now().isoformat()})\
            .eq('id', position['id'])\
            .execute()
        
        # Insert closing trade
        supabase.table('bot_trades').insert({
            'bot_id': self.bot_id,
            'position_id': position['id'],
            'symbol': position['symbol'],
            'side': 'sell' if side == 'long' else 'buy',
            'size': position['size'],
            'price': close_price,
            'pnl': pnl,
            'executed_at': datetime.now().isoformat(),
            'mode': self.mode
        }).execute()
        
        await self.log(
            'trade',
            f"🔴 Closed {side.upper()} {position['symbol']} @ ${close_price:.2f} ({reason}) | P&L: ${pnl:.2f}",
            {'position_id': position['id'], 'pnl': pnl, 'reason': reason}
        )
    
    async def log(self, log_type: str, message: str, data: dict):
        """Log activity"""
        try:
            supabase.table('bot_logs').insert({
                'bot_id': self.bot_id,
                'user_id': self.user_id,
                'log_type': log_type,
                'message': message,
                'data': data,
                'created_at': datetime.now().isoformat()
            }).execute()
            
            logger.info(f"[{self.name}] {message}")
        except Exception as e:
            logger.error(f"Failed to log: {e}")


async def main():
    """Main entry point"""
    engine = BotEngine()
    await engine.start()

if __name__ == '__main__':
    asyncio.run(main())

