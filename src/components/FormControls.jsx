import { useId, useLayoutEffect, useRef, useState } from 'react';
import {
  caretAfterMoneyChars,
  centavosToInput,
  countMoneyChars,
  formatMoneyTyping,
  parseToCentavos,
} from '../utils/currency';

function Field({ label, hint, error, id, children, className = '' }) {
  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

export function TextField({ label, hint, error, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      <input id={id} className="input" {...props} />
    </Field>
  );
}

const EYE = (
  <>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>
);
const EYE_OFF = (
  <>
    <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </>
);

/** Password input with a show/hide toggle on the right. */
export function PasswordField({ label, hint, error, className, ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      <div className="password-input">
        <input id={id} className="input" type={visible ? 'text' : 'password'} {...props} />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {visible ? EYE_OFF : EYE}
          </svg>
        </button>
      </div>
    </Field>
  );
}

export function TextAreaField({ label, hint, error, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      <textarea id={id} className="input textarea" rows={3} {...props} />
    </Field>
  );
}

export function SelectField({ label, hint, error, options, placeholder, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      <select id={id} className="input" {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * Bare money input. Adds thousands commas as the user types ("1234567" -> "1,234,567")
 * and keeps the cursor in place. On blur the value is padded to 2 decimals ("1,500" -> "1,500.00").
 * `value` / `onChange` work with the formatted string; use parseToCentavos() to read it.
 */
export function MoneyInput({ value, onChange, onBlur, className = 'input', ...props }) {
  const ref = useRef(null);
  const pendingCaret = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (pendingCaret.current !== null && el && document.activeElement === el) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  });

  const handleChange = (e) => {
    const raw = e.target.value;
    const before = countMoneyChars(raw.slice(0, e.target.selectionStart ?? raw.length));
    const formatted = formatMoneyTyping(raw);
    pendingCaret.current = caretAfterMoneyChars(formatted, before);
    onChange(formatted);
  };

  const handleBlur = (e) => {
    const c = parseToCentavos(value);
    if (value !== '' && c !== null) onChange(centavosToInput(c));
    onBlur?.(e);
  };

  return (
    <input
      ref={ref}
      className={className}
      inputMode="decimal"
      autoComplete="off"
      placeholder="0.00"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}

/** Labelled peso field built on MoneyInput. */
export function MoneyField({ label, hint, error, value, onChange, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      <div className="money-input">
        <span className="money-prefix">₱</span>
        <MoneyInput id={id} value={value} onChange={onChange} {...props} />
      </div>
    </Field>
  );
}
