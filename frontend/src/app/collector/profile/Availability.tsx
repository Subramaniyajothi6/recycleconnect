"use client";

import { useState } from "react";
import { setAvailable } from "@/actions/collector";
import { useAction } from "@/components/form/useAction";
import { Icon } from "@/components/Icon";

export function Availability({ available }: { available: boolean }) {
  const [on, setOn] = useState(available);
  const save = useAction(setAvailable);
  return (
    <div className="kvlist" style={{ marginTop: 14 }}>
      <div className="kvrow">
        <Icon name="check" size={18} />
        <span><b>Available for pickups</b><small>Turn off when you’re on leave. The office won’t assign new pickups.</small></span>
        <label className="switch">
          <input type="checkbox" checked={on} aria-label="Available for pickups" disabled={save.pending}
            onChange={(e) => { setOn(e.target.checked); save.run(e.target.checked); }} />
          <span />
        </label>
      </div>
      {save.error && <div className="kvrow"><span /><span className="err-text">{save.error.message}</span><span /></div>}
    </div>
  );
}
