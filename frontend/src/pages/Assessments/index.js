import React, { useEffect, useState } from 'react';
import { ClipboardList, Clock, CheckCircle, BarChart2, Plus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import MetricCard from '../../components/ui/MetricCard';
import Modal from '../../components/ui/Modal';
import { StatusBadge, Spinner, EmptyState } from '../../components/ui';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const AssessmentForm = ({ doctors, patients, onSave, onClose }) => {
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', title: '', type: '', max_score: 100, scheduled_date: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/assessments', form);
      toast.success('Assessment created');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error creating assessment'); }
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
        <div><label className="form-label">Doctor</label>
          <select className="select w-full" value={form.doctor_id} onChange={e => set('doctor_id', e.target.value)}>
            <option value="">Select Doctor</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
        <div><label className="form-label">Title</label><input className="input" value={form.title} onChange={e => set('title', e.target.value)} required /></div>
        <div><label className="form-label">Type</label><input className="input" value={form.type} onChange={e => set('type', e.target.value)} placeholder="e.g. Functional, Cognitive" /></div>
        <div><label className="form-label">Max Score</label><input className="input" type="number" value={form.max_score} onChange={e => set('max_score', e.target.value)} /></div>
        <div><label className="form-label">Scheduled Date</label><input className="input" type="datetime-local" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} /></div>
        <div className="col-span-2"><label className="form-label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center">Create Assessment</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
};

const UpdateAssessmentModal = ({ assessment, onSave, onClose }) => {
  const [form, setForm] = useState({ status: assessment.status, score: assessment.score || '', notes: assessment.notes || '', improvement_notes: assessment.improvement_notes || '', completed_date: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/assessments/${assessment.id}`, form);
      toast.success('Assessment updated');
      onSave();
    } catch { toast.error('Error updating assessment'); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm">
        <p className="text-[#111827] font-medium">{assessment.title}</p>
        <p className="text-[#6B7280]">{assessment.patient_name} · {assessment.doctor_name}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Status</label>
          <select className="select w-full" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
          </select>
        </div>
        <div><label className="form-label">Score (/{assessment.max_score})</label><input className="input" type="number" value={form.score} onChange={e => set('score', e.target.value)} /></div>
        <div><label className="form-label">Completed Date</label><input className="input" type="datetime-local" value={form.completed_date} onChange={e => set('completed_date', e.target.value)} /></div>
      </div>
      <div><label className="form-label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div><label className="form-label">Protocol Improvement Notes</label><textarea className="input" rows={2} value={form.improvement_notes} onChange={e => set('improvement_notes', e.target.value)} /></div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center">Update</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
};

const Assessments = () => {
  const [metrics, setMetrics] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchData = async () => {
    try {
      const [m, a, d, p] = await Promise.all([
        api.get('/assessments/metrics'),
        api.get('/assessments', { params: { status: statusFilter } }),
        api.get('/doctors'),
        api.get('/patients'),
      ]);
      setMetrics(m.data); setAssessments(a.data); setDoctors(d.data); setPatients(p.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  if (loading) return <Layout title="Assessments"><Spinner /></Layout>;

  const upcoming = assessments.filter(a => a.status !== 'completed').slice(0, 5);

  return (
    <Layout title="Assessments">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Total Assessments" value={metrics?.total_assessments || 0} icon={ClipboardList} color="primary" />
          <MetricCard title="Pending" value={metrics?.pending || 0} icon={Clock} color="warning" />
          <MetricCard title="Completed" value={metrics?.completed || 0} icon={CheckCircle} color="success" />
          <MetricCard title="Avg Score" value={`${metrics?.avg_score || '0.0'}%`} icon={BarChart2} color="info" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-4">
            <h3 className="font-semibold text-[#111827] mb-3">Upcoming Assessments</h3>
            <div className="space-y-3">
              {upcoming.length === 0 ? <EmptyState message="No upcoming assessments" /> : upcoming.map(a => (
                <div key={a.id} className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{a.title}</p>
                      <p className="text-xs text-[#6B7280]">{a.patient_name}</p>
                      {a.scheduled_date && <p className="text-xs text-[#9CA3AF] mt-1">{format(new Date(a.scheduled_date), 'MMM d, h:mm a')}</p>}
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
              <h3 className="font-semibold text-[#111827]">All Assessments</h3>
              <div className="flex items-center gap-2">
                <select className="select text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
                </select>
                <button onClick={() => setModal('add')} className="btn-primary text-sm"><Plus size={14} /> Add</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#E5E7EB]">
                  <tr>{['Title', 'Patient', 'Doctor', 'Type', 'Score', 'Scheduled', 'Status', 'Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {assessments.length === 0 ? (
                    <tr><td colSpan={8}><EmptyState message="No assessments found" /></td></tr>
                  ) : assessments.map(a => (
                    <tr key={a.id} className="table-row">
                      <td className="table-cell font-medium text-[#111827]">{a.title}</td>
                      <td className="table-cell text-[#374151]">{a.patient_name}</td>
                      <td className="table-cell text-[#374151]">{a.doctor_name || '-'}</td>
                      <td className="table-cell text-[#374151]">{a.type || '-'}</td>
                      <td className="table-cell text-[#374151]">{a.score ? `${a.score}/${a.max_score}` : '-'}</td>
                      <td className="table-cell text-xs text-[#6B7280]">{a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM d') : '-'}</td>
                      <td className="table-cell"><StatusBadge status={a.status} /></td>
                      <td className="table-cell">
                        <button onClick={() => { setSelected(a); setModal('update'); }} className="text-xs text-[#1F4D3E] hover:underline font-medium">Update</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="New Assessment" size="lg">
        <AssessmentForm doctors={doctors} patients={patients} onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === 'update'} onClose={() => setModal(null)} title="Update Assessment" size="lg">
        {selected && <UpdateAssessmentModal assessment={selected} onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />}
      </Modal>
    </Layout>
  );
};

export default Assessments;
