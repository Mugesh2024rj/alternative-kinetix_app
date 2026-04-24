import React, { useEffect, useState } from 'react';
import { Activity, Star, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import Layout from '../../components/layout/Layout';
import MetricCard from '../../components/ui/MetricCard';
import { Spinner, StarRating } from '../../components/ui';
import api from '../../api/axios';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-700 border border-dark-600 rounded-lg p-3 text-xs">
      <p className="text-gray-300 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

const Performance = () => {
  const [metrics, setMetrics] = useState(null);
  const [typeBreakdown, setTypeBreakdown] = useState([]);
  const [satisfaction, setSatisfaction] = useState([]);
  const [doctorIndex, setDoctorIndex] = useState([]);
  const [trends, setTrends] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [m, tb, sat, di, tr] = await Promise.all([
        api.get('/performance/metrics'),
        api.get('/performance/appointment-types'),
        api.get('/performance/satisfaction'),
        api.get('/performance/doctor-index'),
        api.get('/performance/session-trends', { params: { period } }),
      ]);
      setMetrics(m.data); setTypeBreakdown(tb.data); setSatisfaction(sat.data); setDoctorIndex(di.data); setTrends(tr.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [period]);

  if (loading) return <Layout title="Performance"><Spinner /></Layout>;

  const satisfactionData = [1, 2, 3, 4, 5].map(r => ({
    rating: `${r} ★`,
    count: satisfaction.find(s => parseInt(s.rating) === r)?.count || 0
  }));

  return (
    <Layout title="Performance">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Total Sessions" value={metrics?.total_sessions || 0} icon={Activity} color="primary" />
          <MetricCard title="Avg Session Rating" value={`${metrics?.avg_session_rating || '0.0'}/5`} icon={Star} color="success" />
          <MetricCard title="Cancellation Rate" value={`${metrics?.cancellation_rate || 0}%`} icon={XCircle} color="danger" />
          <MetricCard title="Avg Wait Time" value={`${metrics?.avg_wait_time || 0} min`} icon={Clock} color="warning" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4">Appointment Type Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis dataKey="type" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4">Patient Satisfaction (Star-based)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={satisfactionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="rating" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Session Trends</h3>
            <div className="flex bg-dark-700 rounded-lg p-1 gap-1">
              {['weekly', 'monthly', 'yearly'].map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${period === p ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>{p}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Line type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
              <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} dot={false} name="Cancelled" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="p-4 border-b border-dark-700"><h3 className="font-semibold text-white">Doctor Performance Index</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-dark-700">
                <tr>{['Doctor', 'Specialty', 'Sessions', 'On-Time %', 'Feedback Score', 'Handover Penalty', 'Score', 'Trend'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody>
                {doctorIndex.map(doc => {
                  const score = ((doc.sessions_completed * 0.4) + (doc.on_time_percentage * 0.3) + (doc.feedback_score * 20 * 0.3) - (doc.handover_penalty * 5)).toFixed(1);
                  const trend = score > 70 ? 'up' : score > 40 ? 'neutral' : 'down';
                  return (
                    <tr key={doc.id} className="table-row">
                      <td className="table-cell font-medium text-white">{doc.full_name}</td>
                      <td className="table-cell">{doc.specialisation}</td>
                      <td className="table-cell">{doc.sessions_completed}</td>
                      <td className="table-cell">{doc.on_time_percentage || 0}%</td>
                      <td className="table-cell"><StarRating rating={doc.feedback_score} /></td>
                      <td className="table-cell text-red-400">-{doc.handover_penalty}</td>
                      <td className="table-cell">
                        <span className={`font-bold ${score > 70 ? 'text-emerald-400' : score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>{score}</span>
                      </td>
                      <td className="table-cell">
                        {trend === 'up' ? <TrendingUp size={16} className="text-emerald-400" /> : trend === 'down' ? <TrendingDown size={16} className="text-red-400" /> : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Performance;
