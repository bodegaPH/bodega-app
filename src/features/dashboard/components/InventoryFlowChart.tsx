"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface InventoryFlowChartProps {
  data: { date: string; volume: number }[];
}

export function InventoryFlowChart({ data }: InventoryFlowChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-zinc-500 text-sm">
        Insufficient data to display inventory pulse.
      </div>
    );
  }

  // Pad empty data for aesthetic representation if only 1 data point exists
  const chartData = data.length === 1 ? [
    { date: 'Prev', volume: 0 }, ...data, { date: 'Next', volume: 0 }
  ] : data;

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" strokeOpacity={0.05} />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 12 }}
            tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#818cf8', fontWeight: 600 }}
            labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
            cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
          />
          <Area 
            type="monotone" 
            dataKey="volume" 
            stroke="#6366f1" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorVolume)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
