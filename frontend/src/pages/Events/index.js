import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, Users, MapPin, Eye, XCircle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/ui/Modal';
import { StatusBadge, Spinner, EmptyState } from '../../components/ui';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ─────────────────────────────────────────────
// EventForm — Create Event with doctor selector
// ─────────────────────────────────────────────
const EventForm = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ title: '', description: '', event_date: '', end_date: '', location: '', type: '', max_participants: '' });
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [maxError, setMaxError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get('/doctors').then(r => setDoctors(r.data)).catch(() => {});
  }, []);

  const maxCount = parseInt(form.max_participants) || 0;

  const handleMaxChange = (v) => {
    const num = parseInt(v) || 0;
    if (num > doctors.length) {
      setMaxError(`Only ${doctors.length} doctor${doctors.length !== 1 ? 's' : ''} available`);
    } else {
      setMaxError('');
    }
    set('max_participants', v);
    setSelectedDoctors(prev => prev.slice(0, num));
  };

  const toggleDoctor = (id) => {
    setSelectedDoctors(prev => {
      if (prev.includes(id)) return prev.filter(d => d !== id);
      if (prev.length >= maxCount) return prev;
      return [...prev, id];
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (maxCount > doctors.length) {
      toast.error(`Max participants cannot exceed ${doctors.length} available doctors`);
      return;
    }
    try {
      const res = await api.post('/events', form);
      const eventId = res.data.id;
      for (const doctorId of selectedDoctors) {
        const doc = doctors.find(d => d.id === doctorId);
        if (doc?.user_id) {
          await api.post(`/events/${eventId}/assign`, { user_id: doc.user_id, role: 'doctor' }).catch(() => {});
        }
      }
      toast.success('Event created');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error creating event'); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Event Title</label><input className="input" value={form.title} onChange={e => set('title', e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Start Date</label><input className="input" type="datetime-local" value={form.event_date} onChange={e => set('event_date', e.target.value)} required /></div>
        <div><label className="form-label">End Date</label><input className="input" type="datetime-local" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
        <div><label className="form-label">Location</label><input className="input" value={form.location} onChange={e => set('location', e.target.value)} /></div>
        <div><label className="form-label">Type</label><input className="input" value={form.type} onChange={e => set('type', e.target.value)} placeholder="e.g. Workshop, Seminar" /></div>
        <div>
          <label className="form-label">Max Participants</label>
          <input
            className={`input ${maxError ? 'border-red-400 focus:ring-red-400' : ''}`}
            type="number" min="0" max={doctors.length}
            value={form.max_participants}
            onChange={e => handleMaxChange(e.target.value)}
            placeholder={`Max ${doctors.length} (available doctors)`}
          />
          {maxError
            ? <p className="text-xs text-red-500 mt-1">{maxError}</p>
            : doctors.length > 0 && <p className="text-xs text-[#6B7280] mt-1">{doctors.length} doctor{doctors.length !== 1 ? 's' : ''} available</p>
          }
        </div>
      </div>

      {/* Doctor selector — appears only when max_participants > 0 and valid */}
      {maxCount > 0 && !maxError && (
        <div>
          <label className="form-label">
            Assign Doctors
            <span className="ml-2 text-[#1F4D3E] font-semibold">{selectedDoctors.length}/{maxCount} selected</span>
          </label>
          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            {doctors.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] p-3">No doctors available</p>
            ) : (
              <div className="max-h-44 overflow-y-auto divide-y divide-[#F3F4F6]">
                {doctors.map(doc => {
                  const isSelected = selectedDoctors.includes(doc.id);
                  const isDisabled = !isSelected && selectedDoctors.length >= maxCount;
                  return (
                    <button
                      key={doc.id} type="button" disabled={isDisabled}
                      onClick={() => toggleDoctor(doc.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors
                        ${isSelected ? 'bg-[#E8F0EF]' : isDisabled ? 'opacity-40 cursor-not-allowed bg-white' : 'bg-white hover:bg-[#F9FAFB]'}`}
                    >
                      <div>
                        <p className={`text-sm font-medium ${isSelected ? 'text-[#1F4D3E]' : 'text-[#111827]'}`}>{doc.full_name}</p>
                        <p className="text-xs text-[#6B7280]">{doc.specialisation || 'General'} · {doc.status}</p>
                      </div>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#1F4D3E] border-[#1F4D3E]' : 'border-[#D1D5DB]'}`}>
                        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {/* Selected doctor chips */}
          {selectedDoctors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedDoctors.map(id => {
                const doc = doctors.find(d => d.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 bg-[#1F4D3E] text-white text-xs px-2 py-1 rounded-full">
                    {doc?.full_name}
                    <button type="button" onClick={() => toggleDoctor(id)} className="hover:text-red-300 ml-0.5">×</button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div><label className="form-label">Description</label><textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center">Create Event</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────
// EventDetailModal — Full event details with
// assigned doctors (specialisation, email, status)
// and creator role info
// ─────────────────────────────────────────────
const EventDetailModal = ({ eventId, onClose, onCancelled }) => {
  const [event, setEvent] = useState(null);
  const [users, setUsers] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [postReport, setPostReport] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const reload = () => api.get(`/events/${eventId}`).then(r => { setEvent(r.data); setPostReport(r.data.post_event_report || ''); });

  useEffect(() => {
    reload();
    api.get('/settings/users').then(r => setUsers(r.data)).catch(() => {});
  }, [eventId]);

  const assign = async () => {
    if (!assignUserId) return;
    try {
      await api.post(`/events/${eventId}/assign`, { user_id: assignUserId, role: assignRole });
      toast.success('Staff assigned');
      reload();
    } catch { toast.error('Error assigning staff'); }
  };

  const saveReport = async () => {
    try {
      await api.put(`/events/${eventId}`, { ...event, post_event_report: postReport });
      toast.success('Post-event report saved');
    } catch { toast.error('Error saving report'); }
  };

  const handleCancel = async () => {
    try {
      await api.put(`/events/${eventId}/cancel`);
      toast.success('Event cancelled');
      setShowCancelConfirm(false);
      reload();
      if (onCancelled) onCancelled();
    } catch { toast.error('Error cancelling event'); }
  };

  if (!event) return <Spinner />;

  const doctorAssignments = event.assignments?.filter(a => a.role_in_system === 'doctor' || a.event_role === 'doctor') || [];
  const isCancelled = event.status === 'cancelled';

  return (
    <div className="space-y-5">
      {/* Event info grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Title',            event.title],
          ['Type',             event.type],
          ['Location',         event.location],
          ['Start Date',       event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy h:mm a') : '-'],
          ['End Date',         event.end_date   ? format(new Date(event.end_date),   'MMM d, yyyy h:mm a') : '-'],
          ['Max Participants', event.max_participants],
          ['Assigned',         event.assignments?.length || 0],
          ['Status',           event.status],
        ].map(([k, v]) => (
          <div key={k}>
            <span className="text-[#6B7280] text-xs">{k}</span>
            <p className="text-[#111827] font-medium text-sm mt-0.5">{v || '-'}</p>
          </div>
        ))}
      </div>

      {/* Creator info */}
      {event.created_by_name && (
        <div className="flex items-center gap-2 p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
          <div className="w-6 h-6 rounded-full bg-[#1F4D3E] flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">{event.created_by_name.charAt(0)}</span>
          </div>
          <span className="text-xs text-[#6B7280]">Created by</span>
          <span className="text-xs font-medium text-[#111827]">{event.created_by_name}</span>
          <span className="text-xs bg-[#E8F0EF] text-[#1F4D3E] px-1.5 py-0.5 rounded-full capitalize">{event.created_by_role}</span>
        </div>
      )}

      {event.description && (
        <div>
          <span className="text-xs text-[#6B7280]">Description</span>
          <p className="text-sm text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] p-3 rounded-lg mt-1">{event.description}</p>
        </div>
      )}

      {/* Assigned Doctors — with specialisation, email, status */}
      <div>
        <h4 className="text-sm font-semibold text-[#111827] mb-2">Assigned Doctors ({doctorAssignments.length})</h4>
        {doctorAssignments.length === 0 ? (
          <p className="text-xs text-[#9CA3AF] mb-3">No doctors assigned to this event</p>
        ) : (
          <div className="space-y-2 mb-3">
            {doctorAssignments.map(a => (
              <div key={a.id} className="p-3 bg-[#E8F0EF] border border-[#1F4D3E]/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#1F4D3E] flex items-center justify-center shrink-0">
                      <span className="text-white text-[11px] font-bold">{a.full_name?.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1F4D3E]">{a.full_name}</p>
                      {a.specialisation && <p className="text-xs text-[#6B7280]">{a.specialisation}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs bg-white text-[#6B7280] px-2 py-0.5 rounded-full border border-[#E5E7EB] capitalize">{a.doctor_status || a.role_in_system}</span>
                    {a.doctor_email && <span className="text-[10px] text-[#9CA3AF]">{a.doctor_email}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Assignments */}
      <div>
        <h4 className="text-sm font-semibold text-[#111827] mb-2">All Assignments ({event.assignments?.length || 0})</h4>
        <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
          {event.assignments?.map(a => (
            <div key={a.id} className="flex items-center justify-between text-xs p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
              <span className="text-[#111827] font-medium">{a.full_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] capitalize">{a.event_role || a.role}</span>
                <span className="text-[#9CA3AF] capitalize">{a.role_in_system}</span>
              </div>
            </div>
          ))}
          {!event.assignments?.length && <p className="text-[#9CA3AF] text-xs">No assignments yet</p>}
        </div>
        {!isCancelled && (
          <div className="flex gap-2">
            <select className="select flex-1 text-sm" value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
              <option value="">Select Staff/Student</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
            </select>
            <input className="input w-32 text-sm" placeholder="Role" value={assignRole} onChange={e => setAssignRole(e.target.value)} />
            <button onClick={assign} className="btn-primary text-sm">Assign</button>
          </div>
        )}
      </div>

      {/* Post-Event Report */}
      {!isCancelled && (
        <div>
          <h4 className="text-sm font-semibold text-[#111827] mb-2">Post-Event Report</h4>
          <textarea className="input" rows={4} value={postReport} onChange={e => setPostReport(e.target.value)} placeholder="Write post-event report..." />
          <button onClick={saveReport} className="btn-primary mt-2 text-sm">Save Report</button>
        </div>
      )}

      {/* Cancel Event — trigger button + inline confirmation */}
      {!isCancelled && (
        <div className="pt-4 border-t border-[#E5E7EB]">
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
                  <XCircle size={16} className="text-red-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-red-600">Cancel This Event</p>
                  <p className="text-xs text-red-400">Mark event as cancelled</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-red-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 overflow-hidden">
              {/* Warning header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-red-500">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <XCircle size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Cancel this event?</p>
                  <p className="text-xs text-red-100">This action cannot be undone</p>
                </div>
              </div>
              {/* Warning body */}
              <div className="px-4 py-3 bg-red-50">
                <p className="text-xs text-red-700 leading-relaxed">
                  The event will be marked as <span className="font-semibold">cancelled</span> and preserved in the database.
                  All assigned doctors will be automatically restored to their original status.
                </p>
              </div>
              {/* Action buttons */}
              <div className="flex gap-0 border-t border-red-200">
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
                >
                  <XCircle size={15} /> Yes, Cancel Event
                </button>
                <div className="w-px bg-red-300" />
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white hover:bg-red-50 text-red-500 text-sm font-semibold transition-colors"
                >
                  No, Keep It
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Already cancelled banner */}
      {isCancelled && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <XCircle size={16} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-600">Event Cancelled</p>
            <p className="text-xs text-red-400">This event has been cancelled and is preserved for records</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Events — Main page
// ─────────────────────────────────────────────
const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(new Date());

  const fetchData = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Real-time clock — ticks every 60s to re-evaluate which events have ended
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const statusColors = {
    upcoming:  'bg-[#DBEAFE] text-[#1D4ED8]',
    ongoing:   'bg-[#D1FAE5] text-[#065F46]',
    completed: 'bg-[#D1FAE5] text-[#065F46]',
    cancelled: 'bg-[#FEE2E2] text-[#991B1B]'
  };

  // An event is past if its end_date has passed, or event_date has passed when no end_date
  const isPastEvent = (e) => {
    const endTime = e.end_date ? new Date(e.end_date) : (e.event_date ? new Date(e.event_date) : null);
    return endTime && now > endTime;
  };

  // Active: upcoming/ongoing that haven't ended yet
  const activeEvents = events.filter(e =>
    (e.status === 'upcoming' || e.status === 'ongoing') && !isPastEvent(e)
  );

  // History: completed, cancelled, OR time has passed (real-time completed)
  const historyEvents = events.filter(e =>
    e.status === 'completed' || e.status === 'cancelled' ||
    ((e.status === 'upcoming' || e.status === 'ongoing') && isPastEvent(e))
  );

  // Label for history rows
  const historyEventStatus = (e) => {
    if (e.status === 'cancelled') return { label: 'cancelled', cls: 'bg-[#FEE2E2] text-[#991B1B]' };
    if (e.status === 'completed') return { label: 'completed', cls: 'bg-[#D1FAE5] text-[#065F46]' };
    return { label: 'completed', cls: 'bg-[#D1FAE5] text-[#065F46]' };
  };

  if (loading) return <Layout title="Events & Outreach"><Spinner /></Layout>;

  return (
    <Layout title="Events & Outreach">
      <div className="space-y-8">

        {/* ── Active Events ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#111827]">Events & Outreach</h2>
            <button onClick={() => setModal('create')} className="btn-primary"><Plus size={16} /> Create Event</button>
          </div>

          {activeEvents.length === 0 ? (
            <div className="card p-12"><EmptyState message="No active events. Create your first event." /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEvents.map(event => (
                <div key={event.id} className="card p-4 hover:bg-[#F9FAFB] transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-[#E8F0EF] rounded-lg"><CalendarDays size={18} className="text-[#1F4D3E]" /></div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[event.status] || 'bg-[#F3F4F6] text-[#374151]'}`}>{event.status}</span>
                  </div>
                  <h3 className="font-semibold text-[#111827] mb-1">{event.title}</h3>
                  {event.type && <p className="text-xs text-[#1F4D3E] font-medium mb-2">{event.type}</p>}
                  {event.description && <p className="text-xs text-[#6B7280] mb-3 line-clamp-2">{event.description}</p>}
                  <div className="space-y-1 text-xs text-[#9CA3AF]">
                    {event.event_date && <div className="flex items-center gap-1"><CalendarDays size={12} />{format(new Date(event.event_date), 'MMM d, yyyy h:mm a')}</div>}
                    {event.location && <div className="flex items-center gap-1"><MapPin size={12} />{event.location}</div>}
                    <div className="flex items-center gap-1"><Users size={12} />{event.participant_count || 0} assigned</div>
                  </div>
                  <button
                    onClick={() => { setSelectedId(event.id); setModal('detail'); }}
                    className="btn-secondary w-full justify-center mt-3 text-sm"
                  >
                    <Eye size={14} /> View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Event History Panel ── */}
        {historyEvents.length > 0 && (
          <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <div className="flex items-center gap-2 px-3 py-1 bg-[#F3F4F6] border border-[#E5E7EB] rounded-full">
                <CalendarDays size={13} className="text-[#6B7280]" />
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Event History</span>
                <span className="text-xs font-bold text-white bg-[#6B7280] px-1.5 py-0.5 rounded-full">{historyEvents.length}</span>
              </div>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>

            {/* History table card */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Event', 'Type', 'Date', 'Location', 'Assigned', 'Status'].map(h => (
                        <th key={h} className="table-header">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyEvents.map(event => (
                      <tr
                        key={event.id}
                        className="table-row"
                        onClick={() => { setSelectedId(event.id); setModal('detail'); }}
                      >
                        {/* Event name + description */}
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              event.status === 'cancelled' ? 'bg-red-100' : 'bg-[#F3F4F6]'
                            }`}>
                              <CalendarDays size={14} className={event.status === 'cancelled' ? 'text-red-400' : 'text-[#6B7280]'} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#111827] truncate max-w-[160px]">{event.title}</p>
                              {event.description && (
                                <p className="text-xs text-[#9CA3AF] truncate max-w-[160px]">{event.description}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="table-cell">
                          {event.type
                            ? <span className="text-xs bg-[#E8F0EF] text-[#1F4D3E] px-2 py-0.5 rounded-full font-medium">{event.type}</span>
                            : <span className="text-[#D1D5DB] text-xs">—</span>
                          }
                        </td>

                        {/* Date */}
                        <td className="table-cell">
                          <p className="text-xs text-[#374151]">
                            {event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy') : '—'}
                          </p>
                          {event.end_date && (
                            <p className="text-[10px] text-[#9CA3AF]">
                              → {format(new Date(event.end_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </td>

                        {/* Location */}
                        <td className="table-cell">
                          <span className="text-xs text-[#374151]">{event.location || '—'}</span>
                        </td>

                        {/* Assigned count */}
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            <Users size={12} className="text-[#9CA3AF]" />
                            <span className="text-xs text-[#374151] font-medium">{event.participant_count || 0}</span>
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="table-cell">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            statusColors[event.status] || 'bg-[#F3F4F6] text-[#374151]'
                          }`}>{event.status}</span>
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

      {/* Create Event Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create Event" size="lg">
        <EventForm onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>

      {/* Event Detail Modal */}
      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title="Event Details" size="xl">
        {selectedId && (
          <EventDetailModal
            eventId={selectedId}
            onClose={() => setModal(null)}
            onCancelled={fetchData}
          />
        )}
      </Modal>
    </Layout>
  );
};

export default Events;
