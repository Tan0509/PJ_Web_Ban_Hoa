'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Formatter } from 'recharts/types/component/DefaultTooltipContent';
import { ChartInput, ChartType } from '../types';
import { resolveSeriesColor, resolveSliceColors } from '../utils/colors';

type ChartRendererProps = {
  chartType: Exclude<ChartType, 'auto'>;
  input: ChartInput;
};

const numberFormatter = (value: number, unit?: string) => {
  const formatted = new Intl.NumberFormat('vi-VN').format(value);
  return unit ? `${formatted} ${unit}` : formatted;
};

function isEmptyData(input: ChartInput) {
  if (!input.data || input.data.length === 0) return true;
  return input.data.every((d) => d.value === 0);
}

export default function ChartRenderer({ chartType, input }: ChartRendererProps) {
  if (chartType === 'kpi') {
    const kpi = input.data[0];
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-emerald-50 to-white">
        <div className="text-sm text-gray-500 mb-1">{input.title}</div>
        <div className="text-3xl font-semibold text-gray-900">
          {numberFormatter(kpi?.value || 0, input.unit)}
        </div>
        <div className="text-xs text-gray-500 mt-1">KPI card (auto selected)</div>
      </div>
    );
  }

  if (isEmptyData(input)) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50">
        Không có dữ liệu hoặc giá trị bằng 0.
      </div>
    );
  }

  if (chartType === 'pie' || chartType === 'donut') {
    const palette = resolveSliceColors(input);
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={input.data as unknown as Array<Record<string, unknown>>}
            dataKey="value"
            nameKey="label"
            innerRadius={chartType === 'donut' ? 60 : 0}
            outerRadius={110}
            paddingAngle={input.metricType === 'distribution' ? 4 : 2}
          >
            {input.data.map((entry, idx) => (
              <Cell key={entry.label} fill={palette[idx % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={((v: number | undefined) => (v !== undefined ? numberFormatter(v, input.unit) : '')) as Formatter<number, string>}
            labelFormatter={(l) => String(l ?? '')}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const mainColor = resolveSeriesColor(input);

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={input.data} margin={{ left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={((v: number | undefined) => (v !== undefined ? numberFormatter(v, input.unit) : '')) as Formatter<number, string>} />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            name={input.title}
            stroke={mainColor}
            strokeWidth={2.2}
            dot={{ r: 3, stroke: mainColor, strokeWidth: 1 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={input.data} margin={{ left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={((v: number | undefined) => (v !== undefined ? numberFormatter(v, input.unit) : '')) as Formatter<number, string>} />
        <Legend />
        <Bar
          dataKey="value"
          name={input.title}
          fill={mainColor}
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
          activeBar={{ fill: mainColor, opacity: 0.85 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
