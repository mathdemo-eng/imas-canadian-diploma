import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

/** A password field with a show/hide button. */
export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  help,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  help?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <span className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={help ? `${id}-help` : undefined}
          className="min-h-11 w-full rounded-lg border border-rule-strong bg-sheet px-3 pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-controls={id}
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:text-blue"
        >
          {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </span>
      {help && (
        <p id={`${id}-help`} className="text-sm text-ink-3">
          {help}
        </p>
      )}
    </div>
  );
}
