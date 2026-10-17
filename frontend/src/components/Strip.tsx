/** The coloured material-mix bar from the design. Each part's width is proportional to its value. */
export function Strip({ parts, className }: { parts: { code: string; value: number; label: string }[]; className?: string }) {
  return (
    <div className={className ? `strip ${className}` : "strip"} aria-hidden="true">
      {parts.filter((p) => p.value > 0).map((p) => (
        <i key={p.code} style={{ flex: p.value, background: `var(--c-${p.code})` }} title={p.label} />
      ))}
    </div>
  );
}
