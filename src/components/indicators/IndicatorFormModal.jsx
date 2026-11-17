import { useEffect, useState } from 'react';
import Modal from '../Modal';
import MonthlyAllocationEditor from '../MonthlyAllocationEditor';
import { Alert, Button } from '../ui';
import { MoneyField, SelectField, TextField } from '../FormControls';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { createIndicator, updateIndicator } from '../../services/indicatorService';
import { OBJECTS_OF_EXPENSES } from '../../utils/constants';
import { centavosToInput, formatCentavos, parseToCentavos } from '../../utils/currency';
import { autoDistribute, validateMonthlyAllocation } from '../../utils/monthly';
import { friendlyError } from '../../utils/errors';

const blankMonths = () => Array(12).fill('');

export default function IndicatorFormModal({ open, indicator, onClose }) {
  const isEdit = Boolean(indicator);
  const { actor } = useAuth();
  const toast = useToast();

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [object, setObject] = useState('');
  const [budget, setBudget] = useState('');
  const [months, setMonths] = useState(blankMonths);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSaving(false);
    setCode(indicator?.activityCode ?? '');
    setTitle(indicator?.activityTitle ?? '');
    setObject(indicator?.objectOfExpenses ?? '');
    setBudget(indicator ? centavosToInput(indicator.annualBudget) : '');
    setMonths(indicator ? indicator.monthlyAllocation.map(centavosToInput) : blankMonths());
  }, [open, indicator]);

  const budgetCentavos = parseToCentavos(budget);
  const monthCentavos = months.map(parseToCentavos);
  const monthsValid = monthCentavos.every((m) => m !== null);
  const monthly = budgetCentavos !== null && monthsValid ? validateMonthlyAllocation(monthCentavos, budgetCentavos) : null;
  const minBudget = indicator ? indicator.totalObligations - (indicator.realignment || 0) : 0;
  const lockObject = isEdit && indicator.totalObligations > 0;

  const canSave = code.trim() && title.trim() && object && budgetCentavos !== null && monthly?.ok && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    const payload = {
      activityCode: code,
      activityTitle: title,
      objectOfExpenses: object,
      annualBudget: budgetCentavos,
      monthlyAllocation: monthCentavos,
    };
    try {
      if (isEdit) {
        await updateIndicator(indicator.activityCode, payload, actor);
        toast.success(`Indicator ${indicator.activityCode} updated.`);
      } else {
        await createIndicator(payload, actor);
        toast.success(`Indicator ${payload.activityCode.trim().toUpperCase()} created.`);
      }
      onClose();
    } catch (err) {
      setError(friendlyError(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="lg"
      title={isEdit ? `Edit Indicator · ${indicator.activityCode}` : 'New Budget Indicator'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="indicator-form" loading={saving} disabled={!canSave}>
            {isEdit ? 'Save Changes' : 'Create Indicator'}
          </Button>
        </>
      }
    >
      <form id="indicator-form" className="stack" onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <div className="grid-2">
          <TextField
            label="Activity Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={isEdit}
            hint={isEdit ? 'Activity Code cannot be changed.' : 'Unique. Letters, numbers, ".", "_" or "-".'}
            maxLength={50}
            required
            autoFocus={!isEdit}
          />
          <SelectField
            label="Object of Expenses"
            value={object}
            onChange={(e) => setObject(e.target.value)}
            placeholder="Select…"
            options={OBJECTS_OF_EXPENSES.map((o) => ({ value: o.value, label: `${o.value} — ${o.label}` }))}
            disabled={lockObject}
            hint={lockObject ? 'Locked while the indicator has obligations.' : undefined}
            required
          />
        </div>
        <TextField label="Activity Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} required />
        <MoneyField
          label="Annual Budget"
          value={budget}
          onChange={setBudget}
          error={budget && budgetCentavos === null ? 'Enter a valid amount (max 2 decimals).' : undefined}
          hint={
            isEdit && minBudget > 0
              ? `Minimum ${formatCentavos(minBudget)} (current obligations net of realignment).`
              : undefined
          }
        />
        {isEdit && (
          <div className="info-strip">
            <span>
              Realignment: <strong>{formatCentavos(indicator.realignment)}</strong>
            </span>
            <span>
              Obligations: <strong>{formatCentavos(indicator.totalObligations)}</strong>
            </span>
          </div>
        )}
        <MonthlyAllocationEditor
          values={months}
          onChange={setMonths}
          annualCentavos={budgetCentavos}
          onAutoDistribute={() => setMonths(autoDistribute(budgetCentavos).map(centavosToInput))}
          disabled={saving}
        />
      </form>
    </Modal>
  );
}
