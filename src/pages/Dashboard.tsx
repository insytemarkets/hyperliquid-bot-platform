import React from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MetricsCards from '../components/MetricsCards';
import QuickBotBuilder from '../components/QuickBotBuilder';
import ActiveBotsTable from '../components/ActiveBotsTable';
import DashboardPerformanceChart from '../components/DashboardPerformanceChart';
import StrategyTemplates from '../components/StrategyTemplates';
import RecentActivity from '../components/RecentActivity';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="Dashboard" />
      
      <div className="flex h-screen">
        <Sidebar activeItem="Overview" />
        
        <main className="flex-1 overflow-auto bg-gray-50">
          {/* Performance Metrics */}
          <MetricsCards />

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Bot Builder */}
                <QuickBotBuilder />

                {/* Active Bots Table */}
                <ActiveBotsTable />
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Strategy Templates */}
                <StrategyTemplates />

                {/* Performance Chart */}
                <DashboardPerformanceChart />

                {/* Recent Activity */}
                <RecentActivity />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;










