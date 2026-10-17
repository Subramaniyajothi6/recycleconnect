"use client";

import type { ReactNode } from "react";

type Option<T extends string> = { value: T; label: ReactNode };

/** Pill buttons where one option is picked. Submits as a hidden input. */
export function ChoiceGroup<T extends string>({
  name, options, value, onChange, labelledBy, className = "opts", buttonClass = "opt",
}: {
  name: string; options: Option<T>[]; value: T | ""; onChange: (v: T) => void;
  labelledBy: string; className?: string; buttonClass?: string;
}) {
  return (
    <div className={className} role="group" aria-labelledby={labelledBy}>
      {options.map((o) => (
        <button key={o.value} type="button" className={buttonClass} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

/** Pill buttons where several options can be picked. Submits one hidden input per picked value. */
export function MultiChoiceGroup<T extends string>({
  name, options, values, onChange, labelledBy, className = "opts", buttonClass = "opt",
}: {
  name: string; options: Option<T>[]; values: T[]; onChange: (v: T[]) => void;
  labelledBy: string; className?: string; buttonClass?: string;
}) {
  const toggle = (v: T) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div className={className} role="group" aria-labelledby={labelledBy}>
      {options.map((o) => (
        <button key={o.value} type="button" className={buttonClass || undefined} aria-pressed={values.includes(o.value)} onClick={() => toggle(o.value)}>
          {o.label}
        </button>
      ))}
      {values.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}
