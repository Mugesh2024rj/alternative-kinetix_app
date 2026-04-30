import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { format } from 'date-fns';

const typeColors = { info: 'text-blue-600', warning: 'text-yellow-600', success: 'text-emerald-600', error: 'text-red-600', approval: 'text-purple-600' };

const Header = ({ title }) => {
  const { notifications, unreadCount, markRead, markAllRead, handleAction } = useNotifications();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-20" style={{ backgroundColor: '#1F4D3E' }}>
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(!open)} className="relative p-2 text-white/70 hover:text-white transition-colors">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#F59E0B] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-12 w-96 bg-white border border-[#E5E7EB] rounded-2xl shadow-card-hover z-50"
              >
                <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
                  <h3 className="font-semibold text-[#111827]">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-[#1F4D3E] hover:text-[#17382D] flex items-center gap-1 font-medium">
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="text-[#6B7280] hover:text-[#111827]"><X size={16} /></button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-[#6B7280]">No notifications</div>
                  ) : notifications.map(n => (
                    <div key={n.id} onClick={() => { setSelected(n); if (!n.is_read) markRead(n.id); }}
                      className={`p-4 border-b border-[#E5E7EB] cursor-pointer hover:bg-[#F3F4F6] transition-colors ${!n.is_read ? 'bg-[#F0FDF4]' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${typeColors[n.type] || 'text-[#111827]'}`}>{n.title}</p>
                          <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-[#9CA3AF] mt-1">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                        </div>
                        {!n.is_read && <div className="w-2 h-2 bg-[#1F4D3E] rounded-full mt-1 shrink-0" />}
                      </div>
                      {n.action_required && !n.action_taken && (
                        <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleAction(n.id, 'approve')} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg">Approve</button>
                          <button onClick={() => handleAction(n.id, 'reject')} className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg">Reject</button>
                        </div>
                      )}
                      {n.action_taken && (
                        <span className={`text-xs mt-1 inline-block ${n.action_taken === 'approve' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {n.action_taken === 'approve' ? '✓ Approved' : '✗ Rejected'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card-hover p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <h3 className={`font-semibold text-lg ${typeColors[selected.type]}`}>{selected.title}</h3>
                <button onClick={() => setSelected(null)} className="text-[#6B7280] hover:text-[#111827]"><X size={18} /></button>
              </div>
              <p className="text-[#374151] text-sm mb-4">{selected.message}</p>
              <p className="text-xs text-[#9CA3AF]">{format(new Date(selected.created_at), 'MMMM d, yyyy h:mm a')}</p>
              {selected.action_required && !selected.action_taken && (
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { handleAction(selected.id, 'approve'); setSelected(null); }} className="btn-primary flex-1 justify-center">Approve</button>
                  <button onClick={() => { handleAction(selected.id, 'reject'); setSelected(null); }} className="btn-danger flex-1 text-center">Reject</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
