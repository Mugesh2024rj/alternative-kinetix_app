import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, UserCheck, Calendar, BarChart2,
  ArrowLeftRight, FileText, ClipboardList, Settings, TrendingUp,
  CalendarDays, ChevronLeft, ChevronRight, Activity, LogOut, Stethoscope
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/doctors', icon: UserCheck, label: 'Doctors' },
  { path: '/patients', icon: Users, label: 'Patients' },
  { path: '/appointments', icon: Calendar, label: 'Appointments' },
  { path: '/performance', icon: TrendingUp, label: 'Performance' },
  { path: '/handovers', icon: ArrowLeftRight, label: 'Handovers' },
  { path: '/assessments', icon: ClipboardList, label: 'Assessments' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/events', icon: CalendarDays, label: 'Events & Outreach' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-dark-800 border-r border-dark-700 flex flex-col h-screen sticky top-0 overflow-hidden z-30"
    >
      <div className="flex items-center justify-between p-4 border-b border-dark-700 min-h-[64px]">
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Activity size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-wide">KINETIX</span>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
            <Activity size={18} className="text-white" />
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white transition-colors ml-auto">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink key={path} to={path} end={path === '/'}>
            {({ isActive }) => (
              <div className={isActive ? 'sidebar-item-active' : 'sidebar-item'} title={collapsed ? label : ''}>
                <Icon size={18} className="shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-dark-700">
        <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-primary-600/30 rounded-full flex items-center justify-center shrink-0">
            <Stethoscope size={14} className="text-primary-400" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
