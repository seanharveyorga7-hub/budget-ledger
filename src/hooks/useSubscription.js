import { useEffect, useState } from 'react';

/**
 * Generic live-subscription hook.
 * `subscribe(onData, onError)` must return an unsubscribe function.
 */
export function useSubscription(subscribe, deps, { enabled = true, initial = [] } = {}) {
  const [state, setState] = useState({ data: initial, loading: enabled, error: null });

  useEffect(() => {
    if (!enabled) {
      setState({ data: initial, loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    return subscribe(
      (data) => setState({ data, loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return state;
}
