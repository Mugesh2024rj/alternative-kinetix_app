import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Home, CalendarDays, Clock, Star, Plus, Search, Check, X, Eye, Users } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import MetricCard from '../../components/ui/MetricCard';
import Modal from '../../components/ui/Modal';
import { StatusBadge, Spinner, EmptyState, StarRating } from '../../components/ui';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const DoctorForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { full_name: '', specialisation: '', phone: '', email: '', status: 'active' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      if (initial?.id) await api.put(`/doctors/${initial.id}`, form);
      else await api.post('/doctors', form);
      toast.success(`Doctor ${initial?.id ? 'updated' : 'added'} successfully`);
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving doctor'); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Full Name</label><input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} required /></div>
        <div><label className="form-label">Specialisation</label><input className="input" value={form.specialisation} onChange={e => set('specialisation', e.target.value)} /></div>
        <div><label className="form-label">Phone</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label className="form-label">Email</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div><label className="form-label">Status</label>
          <select className="select w-full" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option><option value="leave">Leave</option><option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 justify-center">Save Doctor</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
};

const HouseVisitForm = ({ onSave, onClose, doctors, patients }) => {
  const [form, setForm] = useState({ doctor_id: '', patient_id: '', visit_date: '', next_visit_date: '', distance: '', vitals: { bp: '', pulse: '', temp: '', spo2: '' }, notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setVital = (k, v) => setForm(f => ({ ...f, vitals: { ...f.vitals, [k]: v } }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/doctors/house-visits/submit', form);
      toast.success('House visit submitted for approval');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error submitting'); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Doctor</label>
          <select className="select w-full" value={form.doctor_id} onChange={e => set('doctor_id', e.target.value)} required>
            <option value="">Select Doctor</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
        <div><label className="form-label">Patient</label>
          <select className="select w-full" value={form.patient_id} onChange={e => set('patient_id', e.target.value)} required>
            <option value="">Select Patient</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div><label className="form-label">Visit Date</label><input className="input" type="datetime-local" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} required /></div>
        <div><label className="form-label">Next Visit</label><input className="input" type="datetime-local" value={form.next_visit_date} onChange={e => set('next_visit_date', e.target.value)} /></div>
        <div><label className="form-label">Distance (km)</label><input className="input" type="number" step="0.1" value={form.distance} onChange={e => set('distance', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {['bp', 'pulse', 'temp', 'spo2'].map(v => (
          <div key={v}><label className="form-label uppercase">{v}</label><input className="input" value={form.vitals[v]} onChange={e => setVital(v, e.target.value)} placeholder={v === 'bp' ? '120/80' : v === 'pulse' ? '72' : v === 'temp' ? '98.6' : '98%'} /></div>
        ))}
      </div>
      <div><label className="form-label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center">Submit Visit</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
};

const Doctors = () => {
  const [metrics, setMetrics] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [hvMetrics, setHvMetrics] = useState(null);
  const [houseVisits, setHouseVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('doctors');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [editDoctor, setEditDoctor] = useState(null);

  const fetchData = async () => {
    try {
      const [m, d, hvm, hv, p] = await Promise.all([
        api.get('/doctors/metrics'),
        api.get('/doctors', { params: { search, status: statusFilter } }),
        api.get('/doctors/house-visits/metrics'),
        api.get('/doctors/house-visits/list'),
        api.get('/patients'),
      ]);
      setMetrics(m.data); setDoctors(d.data); setHvMetrics(hvm.data); setHouseVisits(hv.data); setPatients(p.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  const handleApprove = async (id, action) => {
    try {
      await api.put(`/doctors/house-visits/${id}/approve`, { action });
      toast.success(`Visit ${action}d`);
      fetchData();
    } catch { toast.error('Error processing approval'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this doctor?')) return;
    try { await api.delete(`/doctors/${id}`); toast.success('Doctor deleted'); fetchData(); }
    catch { toast.error('Error deleting doctor'); }
  };

  if (loading) return <Layout title="Doctors"><Spinner /></Layout>;

  return (
    <Layout title="Doctors">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard title="Present Doctors" value={metrics?.present_doctors || 0} icon={UserCheck} color="success" />
          <MetricCard title="House Visits Today" value={metrics?.house_visits_today || 0} icon={Home} color="primary" />
          <MetricCard title="Outside Events" value={metrics?.outside_events || 0} icon={CalendarDays} color="info" />
          <MetricCard title="Pending Approvals" value={metrics?.pending_approvals || 0} icon={Clock} color="warning" />
          <MetricCard title="Patient Satisfaction" value={`${metrics?.patient_satisfaction || '0.00'}/5`} icon={Star} color="purple" />
        </div>

        <div className="flex gap-2 border-b border-[#E5E7EB]">
          {['doctors', 'house-visits'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#1F4D3E] text-[#1F4D3E]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}>
              {t === 'doctors' ? 'Doctor List' : 'House Visit Metrics'}
            </button>
          ))}
        </div>

        {tab === 'doctors' && (
          <div className="card">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" /><input className="input pl-9 w-64" placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option><option value="active">Active</option><option value="leave">Leave</option><option value="inactive">Inactive</option>
                </select>
              </div>
              <button onClick={() => { setEditDoctor(null); setModal('add'); }} className="btn-primary"><Plus size={16} /> Add Doctor</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#E5E7EB]">
                  <tr>
                    {['Name', 'Specialisation', 'No. of Patients', 'House Visits', 'Scheduled Timeline', 'Status', 'Actions'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {doctors.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState message="No doctors found" /></td></tr>
                  ) : doctors.map(doc => (
                    <tr key={doc.id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-[#111827]">{doc.full_name}</p>
                          <p className="text-xs text-[#9CA3AF]">{doc.email}</p>
                        </div>
                      </td>
                      <td className="table-cell text-[#374151]">{doc.specialisation}</td>
                      <td className="table-cell text-[#374151]">{doc.patient_count}</td>
                      <td className="table-cell text-[#374151]">{doc.house_visit_count}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <div className="w-24 bg-[#E5E7EB] rounded-full h-1.5">
                            <div className="bg-[#1F4D3E] h-1.5 rounded-full" style={{ width: `${Math.min((doc.today_appointments || 0) * 20, 100)}%` }} />
                          </div>
                          <span className="text-xs text-[#6B7280]">{doc.today_appointments || 0} today</span>
                        </div>
                      </td>
                      <td className="table-cell"><StatusBadge status={doc.status} /></td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditDoctor(doc); setModal('edit'); }} className="text-xs text-[#1F4D3E] hover:underline font-medium">Edit</button>
                          <button onClick={() => handleDelete(doc.id)} className="text-xs text-red-600 hover:underline font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'house-visits' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <MetricCard title="Active HV Patients" value={hvMetrics?.active_hv_patients || 0} icon={Users} color="primary" />
              <MetricCard title="Active HV Doctors" value={hvMetrics?.active_hv_doctors || 0} icon={UserCheck} color="success" />
              <MetricCard title="Pending Entries" value={hvMetrics?.pending_entries || 0} icon={Clock} color="warning" />
            </div>
            <div className="flex justify-end">
              <button onClick={() => setModal('hv')} className="btn-primary"><Plus size={16} /> Submit House Visit</button>
            </div>
            <div className="card">
              <div className="p-4 border-b border-[#E5E7EB]"><h3 className="font-semibold text-[#111827]">House Visit Records</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[#E5E7EB]">
                    <tr>{['Doctor', 'Patient', 'Last Entry', 'Next Visit', 'Distance', 'Status', 'Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {houseVisits.length === 0 ? (
                      <tr><td colSpan={7}><EmptyState message="No house visits found" /></td></tr>
                    ) : houseVisits.map(hv => (
                      <tr key={hv.id} className="table-row">
                        <td className="table-cell font-medium text-[#111827]">{hv.doctor_name}</td>
                        <td className="table-cell text-[#374151]">{hv.patient_name}</td>
                        <td className="table-cell text-xs text-[#6B7280]">{hv.visit_date ? new Date(hv.visit_date).toLocaleDateString() : '-'}</td>
                        <td className="table-cell text-xs text-[#6B7280]">{hv.next_visit_date ? new Date(hv.next_visit_date).toLocaleDateString() : '-'}</td>
                        <td className="table-cell text-[#374151]">{hv.distance ? `${hv.distance} km` : '-'}</td>
                        <td className="table-cell"><StatusBadge status={hv.status} /></td>
                        <td className="table-cell">
                          {hv.status === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleApprove(hv.id, 'approve')} className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium"><Check size={12} /> Approve</button>
                              <button onClick={() => handleApprove(hv.id, 'reject')} className="text-xs text-red-500 hover:underline flex items-center gap-1 font-medium"><X size={12} /> Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Doctor' : 'Add Doctor'}>
        <DoctorForm initial={editDoctor} onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === 'hv'} onClose={() => setModal(null)} title="Submit House Visit" size="lg">
        <HouseVisitForm doctors={doctors} patients={patients} onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>
    </Layout>
  );
};

export default Doctors;
