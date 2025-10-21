/**
 * Marketing Intelligence Dashboard
 *
 * Dashboard principal con KPIs, gráficos y métricas de campañas
 */

import React, { useState, useEffect } from 'react';
import marketingAPI, { DashboardData } from '../../services/marketing-api.service';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const MarketingDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [days]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardData = await marketingAPI.getDashboard(days);
      setData(dashboardData);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.response?.data?.error || 'Error cargando dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-CL').format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadDashboard}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No hay datos disponibles</p>
      </div>
    );
  }

  const { summary } = data;

  // Preparar datos para gráficos
  const chartData = data.dailyMetrics
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((metric) => ({
      date: new Date(metric.date).toLocaleDateString('es-CL', {
        month: 'short',
        day: 'numeric',
      }),
      conversions: metric.conversions,
      cost: metric.cost / 1000, // En miles para mejor visualización
      ctr: metric.ctr,
      roi: metric.roi,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketing Intelligence</h1>
          <p className="text-gray-600 mt-1">
            Panel de control y análisis de campañas
          </p>
        </div>

        <div className="flex gap-3">
          {/* Selector de período */}
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={14}>Últimos 14 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>

          {/* Botón refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <svg
              className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Impresiones"
          value={formatNumber(summary.impressions)}
          icon="👁️"
          change={null}
          color="bg-blue-500"
        />
        <KPICard
          title="Clicks"
          value={formatNumber(summary.clicks)}
          subtitle={`CTR: ${summary.ctr.toFixed(2)}%`}
          icon="🖱️"
          change={null}
          color="bg-green-500"
        />
        <KPICard
          title="Conversiones"
          value={formatNumber(summary.conversions)}
          subtitle={`CPA: ${formatCurrency(summary.cpa)}`}
          icon="✅"
          change={null}
          color="bg-purple-500"
        />
        <KPICard
          title="ROI"
          value={`${summary.roi.toFixed(1)}%`}
          subtitle={`Inversión: ${formatCurrency(summary.cost)}`}
          icon="💰"
          change={summary.roi > 0 ? 'positive' : summary.roi < 0 ? 'negative' : null}
          color={summary.roi > 0 ? 'bg-emerald-500' : 'bg-red-500'}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversiones Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Conversiones por Día
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="conversions"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ROI Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ROI por Día</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'ROI']}
              />
              <Legend />
              <Bar
                dataKey="roi"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CTR Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">CTR por Día</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'CTR']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="ctr"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Costo Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Costo por Día (miles CLP)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [
                  formatCurrency(value * 1000),
                  'Costo',
                ]}
              />
              <Legend />
              <Bar dataKey="cost" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Resumen del Período</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-blue-100 text-sm">Inversión Total</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.cost)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Revenue Total</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.revenue)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">CPC Promedio</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.cpc)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">CTR Promedio</p>
            <p className="text-2xl font-bold">{summary.ctr.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// KPI Card Component
// ============================================================================

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  change?: 'positive' | 'negative' | null;
  color: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  change,
  color,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-600 text-sm font-medium">{title}</span>
        <span className={`${color} text-white text-2xl w-12 h-12 rounded-lg flex items-center justify-center`}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        )}
        {change && (
          <div
            className={`flex items-center mt-2 text-sm ${
              change === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change === 'positive' ? (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {change === 'positive' ? 'Mejorando' : 'Necesita atención'}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingDashboard;
