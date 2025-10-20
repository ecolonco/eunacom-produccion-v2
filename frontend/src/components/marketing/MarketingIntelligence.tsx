/**
 * Marketing Intelligence Main Component
 *
 * Componente principal que integra todos los módulos de marketing intelligence
 */

import React, { useState } from 'react';
import MarketingDashboard from './MarketingDashboard';
import RecommendationsPanel from './RecommendationsPanel';
import AIChat from './AIChat';
import AnalysisHistory from './AnalysisHistory';

type Tab = 'dashboard' | 'recommendations' | 'chat' | 'history';

export const MarketingIntelligence: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: '📊' },
    { id: 'recommendations' as Tab, label: 'Recomendaciones', icon: '🤖' },
    { id: 'chat' as Tab, label: 'Chat IA', icon: '💬' },
    { id: 'history' as Tab, label: 'Historial', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">🚀</span>
                Marketing Intelligence
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-sm text-gray-600">
                Plataforma EUNACOM
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                MI
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <MarketingDashboard />}
        {activeTab === 'recommendations' && <RecommendationsPanel />}
        {activeTab === 'chat' && <AIChat />}
        {activeTab === 'history' && <AnalysisHistory />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>
              Marketing Intelligence System v2.0 • Powered by IA
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Análisis automático de campañas • Recomendaciones inteligentes • Chat con IA
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingIntelligence;
