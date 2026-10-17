"use client";

import { useEffect } from "react";

// Admin filter pills (`.fsel`): a click anywhere on the pill (its label text or padding) opens the
// dropdown or date picker, not only a click on the small control inside it.
export function FilterPicker() {
  useEffect(() => {
    function open(e: MouseEvent) {
      if (e.button !== 0 || !(e.target instanceof Element)) return;
      const pill = e.target.closest(".fsel");
      const field = pill?.querySelector<HTMLSelectElement | HTMLInputElement>("select, input[type=date]");
      if (!field || field.contains(e.target)) return;
      e.preventDefault();
      field.focus();
      try {
        field.showPicker();
      } catch {
        // Browsers without showPicker() still get the focus; arrow keys or a second click open it.
      }
    }
    document.addEventListener("mousedown", open);
    return () => document.removeEventListener("mousedown", open);
  }, []);
  return null;
}
