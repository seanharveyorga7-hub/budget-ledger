import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from '../ui';

const TARGET_TIMEOUT_MS = 6000;
const PAD = 6;
const GAP = 14;

const clamp = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max));

/** Spotlight + explanation card for a single tutorial step. Remount per step (key = step.id). */
export default function TutorialOverlay({ step, index, total, onNext, onBack, onSkip }) {
  const [target, setTarget] = useState(null);
  const [searching, setSearching] = useState(Boolean(step.target));
  const [rect, setRect] = useState(null);
  const [pos, setPos] = useState(null);
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  const isLast = index === total - 1;

  // 1. Wait for the highlighted element (the page may still be navigating or loading).
  useEffect(() => {
    if (!step.target) return undefined;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el || Date.now() - startedAt > TARGET_TIMEOUT_MS) {
        clearInterval(timer);
        if (el) {
          const tall = el.offsetHeight > window.innerHeight * 0.6;
          el.scrollIntoView({ block: tall ? 'start' : 'center', inline: 'nearest' });
          setTarget(el);
        }
        setSearching(false); // not found: falls back to a centered card
      }
    }, 100);
    return () => clearInterval(timer);
  }, [step.target]);

  // 2. Track the element's position while the step is open.
  useEffect(() => {
    if (!target) return undefined;
    const update = () => {
      const r = target.getBoundingClientRect();
      const top = Math.max(r.top - PAD, 4);
      const left = Math.max(r.left - PAD, 4);
      const bottom = Math.min(r.bottom + PAD, window.innerHeight - 4);
      const right = Math.min(r.right + PAD, window.innerWidth - 4);
      setRect(bottom > top && right > left ? { top, left, bottom, right, width: right - left, height: bottom - top } : null);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const ro = new ResizeObserver(update);
    ro.observe(target);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      ro.disconnect();
    };
  }, [target]);

  // 3. Place the card beside the spotlight: below, above, right, left, or bottom corner.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;

    if (!rect) {
      setPos({ top: Math.max(GAP, (vh - ch) / 2), left: Math.max(GAP, (vw - cw) / 2) });
      return;
    }
    let top;
    let left;
    if (rect.bottom + GAP + ch <= vh) top = rect.bottom + GAP;
    else if (rect.top - GAP - ch >= 0) top = rect.top - GAP - ch;
    else if (rect.right + GAP + cw <= vw) {
      left = rect.right + GAP;
      top = clamp(rect.top, GAP, vh - ch - GAP);
    } else if (rect.left - GAP - cw >= 0) {
      left = rect.left - GAP - cw;
      top = clamp(rect.top, GAP, vh - ch - GAP);
    } else {
      top = vh - ch - GAP; // large element: overlap its bottom-right corner
      left = vw - cw - GAP;
    }
    if (left === undefined) left = clamp(rect.left + rect.width / 2 - cw / 2, GAP, vw - cw - GAP);
    setPos({ top, left });
  }, [rect, searching, step.id]);

  // Keyboard: Esc skips, arrows move between steps.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onSkip();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft' && index > 0) onBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onNext, onBack, onSkip, index]);

  useEffect(() => {
    if (!searching) nextRef.current?.focus({ preventScroll: true });
  }, [searching]);

  return createPortal(
    <div className="tour-root">
      <div className="tour-blocker" />
      {rect ? (
        <div className="tour-spotlight" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
      ) : (
        <div className="tour-backdrop" />
      )}

      <div
        ref={cardRef}
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
      >
        <div className="tour-progress-row">
          <span className="tour-step-count">
            Step {index + 1} of {total}
          </span>
          <button type="button" className="link small" onClick={onSkip}>
            Skip tutorial
          </button>
        </div>
        <div className="tour-bar" aria-hidden="true">
          <div style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>

        <h2 id="tour-title" className="tour-title">
          {step.title}
        </h2>
        <div className="tour-body" aria-live="polite">
          {searching ? <Spinner label="Opening this section…" /> : step.body}
        </div>

        <div className="tour-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} disabled={index === 0}>
            Back
          </button>
          <button type="button" ref={nextRef} className="btn btn-primary btn-sm" onClick={onNext}>
            {isLast ? 'Finish' : index === 0 ? "Let's go" : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
