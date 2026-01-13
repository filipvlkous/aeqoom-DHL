import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Activity, Loader2, Clock8 } from 'lucide-react';
import './Dashboard.css';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Types
export type TimePeriod = 'day' | 'week' | 'month';
type ChartType = 'timeline' | 'regime' | 'duration' | 'activity' | 'daily_rows';

interface TimeSeriesData {
  time: string;
  totalSendCount: number;
  addedCount: number;
  duration: number;
  rowCount: number;
}

// New Interface for the Daily Bar Graph
interface DailyRowData {
  display_date: string;
  row_count: number;
}

interface RegimeData {
  name: string;
  count: number;
  color: string;
  regimeId: number;
  [key: string]: any;
}

interface DurationData {
  range: string;
  count: number;
}

interface StatsData {
  totalSendCount: number;
  sendCountChange: number;
  totalAddedCount: number;
  addedCountChange: number;
  avgDuration: number;
  durationChange: number;
  regimeRows: number;
  regimeRowsChange: number;
}

interface ChartButton {
  id: ChartType;
  icon: any;
  label: string;
}

const SUPABASE_URL = 'https://aouteibsooigkxdtuayu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvdXRlaWJzb29pZ2t4ZHR1YXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQyMjgsImV4cCI6MjA3NzI1MDIyOH0.jG7qLOe5swEBxeTltE9MJmWt0NpZ4uUZpChTwwz67ac';

const callSupabaseFunction = async (functionName: string, params: any = {}) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
      },
    );
    if (!response.ok) throw new Error(`Failed`);
    return await response.json();
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    return null;
  }
};

const fetchTimeSeriesData = async (period: TimePeriod) => {
  const data = await callSupabaseFunction('get_time_series_stats', {
    period_type: period,
  });
  if (!data) return [];
  return data.map((item: any) => ({
    time: item.time_label,
    totalSendCount: parseInt(item.total_send_count) || 0,
    addedCount: parseInt(item.added_count) || 0,
    duration: parseInt(item.avg_duration) || 0,
    rowCount: parseInt(item.row_count) || 0,
  }));
};

const fetchDailyAddedRows = async (period: TimePeriod) => {
  const data = await callSupabaseFunction('get_daily_added_rows', {
    period_type: period,
  });
  if (!data) return [];
  return data.map((item: any) => ({
    display_date: item.display_date,
    row_count: parseInt(item.row_count) || 0,
  }));
};

const fetchRegimeData = async (period: TimePeriod) => {
  const data = await callSupabaseFunction('get_regime_distribution', {
    period_type: period,
  });
  if (!data || !Array.isArray(data)) return [];
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
  return data
    .map((item: any, index: number) => ({
      name: `Regime ${item.regime || 'Unknown'}`,
      count: parseInt(item.count) || 0,
      color: colors[index % colors.length],
      regimeId: item.regime,
    }))
    .filter((item) => item.count > 0);
};

const fetchDurationData = async (period: TimePeriod) => {
  const data = await callSupabaseFunction('get_duration_distribution', {
    period_type: period,
  });
  return data || [];
};

const fetchStatsData = async (
  period: TimePeriod,
  targetRegime: number | null,
): Promise<StatsData> => {
  const data = await callSupabaseFunction('get_dashboard_comparison_stats', {
    period_type: period,
    target_regime: targetRegime,
  });

  if (!data || data.length === 0) {
    return {
      totalSendCount: 0,
      sendCountChange: 0,
      totalAddedCount: 0,
      addedCountChange: 0,
      avgDuration: 0,
      durationChange: 0,
      regimeRows: 0,
      regimeRowsChange: 0,
    };
  }

  const row = data[0];

  const calcChange = (curr: number, prev: number) => {
    const current = curr || 0;
    const previous = prev || 0;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    totalSendCount: row.curr_total_send || 0,
    sendCountChange: calcChange(row.curr_total_send, row.prev_total_send),
    totalAddedCount: row.curr_total_added || 0,
    addedCountChange: calcChange(row.curr_total_added, row.prev_total_added),
    avgDuration: row.curr_avg_duration || 0,
    durationChange: calcChange(row.curr_avg_duration, row.prev_avg_duration),
    regimeRows: row.curr_regime_rows || 0,
    regimeRowsChange: calcChange(row.curr_regime_rows, row.prev_regime_rows),
  };
};

const PercentChange = ({
  value,
  isPositive,
  arrowSide,
  t,
}: {
  value: number;
  isPositive: boolean;
  arrowSide: boolean;
  t: any;
}) => {
  return (
    <p
      style={
        value === 0
          ? { color: 'gray' }
          : isPositive
            ? { color: '#16a34a' }
            : { color: '#dc2626' }
      }
      className={`stat-change ${isPositive ? 'text-green-600' : 'text-red-600'}`}
    >
      {arrowSide ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%{' '}
      {t('analytics.prev')}
    </p>
  );
};

export default function Dashboard() {
  const { t } = useTranslation();
  const [activeChart, setActiveChart] = useState<ChartType>('timeline');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('day');
  const [loading, setLoading] = useState(false);
  const [selectedRegime, setSelectedRegime] = useState<number | null>(null);

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [dailyAddedData, setDailyAddedData] = useState<DailyRowData[]>([]); // New State
  const [regimeData, setRegimeData] = useState<RegimeData[]>([]);
  const [durationData, setDurationData] = useState<DurationData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const rData = await fetchRegimeData(timePeriod);
        setRegimeData(rData);

        let currentRegime = selectedRegime;
        if (currentRegime === null && rData.length > 0) {
          currentRegime = rData[0].regimeId;
          setSelectedRegime(currentRegime);
        }

        const [tsData, dailyData, dData, sData] = await Promise.all([
          fetchTimeSeriesData(timePeriod),
          fetchDailyAddedRows(timePeriod), // Fetch new data
          fetchDurationData(timePeriod),
          fetchStatsData(timePeriod, currentRegime),
        ]);

        setTimeSeriesData(tsData);
        setDailyAddedData(dailyData);
        setDurationData(dData);
        setStats(sData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [timePeriod]);

  useEffect(() => {
    if (selectedRegime !== null) {
      fetchStatsData(timePeriod, selectedRegime).then(setStats);
    }
  }, [selectedRegime]);

  const avgAddedCount =
    timeSeriesData.length > 0
      ? Math.round(
          timeSeriesData.reduce((sum, item) => sum + item.addedCount, 0) /
            timeSeriesData.length,
        )
      : 0;

  const chartButtons: ChartButton[] = [
    { id: 'timeline', icon: TrendingUp, label: t('analytics.timeline') },
    { id: 'daily_rows', icon: Activity, label: t('analytics.scanned') }, // New Button
    { id: 'duration', icon: Clock8, label: t('analytics.duration') },
  ];

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <Link to="/" className="btn-link">
          <span> ← Back</span>
        </Link>

        <div className="header-block">
          <h1 className="header-title">{t('analytics.title')}</h1>
          <p className="header-subtitle">{t('analytics.description')} </p>
        </div>

        <div className="period-selector">
          <span className="period-label">{t('analytics.time')}</span>
          <div className="period-buttons">
            {(['day', 'week', 'month'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={
                  timePeriod === period ? 'period-btn active' : 'period-btn'
                }
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading || !stats ? (
          <div className="loading-container">
            <Loader2 className="loading-spinner animate-spin" />
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card stat-blue">
                <p className="stat-label">{t('analytics.totalSend')}</p>
                <p className="stat-value">
                  {stats.totalSendCount.toLocaleString()}
                </p>
                <PercentChange
                  value={stats.sendCountChange}
                  isPositive={stats.sendCountChange >= 0}
                  arrowSide={stats.sendCountChange >= 0}
                  t={t}
                />
              </div>
              <div className="stat-card stat-purple">
                <p className="stat-label">{t('analytics.totalAdded')}</p>
                <p className="stat-value">
                  {stats.totalAddedCount.toLocaleString()}
                </p>
                <PercentChange
                  t={t}
                  value={stats.addedCountChange}
                  isPositive={stats.sendCountChange <= 0}
                  arrowSide={stats.sendCountChange >= 0}
                />
              </div>

              <div className="stat-card stat-pink">
                <p className="stat-label">{t('analytics.avgAdded')}</p>
                <p className="stat-value">{avgAddedCount.toLocaleString()}</p>
              </div>
              <div className="stat-card stat-purple">
                <p className="stat-label">{t('analytics.avgDuration')}</p>
                <p className="stat-value">{stats.avgDuration}s</p>
                <PercentChange
                  t={t}
                  value={stats.durationChange}
                  isPositive={stats.sendCountChange <= 0}
                  arrowSide={stats.sendCountChange >= 0}
                />
              </div>
            </div>

            <div className="chart-selector">
              {chartButtons.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveChart(id)}
                  className={
                    activeChart === id ? 'chart-btn active' : 'chart-btn'
                  }
                >
                  <Icon size={20} />
                  {label}
                </button>
              ))}
            </div>

            <div className="chart-container">
              <div className="chart-inner">
                <ResponsiveContainer width="100%" height="100%">
                  {activeChart === 'timeline' ? (
                    <AreaChart
                      data={timeSeriesData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorSend"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorAdded"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#b91010"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#b91010"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        stroke="#888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <CartesianGrid
                        strokeDasharray="3 3"
                        opacity={0.1}
                        vertical={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalSendCount"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorSend)"
                        name={t('analytics.sends')}
                      />
                      <Area
                        type="monotone"
                        dataKey="addedCount"
                        stroke="#b91010"
                        fillOpacity={1}
                        fill="url(#colorAdded)"
                        name={t('analytics.added')}
                      />
                    </AreaChart>
                  ) : activeChart === 'daily_rows' ? (
                    // --- NEW DAILY ROWS BAR CHART ---
                    <BarChart
                      data={dailyAddedData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="display_date"
                        stroke="#888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Bar
                        dataKey="row_count"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        name={t('analytics.count')}
                        maxBarSize={timePeriod === 'day' ? 100 : undefined}
                      />
                    </BarChart>
                  ) : activeChart === 'regime' ? (
                    regimeData.length > 0 ? (
                      <PieChart>
                        <Pie
                          data={regimeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="name"
                          label={({ name, percent }: any) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {regimeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-500">
                        {t('analytics.noData')}
                      </div>
                    )
                  ) : activeChart === 'duration' ? (
                    <BarChart
                      data={durationData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="range"
                        stroke="#888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        name={t('analytics.count')}
                      />
                    </BarChart>
                  ) : null}
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
