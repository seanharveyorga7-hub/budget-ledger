import { useEffect, useMemo, useState } from 'react';
import Modal from '../Modal';
import { Alert, Button } from '../ui';
import { MoneyField, SelectField, TextAreaField, TextField } from '../FormControls';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { createLedgerEntry, updateLedgerEntry } from '../../services/ledgerService';
import { availableForEntry } from '../../utils/balance';
import { centavosToInput, formatCentavos, parseToCentavos } from '../../utils/currency';
import { todayISO } from '../../utils/dates';
import { friendlyError } from '../../utils/errors';

export default function LedgerFormModal({ open, entry, indicators, onClose }) {
  const isEdit = Boolean(entry);
  const { actor, isAdmin } = useAuth();
  const toast = useToast();

  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [particulars, setParticulars] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(entry?.activityCode ?? '');
    setAmount(entry ? centavosToInput(entry.amount) : '');
    setDate(entry?.date ?? todayISO());
    setParticulars(entry?.particulars ?? '');
    setError('');
    setSaving(false);
  }, [open, entry]);

  const byCode = useMemo(() => Object.fromEntries(indicators.map((i) => [i.activityCode, i])), [indicators]);
  const indicator = byCode[code];
  const available = indicator ? availableForEntry(indicator, entry) : 0;
  const amountCentavos = parseToCentavos(amount);
  const exceeds = indicator && amountCentavos !== null && amountCentavos > available;

  const canSave = indicator && amountCentavos > 0 && !exceeds && date && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    const payload = { activityCode: code, amount: amountCentavos, date, particulars };
    try {
      if (isEdit) {
        await updateLedgerEntry(entry.id, payload, actor, { isAdmin });
        toast.success('Ledger entry updated.');
      } else {
        await createLedgerEntry(payload, actor);
        toast.success(`Obligation of ${formatCentavos(amountCentavos)} recorded.`);
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
      title={isEdit ? 'Edit Obligation' : 'New Obligation'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="ledger-form" loading={saving} disabled={!canSave}>
            {isEdit ? 'Save Changes' : 'Record Obligation'}
          </Button>
        </>
      }
    >
      <form id="ledger-form" className="stack" onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <SelectField
          label="Budget Indicator"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Select an active indicator…"
          options={indicators.map((i) => ({ value: i.activityCode, label: `${i.activityCode} — ${i.activityTitle}` }))}
          autoFocus={!isEdit}
        />
        <div className="grid-2">
          <TextField label="Activity Title" value={indicator?.activityTitle ?? ''} readOnly placeholder="Auto-filled" />
          <TextField label="Object of Expenditure" value={indicator?.objectOfExpenses ?? ''} readOnly placeholder="Auto-filled" />
        </div>
        <div className="grid-2">
          <MoneyField
            label="Amount"
            value={amount}
            onChange={setAmount}
            error={
              amount && amountCentavos === null
                ? 'Enter a valid amount.'
                : exceeds
                  ? `Exceeds available balance of ${formatCentavos(available)}.`
                  : undefined
            }
          />
          <TextField label="Transaction Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <TextAreaField
          label="Particulars (optional)"
          value={particulars}
          onChange={(e) => setParticulars(e.target.value)}
          maxLength={500}
          placeholder="Payee, purpose, reference no., etc."
        />

        {indicator && (
          <div className={`preview-box ${exceeds ? 'preview-danger' : ''}`}>
            <div>
              Available balance{isEdit && entry.activityCode === code ? ' (including this entry)' : ''}:{' '}
              <strong>{formatCentavos(available)}</strong>
            </div>
            {amountCentavos > 0 && (
              <div>
                Remaining after this entry: <strong>{formatCentavos(available - amountCentavos)}</strong>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
