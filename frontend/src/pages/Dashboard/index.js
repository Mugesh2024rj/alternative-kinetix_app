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

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">Events Calendar</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded hover:bg-dark-600 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-white w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 rounded hover:bg-dark-600 text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const events = getEventsForDay(day);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const inMonth = isSameMonth(day, currentMonth);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                  className={`relative flex flex-col items-center justify-start p-1 rounded-lg min-h-[44px] transition-colors
                    ${ isSelected ? 'bg-primary-600 text-white' :
                       isToday ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500' :
                       inMonth ? 'hover:bg-dark-600 text-gray-300' : 'text-gray-600 hover:bg-dark-700'}`}
                >
                  <span className={`text-xs font-medium ${isToday && !isSelected ? 'text-primary-400' : ''}`}>{format(day, 'd')}</span>
                  {events.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {events.slice(0, 3).map((_, ei) => (
                        <span key={ei} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary-400'}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            {format(displayDay, 'MMMM d, yyyy')}{isSameDay(displayDay, today) ? ' — Today' : ''}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No events this day</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {selectedEvents.map((event, i) => (
                <div key={i} className="p-3 bg-dark-700/50 rounded-lg border border-dark-600">
                  <p className="text-sm font-medium text-white truncate">{event.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(event.start), 'h:mm a')}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-primary-400">{event.type}</span>
                    <StatusBadge status={event.status} />
                  </div>
                </div>
              ))}
            </div>
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
            <h2 className="text-base font-semibold text-white mb-4">Today's Schedule</h2>
            {schedule.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No appointments scheduled today</p>
            ) : (
              <div className="space-y-2">
                {schedule.map(appt => (
                  <div key={appt.id} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-400 w-16 shrink-0">{format(new Date(appt.appointment_time), 'h:mm a')}</div>
                      <div>
                        <p className="text-sm font-medium text-white">{appt.patient_name}</p>
                        <p className="text-xs text-gray-400">{appt.doctor_name} · {appt.type}</p>
                      </div>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No recent activity</p>
              ) : activity.map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{format(new Date(item.created_at), 'MMM d, h:mm a')}</p>
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
