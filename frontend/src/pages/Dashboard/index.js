import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, ArrowLeftRight, Star, Activity, Home, Building2, ClipboardList, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/layout/Layout';
import MetricCard from '../../components/ui/MetricCard';
import { StatusBadge, Spinner } from '../../components/ui';
import api from '../../api/axios';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

const VirtualCalendar = ({ calendar }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const getEventsForDay = (day) =>
    calendar.filter(e => isSameDay(new Date(e.start), day));

  const days = [];
  let d = startDate;
  while (d <= endDate) { days.push(d); d = addDays(d, 1); }

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : getEventsForDay(today);
  const displayDay = selectedDay || today;

  // When day changes, clear selected event
  const handleDayClick = (day) => {
    setSelectedEvent(null);
    setSelectedDay(isSameDay(day, selectedDay) ? null : day);
  };

  // Determine day styling based on event statuses
  const getDayStyle = (events) => {
    if (events.length === 0) return { border: '', bg: '', text: '' };
    
    const hasCompleted = events.some(e => e.status === 'completed');
    const hasCancelled = events.some(e => e.status === 'cancelled');
    const hasUpcoming = events.some(e => e.status === 'upcoming' || e.status === 'ongoing');
    
    // Priority: completed > cancelled > upcoming
    if (hasCompleted) {
      return {
        border: 'border-emerald-400',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-700'
      };
    }
    if (hasCancelled) {
      return {
        border: 'border-red-300',
        bg: 'bg-red-50',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700'
      };
    }
    return {
      border: 'border-amber-300',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700'
    };
  };

  // Status color map matching existing badge system
  const statusBg = {
    upcoming:    'bg-[#DBEAFE] text-[#1D4ED8]',
    ongoing:     'bg-[#D1FAE5] text-[#065F46]',
    completed:   'bg-emerald-100 text-emerald-700',
    cancelled:   'bg-red-100 text-red-700',
    scheduled:   'bg-[#DBEAFE] text-[#1D4ED8]',
    done:        'bg-emerald-100 text-emerald-700',
    'in-progress': 'bg-[#EDE9FE] text-[#5B21B6]',
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#111827]">Events Calendar</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedEvent(null); }} className="p-1 rounded hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-[#111827] w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
          <button onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedEvent(null); }} className="p-1 rounded hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Calendar grid ── */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-[#6B7280] py-1">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const events = getEventsForDay(day);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const inMonth = isSameMonth(day, currentMonth);
              const hasEvents = events.length > 0;
              const dayStyle = hasEvents ? getDayStyle(events) : {};
              const hasCompletedEvent = hasEvents && events.some(e => e.status === 'completed');
              const hasUpcomingEvent = hasEvents && events.some(e => e.status === 'upcoming' || e.status === 'ongoing');
              
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={`group relative flex flex-col items-center justify-start p-1 rounded-lg min-h-[56px] transition-all duration-200
                    ${isSelected
                      ? 'bg-[#1F4D3E] text-white shadow-lg'
                      : isToday && !hasEvents
                      ? 'bg-[#E8F0EF] text-[#1F4D3E] ring-1 ring-[#1F4D3E]'
                      : hasEvents && inMonth
                      ? `border-2 ${dayStyle.border} ${dayStyle.bg} hover:shadow-md hover:scale-105 transition-all`
                      : inMonth
                      ? 'hover:bg-[#F3F4F6] text-[#374151]'
                      : 'text-[#D1D5DB] hover:bg-[#F9FAFB]'}`}
                >
                  {/* Day number with optional tick for completed */}
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold ${
                      isSelected ? 'text-white' :
                      isToday && !hasEvents ? 'text-[#1F4D3E]' :
                      hasEvents && inMonth ? dayStyle.text : ''
                    }`}>{format(day, 'd')}</span>
                    {hasCompletedEvent && !isSelected && (
                      <Check size={12} className={`font-bold ${dayStyle.text}`} strokeWidth={3} />
                    )}
                  </div>

                  {/* Event indicators */}
                  {hasEvents && (
                    <div className="w-full mt-0.5 space-y-0.5">
                      {events.slice(0, 2).map((ev, ei) => (
                        <p key={ei} className={`text-[9px] leading-tight truncate text-center px-0.5 rounded font-medium ${
                          isSelected ? 'text-white/90' : dayStyle.text
                        }`}>{ev.title}</p>
                      ))}
                      {events.length > 2 && (
                        <p className={`text-[9px] text-center font-semibold ${
                          isSelected ? 'text-white/70' : `${dayStyle.text}/70`
                        }`}>+{events.length - 2}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Event type indicator dot for upcoming events */}
                  {hasUpcomingEvent && !hasCompletedEvent && !isSelected && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right panel: event list or event detail ── */}
        <div className="flex flex-col min-h-0">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#6B7280]">
              {format(displayDay, 'MMM d, yyyy')}
              {isSameDay(displayDay, today) ? <span className="ml-1 text-[#1F4D3E] font-semibold">— Today</span> : ''}
            </h3>
            {/* Back button — only visible when an event is expanded */}
            {selectedEvent && (
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-xs text-[#6B7280] hover:text-[#111827] flex items-center gap-1 transition-colors"
              >
                <ChevronLeft size={13} /> Back
              </button>
            )}
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm py-4 text-center">No events this day</p>
          ) : selectedEvent ? (
            /* ── Expanded event detail view ── */
            <motion.div
              key={selectedEvent.title}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              className="flex-1 overflow-y-auto"
            >
              {/* Title banner */}
              <div className={`p-4 rounded-xl mb-3 flex items-center justify-between ${
                selectedEvent.status === 'completed'
                  ? 'bg-emerald-600'
                  : selectedEvent.status === 'cancelled'
                  ? 'bg-red-600'
                  : 'bg-[#1F4D3E]'
              }`}>
                <div>
                  <p className="text-white font-semibold text-sm leading-snug">{selectedEvent.title}</p>
                  {selectedEvent.type && (
                    <span className="inline-block mt-1.5 text-[10px] font-medium bg-white/20 text-white px-2 py-0.5 rounded-full">
                      {selectedEvent.type}
                    </span>
                  )}
                </div>
                {selectedEvent.status === 'completed' && (
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                      <Check size={18} className="text-white font-bold" strokeWidth={3} />
                    </div>
                  </div>
                )}
              </div>

              {/* Detail rows */}
              <div className="space-y-2">
                {/* Status */}
                <div className={`flex items-center justify-between px-3 py-2 border rounded-lg font-medium ${
                  selectedEvent.status === 'completed'
                    ? 'bg-emerald-50 border-emerald-200'
                    : selectedEvent.status === 'cancelled'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-[#F9FAFB] border-[#E5E7EB]'
                }`}>
                  <span className={`text-xs ${
                    selectedEvent.status === 'completed'
                      ? 'text-emerald-700'
                      : selectedEvent.status === 'cancelled'
                      ? 'text-red-700'
                      : 'text-[#6B7280]'
                  }`}>Status</span>
                  <div className="flex items-center gap-1">
                    {selectedEvent.status === 'completed' && (
                      <Check size={14} className="text-emerald-600 font-bold" strokeWidth={3} />
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                      statusBg[selectedEvent.status] || 'bg-[#F3F4F6] text-[#374151]'
                    }`}>{selectedEvent.status}</span>
                  </div>
                </div>

                {/* Start time */}
                <div className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                  <span className="text-xs text-[#6B7280] font-medium">Start</span>
                  <span className="text-xs font-semibold text-[#111827]">
                    {format(new Date(selectedEvent.start), 'MMM d, yyyy')}
                    <span className="ml-1 text-[#1F4D3E]">{format(new Date(selectedEvent.start), 'h:mm a')}</span>
                  </span>
                </div>

                {/* End time — only if present */}
                {selectedEvent.end && (
                  <div className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-xs text-[#6B7280] font-medium">End</span>
                    <span className="text-xs font-semibold text-[#111827]">
                      {format(new Date(selectedEvent.end), 'MMM d, yyyy')}
                      <span className="ml-1 text-[#1F4D3E]">{format(new Date(selectedEvent.end), 'h:mm a')}</span>
                    </span>
                  </div>
                )}

                {/* Type */}
                {selectedEvent.type && (
                  <div className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-xs text-[#6B7280] font-medium">Type</span>
                    <span className="text-xs font-semibold text-[#111827]">{selectedEvent.type}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ── Event list for selected day ── */
            <motion.div
              key={displayDay.toISOString()}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-2 max-h-64 overflow-y-auto pr-1"
            >
              {selectedEvents.map((event, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedEvent(event)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-150 group ${
                    event.status === 'completed'
                      ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-sm'
                      : event.status === 'cancelled'
                      ? 'bg-red-50 border-red-300 hover:bg-red-100 hover:border-red-400 hover:shadow-sm'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] hover:border-[#1F4D3E]/30 hover:bg-[#E8F0EF] hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {event.status === 'completed' && (
                        <Check size={16} className="text-emerald-600 font-bold shrink-0 mt-0.5" strokeWidth={3} />
                      )}
                      <p className={`text-sm font-medium truncate transition-colors ${
                        event.status === 'completed' ? 'text-emerald-700 group-hover:text-emerald-800' :
                        event.status === 'cancelled' ? 'text-red-700 group-hover:text-red-800' :
                        'text-[#111827] group-hover:text-[#1F4D3E]'
                      }`}>{event.title}</p>
                    </div>
                    <ChevronRight size={14} className={`transition-colors shrink-0 mt-0.5 ${
                      event.status === 'completed' ? 'text-emerald-400 group-hover:text-emerald-600' :
                      event.status === 'cancelled' ? 'text-red-400 group-hover:text-red-600' :
                      'text-[#9CA3AF] group-hover:text-[#1F4D3E]'
                    }`} />
                  </div>
                  <p className={`text-xs mt-1 ${
                    event.status === 'completed' ? 'text-emerald-600' :
                    event.status === 'cancelled' ? 'text-red-600' :
                    'text-[#6B7280]'
                  }`}>{format(new Date(event.start), 'h:mm a')}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-medium ${
                      event.status === 'completed' ? 'text-emerald-700' :
                      event.status === 'cancelled' ? 'text-red-700' :
                      'text-[#1F4D3E]'
                    }`}>{event.type}</span>
                    <div className="flex items-center gap-1">
                      {event.status === 'completed' && (
                        <Check size={12} className="text-emerald-600 font-bold" strokeWidth={3} />
                      )}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        statusBg[event.status] || 'bg-[#F3F4F6] text-[#374151]'
                      }`}>{event.status}</span>
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const ActivityPanel = ({ activity, getActivityStyle, getActivityLabel }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? activity : activity.slice(0, 3);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#111827]">Recent Activity</h2>
        {activity.length > 0 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-xs bg-[#1F4D3E] text-white px-2.5 py-1 rounded-full hover:bg-[#163d30] transition-colors"
          >
            {showAll ? 'Show less' : `Latest (${activity.length}) notifications`}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {activity.length === 0 ? (
          <p className="text-[#9CA3AF] text-sm text-center py-8">No recent activity</p>
        ) : visible.map(item => {
          const activityStyle = getActivityStyle(item.type);
          return (
            <div key={item.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#1F4D3E]">
                  {activityStyle.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <p className="text-sm font-semibold text-[#111827] truncate">{item.title}</p>
                    <span className="text-[11px] text-[#9CA3AF] whitespace-nowrap">{format(new Date(item.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1 leading-5">{item.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#6B7280]">
                    <span className="rounded-full bg-[#F3F4F6] px-2 py-1 text-[#374151]">By {item.user_name || 'System'}</span>
                    <span className={`rounded-full px-2 py-1 ${activityStyle.badge}`}>{getActivityLabel(item.type)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [activity, setActivity] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [m, s, a, c] = await Promise.all([
          api.get('/dashboard/metrics'),
          api.get('/dashboard/schedule'),
          api.get('/dashboard/activity'),
          api.get('/dashboard/calendar'),
        ]);
        setMetrics(m.data);
        setSchedule(s.data);
        setActivity(a.data);
        setCalendar(c.data);
      } catch {}
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return <Layout title="Dashboard"><Spinner /></Layout>;

  const metricCards = [
    { title: 'Total Patients', value: metrics?.total_patients || 0, icon: Users, color: 'primary' },
    { title: "Today's Patients", value: metrics?.today_patients || 0, icon: UserCheck, color: 'success' },
    { title: 'Pending Transfers', value: metrics?.pending_transfers || 0, icon: ArrowLeftRight, color: 'warning' },
    { title: 'Avg Feedback Score', value: metrics?.avg_feedback_score || '0.0', icon: Star, color: 'info' },
    { title: 'Handovers', value: metrics?.handovers || 0, icon: Activity, color: 'purple' },
    { title: 'House Visits', value: metrics?.house_visits || 0, icon: Home, color: 'danger' },
    { title: 'Available in Clinic', value: metrics?.available_in_clinic || 0, icon: Building2, color: 'success' },
    { title: 'Assessments', value: metrics?.assessments || 0, icon: ClipboardList, color: 'warning' },
  ];

  const activityTypeStyles = {
    alert: { badge: 'bg-red-50 text-red-700', icon: <AlertCircle size={14} className="text-red-500" /> },
    success: { badge: 'bg-emerald-50 text-emerald-700', icon: <Check size={14} className="text-emerald-500" /> },
    info: { badge: 'bg-sky-50 text-sky-700', icon: <Activity size={14} className="text-sky-500" /> },
    update: { badge: 'bg-slate-50 text-slate-700', icon: <Activity size={14} className="text-slate-500" /> },
  };

  const getActivityStyle = (type) => activityTypeStyles[type] || activityTypeStyles.update;

  const getActivityLabel = (type) => {
    if (!type) return 'Update';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricCards.map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <MetricCard {...card} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#111827]">Today's Schedule</h2>
              <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-1 rounded-full">
                Clinic: 8:00 AM – 6:00 PM
              </span>
            </div>
            {schedule.length === 0 ? (
              <p className="text-[#9CA3AF] text-sm text-center py-8">No appointments scheduled today</p>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[60px] top-0 bottom-0 w-px bg-[#E5E7EB]" />
                <div className="space-y-0">
                  {schedule.map((appt, i) => {
                    const time = new Date(appt.appointment_time);
                    const duration = appt.duration || 30;
                    const end = new Date(time.getTime() + duration * 60000);
                    const isNow = (() => {
                      const now = new Date();
                      return now >= time && now <= end;
                    })();
                    const isPast = new Date() > end;
                    const effectiveStatus = (appt.status === 'scheduled' && isPast) ? 'completed' : appt.status;
                    const dotColor = effectiveStatus === 'done' || effectiveStatus === 'completed' ? 'bg-emerald-500'
                      : effectiveStatus === 'in-progress' || isNow ? 'bg-[#1F4D3E]'
                      : effectiveStatus === 'cancelled' ? 'bg-red-400'
                      : isPast ? 'bg-[#D1D5DB]'
                      : 'bg-[#F59E0B]';
                    return (
                      <div key={appt.id} className="flex items-start gap-0 relative">
                        {/* Time label */}
                        <div className="w-[52px] shrink-0 text-right pr-2 pt-3">
                          <span className={`text-[11px] font-medium ${
                            isNow ? 'text-[#1F4D3E]' : isPast ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
                          }`}>
                            {format(time, 'h:mm a')}
                          </span>
                        </div>
                        {/* Dot on the line */}
                        <div className="relative flex flex-col items-center" style={{ width: 16, marginLeft: 0 }}>
                          <div className={`w-3 h-3 rounded-full border-2 border-white shadow mt-3.5 z-10 shrink-0 ${
                            isNow ? 'ring-2 ring-[#1F4D3E] ring-offset-1' : ''
                          } ${dotColor}`} />
                          {i < schedule.length - 1 && (
                            <div className="w-px flex-1 bg-[#E5E7EB] min-h-[8px]" />
                          )}
                        </div>
                        {/* Appointment card */}
                        <div className={`flex-1 ml-3 mb-2 p-3 rounded-lg border transition-all ${
                          isNow
                            ? 'bg-[#E8F0EF] border-[#1F4D3E]/30 shadow-sm'
                            : isPast
                            ? 'bg-[#F9FAFB] border-[#E5E7EB] opacity-60'
                            : 'bg-[#F9FAFB] border-[#E5E7EB]'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-[#111827] truncate">{appt.patient_name}</p>
                                {isNow && (
                                  <span className="text-[10px] bg-[#1F4D3E] text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">Now</span>
                                )}
                              </div>
                              <p className="text-xs text-[#6B7280] mt-0.5">
                                {appt.doctor_name}
                                <span className="mx-1">·</span>
                                {appt.type}
                                <span className="mx-1">·</span>
                                {format(time, 'h:mm a')} - {format(end, 'h:mm a')}
                                <span className="mx-1">·</span>
                                {duration} min
                              </p>
                            </div>
                            <StatusBadge status={effectiveStatus === 'done' ? 'completed' : effectiveStatus} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <ActivityPanel activity={activity} getActivityStyle={getActivityStyle} getActivityLabel={getActivityLabel} />
        </div>

        <VirtualCalendar calendar={calendar} />
      </div>
    </Layout>
  );
};

export default Dashboard;
