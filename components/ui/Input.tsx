import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export default function Input({
  label,
  error,
  icon,
  fullWidth = true,
  className = '',
  ...props
}: InputProps) {
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <div className={widthClass}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`
            ${widthClass}
            ${icon ? 'pl-12' : 'pl-4'}
            pr-4 py-3
            bg-white/60 backdrop-blur-sm
            border-2 border-gray-200
            rounded-xl
            text-gray-900
            placeholder-gray-400
            transition-all duration-300
            focus:outline-none
            focus:border-transparent
            focus:ring-2
            focus:ring-blue-500/50
            hover:border-gray-300
            ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  rows?: number;
  fullWidth?: boolean;
}

export function Textarea({
  label,
  error,
  rows = 4,
  fullWidth = true,
  className = '',
  ...props
}: TextareaProps) {
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <div className={widthClass}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`
          ${widthClass}
          px-4 py-3
          bg-white/60 backdrop-blur-sm
          border-2 border-gray-200
          rounded-xl
          text-gray-900
          placeholder-gray-400
          transition-all duration-300
          focus:outline-none
          focus:border-transparent
          focus:ring-2
          focus:ring-blue-500/50
          hover:border-gray-300
          resize-none
          ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
