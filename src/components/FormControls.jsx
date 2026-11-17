import { useId, useLayoutEffect, useRef } from 'react';
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
