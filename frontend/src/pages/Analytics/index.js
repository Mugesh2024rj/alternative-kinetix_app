import React, { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Users, ClipboardList, ArrowLeftRight, UserCheck } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Layout from '../../components/layout/Layout';
import MetricCard from '../../components/ui/MetricCard';
import { Spinner } from '../../components/ui';
import api from '../../api/axios';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-700 border border-dark-600 rounded-lg p-3 text-xs">
      <p className="text-gray-300 mb-1">{label}</p>
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
          <h2 className="text-lg font-semibold text-white">Analytics Overview</h2>
          <div className="flex bg-dark-700 rounded-lg p-1 gap-1">
            {['weekly', 'monthly', 'quarterly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 text-xs rounded-md capitalize transition-colors ${period === p ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>{p}</button>
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
          <h3 className="font-semibold text-white mb-4">Appointment Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} name="Appointments" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4">Assessment Status Distribution</h3>
            {assessmentPie.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm">No assessment data</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={assessmentPie} dataKey="value" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {assessmentPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4">Doctor Workload</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={doctorWorkload.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => v.split(' ').pop()} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Bar dataKey="patients" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Patients" />
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
