import React, { useEffect, useState } from 'react';
import { Users, ArrowLeftRight, Clock, Star, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/layout/Layout';
import MetricCard from '../../components/ui/MetricCard';
import Modal from '../../components/ui/Modal';
import { StatusBadge, Spinner, EmptyState } from '../../components/ui';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const HandoverForm = ({ doctors, patients, onSave, onClose }) => {
  const [form, setForm] = useState({ patient_id: '', from_doctor_id: '', to_doctor_id: '', case_type: '', stage: '', transfer_reason: '', priority: 'medium', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/handovers', form);
      toast.success('Handover created');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error creating handover'); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Patient</label>
          <select className="select w-full" value={form.patient_id} onChange={e => set('patient_id', e.target.value)} required>
            <option value="">Select Patient</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div><label className="form-label">Priority</label>
          <select className="select w-full" value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
        </div>
        <div><label className="form-label">From Doctor</label>
          <select className="select w-full" value={form.from_doctor_id} onChange={e => set('from_doctor_id', e.target.value)}>
            <option value="">Select Doctor</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
        <div><label className="form-label">To Doctor</label>
          <select className="select w-full" value={form.to_doctor_id} onChange={e => set('to_doctor_id', e.target.value)}>
            <option value="">Select Doctor</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
        <div><label className="form-label">Case Type</label><input className="input" value={form.case_type} onChange={e => set('case_type', e.target.value)} /></div>
        <div><label className="form-label">Stage</label><input className="input" value={form.stage} onChange={e => set('stage', e.target.value)} /></div>
        <div className="col-span-2"><label className="form-label">Transfer Reason</label><textarea className="input" rows={2} value={form.transfer_reason} onChange={e => set('transfer_reason', e.target.value)} /></div>
        <div className="col-span-2"><label className="form-label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center">Create Handover</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
};

const priorityColor = { low: 'text-emerald-700', medium: 'text-[#B45309]', high: 'text-orange-700', critical: 'text-red-600' };

const Handovers = () => {
  const [metrics, setMetrics] = useState(null);
  const [handovers, setHandovers] = useState([]);
  const [staffAvail, setStaffAvail] = useState({ available: 0, unavailable: 0, doctors: [] });
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [modal, setModal] = useState(null);

  const fetchData = async () => {
    try {
      const [m, h, sa, d, p] = await Promise.all([
        api.get('/handovers/metrics'),
        api.get('/handovers', { params: { status: statusFilter, priority: priorityFilter } }),
        api.get('/handovers/staff-availability'),
        api.get('/doctors'),
        api.get('/patients'),
      ]);
      setMetrics(m.data); setHandovers(h.data); setStaffAvail(sa.data); setDoctors(d.data); setPatients(p.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [statusFilter, priorityFilter]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/handovers/${id}`, { status });
      toast.success('Status updated');
      fetchData();
    } catch { toast.error('Error updating status'); }
  };

  if (loading) return <Layout title="Handovers"><Spinner /></Layout>;

  const loadChartData = staffAvail.doctors.slice(0, 6).map(d => ({
    name: d.full_name.split(' ').pop(),
    load: d.load_percentage || 0,
    patients: d.patient_count
  }));

  return (
    <Layout title="Handovers">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Total Patients" value={metrics?.total_patients || 0} icon={Users} color="primary" />
          <MetricCard title="Today's Patients" value={metrics?.today_patients || 0} icon={Users} color="success" />
          <MetricCard title="Pending Transfers" value={metrics?.pending_transfers || 0} icon={ArrowLeftRight} color="warning" />
          <MetricCard title="Avg Feedback Score" value={`${metrics?.avg_feedback_score || '0.0'}/5`} icon={Star} color="info" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#E5E7EB]">
              <h3 className="font-semibold text-[#111827]">Patient Transfer Queue</h3>
              <div className="flex items-center gap-2">
                <select className="select text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option><option value="pending">Pending</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                </select>
                <select className="select text-sm" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                  <option value="">All Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
                <button onClick={() => setModal('new')} className="btn-primary text-sm"><Plus size={14} /> New Handover</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#E5E7EB]">
                  <tr>{['Patient', 'Case Type', 'Stage', 'Transfer Reason', 'Priority', 'Requested On', 'Status', 'Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {handovers.length === 0 ? (
                    <tr><td colSpan={8}><EmptyState message="No handovers found" /></td></tr>
                  ) : handovers.map(h => (
                    <tr key={h.id} className="table-row">
                      <td className="table-cell">
                        <p className="font-medium text-[#111827]">{h.patient_name}</p>
                        <p className="text-xs text-[#9CA3AF]">{h.from_doctor_name} → {h.to_doctor_name}</p>
                      </td>
                      <td className="table-cell text-[#374151]">{h.case_type || '-'}</td>
                      <td className="table-cell text-[#374151]">{h.stage || '-'}</td>
                      <td className="table-cell max-w-[150px] truncate text-xs text-[#6B7280]">{h.transfer_reason || '-'}</td>
                      <td className="table-cell"><span className={`text-xs font-semibold uppercase ${priorityColor[h.priority]}`}>{h.priority}</span></td>
                      <td className="table-cell text-xs text-[#6B7280]">{format(new Date(h.requested_on), 'MMM d, yyyy')}</td>
                      <td className="table-cell"><StatusBadge status={h.status} /></td>
                      <td className="table-cell">
                        {h.status === 'pending' && (
                          <div className="flex gap-1">
                            <button onClick={() => updateStatus(h.id, 'active')} className="text-xs text-blue-600 hover:underline font-medium">Activate</button>
                            <button onClick={() => updateStatus(h.id, 'completed')} className="text-xs text-emerald-600 hover:underline font-medium">Complete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="font-semibold text-[#111827] mb-3">Staff Availability</h3>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-emerald-600">{staffAvail.available}</p>
                  <p className="text-xs text-[#6B7280]">Available</p>
                </div>
                <div className="flex-1 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-500">{staffAvail.unavailable}</p>
                  <p className="text-xs text-[#6B7280]">Unavailable</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={loadChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="load" fill="#1F4D3E" radius={[4, 4, 0, 0]} name="Load %" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {staffAvail.doctors.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[#111827] font-medium">{doc.full_name}</p>
                      <p className="text-[#9CA3AF]">{doc.specialisation}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#374151]">{doc.patient_count} pts</p>
                      <div className="w-16 bg-[#E5E7EB] rounded-full h-1 mt-1">
                        <div className="bg-[#1F4D3E] h-1 rounded-full" style={{ width: `${Math.min(doc.load_percentage || 0, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-[#111827] mb-3">Recent Activity</h3>
              <div className="space-y-3">
                {handovers.slice(0, 4).map(h => (
                  <div key={h.id} className="flex items-start gap-2 text-xs">
                    <div className="w-1.5 h-1.5 bg-[#1F4D3E] rounded-full mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[#111827] font-medium">{h.patient_name}</p>
                      <p className="text-[#9CA3AF]">{h.from_doctor_name} → {h.to_doctor_name}</p>
                      <p className="text-[#9CA3AF]">{format(new Date(h.requested_on), 'MMM d')}</p>
                    </div>
                  </div>
                ))}
                {handovers.length === 0 && <p className="text-[#9CA3AF] text-xs text-center py-4">No recent activity</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={modal === 'new'} onClose={() => setModal(null)} title="New Handover" size="lg">
        <HandoverForm doctors={doctors} patients={patients} onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>
    </Layout>
  );
};

export default Handovers;
