import React from 'react';
import { Loader2 } from 'lucide-react';

const statusMap = {
  active: 'badge-active', leave: 'badge-leave', inactive: 'badge-inactive',
  pending: 'badge-pending', done: 'badge-done', cancelled: 'badge-cancelled',
  scheduled: 'badge-scheduled', 'in-progress': 'badge-in-progress',
  completed: 'badge-done', approved: 'badge-active', rejected: 'badge-cancelled',
  upcoming: 'badge-scheduled', ongoing: 'badge-in-progress',
  low: 'badge-active', medium: 'badge-scheduled', high: 'badge-pending', critical: 'badge-cancelled',
  'in-house': 'badge-in-progress', discharged: 'badge-inactive',
};

export const StatusBadge = ({ status }) => (
  <span className={statusMap[status] || 'badge-inactive'}>{status}</span>
);

export const Spinner = ({ size = 20 }) => (
  <div className="flex items-center justify-center p-8">
    <Loader2 size={size} className="animate-spin text-[#1F4D3E]" />
  </div>
);

export const EmptyState = ({ message = 'No data found' }) => (
  <div className="flex flex-col items-center justify-center p-12 text-[#6B7280]">
    <p className="text-sm">{message}</p>
  </div>
);

export const StarRating = ({ rating, max = 5 }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <span key={i} className={i < Math.round(rating) ? 'text-yellow-500' : 'text-[#D1D5DB]'}>★</span>
    ))}
    <span className="text-xs text-[#6B7280] ml-1">{parseFloat(rating).toFixed(1)}</span>
  </div>
);
