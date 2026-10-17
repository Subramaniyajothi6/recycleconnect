"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/actions/result";

/**
 * Runs a Server Action from a button or form and keeps its result (error message and field errors) for display.
 * The action itself refreshes the page on success.
 */
export function useAction<A extends unknown[]>(action: (...args: A) => Promise<ActionResult>) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (...args: A) =>
    new Promise<ActionResult>((resolve) => {
      start(async () => {
        const r = await action(...args);
        setResult(r);
        resolve(r);
      });
    });
  return { run, pending, result, error: result && !result.ok ? result : null, reset: () => setResult(null) };
}
