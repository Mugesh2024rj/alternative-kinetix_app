import React, { useEffect, useState } from 'react';
import { Activity, Star, XCircle, Clock, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import Layout from '../../components/layout/Layout';
import MetricCard from '../../components/ui/MetricCard';
import { Spinner, StarRating } from '../../components/ui';
import api from '../../api/axios';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 text-xs shadow-card-hover">
      <p className="text-[#374151] mb-1 font-medium">{label}</p>
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
  const [completedAppts, setCompletedAppts] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetchData = async () => {
    try {
      const [m, tb, sat, di, tr, ca] = await Promise.all([
        api.get('/performance/metrics'),
        api.get('/performance/appointment-types'),
        api.get('/performance/satisfaction'),
        api.get('/performance/doctor-index'),
        api.get('/performance/session-trends', { params: { period } }),
        api.get('/performance/completed-appointments'),
      ]);
      setMetrics(m.data);
      setTypeBreakdown(tb.data);
      setSatisfaction(sat.data);
      setDoctorIndex(di.data);
      setTrends(tr.data);
      setCompletedAppts(ca.data);
    } catch {}
    setLoading(false);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.post('/performance/recalculate-all');
      const fresh = await api.get('/performance/doctor-index');
      setDoctorIndex(fresh.data);
    } catch {}
    setRecalculating(false);
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
            <h3 className="font-semibold text-[#111827] mb-4">Appointment Type Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis dataKey="type" type="category" tick={{ fill: '#6B7280', fontSize: 12 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#1F4D3E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-[#111827] mb-4">Patient Satisfaction (Star-based)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={satisfactionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="rating" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[#111827] mb-4">Completed Appointments by Doctor</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={completedAppts} margin={{ top: 10, right: 20, left: 10, bottom: 35 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="doctor"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                tickFormatter={v => v.split(' ').slice(-1)[0]}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#111827]">Session Trends</h3>
            <div className="flex bg-[#F3F4F6] rounded-lg p-1 gap-1">
              {['weekly', 'monthly', 'yearly'].map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${period === p ? 'bg-[#1F4D3E] text-white' : 'text-[#6B7280] hover:text-[#111827]'}`}>{p}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="period" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#6B7280', fontSize: 12 }} />
              <Line type="monotone" dataKey="sessions" stroke="#1F4D3E" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
              <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} dot={false} name="Cancelled" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="p-4 border-b border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#111827]">Doctor Performance Index</h3>
                <p className="text-xs text-[#6B7280] mt-1">Points: +10 per completed appointment · +15 per completed event · feedback×20 · -10 per pending handover</p>
              </div>
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1F4D3E] text-white rounded-lg hover:bg-[#163d30] disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={12} className={recalculating ? 'animate-spin' : ''} />
                {recalculating ? 'Updating...' : 'Recalculate Points'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#E5E7EB]">
                <tr>
                  {['#', 'Doctor', 'Specialty', 'Sessions', 'Completed Appts', 'Events', 'Appt Pts', 'Event Pts', 'Feedback Pts', 'Penalty', 'Total Points', 'Trend'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...doctorIndex].sort((a, b) => (parseInt(b.total_points) || 0) - (parseInt(a.total_points) || 0)).map((doc, idx) => {
                  const total = parseInt(doc.total_points) || 0;
                  const rank = idx + 1;
                  const rankBadge = rank === 1
                    ? { bg: 'bg-yellow-50 border-yellow-300', label: '🥇', row: 'bg-yellow-50' }
                    : rank === 2
                    ? { bg: 'bg-gray-100 border-gray-300', label: '🥈', row: 'bg-gray-50' }
                    : rank === 3
                    ? { bg: 'bg-orange-50 border-orange-300', label: '🥉', row: 'bg-orange-50' }
                    : { bg: '', label: rank, row: '' };
                  return (
                    <tr key={doc.id} className={`table-row ${rankBadge.row}`}>
                      <td className="table-cell">
                        {rank <= 3
                          ? <span className="text-base">{rankBadge.label}</span>
                          : <span className="text-xs text-[#9CA3AF]">{rank}</span>}
                      </td>
                      <td className="table-cell font-medium text-[#111827]">
                        {rank <= 3 ? <span className="font-bold">{doc.full_name}</span> : doc.full_name}
                      </td>
                      <td className="table-cell text-[#374151]">{doc.specialisation}</td>
                      <td className="table-cell text-[#374151]">{doc.sessions_completed}</td>
                      <td className="table-cell text-[#374151]">{doc.appointments_completed || 0}</td>
                      <td className="table-cell text-[#374151]">{doc.events_participated || 0}</td>
                      <td className="table-cell text-emerald-600">+{doc.appointment_points || 0}</td>
                      <td className="table-cell text-blue-600">+{doc.event_points || 0}</td>
                      <td className="table-cell text-amber-600">+{doc.feedback_points || 0}</td>
                      <td className="table-cell text-red-600">-{doc.penalty_points || 0}</td>
                      <td className="table-cell">
                        <span className={`font-bold text-sm ${total > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {total}
                        </span>
                      </td>
                      <td className="table-cell">
                        {total > 0
                          ? <TrendingUp size={16} className="text-emerald-600" />
                          : <TrendingDown size={16} className="text-red-500" />}
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
