import React, { useEffect, useState } from 'react';
import { FileText, Download, Clock, Plus, Calendar } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/ui/Modal';
import { StatusBadge, Spinner, EmptyState } from '../../components/ui';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const REPORT_TYPES = [
  { value: 'clinical_handover', label: 'Clinical Handover Report' },
  { value: 'appointment_summary', label: 'Appointment Summary' },
  { value: 'staff_utilization', label: 'Staff Utilization' },
  { value: 'assessment_audit', label: 'Assessment Audit' },
  { value: 'house_visit_analytics', label: 'House Visit Analytics' },
];

const GenerateForm = ({ onSave, onClose }) => {
  const [form, setForm] = useState({
    title: '',
    type: 'clinical_handover',
    file_format: 'pdf',
    parameters: { from_date: '', to_date: '' }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setParam = (k, v) =>
    setForm(f => ({ ...f, parameters: { ...f.parameters, [k]: v } }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reports/generate', form);
      toast.success('Report generation started');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error generating report');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs text-text-secondary mb-1 block">Report Title</label>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required />
      </div>

      <div>
        <label className="text-xs text-text-secondary mb-1 block">Report Type</label>
        <select className="select w-full" value={form.type} onChange={e => set('type', e.target.value)}>
          {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-text-secondary mb-1 block">From Date</label>
          <input className="input" type="date" value={form.parameters.from_date} onChange={e => setParam('from_date', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-text-secondary mb-1 block">To Date</label>
          <input className="input" type="date" value={form.parameters.to_date} onChange={e => setParam('to_date', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-xs text-text-secondary mb-1 block">Export Format</label>
        <div className="flex gap-3">
          {['pdf', 'csv', 'excel'].map(f => (
            <label key={f} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={f} checked={form.file_format === f} onChange={() => set('file_format', f)} className="accent-primary" />
              <span className="text-sm text-text-secondary uppercase">{f}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center">Generate Report</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
};

const ScheduleForm = ({ onSave, onClose }) => {
  const [form, setForm] = useState({
    title: '',
    type: 'appointment_summary',
    file_format: 'pdf',
    schedule_config: { frequency: 'weekly', day: 'Monday', time: '08:00' }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSched = (k, v) =>
    setForm(f => ({ ...f, schedule_config: { ...f.schedule_config, [k]: v } }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reports/schedule', form);
      toast.success('Report scheduled');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error scheduling report');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs text-text-secondary mb-1 block">Report Title</label>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required />
      </div>

      <div>
        <label className="text-xs text-text-secondary mb-1 block">Report Type</label>
        <select className="select w-full" value={form.type} onChange={e => set('type', e.target.value)}>
          {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <select className="select" value={form.schedule_config.frequency} onChange={e => setSched('frequency', e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <input className="input" value={form.schedule_config.day} onChange={e => setSched('day', e.target.value)} />
        <input className="input" type="time" value={form.schedule_config.time} onChange={e => setSched('time', e.target.value)} />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1">Schedule Report</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
};

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const fetchData = async () => {
    try {
      const res = await api.get('/reports');
      setReports(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <Layout title="Reports"><Spinner /></Layout>;

  const recent = reports.filter(r => r.status === 'completed').slice(0, 5);
  const scheduled = reports.filter(r => r.scheduled);

  return (
    <Layout title="Reports">
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Reports & Exports</h2>
          <div className="flex gap-3">
            <button onClick={() => setModal('schedule')} className="btn-secondary">
              <Calendar size={16} /> Schedule Report
            </button>
            <button onClick={() => setModal('generate')} className="btn-primary">
              <Plus size={16} /> Generate Report
            </button>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TYPES.map(type => (
            <div key={type.value}
              className="bg-card rounded-2xl shadow-card border border-border p-4 flex items-center justify-between cursor-pointer hover:border-primary/30"
              onClick={() => setModal('generate')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{type.label}</p>
                  <p className="text-xs text-text-secondary">Click to generate</p>
                </div>
              </div>
              <Download size={16} className="text-text-secondary" />
            </div>
          ))}
        </div>

        {/* SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* RECENT */}
          <div className="bg-card rounded-2xl shadow-card border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Recent Exports</h3>
            </div>
            <div className="divide-y divide-border">
              {recent.length === 0 ? <EmptyState message="No recent exports" /> :
                recent.map(r => (
                  <div key={r.id} className="p-4 flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{r.title}</p>
                      <p className="text-xs text-text-secondary">{r.file_format}</p>
                      <p className="text-xs text-gray-400">{format(new Date(r.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <Download className="text-primary cursor-pointer" />
                  </div>
                ))}
            </div>
          </div>

          {/* SCHEDULED */}
          <div className="bg-card rounded-2xl shadow-card border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Scheduled Reports</h3>
            </div>
            <div className="divide-y divide-border">
              {scheduled.length === 0 ? <EmptyState message="No scheduled reports" /> :
                scheduled.map(r => (
                  <div key={r.id} className="p-4 flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{r.title}</p>
                      <p className="text-xs text-text-secondary">{r.type}</p>
                    </div>
                    <Clock className="text-warning" />
                  </div>
                ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODALS */}
      <Modal open={modal === 'generate'} onClose={() => setModal(null)} title="Generate Report">
        <GenerateForm onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>

      <Modal open={modal === 'schedule'} onClose={() => setModal(null)} title="Schedule Report">
        <ScheduleForm onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>

    </Layout>
  );
};

export default Reports;