'use client';

import { DateRange } from '../types/dashboard';
import { DATE_PRESETS, DatePresetKey } from '../utils/chartConfig';

type DateRangePickerProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

function computePresetRange(preset: DatePresetKey): DateRange {
  const today = new Date();
  if (preset === 7) {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }
  if (preset === 30) {
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }
  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }
  const y = today.getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const isValid = new Date(value.from) <= new Date(value.to);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Từ ngày</label>
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Đến ngày</label>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-2">
          {DATE_PRESETS.map((preset) => {
            const presetRange = computePresetRange(preset.value);
            const isActive = presetRange.from === value.from && presetRange.to === value.to;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(presetRange)}
                className={`px-3 h-11 text-xs border rounded-md transition ${
                  isActive
                    ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-emerald-500'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
      {!isValid && <div className="text-xs text-red-600">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</div>}
    </div>
  );
}
