import { useEffect, useState } from 'react';
import api from '../../api/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { UsersRound, Building2, UserRound, ShieldAlert, Loader2, MapPin, Activity } from 'lucide-react';

const govFontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800&display=swap');
  .font-gov { font-family: 'Public Sans', system-ui, -apple-system, sans-serif; }
`;

export default function DashboardStats({ userRole }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const logoUrl = '/san_felipe_seal.png';

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
      <div className="font-gov flex flex-col items-center justify-center min-h-[60vh] bg-slate-50/50 border border-slate-200 rounded-3xl p-12 text-center shadow-sm animate-in fade-in zoom-in-95 duration-300">
        <style>{govFontStyles}</style>
        <div className="bg-red-50 p-5 rounded-full mb-6 border border-red-100/50 shadow-sm">
          <ShieldAlert size={48} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-medium text-slate-800 tracking-tight">Access Restricted</h2>
        <p className="text-slate-500 mt-3 max-w-sm mx-auto text-sm leading-relaxed font-normal">
          Global statistics and demographic analytics are strictly limited to Administrator accounts.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
        <>
            <style>{govFontStyles}</style>
            <BufferingLoader />
        </>
    );
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

  const GENDER_COLORS = ['#475569', '#dc2626'];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central" 
        className="text-xs font-normal font-gov tracking-wide"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="font-gov space-y-8 pb-12 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <style>{govFontStyles}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 text-red-600 mb-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm p-0.5 overflow-hidden">
                <img 
                    src={logoUrl} 
                    alt="San Felipe Seal" 
                    className="w-full h-full object-contain rounded-full" 
                    onError={(e) => (e.target.style.display = 'none')} 
                />
            </div>
            <span className="text-[11px] font-medium tracking-widest uppercase">Municipality of San Felipe, Zambales</span>
          </div>
          <h1 className="text-3xl font-medium text-slate-800 tracking-tight">
            Population Overview
          </h1>
        </div>
      </div>

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Total Residents" 
          value={stats?.total_residents} 
          icon={<UsersRound size={22} />} 
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        <StatCard 
          title="Total Households" 
          value={stats?.total_households} 
          icon={<Building2 size={22} />} 
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <StatCard 
          title="Male Population" 
          value={stats?.total_male} 
          icon={<UserRound size={22} />} 
          colorClass="text-slate-600"
          bgClass="bg-slate-100"
        />
        <StatCard 
          title="Female Population" 
          value={stats?.total_female} 
          icon={<UserRound size={22} />} 
          colorClass="text-red-600"
          bgClass="bg-red-50"
        />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BARANGAY CHART */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
          <div className="mb-8 flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="p-2 bg-slate-50 text-slate-400 rounded-lg border border-slate-100"><MapPin size={20} /></div>
            <div>
              <h3 className="text-base font-medium text-slate-800 tracking-tight">Population by Location</h3>
              <p className="text-xs font-normal text-slate-400 mt-0.5">Recorded residents per Barangay unit</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barangayData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Public Sans', fontWeight: 400 }}
                    dy={15}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Public Sans', fontWeight: 400 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar 
                    dataKey="value" 
                    fill="#dc2626" 
                    radius={[6, 6, 0, 0]} 
                    barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GENDER DONUT CHART */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="p-2 bg-slate-50 text-slate-400 rounded-lg border border-slate-100"><UsersRound size={20} /></div>
            <div>
              <h3 className="text-base font-medium text-slate-800 tracking-tight">Gender Ratio</h3>
            </div>
          </div>
          
          <div className="flex-1 relative min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {genderData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <span className="block text-2xl font-medium text-slate-800 tabular-nums tracking-tight">
                        {(stats?.total_residents || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400 uppercase tracking-widest mt-1">
                        Total
                    </span>
                </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-col gap-3 pt-5 border-t border-slate-100">
            {genderData.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3.5 h-3.5 rounded-md shadow-sm"
                    style={{ backgroundColor: GENDER_COLORS[index] }}
                  />
                  <span className="text-xs font-normal text-slate-600 uppercase tracking-wide">
                    {entry.name}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-800 tabular-nums">
                  {entry.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECTOR LIST CHART */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-5">
           <div className="p-2 bg-slate-50 text-slate-400 rounded-lg border border-slate-100"><Activity size={20} /></div>
           <div>
               <h3 className="text-base font-medium text-slate-800 tracking-tight">Sector Classification</h3>
           </div>
        </div>

        <div className="w-full overflow-hidden">
            <ResponsiveContainer width="100%" height={Math.max(400, sectorData.length * 55)}>
              <BarChart
                layout="vertical"
                data={sectorData}
                margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={180}
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 400, fontFamily: 'Public Sans' }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar 
                    dataKey="value" 
                    fill="#dc2626" 
                    radius={[0, 6, 6, 0]} 
                    barSize={24}
                    background={{ fill: '#f1f5f9', radius: [0, 6, 6, 0] }} 
                />
              </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

// --- SUBCOMPONENTS ---

function StatCard({ title, value, icon, colorClass, bgClass }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-red-200 transition-all duration-300 group">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
            <p className="text-[11px] font-normal text-slate-400 uppercase tracking-widest">
                {title}
            </p>
            <h4 className="text-3xl font-medium text-slate-800 tabular-nums tracking-tight">
                {(value || 0).toLocaleString()}
            </h4>
        </div>
        <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${bgClass} ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
             {icon}
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm text-white p-4 rounded-xl shadow-xl border border-slate-800 animate-in zoom-in-95 duration-200">
          <p className="text-[10px] font-normal text-slate-400 mb-1 uppercase tracking-widest">{label}</p>
          <p className="text-xl font-medium text-white tabular-nums tracking-tight">
            {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
};

// --- LOADING COMPONENT ---
function BufferingLoader() {
    return (
        <div className="relative min-h-[80vh] w-full max-w-7xl mx-auto p-6 font-gov">
            {/* Background Skeleton */}
            <div className="space-y-8 opacity-30 pointer-events-none select-none animate-pulse">
                <div className="mb-8">
                   <div className="h-4 w-32 bg-slate-300 rounded-full mb-3"></div>
                   <div className="h-8 w-64 bg-slate-300 rounded-lg"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <div className="lg:col-span-2 h-[400px] bg-slate-200 rounded-2xl"></div>
                    <div className="lg:col-span-1 h-[400px] bg-slate-200 rounded-2xl"></div>
                </div>
            </div>

            {/* Loader Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="p-5 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-300">
                    <Loader2 size={36} className="text-red-600 animate-spin mb-3" />
                    <p className="text-[11px] font-normal text-slate-400 uppercase tracking-widest">
                        Compiling Data...
                    </p>
                </div>
            </div>
        </div>
    )
}