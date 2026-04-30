import React, { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Users, ClipboardList, ArrowLeftRight, UserCheck } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Layout from '../../components/layout/Layout';
import MetricCard from '../../components/ui/MetricCard';
import { Spinner } from '../../components/ui';
import api from '../../api/axios';

const COLORS = ['#1F4D3E', '#10b981', '#F59E0B', '#ef4444', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 text-xs shadow-card-hover">
      <p className="text-[#374151] mb-1 font-medium">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

const Analytics = () => {
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [assessmentPie, setAssessmentPie] = useState([]);
  const [doctorWorkload, setDoctorWorkload] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [m, t, ap, dw] = await Promise.all([
        api.get('/analytics/metrics', { params: { period } }),
        api.get('/analytics/appointment-trends', { params: { period } }),
        api.get('/analytics/assessment-status'),
        api.get('/analytics/doctor-workload'),
      ]);
      setMetrics(m.data); setTrends(t.data); setAssessmentPie(ap.data); setDoctorWorkload(dw.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [period]);

  if (loading) return <Layout title="Analytics"><Spinner /></Layout>;

  return (
    <Layout title="Analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">Analytics Overview</h2>
          <div className="flex bg-[#F3F4F6] rounded-lg p-1 gap-1">
            {['weekly', 'monthly', 'quarterly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 text-xs rounded-md capitalize transition-colors ${period === p ? 'bg-[#1F4D3E] text-white' : 'text-[#6B7280] hover:text-[#111827]'}`}>{p}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard title="Appointments" value={metrics?.appointments || 0} icon={BarChart2} color="primary" />
          <MetricCard title="Assessments" value={metrics?.assessments || 0} icon={ClipboardList} color="info" />
          <MetricCard title="Handover Resolution" value={`${metrics?.handover_resolution || 0}%`} icon={ArrowLeftRight} color="success" />
          <MetricCard title="Retention Rate" value={`${metrics?.retention || 0}%`} icon={Users} color="warning" />
          <MetricCard title="Staff Utilization" value={`${metrics?.staff_utilization || 0}%`} icon={UserCheck} color="purple" />
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[#111827] mb-4">Appointment Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" stroke="#1F4D3E" strokeWidth={2.5} dot={{ fill: '#1F4D3E', r: 3 }} name="Appointments" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold text-[#111827] mb-4">Assessment Status Distribution</h3>
            {assessmentPie.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[#9CA3AF] text-sm">No assessment data</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={assessmentPie} dataKey="value" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {assessmentPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ color: '#6B7280', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-[#111827] mb-4">Doctor Workload</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={doctorWorkload.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={v => v.split(' ').pop()} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#6B7280', fontSize: 12 }} />
                <Bar dataKey="patients" fill="#1F4D3E" radius={[4, 4, 0, 0]} name="Patients" />
                <Bar dataKey="appointments" fill="#10b981" radius={[4, 4, 0, 0]} name="Today's Appts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
