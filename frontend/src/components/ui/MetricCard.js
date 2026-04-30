import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MetricCard = ({ title, value, icon: Icon, color = 'primary', trend, trendValue, subtitle }) => {
  const colorMap = {
    primary: 'bg-[#E8F0EF] text-[#1F4D3E]',
    success: 'bg-[#D1FAE5] text-[#065F46]',
    warning: 'bg-[#FEF3C7] text-[#92400E]',
    danger:  'bg-[#FEE2E2] text-[#991B1B]',
    info:    'bg-[#DBEAFE] text-[#1D4ED8]',
    purple:  'bg-[#EDE9FE] text-[#5B21B6]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="metric-card"
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-700' : trend === 'down' ? 'text-red-600' : 'text-[#6B7280]'}`}>
            {trend === 'up' ? <TrendingUp size={14} /> : trend === 'down' ? <TrendingDown size={14} /> : <Minus size={14} />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-black">{value}</p>
        <p className="text-sm text-black">{title}</p>
        {subtitle && <p className="text-xs text-black mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
};

export default MetricCard;
