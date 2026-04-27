import { useState, useEffect, useRef } from 'react';
import { cn } from '../../utils';

interface CalendarDate {
  day: number;
  month: number;
  year: number;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function parseDateText(value: string): CalendarDate | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (/^\d+$/.test(trimmed)) {
    if (digits.length === 8) {
      const y = Number(digits.slice(0, 4));
      const m = Number(digits.slice(4, 6));
      const d = Number(digits.slice(6, 8));
      if (isValidDate(y, m, d)) return { year: y, month: m, day: d };
    }
    return null;
  }
  const parts = trimmed.match(/\d+/g);
  if (parts && parts.length === 3 && parts[0].length === 4) {
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (isValidDate(y, m, d)) return { year: y, month: m, day: d };
  }
  return null;
}

function formatDisplay(date: CalendarDate | null): string {
  if (!date) return '';
  return `${date.year}${String(date.month).padStart(2, '0')}${String(date.day).padStart(2, '0')}`;
}

interface DatePickerProps {
  value?: { year: number; month: number; day: number } | string | null;
  onChange?: (date: CalendarDate | null) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  suffix?: React.ReactNode;
}

export function DatePicker({ value, onChange, placeholder = '例: 20281001', className, label, suffix }: DatePickerProps) {
  const [textValue, setTextValue] = useState('');
  const nativeDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value && typeof value === 'object') {
      setTextValue(formatDisplay(value as CalendarDate));
    } else if (typeof value === 'string') {
      const parsed = parseDateText(value);
      setTextValue(parsed ? formatDisplay(parsed) : value);
    } else {
      setTextValue('');
    }
  }, [value]);

  const handleInputChange = (val: string) => {
    const digits = val.replace(/[^\d]/g, '');
    if (digits.length > 8) return;
    setTextValue(digits);

    if (digits.length === 8) {
      const parsed = parseDateText(digits);
      if (parsed) {
        onChange?.(parsed);
      }
    } else if (digits.length === 0) {
      onChange?.(null);
    }
  };

  const handleBlur = () => {
    const digits = textValue.replace(/[^\d]/g, '');
    if (digits.length === 8) {
      const parsed = parseDateText(digits);
      if (parsed) {
        setTextValue(formatDisplay(parsed));
        onChange?.(parsed);
      }
    } else if (digits.length > 0) {
      setTextValue('');
      onChange?.(null);
    }
  };

  const handleCalendarClick = () => {
    nativeDateRef.current?.showPicker?.();
    nativeDateRef.current?.click();
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const parts = e.target.value.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (isValidDate(y, m, d)) {
          const date = { year: y, month: m, day: d };
          setTextValue(formatDisplay(date));
          onChange?.(date);
        }
      }
    } else {
      setTextValue('');
      onChange?.(null);
    }
  };

  return (
    <label className={cn('flex-1', className)}>
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <div className="flex items-center gap-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-0 focus-within:border-blue-500 transition-colors h-9">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={placeholder}
          value={textValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          className="flex-1 bg-transparent outline-none placeholder:text-gray-400 text-gray-900"
        />
        <input
          ref={nativeDateRef}
          type="date"
          className="absolute invisible w-0 h-0"
          onChange={handleNativeDateChange}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={handleCalendarClick}
          className="text-gray-400 hover:text-gray-600 shrink-0 p-1"
          tabIndex={-1}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        {suffix && <div className="shrink-0">{suffix}</div>}
      </div>
    </label>
  );
}
