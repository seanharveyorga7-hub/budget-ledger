import { useEffect, useMemo, useState } from 'react';
import Modal from '../Modal';
import { Alert, Button } from '../ui';
import { MoneyField, SelectField, TextAreaField } from '../FormControls';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { realignBudget } from '../../services/realignmentService';
import { availableBalance } from '../../utils/balance';
import { formatCentavos, parseToCentavos } from '../../utils/currency';
import { friendlyError } from '../../utils/errors';

export default function RealignmentModal({ open, onClose, indicators, defaultSource }) {
  const { actor } = useAuth();
  const toast = useToast();
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSource(defaultSource || '');
    setTarget('');
    setAmount('');
    setReason('');
    setError('');
    setSaving(false);
  }, [open, defaultSource]);

  const byCode = useMemo(() => Object.fromEntries(indicators.map((i) => [i.activityCode, i])), [indicators]);
  const src = byCode[source];
  const tgt = byCode[target];
  const srcAvailable = availableBalance(src);
  const amountCentavos = parseToCentavos(amount);
  const exceeds = src && amountCentavos !== null && amountCentavos > srcAvailable;

  const option = (i) => ({
    value: i.activityCode,
    label: `${i.activityCode} · ${i.objectOfExpenses} · ${i.activityTitle} (avail. ${formatCentavos(availableBalance(i))})`,
  });

  const canSave = src && tgt && amountCentavos > 0 && !exceeds && reason.trim() && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await realignBudget({ sourceCode: source, targetCode: target, amount: amountCentavos, reason }, actor);
      toast.success(`Realigned ${formatCentavos(amountCentavos)} from ${source} to ${target}.`);
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
      title="Budget Realignment"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="realign-form" loading={saving} disabled={!canSave}>
            Transfer Funds
          </Button>
        </>
      }
    >
      <form id="realign-form" className="stack" onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <SelectField
          label="Source Indicator (transfer from)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Select source…"
          options={indicators.map((i) => ({ ...option(i), disabled: availableBalance(i) <= 0 }))}
        />
        <SelectField
          label="Target Indicator (transfer to)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Select target…"
          options={indicators.filter((i) => i.activityCode !== source).map(option)}
        />
        <MoneyField
          label="Transfer Amount"
          value={amount}
          onChange={setAmount}
          error={
            amount && amountCentavos === null
              ? 'Enter a valid amount.'
              : exceeds
                ? `Exceeds the source's available balance of ${formatCentavos(srcAvailable)}.`
                : undefined
          }
          hint={src ? `Source available balance: ${formatCentavos(srcAvailable)}` : undefined}
        />
        <TextAreaField label="Reason / Justification" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />

        {src && tgt && amountCentavos > 0 && !exceeds && (
          <div className="preview-box">
            <div>
              <strong>{src.activityCode}</strong> available: {formatCentavos(srcAvailable)} →{' '}
              {formatCentavos(srcAvailable - amountCentavos)}
            </div>
            <div>
              <strong>{tgt.activityCode}</strong> available: {formatCentavos(availableBalance(tgt))} →{' '}
              {formatCentavos(availableBalance(tgt) + amountCentavos)}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
