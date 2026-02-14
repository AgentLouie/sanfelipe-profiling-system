import { useEffect, useState } from 'react';
import api from '../../api/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { UsersRound, Building2, UserRound, ShieldAlert, Loader2 } from 'lucide-react';

export default function DashboardStats({ userRole }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = userRole?.toLowerCase() === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
        setTimeout(() => {
            setLoading(false);
        }, 500);

      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-lg shadow-stone-200/50">
        <div className="bg-red-50 p-4 rounded-full mb-6">
          <ShieldAlert size={40} className="text-red-700" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Access Restricted</h2>
        <p className="text-stone-500 mt-3 max-w-sm mx-auto text-base leading-relaxed">
          Global statistics are strictly limited to Administrator accounts.
        </p>
      </div>
    );
  }

  // --- LOADING STATE ---
  if (loading) {
    return <BufferingLoader />;
  }

  // --- DATA PROCESSING ---
  const barangayData = Object.entries(stats?.population_by_barangay || {})
    .map(([name, value]) => ({ name, value }));

  const sectorData = Object.entries(stats?.population_by_sector || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const genderData = [
    { name: 'Male', value: stats?.total_male || 0 },
    { name: 'Female', value: stats?.total_female || 0 },
  ];

  const GENDER_COLORS = ['#991b1b', '#ef4444'];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-stone-900 tracking-tight">
            Overview
          </h1>
          <p className="text-stone-500 mt-2 text-base font-medium">
            Municipality-wide demographic intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-stone-100 rounded-full border border-stone-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
                Live Data
            </span>
        </div>
      </div>

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Residents" 
          value={stats?.total_residents} 
          icon={<UsersRound size={22} />} 
        />
        <StatCard 
          title="Total Households" 
          value={stats?.total_households} 
          icon={<Building2 size={22} />} 
        />
        <StatCard 
          title="Male Population" 
          value={stats?.total_male} 
          icon={<UserRound size={22} />} 
        />
        <StatCard 
          title="Female Population" 
          value={stats?.total_female} 
          icon={<UserRound size={22} />} 
        />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* BARANGAY CHART */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-stone-100 shadow-xl shadow-stone-200/40">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-stone-900">Population Distribution</h3>
            <p className="text-sm text-stone-400 font-medium">Residents per Barangay</p>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barangayData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#78716c', fontSize: 11 }}
                    dy={10}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#78716c', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f4' }} />
                <Bar 
                    dataKey="value" 
                    fill="#991b1b" 
                    radius={[6, 6, 0, 0]} 
                    barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GENDER DONUT CHART */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-8 border border-stone-100 shadow-xl shadow-stone-200/40 flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-stone-900">Gender Split</h3>
            <p className="text-sm text-stone-400 font-medium">Demographic Ratio</p>
          </div>
          <div className="flex-1 min-h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {genderData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-stone-600 font-semibold ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text for Donut */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                    <span className="block text-3xl font-bold text-stone-900">
                        {((stats?.total_male / stats?.total_residents) * 100).toFixed(0)}%
                    </span>
                    <span className="text-xs text-stone-400 font-bold uppercase tracking-wide">Male</span>
                </div>
            </div>
          </div>
        </div>

      </div>

      {/* SECTOR LIST CHART */}
      <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-xl shadow-stone-200/40">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h3 className="text-lg font-bold text-stone-900">Sector Breakdown</h3>
                <p className="text-sm text-stone-400 font-medium">Population by Sector Classification</p>
            </div>
        </div>

        <div className="w-full overflow-hidden">
            <ResponsiveContainer width="100%" height={Math.max(400, sectorData.length * 60)}>
              <BarChart
                layout="vertical"
                data={sectorData}
                margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f5f5f4" />
                <XAxis type="number" hide />
                <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={150}
                    tick={{ fill: '#44403c', fontSize: 13, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fafaf9' }} />
                <Bar 
                    dataKey="value" 
                    fill="#991b1b" 
                    radius={[0, 6, 6, 0]} 
                    barSize={24}
                    background={{ fill: '#f5f5f4', radius: [0, 6, 6, 0] }}
                />
              </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

// --- SUBCOMPONENTS ---

function StatCard({ title, value, icon }) {
  return (
    <div className="group relative overflow-hidden bg-white p-6 rounded-3xl border border-stone-100 shadow-lg shadow-stone-200/50 hover:shadow-stone-300/50 hover:-translate-y-1 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 flex items-center justify-center bg-stone-50 border border-stone-100 text-stone-600 rounded-2xl shadow-sm group-hover:bg-red-600 group-hover:text-white group-hover:shadow-red-200 transition-all duration-300">
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                    {title}
                </p>
                <h4 className="text-3xl font-extrabold text-stone-900 tabular-nums tracking-tight">
                    {(value || 0).toLocaleString()}
                </h4>
            </div>
        </div>
        
        {/* Decorative Background Element */}
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-stone-50 rounded-full group-hover:bg-red-50 transition-colors duration-500 z-0" />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900/95 backdrop-blur text-white p-4 rounded-xl shadow-2xl border border-stone-800">
          <p className="text-sm font-medium text-stone-300 mb-1">{label}</p>
          <p className="text-lg font-bold text-white tabular-nums">
            {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
};

// --- UPDATED LOADING COMPONENT ---
function BufferingLoader() {
    return (
        <div className="relative min-h-[80vh] w-full">
            {/* 1. Background Skeleton (Kept subtle for context) */}
            <div className="space-y-8 opacity-10 blur-[2px] pointer-events-none select-none transition-all duration-500">
                <div className="flex justify-between items-end">
                   <div className="space-y-3">
                       <div className="h-10 w-48 bg-stone-400 rounded-lg"></div>
                       <div className="h-4 w-64 bg-stone-300 rounded-lg"></div>
                   </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-40 bg-stone-200 rounded-3xl"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-80 bg-stone-200 rounded-3xl"></div>
                    <div className="lg:col-span-1 h-80 bg-stone-200 rounded-3xl"></div>
                </div>
            </div>

            {/* 2. Clean Loader Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                {/* Red Spinner */}
                <Loader2 size={48} className="text-red-500 animate-spin mb-4" strokeWidth={2.5} />
                
                {/* Text: SYNCING RECORDS... */}
                <p className="text-sm font-bold text-stone-500 uppercase tracking-[0.2em] animate-pulse">
                    Syncing Records...
                </p>
            </div>
        </div>
    )
}