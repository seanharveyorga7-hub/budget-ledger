import { MONTHS } from '../utils/monthly';
import { formatCentavos, parseToCentavos } from '../utils/currency';
import { Button } from './ui';
import { MoneyInput } from './FormControls';

/**
 * 12 month inputs (strings) with a live total vs. the annual budget.
 * The parent decides whether saving is allowed.
 */
export default function MonthlyAllocationEditor({ values, onChange, annualCentavos, onAutoDistribute, disabled }) {
  const parsed = values.map(parseToCentavos);
  const invalid = parsed.some((v) => v === null);
  const sum = parsed.reduce((s, v) => s + (v || 0), 0);
  const diff = (annualCentavos ?? 0) - sum;
  const matches = !invalid && annualCentavos !== null && diff === 0;

  const setMonth = (i, v) => onChange(values.map((old, idx) => (idx === i ? v : old)));

  return (
    <div className="monthly">
      <div className="monthly-head">
        <div>
          <div className="field-label">Monthly Allocation</div>
          <div className="field-hint">Must add up exactly to the Annual Budget.</div>
        </div>
        <Button variant="secondary" size="sm" onClick={onAutoDistribute} disabled={disabled || annualCentavos === null}>
          Auto-Distribute
        </Button>
      </div>

      <div className="monthly-grid">
        {MONTHS.map((m, i) => (
          <label key={m} className={`month-cell ${parsed[i] === null ? 'field-invalid' : ''}`}>
            <span className="month-name">{m}</span>
            <MoneyInput
              className="input input-sm"
              value={values[i]}
              disabled={disabled}
              onChange={(v) => setMonth(i, v)}
              aria-label={`${m} allocation`}
            />
          </label>
        ))}
      </div>

      <div className={`monthly-total ${matches ? 'ok' : 'bad'}`}>
        <span>
          12-month total: <strong>{formatCentavos(sum)}</strong>
        </span>
        <span>
          {invalid
            ? 'Fix the invalid month amounts.'
            : annualCentavos === null
              ? 'Enter a valid Annual Budget.'
              : matches
                ? '✓ Matches Annual Budget'
                : diff > 0
                  ? `${formatCentavos(diff)} left to allocate`
                  : `${formatCentavos(-diff)} over the Annual Budget`}
        </span>
      </div>
    </div>
  );
}
