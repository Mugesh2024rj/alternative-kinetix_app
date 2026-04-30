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
  const [form, setForm] = useState({ title: '', type: 'clinical_handover', file_format: 'pdf', parameters: { from_date: '', to_date: '' } });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setParam = (k, v) => setForm(f => ({ ...f, parameters: { ...f.parameters, [k]: v } }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reports/generate', form);
      toast.success('Report generation started');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error generating report'); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Report Title</label><input className="input" value={form.title} onChange={e => set('title', e.target.value)} required /></div>
      <div><label className="form-label">Report Type</label>
        <select className="select w-full" value={form.type} onChange={e => set('type', e.target.value)}>
          {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">From Date</label><input className="input" type="date" value={form.parameters.from_date} onChange={e => setParam('from_date', e.target.value)} /></div>
        <div><label className="form-label">To Date</label><input className="input" type="date" value={form.parameters.to_date} onChange={e => setParam('to_date', e.target.value)} /></div>
      </div>
      <div><label className="form-label">Export Format</label>
        <div className="flex gap-3">
          {['pdf', 'csv', 'excel'].map(f => (
            <label key={f} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="format" value={f} checked={form.file_format === f} onChange={() => set('file_format', f)} className="accent-[#1F4D3E]" />
              <span className="text-sm text-[#111827] uppercase">{f}</span>
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
  const [form, setForm] = useState({ title: '', type: 'appointment_summary', file_format: 'pdf', schedule_config: { frequency: 'weekly', day: 'Monday', time: '08:00' } });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSched = (k, v) => setForm(f => ({ ...f, schedule_config: { ...f.schedule_config, [k]: v } }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reports/schedule', form);
      toast.success('Report scheduled');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error scheduling report'); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Report Title</label><input className="input" value={form.title} onChange={e => set('title', e.target.value)} required /></div>
      <div><label className="form-label">Report Type</label>
        <select className="select w-full" value={form.type} onChange={e => set('type', e.target.value)}>
          {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="form-label">Frequency</label>
          <select className="select w-full" value={form.schedule_config.frequency} onChange={e => setSched('frequency', e.target.value)}>
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </select>
        </div>
        <div><label className="form-label">Day</label><input className="input" value={form.schedule_config.day} onChange={e => setSched('day', e.target.value)} /></div>
        <div><label className="form-label">Time</label><input className="input" type="time" value={form.schedule_config.time} onChange={e => setSched('time', e.target.value)} /></div>
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center">Schedule Report</button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
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

  const typeLabel = (type) => REPORT_TYPES.find(t => t.value === type)?.label || type;

  if (loading) return <Layout title="Reports"><Spinner /></Layout>;

  const recent = reports.filter(r => r.status === 'completed').slice(0, 5);
  const scheduled = reports.filter(r => r.scheduled);

  return (
    <Layout title="Reports">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">Reports & Exports</h2>
          <div className="flex gap-3">
            <button onClick={() => setModal('schedule')} className="btn-secondary"><Calendar size={16} /> Schedule Report</button>
            <button onClick={() => setModal('generate')} className="btn-primary"><Plus size={16} /> Generate Report</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TYPES.map(type => (
            <div key={type.value} className="card p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors cursor-pointer" onClick={() => setModal('generate')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#E8F0EF] rounded-lg"><FileText size={18} className="text-[#1F4D3E]" /></div>
                <div>
                  <p className="text-sm font-medium text-[#111827]">{type.label}</p>
                  <p className="text-xs text-[#6B7280]">Click to generate</p>
                </div>
              </div>
              <Download size={16} className="text-[#6B7280]" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="p-4 border-b border-[#E5E7EB]"><h3 className="font-semibold text-[#111827]">Recent Exports</h3></div>
            <div className="divide-y divide-[#E5E7EB]">
              {recent.length === 0 ? <EmptyState message="No recent exports" /> : recent.map(r => (
                <div key={r.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">{r.title}</p>
                    <p className="text-xs text-[#6B7280]">{typeLabel(r.type)} · {r.file_format?.toUpperCase()}</p>
                    <p className="text-xs text-[#9CA3AF]">{format(new Date(r.created_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === 'completed' && <button className="text-[#1F4D3E] hover:text-[#17382D]"><Download size={16} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="p-4 border-b border-[#E5E7EB]"><h3 className="font-semibold text-[#111827]">Scheduled Reports</h3></div>
            <div className="divide-y divide-[#E5E7EB]">
              {scheduled.length === 0 ? <EmptyState message="No scheduled reports" /> : scheduled.map(r => (
                <div key={r.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">{r.title}</p>
                    <p className="text-xs text-[#6B7280]">{typeLabel(r.type)}</p>
                    {r.schedule_config && (
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        {r.schedule_config.frequency} · {r.schedule_config.day} at {r.schedule_config.time}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#F59E0B]" />
                    <span className="text-xs text-[#92400E] font-medium">Scheduled</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={modal === 'generate'} onClose={() => setModal(null)} title="Generate Report" size="lg">
        <GenerateForm onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === 'schedule'} onClose={() => setModal(null)} title="Schedule Report" size="lg">
        <ScheduleForm onSave={() => { setModal(null); fetchData(); }} onClose={() => setModal(null)} />
      </Modal>
    </Layout>
  );
};

export default Reports;
