import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase/supabaseClient';
import type { User } from '@supabase/supabase-js';

const Home: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setMessage('');

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: process.env.NODE_ENV === 'production' 
              ? 'https://build-52nmop1ol-memestreetmarkets.vercel.app/dashboard'
              : 'http://localhost:3000/dashboard',
          },
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setAuthLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: process.env.NODE_ENV === 'production' 
            ? 'https://build-52nmop1ol-memestreetmarkets.vercel.app/dashboard'
            : 'http://localhost:3000/dashboard',
        },
      });
      if (error) throw error;
      setMessage('Check your email for the magic link!');
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage('Error signing out: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-sm">HL</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">HyperLiquid</h1>
                  <p className="text-xs text-gray-500">Institutional Trading Platform</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">{user.email}</span>
                <button
                  onClick={signOut}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-light text-gray-900 mb-4">
              Welcome Back
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Access your institutional-grade trading infrastructure and automated strategies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <Link
              to="/dashboard"
              className="group bg-white border border-gray-200 rounded-lg p-8 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-gray-900">Dashboard</h3>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-gray-600">Monitor performance, active positions, and system health.</p>
            </Link>

            <Link
              to="/strategies"
              className="group bg-white border border-gray-200 rounded-lg p-8 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-gray-900">Strategies</h3>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-gray-600">Deploy and manage automated trading strategies.</p>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-8 py-8 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-light text-gray-900 mb-1">24/7</div>
              <div className="text-sm text-gray-500">Market Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-gray-900 mb-1">99.9%</div>
              <div className="text-sm text-gray-500">System Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-gray-900 mb-1">&lt;1ms</div>
              <div className="text-sm text-gray-500">Execution Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-gray-900 mb-1">Real-time</div>
              <div className="text-sm text-gray-500">Data Processing</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">HL</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">HyperLiquid</h1>
                <p className="text-xs text-gray-500">Institutional Trading Platform</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 py-16">
          {/* Left Side - Content */}
          <div className="flex flex-col justify-center">
            <div className="mb-8">
              <h1 className="text-5xl font-light text-gray-900 mb-6 leading-tight">
                Institutional-Grade
                <br />
                <span className="font-medium">Trading Infrastructure</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Advanced algorithmic trading platform built for professional traders and institutions. 
                Deploy sophisticated strategies with institutional-grade execution and risk management.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-6 mb-12">
              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Advanced Order Management</h3>
                  <p className="text-gray-600">Sophisticated order routing with smart execution algorithms</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Real-Time Market Data</h3>
                  <p className="text-gray-600">Low-latency data feeds with microsecond precision</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Risk Management Suite</h3>
                  <p className="text-gray-600">Comprehensive risk controls and position monitoring</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Strategy Backtesting</h3>
                  <p className="text-gray-600">Historical simulation with tick-level accuracy</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200">
              <div>
                <div className="text-3xl font-light text-gray-900 mb-2">$2.4B+</div>
                <div className="text-sm text-gray-500 uppercase tracking-wide">Volume Processed</div>
              </div>
              <div>
                <div className="text-3xl font-light text-gray-900 mb-2">99.99%</div>
                <div className="text-sm text-gray-500 uppercase tracking-wide">System Reliability</div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-medium text-gray-900 mb-2">
                    {authMode === 'signin' ? 'Access Platform' : 'Request Access'}
                  </h2>
                  <p className="text-gray-600">
                    {authMode === 'signin' 
                      ? 'Sign in to your institutional account' 
                      : 'Create your institutional account'
                    }
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authLoading ? 'Processing...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-gray-50 text-gray-500">Or</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleMagicLink}
                    disabled={authLoading || !email}
                    className="w-full bg-white hover:bg-gray-50 text-gray-900 py-2 px-4 rounded-md font-medium border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Magic Link
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {authMode === 'signin' 
                      ? "Don't have an account? Request access" 
                      : "Already have an account? Sign in"
                    }
                  </button>
                </div>

                {message && (
                  <div className={`mt-4 p-3 rounded-md text-sm ${
                    message.includes('Check your email') 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}
              </div>

              {/* Trust Indicators */}
              <div className="mt-8 text-center">
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Bank-Grade Security
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    SOC 2 Compliant
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;