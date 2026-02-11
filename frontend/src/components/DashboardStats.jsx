import { useEffect, useState } from 'react';
import api from '../api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { UsersRound, Building2, UserRound, ShieldAlert, Loader2 } from 'lucide-react';

export default function DashboardStats({ userRole }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to normalize role for comparison
  const isAdmin = userRole?.toLowerCase() === 'admin';

  useEffect(() => {
    // 1. Guard: Only admins can fetch dashboard data
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  // 2. Access Control: If the user is NOT an admin, show Access Restricted UI
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border border-stone-100 rounded-2xl p-10 text-center animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Access Restricted</h2>
        <p className="text-stone-500 mt-2 max-w-sm mx-auto">
          Your account does not have permission to view the global dashboard statistics. Please use the Resident Database to manage your assigned records.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-stone-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-red-700" />
        <p className="font-medium">Loading analytics from cloud...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-10 text-center bg-red-50 rounded-xl border border-red-100 max-w-2xl mx-auto">
        <p className="text-red-700 font-bold">Unable to load dashboard data.</p>
        <p className="text-red-600 text-sm mt-1">This usually happens if the database is empty or the connection timed out.</p>
      </div>
    );
  }

  // Data Formatting for Recharts
  const barangayData = Object.entries(stats.population_by_barangay || {})
    .map(([key, value]) => ({ name: key, value }))
    .sort((a, b) => b.value - a.value);

  const genderData = [
    { name: 'Male', value: stats.total_male || 0 },
    { name: 'Female', value: stats.total_female || 0 }
  ];

  const sectorData = Object.entries(stats.population_by_sector || {})
    .map(([key, value]) => ({ name: key, value }))
    .sort((a, b) => b.value - a.value);

  const GENDER_COLORS = ['#7f1d1d', '#ef4444'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Overview</h1>
        <p className="text-stone-500 mt-1">Municipality-wide demographic insights.</p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Residents" value={stats.total_residents} icon={<UsersRound size={20} />} />
        <StatCard title="Total Households" value={stats.total_households} icon={<Building2 size={20} />} />
        <StatCard title="Male" value={stats.total_male} icon={<UserRound size={20} />} />
        <StatCard title="Female" value={stats.total_female} icon={<UserRound size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BARANGAY CHART */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-800 mb-6">Population by Barangay</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barangayData} margin={{ bottom: 40 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  tick={{ fill: '#6b7280', fontSize: 11 }} 
                  interval={0}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#991b1b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GENDER PIE */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-800 mb-6">Gender Distribution</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTOR CHART */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-800 mb-6">Vulnerable Sectors</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={sectorData}>
              <CartesianGrid stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#7f1d1d" barSize={20} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 flex items-center justify-center bg-red-50 rounded-xl text-red-700">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{title}</p>
          <p className="text-2xl font-black text-stone-900">{(value || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}