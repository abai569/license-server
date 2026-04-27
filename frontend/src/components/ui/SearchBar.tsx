import { cn } from '../../utils';

interface SearchBarProps {
  isVisible: boolean;
  value: string;
  placeholder?: string;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
  width?: string;
}

export function SearchBar({
  isVisible,
  value,
  placeholder = '搜索',
  onOpen,
  onClose,
  onChange,
  width = '240px',
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 h-10 overflow-hidden">
      {!isVisible ? (
        <button
          onClick={onOpen}
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="搜索"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      ) : (
        <div className="flex w-full items-center gap-2 animate-slide-in">
          <input
            autoFocus
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "px-3 py-2 text-sm border border-gray-200 rounded-lg h-10",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "bg-gray-50"
            )}
            style={{ width }}
          />
          <button
            onClick={() => {
              onClose();
              onChange('');
            }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0"
            aria-label="关闭搜索"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
