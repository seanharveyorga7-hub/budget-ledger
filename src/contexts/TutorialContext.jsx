import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { markTutorialComplete } from '../services/userService';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import { getStepsForRole } from '../components/tutorial/tutorialSteps';

const TutorialContext = createContext(null);

// Local copy so the tour doesn't reappear if the profile write fails (e.g. offline).
const storageKey = (uid) => `budget-ledger:tutorial-done:${uid}`;
function readLocalDone(uid) {
  try {
    return localStorage.getItem(storageKey(uid)) === '1';
  } catch {
    return false;
  }
}
function writeLocalDone(uid) {
  try {
    localStorage.setItem(storageKey(uid), '1');
  } catch {
    /* storage unavailable: the Firestore flag still applies */
  }
}

export function TutorialProvider({ children }) {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const steps = useMemo(() => getStepsForRole(role), [role]);
  const [index, setIndex] = useState(-1); // -1 = closed
  const autoStarted = useRef(false);

  const goTo = useCallback(
    (i) => {
      const step = steps[i];
      if (!step) return;
      if (step.route && step.route !== pathname) navigate(step.route);
      setIndex(i);
    },
    [steps, pathname, navigate],
  );

  const start = useCallback(() => goTo(0), [goTo]);

  const finish = useCallback(() => {
    setIndex(-1);
    if (!user) return;
    writeLocalDone(user.uid);
    if (!profile?.tutorialCompletedAt) {
      markTutorialComplete(user.uid).catch((err) => console.warn('[tutorial] could not save completion:', err));
    }
  }, [user, profile]);

  // Auto-start on a user's first sign-in.
  useEffect(() => {
    if (autoStarted.current || !user || !profile) return undefined;
    if (profile.tutorialCompletedAt || readLocalDone(user.uid)) {
      autoStarted.current = true;
      return undefined;
    }
    const timer = setTimeout(() => {
      autoStarted.current = true;
      setIndex(0);
    }, 600);
    return () => clearTimeout(timer);
  }, [user, profile]);

  const value = useMemo(() => ({ active: index >= 0, start }), [index, start]);
  const step = steps[index];

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {step && (
        <TutorialOverlay
          key={step.id}
          step={step}
          index={index}
          total={steps.length}
          onNext={() => (index === steps.length - 1 ? finish() : goTo(index + 1))}
          onBack={() => goTo(index - 1)}
          onSkip={finish}
        />
      )}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used inside <TutorialProvider>');
  return ctx;
}
