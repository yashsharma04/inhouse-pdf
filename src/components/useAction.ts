import { useCallback, useState } from 'react';
import { toUserMessage } from './errors';

export type ActionState<T> =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'done'; result: T }
  | { status: 'error'; message: string };

/** Tracks one async action (merge, compress, ...) and turns failures into user-facing messages. */
export function useAction<T>() {
  const [state, setState] = useState<ActionState<T>>({ status: 'idle' });

  const run = useCallback(async (task: () => Promise<T>) => {
    setState({ status: 'working' });
    try {
      setState({ status: 'done', result: await task() });
    } catch (error) {
      setState({ status: 'error', message: toUserMessage(error) });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, run, reset };
}
