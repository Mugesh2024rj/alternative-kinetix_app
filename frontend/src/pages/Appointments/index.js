import React, { useEffect, useState } from 'react';
import { Calendar, Plus, Search, Eye, FileText, Settings2, Info, X } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/ui/Modal';
import { StatusBadge, Spinner, EmptyState } from '../../components/ui';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const AppointmentForm = ({ initial, doctors, patients, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { patient_id: '', doctor_id: '', appointment_time: '', duration: 30, type: 'Physio' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      if (initial?.id) await api.put(`/appointments/${initial.id}`, form);
      else await api.post('/appointments', form);
      toast.success(`Appointment ${initial?.id ? 'updated' : 'created'}`);
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving appointment'); }
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
          <select className="select w-full" value={form.doctor_id} onChange={e => set('doctor_id', e.target.value)} required>
            <option value="">Select Doctor</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
        <div><label className="form-label">Date & Time</label><input className="input" type="datetime-local" value={form.appointment_time} onChange={e => set('appointment_time', e.target.value)} required /></div>
        <div><label className="form-label">Duration (min)</label><input className="input" type="number" value={form.duration} onChange={e => set('duration', e.target.value)} /></div>
        <div><label className="form-label">Type</label>
          <select className="select w-full" value={form.type} onChange={e => set('type', e.target.value)}>
            <option>Physio</option><option>Rehab</option><option>Neuro</option><option>Pain</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center">Save Appointment</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
};

const ManageModal = ({ appointment, doctors, onSave, onClose }) => {
  const [substituteId, setSubstituteId] = useState('');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const submit = async () => {
    try {
      await api.put(`/appointments/${appointment.id}`, { ...appointment, substitute_doctor_id: substituteId, notes });
      toast.success('Appointment updated');
      onSave();
    } catch { toast.error('Error updating'); }
  };
  return (
    <div className="space-y-4">
      <div><label className="form-label">Substitute Doctor</label>
        <select className="select w-full" value={substituteId} onChange={e => setSubstituteId(e.target.value)}>
          <option value="">Select Substitute</option>
          {doctors.filter(d => d.id !== appointment?.doctor_id).map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.specialisation}</option>)}
        </select>
      </div>
      <div><label className="form-label">Notes</label><textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <div className="flex gap-3">
        <button onClick={submit} className="btn-primary flex-1 justify-center">Update</button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </div>
  );
};

const NotesModal = ({ appointment, onSave, onClose }) => {
  const [notes, setNotes] = useState(appointment?.notes || '');
  const submit = async () => {
    try {
      await api.put(`/appointments/${appointment.id}`, { ...appointment, notes });
      toast.success('Notes saved');
      onSave();
    } catch { toast.error('Error saving notes'); }
  };
  return (
    <div className="space-y-4">
      <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] text-sm text-[#374151]">
        <p><span className="text-[#6B7280]">Patient:</span> {appointment?.patient_name}</p>
        <p><span className="text-[#6B7280]">Doctor:</span> {appointment?.doctor_name}</p>
        <p><span className="text-[#6B7280]">Type:</span> {appointment?.type}</p>
      </div>
      <div><label className="form-label">Doctor Protocol Notes</label><textarea className="input" rows={5} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter protocol notes..." /></div>
      <div className="flex gap-3">
        <button onClick={submit} className="btn-primary flex-1 justify-center">Save Notes</button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </div>
  );
};

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState('day');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(new Date());

  const fetchData = async () => {
    try {
      const [a, d, p] = await Promise.all([
        api.get('/appointments', { params: { search, status: statusFilter, type: typeFilter, view: viewMode !== 'day' ? viewMode : undefined } }),
        api.get('/doctors'),
        api.get('/patients'),
      ]);
      setAppointments(a.data); setDoctors(d.data); setPatients(p.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search, statusFilter, typeFilter, viewMode]);

  // Real-time clock — ticks every 60s to re-evaluate which appointments are past
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // An appointment is considered "past" if its end time has passed
  // and its status is still scheduled or in-progress (not yet marked done by backend)
  const isPastAppt = (appt) => {
    const end = new Date(new Date(appt.appointment_time).getTime() + (appt.duration || 30) * 60000);
    return now > end;
  };

  // Active: scheduled/in-progress that haven't ended yet
  const activeAppts = appointments.filter(a =>
    (a.status === 'scheduled' || a.status === 'in-progress') && !isPastAppt(a)
  );

  // History: done, cancelled, OR time has passed (real-time completed)
  const historyAppts = appointments.filter(a =>
    a.status === 'done' || a.status === 'cancelled' ||
    ((a.status === 'scheduled' || a.status === 'in-progress') && isPastAppt(a))
  );

  const getActionButton = (appt) => {
    if (appt.status === 'done') return <button onClick={() => { setSelected(appt); setModal('notes'); }} className="text-xs text-emerald-600 hover:underline font-medium flex items-center gap-1"><FileText size={12} /> Notes</button>;
    if (appt.status === 'in-progress') return <button onClick={() => { setSelected(appt); setModal('manage'); }} className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"><Settings2 size={12} /> Manage</button>;
    if (appt.status === 'scheduled') return <button onClick={() => { setSelected(appt); setModal('details'); }} className="text-xs text-[#1F4D3E] hover:underline font-medium flex items-center gap-1"><Eye size={12} /> Details</button>;
    if (appt.status === 'cancelled') return <button onClick={() => { setSelected(appt); setModal('cancel-details'); }} className="text-xs text-red-600 hover:underline font-medium flex items-center gap-1"><Info size={12} /> Details</button>;
    return null;
  };

  // Status label for history rows — show "completed" for time-passed ones
  const historyStatus = (appt) => {
    if (appt.status === 'done') return { label: 'done', cls: 'bg-[#D1FAE5] text-[#065F46]' };
    if (appt.status === 'cancelled') return { label: 'cancelled', cls: 'bg-[#FEE2E2] text-[#991B1B]' };
    return { label: 'completed', cls: 'bg-[#D1FAE5] text-[#065F46]' };
  };

  if (loading) return <Layout title="Appointments"><Spinner /></Layout>;

  return (
    <Layout title="Appointments">
      <div className="space-y-8">

        {/* ── Active Appointments table ── */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" /><input className="input pl-9 w-56" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
              <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status</option><option value="scheduled">Scheduled</option><option value="in-progress">In Progress</option><option value="done">Done</option><option value="cancelled">Cancelled</option>
              </select>
              <select className="select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All Types</option><option>Physio</option><option>Rehab</option><option>Neuro</option><option>Pain</option>
              </select>
              <div className="flex bg-[#F3F4F6] rounded-lg p-1 gap-1">
                {['day', 'week', 'month'].map(v => (
                  <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${viewMode === v ? 'bg-[#1F4D3E] text-white' : 'text-[#6B7280] hover:text-[#111827]'}`}>{v}</button>
                ))}
              </div>
            </div>
            <button onClick={() => { setSelected(null); setModal('add'); }} className="btn-primary"><Plus size={16} /> Add Appointment</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#E5E7EB]">
                <tr>{['Time', 'Patient Name', 'Type', 'Doctor Name', 'Duration', 'Status', 'Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody>
                {activeAppts.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState message="No active appointments" /></td></tr>
                ) : activeAppts.map(appt => (
                  <tr key={appt.id} className="table-row">
                    <td className="table-cell text-xs text-[#6B7280]">{format(new Date(appt.appointment_time), 'MMM d, h:mm a')}</td>
                    <td className="table-cell"><p className="font-medium text-[#111827]">{appt.patient_name}</p><p className="text-xs text-[#9CA3AF]">{appt.age} / {appt.gender}</p></td>
                    <td className="table-cell"><span className="text-xs bg-[#E8F0EF] text-[#1F4D3E] px-2 py-0.5 rounded-full font-medium">{appt.type}</span></td>
                    <td className="table-cell text-[#374151]">{appt.doctor_name}</td>
                    <td className="table-cell text-[#374151]">{appt.duration} min</td>
                    <td className="table-cell"><StatusBadge status={appt.status} /></td>
                    <td className="table-cell">{getActionButton(appt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Appointment History Panel ── */}
        {historyAppts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <div className="flex items-center gap-2 px-3 py-1 bg-[#F3F4F6] border border-[#E5E7EB] rounded-full">
                <Calendar size={13} className="text-[#6B7280]" />
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Appointment History</span>
                <span className="text-xs font-bold text-white bg-[#6B7280] px-1.5 py-0.5 rounded-full">{historyAppts.length}</span>
              </div>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>{['Time', 'Patient', 'Type', 'Doctor', 'Duration', 'Status'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {historyAppts.map(appt => {
                      const { label, cls } = historyStatus(appt);
                      return (
                        <tr key={appt.id} className="table-row" onClick={() => { setSelected(appt); setModal(appt.status === 'cancelled' ? 'cancel-details' : 'details'); }}>
                          <td className="table-cell text-xs text-[#6B7280]">{format(new Date(appt.appointment_time), 'MMM d, h:mm a')}</td>
                          <td className="table-cell">
                            <p className="font-medium text-[#111827]">{appt.patient_name}</p>
                            <p className="text-xs text-[#9CA3AF]">{appt.age} / {appt.gender}</p>
                          </td>
                          <td className="table-cell"><span className="text-xs bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded-full font-medium">{appt.type}</span></td>
                          <td className="table-cell text-[#374151]">{appt.doctor_name}</td>
                          <td className="table-cell text-[#374151]">{appt.duration} min</td>
                          <td className="table-cell"><span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cls}`}>{label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Add Appointment" size="lg">
        <AppointmentForm doctors={doctors} patients={patients} onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === 'notes'} onClose={() => setModal(null)} title="Doctor Protocol Notes">
        {selected && <NotesModal appointment={selected} onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />}
      </Modal>
      <Modal open={modal === 'manage'} onClose={() => setModal(null)} title="Manage Appointment">
        {selected && <ManageModal appointment={selected} doctors={doctors} onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />}
      </Modal>
      <Modal open={modal === 'details'} onClose={() => setModal(null)} title="Appointment Details">
        {selected && (
          <div className="space-y-3 text-sm">
            {[['Patient', selected.patient_name], ['Age/Gender', `${selected.age} / ${selected.gender}`], ['Condition', selected.condition], ['Doctor', selected.doctor_name], ['Specialisation', selected.specialisation], ['Type', selected.type], ['Time', format(new Date(selected.appointment_time), 'MMMM d, yyyy h:mm a')], ['Duration', `${selected.duration} minutes`], ['Status', selected.status]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280]">{k}</span><span className="text-[#111827] font-medium">{v || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
      <Modal open={modal === 'cancel-details'} onClose={() => setModal(null)} title="Cancellation Details">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">Appointment Cancelled</p>
              <p className="text-[#374151] mt-1">{selected.cancellation_reason || 'No reason provided'}</p>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5E7EB]"><span className="text-[#6B7280]">Patient</span><span className="text-[#111827] font-medium">{selected.patient_name}</span></div>
            <div className="flex justify-between py-2 border-b border-[#E5E7EB]"><span className="text-[#6B7280]">Doctor</span><span className="text-[#111827] font-medium">{selected.doctor_name}</span></div>
            <div className="flex justify-between py-2"><span className="text-[#6B7280]">Original Time</span><span className="text-[#111827] font-medium">{format(new Date(selected.appointment_time), 'MMM d, h:mm a')}</span></div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default Appointments;
