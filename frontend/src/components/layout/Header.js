import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, X, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { format } from 'date-fns';

const typeColors = { info: 'text-blue-400', warning: 'text-yellow-400', success: 'text-emerald-400', error: 'text-red-400', approval: 'text-purple-400' };

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
    <header className="bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(!open)} className="relative p-2 text-gray-400 hover:text-white transition-colors">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
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
                className="absolute right-0 top-12 w-96 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl z-50"
              >
                <div className="flex items-center justify-between p-4 border-b border-dark-700">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No notifications</div>
                  ) : notifications.map(n => (
                    <div key={n.id} onClick={() => { setSelected(n); if (!n.is_read) markRead(n.id); }}
                      className={`p-4 border-b border-dark-700 cursor-pointer hover:bg-dark-700/50 transition-colors ${!n.is_read ? 'bg-primary-600/5' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${typeColors[n.type] || 'text-white'}`}>{n.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                        </div>
                        {!n.is_read && <div className="w-2 h-2 bg-primary-500 rounded-full mt-1 shrink-0" />}
                      </div>
                      {n.action_required && !n.action_taken && (
                        <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleAction(n.id, 'approve')} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg">Approve</button>
                          <button onClick={() => handleAction(n.id, 'reject')} className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg">Reject</button>
                        </div>
                      )}
                      {n.action_taken && (
                        <span className={`text-xs mt-1 inline-block ${n.action_taken === 'approve' ? 'text-emerald-400' : 'text-red-400'}`}>
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
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-dark-800 rounded-xl border border-dark-700 p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <h3 className={`font-semibold text-lg ${typeColors[selected.type]}`}>{selected.title}</h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
              <p className="text-gray-300 text-sm mb-4">{selected.message}</p>
              <p className="text-xs text-gray-500">{format(new Date(selected.created_at), 'MMMM d, yyyy h:mm a')}</p>
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
