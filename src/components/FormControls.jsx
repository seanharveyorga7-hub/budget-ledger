import { useId } from 'react';
import { centavosToInput, parseToCentavos } from '../utils/currency';

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

/** Peso input. Value is the raw string the user typed; it is tidied to 2 decimals on blur. */
export function MoneyField({ label, hint, error, value, onChange, className, ...props }) {
  const id = useId();
  const handleBlur = () => {
    const c = parseToCentavos(value);
    if (c !== null) onChange(centavosToInput(c));
  };
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      <div className="money-input">
        <span className="money-prefix">₱</span>
        <input
          id={id}
          className="input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          {...props}
        />
      </div>
    </Field>
  );
}
