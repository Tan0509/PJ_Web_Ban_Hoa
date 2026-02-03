'use client';

import { useMemo, useState } from 'react';
import { ChartInput, ChartType } from '../types';
import { resolveChartType } from '../utils/chartResolver';
import ChartRenderer from './ChartRenderer';

type ChartContainerProps = {
  input: ChartInput;
};

const options: { value: ChartType; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'bar', label: 'Bar chart' },
  { value: 'line', label: 'Line chart' },
  { value: 'pie', label: 'Pie chart' },
  { value: 'donut', label: 'Donut chart' },
];

export default function ChartContainer({ input }: ChartContainerProps) {
  const [overrideType, setOverrideType] = useState<ChartType>('auto');

  const resolved = useMemo(() => resolveChartType(input), [input]);
  const effectiveType = overrideType === 'auto' ? resolved.type : overrideType;

  const isEmpty = !input.data || input.data.length === 0 || input.data.every((d) => d.value === 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">{input.title}</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Loại chart</label>
            <select
              value={overrideType}
              onChange={(e) => setOverrideType(e.target.value as ChartType)}
              className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50">
          Không có dữ liệu.
        </div>
      ) : (
        <ChartRenderer chartType={overrideType === 'auto' ? resolved.type : overrideType} input={input} />
      )}
    </div>
  );
}
