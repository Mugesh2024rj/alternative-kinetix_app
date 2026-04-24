import React, { useEffect, useState } from 'react';
import { Settings, Users, Calendar, CreditCard, Bell, Link2, Shield, Building2, Plus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/ui/Modal';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'clinic', label: 'Clinic Profile', icon: Building2 },
  { id: 'appointments', label: 'Appointment Types', icon: Calendar },
  { id: 'staff', label: 'Staff & Roles', icon: Users },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'security', label: 'Security', icon: Shield },
];

const ClinicProfile = () => {
  const [form, setForm] = useState({ clinic_name: 'KINETIX Clinic', address: '', phone: '', email: '', website: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    try { await api.put('/settings/clinic', { key: 'clinic_profile', value: form }); toast.success('Clinic profile saved'); }
    catch { toast.error('Error saving'); }
  };
  return (
    <div className="space-y-4 max-w-lg">
      {[['Clinic Name', 'clinic_name', 'text'], ['Address', 'address', 'text'], ['Phone', 'phone', 'text'], ['Email', 'email', 'email'], ['Website', 'website', 'url']].map(([label, key, type]) => (
        <div key={key}><label className="text-xs text-gray-400 mb-1 block">{label}</label><input className="input" type={type} value={form[key]} onChange={e => set(key, e.target.value)} /></div>
      ))}
      <button onClick={save} className="btn-primary">Save Profile</button>
    </div>
  );
};

const AppointmentTypes = () => {
  const [types, setTypes] = useState(['Physio', 'Rehab', 'Neuro', 'Pain']);
  const [newType, setNewType] = useState('');
  const add = () => { if (newType.trim()) { setTypes(t => [...t, newType.trim()]); setNewType(''); } };
  const remove = (t) => setTypes(prev => prev.filter(x => x !== t));
  return (
    <div className="space-y-4 max-w-md">
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="New appointment type" value={newType} onChange={e => setNewType(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button onClick={add} className="btn-primary"><Plus size={16} /></button>
      </div>
      <div className="space-y-2">
        {types.map(t => (
          <div key={t} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
            <span className="text-sm text-white">{t}</span>
            <button onClick={() => remove(t)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const StaffRoles = () => {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'staff', full_name: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { api.get('/settings/users').then(r => setUsers(r.data)).catch(() => {}); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settings/users', form);
      toast.success('User created');
      setModal(false);
      api.get('/settings/users').then(r => setUsers(r.data));
    } catch (err) { toast.error(err.response?.data?.error || 'Error creating user'); }
  };

  const updateRole = async (id, role) => {
    try {
      const user = users.find(u => u.id === id);
      await api.put(`/settings/users/${id}`, { ...user, role });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
      toast.success('Role updated');
    } catch { toast.error('Error updating role'); }
  };

  const toggleActive = async (id, is_active) => {
    try {
      const user = users.find(u => u.id === id);
      await api.put(`/settings/users/${id}`, { ...user, is_active: !is_active });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !is_active } : u));
      toast.success('Status updated');
    } catch { toast.error('Error updating status'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Add User</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-dark-700">
            <tr>{['Name', 'Username', 'Email', 'Role', 'Active', 'Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="table-row">
                <td className="table-cell font-medium text-white">{u.full_name}</td>
                <td className="table-cell text-gray-400">{u.username}</td>
                <td className="table-cell text-gray-400">{u.email}</td>
                <td className="table-cell">
                  <select className="select text-xs py-1" value={u.role} onChange={e => updateRole(u.id, e.target.value)}>
                    <option value="admin">Admin</option><option value="doctor">Doctor</option><option value="staff">Staff</option>
                  </select>
                </td>
                <td className="table-cell">
                  <button onClick={() => toggleActive(u.id, u.is_active)} className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="table-cell text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Add User">
        <form onSubmit={createUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400 mb-1 block">Full Name</label><input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} required /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Username</label><input className="input" value={form.username} onChange={e => set('username', e.target.value)} required /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Email</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Password</label><input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Role</label>
              <select className="select w-full" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="admin">Admin</option><option value="doctor">Doctor</option><option value="staff">Staff</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1 justify-center">Create User</button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const SecuritySettings = () => {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [twoFA, setTwoFA] = useState(false);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    api.get('/auth/sessions').then(r => setSessions(r.data)).catch(() => {});
  }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) { toast.error('Passwords do not match'); return; }
    try {
      await api.put('/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Error changing password'); }
  };

  const toggle2FA = async () => {
    try {
      await api.put('/settings/2fa', { enabled: !twoFA });
      setTwoFA(!twoFA);
      toast.success(`2FA ${!twoFA ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Error updating 2FA'); }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-4">Change Password</h3>
        <form onSubmit={changePassword} className="space-y-3">
          {[['Current Password', 'current_password'], ['New Password', 'new_password'], ['Confirm New Password', 'confirm_password']].map(([label, key]) => (
            <div key={key}><label className="text-xs text-gray-400 mb-1 block">{label}</label><input className="input" type="password" value={pwForm[key]} onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))} required /></div>
          ))}
          <button type="submit" className="btn-primary">Update Password</button>
        </form>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Two-Factor Authentication</h3>
            <p className="text-xs text-gray-400 mt-1">Add an extra layer of security to your account</p>
          </div>
          <button onClick={toggle2FA} className={`relative w-12 h-6 rounded-full transition-colors ${twoFA ? 'bg-primary-600' : 'bg-dark-600'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${twoFA ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
        {twoFA && <div className="mt-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg text-xs text-primary-300">2FA is enabled. Use your authenticator app to generate codes.</div>}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3">Active Sessions</h3>
        <div className="space-y-2">
          {sessions.slice(0, 5).map(s => (
            <div key={s.id} className="flex items-center justify-between p-2 bg-dark-700/50 rounded-lg text-xs">
              <div>
                <p className="text-white">{s.ip_address || 'Unknown IP'}</p>
                <p className="text-gray-500">{new Date(s.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>{s.is_active ? 'Active' : 'Expired'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const NotificationSettings = () => {
  const [settings, setSettings] = useState({ email_notifications: true, push_notifications: true, handover_alerts: true, appointment_reminders: true, house_visit_alerts: true });
  const toggle = (k) => setSettings(s => ({ ...s, [k]: !s[k] }));
  const save = async () => {
    try { await api.put('/settings/clinic', { key: 'notification_settings', value: settings }); toast.success('Notification settings saved'); }
    catch { toast.error('Error saving'); }
  };
  return (
    <div className="space-y-4 max-w-md">
      {Object.entries(settings).map(([key, val]) => (
        <div key={key} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
          <span className="text-sm text-white capitalize">{key.replace(/_/g, ' ')}</span>
          <button onClick={() => toggle(key)} className={`relative w-10 h-5 rounded-full transition-colors ${val ? 'bg-primary-600' : 'bg-dark-600'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${val ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      ))}
      <button onClick={save} className="btn-primary">Save Settings</button>
    </div>
  );
};

const ScheduleSettings = () => {
  const [form, setForm] = useState({ start_time: '08:00', end_time: '18:00', slot_duration: 30, working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] });
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const toggleDay = (d) => setForm(f => ({ ...f, working_days: f.working_days.includes(d) ? f.working_days.filter(x => x !== d) : [...f.working_days, d] }));
  const save = async () => {
    try { await api.put('/settings/clinic', { key: 'schedule_settings', value: form }); toast.success('Schedule settings saved'); }
    catch { toast.error('Error saving'); }
  };
  return (
    <div className="space-y-4 max-w-md">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-xs text-gray-400 mb-1 block">Start Time</label><input className="input" type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">End Time</label><input className="input" type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Slot Duration (min)</label><input className="input" type="number" value={form.slot_duration} onChange={e => setForm(f => ({ ...f, slot_duration: e.target.value }))} /></div>
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Working Days</label>
        <div className="flex gap-2 flex-wrap">
          {days.map(d => (
            <button key={d} onClick={() => toggleDay(d)} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${form.working_days.includes(d) ? 'bg-primary-600 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'}`}>{d}</button>
          ))}
        </div>
      </div>
      <button onClick={save} className="btn-primary">Save Schedule</button>
    </div>
  );
};

const BillingPlan = () => (
  <div className="space-y-4 max-w-lg">
    <div className="card p-5 border-primary-500/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white">Current Plan</h3>
        <span className="bg-primary-500/20 text-primary-400 text-xs px-3 py-1 rounded-full font-medium">Professional</span>
      </div>
      <div className="space-y-2 text-sm text-gray-300">
        <p>✓ Unlimited patients</p><p>✓ All modules enabled</p><p>✓ Real-time notifications</p><p>✓ Advanced analytics</p><p>✓ Priority support</p>
      </div>
      <button className="btn-primary mt-4">Upgrade Plan</button>
    </div>
  </div>
);

const Integrations = () => (
  <div className="space-y-4 max-w-lg">
    {[{ name: 'Electronic Health Records (EHR)', desc: 'Sync patient data with EHR systems', connected: false }, { name: 'SMS Gateway', desc: 'Send appointment reminders via SMS', connected: true }, { name: 'Email Service', desc: 'Automated email notifications', connected: true }, { name: 'Payment Gateway', desc: 'Process billing and payments', connected: false }].map(int => (
      <div key={int.name} className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{int.name}</p>
          <p className="text-xs text-gray-400">{int.desc}</p>
        </div>
        <button className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${int.connected ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>
          {int.connected ? 'Connected' : 'Connect'}
        </button>
      </div>
    ))}
  </div>
);

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('clinic');

  const renderContent = () => {
    switch (activeTab) {
      case 'clinic': return <ClinicProfile />;
      case 'appointments': return <AppointmentTypes />;
      case 'staff': return <StaffRoles />;
      case 'schedule': return <ScheduleSettings />;
      case 'billing': return <BillingPlan />;
      case 'notifications': return <NotificationSettings />;
      case 'integrations': return <Integrations />;
      case 'security': return <SecuritySettings />;
      default: return null;
    }
  };

  return (
    <Layout title="Settings">
      <div className="flex gap-6">
        <div className="w-56 shrink-0">
          <div className="card p-2 space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${activeTab === id ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' : 'text-gray-400 hover:text-white hover:bg-dark-700'}`}>
                <Icon size={16} />{label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-6">{tabs.find(t => t.id === activeTab)?.label}</h2>
            {renderContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
