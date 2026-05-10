import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, ArrowLeftRight, Star, Activity, Home, Building2, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Status color map matching existing badge system
  const statusBg = {
    upcoming:    'bg-[#DBEAFE] text-[#1D4ED8]',
    ongoing:     'bg-[#D1FAE5] text-[#065F46]',
    completed:   'bg-[#D1FAE5] text-[#065F46]',
    cancelled:   'bg-[#FEE2E2] text-[#991B1B]',
    scheduled:   'bg-[#DBEAFE] text-[#1D4ED8]',
    done:        'bg-[#D1FAE5] text-[#065F46]',
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
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={`group relative flex flex-col items-center justify-start p-1 rounded-lg min-h-[56px] transition-all duration-200
                    ${ isSelected
                        ? 'bg-[#1F4D3E] text-white shadow-lg'
                        : isToday
                        ? 'bg-[#E8F0EF] text-[#1F4D3E] ring-1 ring-[#1F4D3E]'
                        : hasEvents && inMonth
                        ? 'bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400 hover:shadow-md hover:scale-105'
                        : inMonth
                        ? 'hover:bg-[#F3F4F6] text-[#374151]'
                        : 'text-[#D1D5DB] hover:bg-[#F9FAFB]'}`}
                >
                  <span className={`text-xs font-semibold ${
                    isSelected ? 'text-white' :
                    isToday ? 'text-[#1F4D3E]' :
                    hasEvents && inMonth ? 'text-amber-700' : ''
                  }`}>{format(day, 'd')}</span>

                  {hasEvents && (
                    <div className="w-full mt-0.5 space-y-0.5">
                      {events.slice(0, 2).map((ev, ei) => (
                        <p key={ei} className={`text-[9px] leading-tight truncate text-center px-0.5 rounded ${
                          isSelected ? 'text-white/90' : 'text-amber-700'
                        }`}>{ev.title}</p>
                      ))}
                      {events.length > 2 && (
                        <p className={`text-[9px] text-center ${isSelected ? 'text-white/70' : 'text-amber-600/70'}`}>+{events.length - 2} more</p>
                      )}
                    </div>
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
              <div className="p-4 bg-[#1F4D3E] rounded-xl mb-3">
                <p className="text-white font-semibold text-sm leading-snug">{selectedEvent.title}</p>
                {selectedEvent.type && (
                  <span className="inline-block mt-1.5 text-[10px] font-medium bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {selectedEvent.type}
                  </span>
                )}
              </div>

              {/* Detail rows */}
              <div className="space-y-2">
                {/* Status */}
                <div className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                  <span className="text-xs text-[#6B7280] font-medium">Status</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    statusBg[selectedEvent.status] || 'bg-[#F3F4F6] text-[#374151]'
                  }`}>{selectedEvent.status}</span>
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
                  className="w-full text-left p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#1F4D3E]/30 hover:bg-[#E8F0EF] hover:shadow-sm transition-all duration-150 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#111827] truncate group-hover:text-[#1F4D3E] transition-colors">{event.title}</p>
                    <ChevronRight size={14} className="text-[#9CA3AF] group-hover:text-[#1F4D3E] shrink-0 mt-0.5 transition-colors" />
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">{format(new Date(event.start), 'h:mm a')}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-[#1F4D3E] font-medium">{event.type}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      statusBg[event.status] || 'bg-[#F3F4F6] text-[#374151]'
                    }`}>{event.status}</span>
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
                    const isNow = (() => {
                      const now = new Date();
                      const end = new Date(time.getTime() + (appt.duration || 30) * 60000);
                      return now >= time && now <= end;
                    })();
                    const isPast = new Date() > new Date(time.getTime() + (appt.duration || 30) * 60000);
                    const dotColor = appt.status === 'done' ? 'bg-emerald-500'
                      : appt.status === 'in-progress' || isNow ? 'bg-[#1F4D3E]'
                      : appt.status === 'cancelled' ? 'bg-red-400'
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
                                {appt.duration || 30} min
                              </p>
                            </div>
                            <StatusBadge status={appt.status} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-[#111827] mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-[#9CA3AF] text-sm text-center py-8">No recent activity</p>
              ) : activity.map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#1F4D3E] rounded-full mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-[#111827] font-medium">{item.title}</p>
                    <p className="text-xs text-[#6B7280]">{item.message}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{format(new Date(item.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <VirtualCalendar calendar={calendar} />
      </div>
    </Layout>
  );
};

export default Dashboard;
