import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, Users, MapPin, Eye } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/ui/Modal';
import { StatusBadge, Spinner, EmptyState } from '../../components/ui';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EventForm = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ title: '', description: '', event_date: '', end_date: '', location: '', type: '', max_participants: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/events', form);
      toast.success('Event created');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error creating event'); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="text-xs text-gray-400 mb-1 block">Event Title</label><input className="input" value={form.title} onChange={e => set('title', e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-xs text-gray-400 mb-1 block">Start Date</label><input className="input" type="datetime-local" value={form.event_date} onChange={e => set('event_date', e.target.value)} required /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">End Date</label><input className="input" type="datetime-local" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Location</label><input className="input" value={form.location} onChange={e => set('location', e.target.value)} /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Type</label><input className="input" value={form.type} onChange={e => set('type', e.target.value)} placeholder="e.g. Workshop, Seminar" /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Max Participants</label><input className="input" type="number" value={form.max_participants} onChange={e => set('max_participants', e.target.value)} /></div>
      </div>
      <div><label className="text-xs text-gray-400 mb-1 block">Description</label><textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center">Create Event</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
};

const EventDetailModal = ({ eventId, onClose }) => {
  const [event, setEvent] = useState(null);
  const [users, setUsers] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [postReport, setPostReport] = useState('');

  useEffect(() => {
    api.get(`/events/${eventId}`).then(r => { setEvent(r.data); setPostReport(r.data.post_event_report || ''); });
    api.get('/settings/users').then(r => setUsers(r.data)).catch(() => {});
  }, [eventId]);

  const assign = async () => {
    if (!assignUserId) return;
    try {
      await api.post(`/events/${eventId}/assign`, { user_id: assignUserId, role: assignRole });
      toast.success('Staff assigned');
      api.get(`/events/${eventId}`).then(r => setEvent(r.data));
    } catch { toast.error('Error assigning staff'); }
  };

  const saveReport = async () => {
    try {
      await api.put(`/events/${eventId}`, { ...event, post_event_report: postReport });
      toast.success('Post-event report saved');
    } catch { toast.error('Error saving report'); }
  };

  if (!event) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[['Title', event.title], ['Type', event.type], ['Location', event.location], ['Date', event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy h:mm a') : '-'], ['Max Participants', event.max_participants], ['Status', event.status]].map(([k, v]) => (
          <div key={k}><span className="text-gray-400">{k}: </span><span className="text-white">{v || '-'}</span></div>
        ))}
      </div>
      {event.description && <p className="text-sm text-gray-300 bg-dark-700/50 p-3 rounded-lg">{event.description}</p>}

      <div>
        <h4 className="text-sm font-semibold text-white mb-2">Assigned Staff & Students ({event.assignments?.length || 0})</h4>
        <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
          {event.assignments?.map(a => (
            <div key={a.id} className="flex items-center justify-between text-xs p-2 bg-dark-700/50 rounded">
              <span className="text-white">{a.full_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 capitalize">{a.role}</span>
                <span className="text-gray-500 capitalize">{a.role_in_system}</span>
              </div>
            </div>
          ))}
          {!event.assignments?.length && <p className="text-gray-500 text-xs">No assignments yet</p>}
        </div>
        <div className="flex gap-2">
          <select className="select flex-1 text-sm" value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
            <option value="">Select Staff/Student</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
          </select>
          <input className="input w-32 text-sm" placeholder="Role" value={assignRole} onChange={e => setAssignRole(e.target.value)} />
          <button onClick={assign} className="btn-primary text-sm">Assign</button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-white mb-2">Post-Event Report</h4>
        <textarea className="input" rows={4} value={postReport} onChange={e => setPostReport(e.target.value)} placeholder="Write post-event report..." />
        <button onClick={saveReport} className="btn-primary mt-2 text-sm">Save Report</button>
      </div>
    </div>
  );
};

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const fetchData = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const statusColors = { upcoming: 'bg-blue-500/20 text-blue-400', ongoing: 'bg-emerald-500/20 text-emerald-400', completed: 'bg-gray-500/20 text-gray-400', cancelled: 'bg-red-500/20 text-red-400' };

  if (loading) return <Layout title="Events & Outreach"><Spinner /></Layout>;

  return (
    <Layout title="Events & Outreach">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Events & Outreach</h2>
          <button onClick={() => setModal('create')} className="btn-primary"><Plus size={16} /> Create Event</button>
        </div>

        {events.length === 0 ? (
          <div className="card p-12"><EmptyState message="No events found. Create your first event." /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(event => (
              <div key={event.id} className="card p-4 hover:border-primary-500/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-primary-500/20 rounded-lg"><CalendarDays size={18} className="text-primary-400" /></div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[event.status] || 'bg-gray-500/20 text-gray-400'}`}>{event.status}</span>
                </div>
                <h3 className="font-semibold text-white mb-1">{event.title}</h3>
                {event.type && <p className="text-xs text-primary-400 mb-2">{event.type}</p>}
                {event.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{event.description}</p>}
                <div className="space-y-1 text-xs text-gray-500">
                  {event.event_date && <div className="flex items-center gap-1"><CalendarDays size={12} />{format(new Date(event.event_date), 'MMM d, yyyy h:mm a')}</div>}
                  {event.location && <div className="flex items-center gap-1"><MapPin size={12} />{event.location}</div>}
                  <div className="flex items-center gap-1"><Users size={12} />{event.participant_count || 0} assigned</div>
                </div>
                <button onClick={() => { setSelectedId(event.id); setModal('detail'); }} className="btn-secondary w-full justify-center mt-3 text-sm"><Eye size={14} /> View Details</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create Event" size="lg">
        <EventForm onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title="Event Details" size="xl">
        {selectedId && <EventDetailModal eventId={selectedId} onClose={() => setModal(null)} />}
      </Modal>
    </Layout>
  );
};

export default Events;
