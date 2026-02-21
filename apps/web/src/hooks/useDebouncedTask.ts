import { useCallback, useEffect, useRef } from "react";

export function useDebouncedTask(task: () => Promise<void> | void, delayMs: number) {
  const timerRef = useRef<number | null>(null);
  const taskRef = useRef(task);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(async () => {
    cancel();
    await taskRef.current();
  }, [cancel]);

  const schedule = useCallback(() => {
    cancel();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void taskRef.current();
    }, delayMs);
  }, [cancel, delayMs]);

  useEffect(() => cancel, [cancel]);

  return { schedule, cancel, flush };
}
