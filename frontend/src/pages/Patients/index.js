import React, { useEffect, useState } from 'react';
import { Users, UserCheck, X, Plus, Search, Eye, CheckCircle, Clock } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import MetricCard from '../../components/ui/MetricCard';
import Modal from '../../components/ui/Modal';
import { StatusBadge, Spinner, EmptyState } from '../../components/ui';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const PatientForm = ({ initial, doctors, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { full_name: '', age: '', gender: 'Male', condition: '', assigned_doctor_id: '', phone: '', email: '', address: '', status: 'active' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      if (initial?.id) await api.put(`/patients/${initial.id}`, form);
      else await api.post('/patients', form);
      toast.success(`Patient ${initial?.id ? 'updated' : 'added'}`);
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving patient'); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-xs text-gray-400 mb-1 block">Full Name</label><input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} required /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Age</label><input className="input" type="number" value={form.age} onChange={e => set('age', e.target.value)} /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Gender</label>
          <select className="select w-full" value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
        <div><label className="text-xs text-gray-400 mb-1 block">Status</label>
          <select className="select w-full" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option><option value="in-house">In-House</option><option value="discharged">Discharged</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="col-span-2"><label className="text-xs text-gray-400 mb-1 block">Condition</label><input className="input" value={form.condition} onChange={e => set('condition', e.target.value)} /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Assigned Doctor</label>
          <select className="select w-full" value={form.assigned_doctor_id} onChange={e => set('assigned_doctor_id', e.target.value)}>
            <option value="">Select Doctor</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
        <div><label className="text-xs text-gray-400 mb-1 block">Phone</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Email</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div className="col-span-2"><label className="text-xs text-gray-400 mb-1 block">Address</label><textarea className="input" rows={2} value={form.address} onChange={e => set('address', e.target.value)} /></div>
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center">Save Patient</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
};

const ProtocolTimeline = ({ patientId, patientName }) => {
  const [protocol, setProtocol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/patients/${patientId}/protocol`).then(r => { setProtocol(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [patientId]);

  const statusIcon = { done: '✓', 'in-progress': '◉', pending: '○' };
  const statusColor = { done: 'text-emerald-400 border-emerald-500', 'in-progress': 'text-blue-400 border-blue-500', pending: 'text-gray-500 border-gray-600' };

  if (loading) return <Spinner />;
  if (!protocol) return (
    <div className="text-center py-8">
      <p className="text-gray-400 mb-4">No protocol assigned yet</p>
    </div>
  );

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-white">{protocol.title}</h3>
        <p className="text-sm text-gray-400">{protocol.description}</p>
      </div>
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-dark-600" />
        <div className="space-y-4">
          {protocol.steps?.map((step, i) => (
            <div key={step.id} className="flex gap-4 relative">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 bg-dark-800 z-10 ${statusColor[step.status]}`}>
                {statusIcon[step.status]}
              </div>
              <div className={`flex-1 p-3 rounded-lg border ${step.status === 'in-progress' ? 'border-blue-500/30 bg-blue-500/5' : 'border-dark-600 bg-dark-700/30'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white text-sm">Step {step.step_number}: {step.phase}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                  </div>
                  <StatusBadge status={step.status} />
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {step.doctor_name && <span>Dr. {step.doctor_name}</span>}
                  {step.scheduled_date && <span>{new Date(step.scheduled_date).toLocaleDateString()}</span>}
                  {step.notes && <span className="text-gray-400 italic">{step.notes}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Patients = () => {
  const [metrics, setMetrics] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [allProtocols, setAllProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('patients');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [editPatient, setEditPatient] = useState(null);
  const [viewPatient, setViewPatient] = useState(null);

  const fetchData = async () => {
    try {
      const [m, p, d, ap] = await Promise.all([
        api.get('/patients/metrics'),
        api.get('/patients', { params: { search, status: statusFilter } }),
        api.get('/doctors'),
        api.get('/patients/protocols/all'),
      ]);
      setMetrics(m.data); setPatients(p.data); setDoctors(d.data); setAllProtocols(ap.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this patient?')) return;
    try { await api.delete(`/patients/${id}`); toast.success('Patient deleted'); fetchData(); }
    catch { toast.error('Error deleting patient'); }
  };

  if (loading) return <Layout title="Patients"><Spinner /></Layout>;

  return (
    <Layout title="Patients">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Patients Visited" value={metrics?.patients_visited || 0} icon={UserCheck} color="success" />
          <MetricCard title="In-House Patients" value={metrics?.in_house_patients || 0} icon={Users} color="primary" />
          <MetricCard title="Cancelled" value={metrics?.cancelled || 0} icon={X} color="danger" />
          <MetricCard title="Discharged" value={metrics?.discharged || 0} icon={CheckCircle} color="info" />
        </div>

        <div className="flex gap-2 border-b border-dark-700">
          {['patients', 'protocols'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary-500 text-primary-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
              {t === 'patients' ? 'Patient List' : 'Protocol View'}
            </button>
          ))}
        </div>

        {tab === 'patients' && (
          <div className="card">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <div className="flex items-center gap-3">
                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input pl-9 w-64" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option><option value="active">Active</option><option value="in-house">In-House</option><option value="discharged">Discharged</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
              <button onClick={() => { setEditPatient(null); setModal('add'); }} className="btn-primary"><Plus size={16} /> Add Patient</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-dark-700">
                  <tr>{['Name', 'Age/Gender', 'Condition', 'Assigned Doctor', 'Last Visit', 'Status', 'Action'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState message="No patients found" /></td></tr>
                  ) : patients.map(p => (
                    <tr key={p.id} className="table-row">
                      <td className="table-cell"><p className="font-medium text-white">{p.full_name}</p><p className="text-xs text-gray-500">{p.phone}</p></td>
                      <td className="table-cell">{p.age} / {p.gender}</td>
                      <td className="table-cell max-w-[200px] truncate">{p.condition}</td>
                      <td className="table-cell">{p.doctor_name || '-'}</td>
                      <td className="table-cell text-xs">{p.last_visit ? new Date(p.last_visit).toLocaleDateString() : '-'}</td>
                      <td className="table-cell"><StatusBadge status={p.status} /></td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setViewPatient(p); setModal('view'); }} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"><Eye size={12} /> View</button>
                          <button onClick={() => { setEditPatient(p); setModal('edit'); }} className="text-xs text-gray-400 hover:text-white">Edit</button>
                          <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'protocols' && (
          <div className="card">
            <div className="p-4 border-b border-dark-700"><h3 className="font-semibold text-white">All Patient Protocols — Handover View</h3></div>
            <div className="divide-y divide-dark-700">
              {allProtocols.length === 0 ? <EmptyState message="No protocols found" /> : allProtocols.map(proto => (
                <div key={proto.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-white">{proto.patient_name}</p>
                      <p className="text-xs text-gray-400">{proto.condition} · {proto.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{proto.completed_steps}/{proto.total_steps} steps</p>
                      <div className="w-32 bg-dark-700 rounded-full h-1.5 mt-1">
                        <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${proto.total_steps > 0 ? (proto.completed_steps / proto.total_steps) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Patient' : 'Add Patient'} size="lg">
        <PatientForm initial={editPatient} doctors={doctors} onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`Protocol: ${viewPatient?.full_name}`} size="lg">
        {viewPatient && <ProtocolTimeline patientId={viewPatient.id} patientName={viewPatient.full_name} />}
      </Modal>
    </Layout>
  );
};

export default Patients;
