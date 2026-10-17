import type { Me } from "@/lib/types";

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/** Formats a stored 10-digit mobile as "+91 98400 12345". */
export function formatMobile(m: string) {
  return m.length === 10 ? `+91 ${m.slice(0, 5)} ${m.slice(5)}` : m;
}

export function ProfileHead({ me, line, pill }: { me: Me; line: string; pill?: string }) {
  return (
    <div className="prof-head">
      <span className="av" aria-hidden="true">{initials(me.name)}</span>
      <div>
        <h2>{me.name}</h2>
        <p>{line}</p>
        {pill && <span className="pill">{pill}</span>}
      </div>
    </div>
  );
}
