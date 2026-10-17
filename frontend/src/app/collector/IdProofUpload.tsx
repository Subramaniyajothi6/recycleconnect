"use client";

import { uploadIdProof } from "@/actions/collector";
import { FieldMessage } from "@/components/form/FieldMessage";
import { useAction } from "@/components/form/useAction";
import { Icon } from "@/components/Icon";

export function IdProofUpload() {
  const upload = useAction(uploadIdProof);
  return (
    <div style={{ margin: "14px 20px 0" }}>
      <label className="upload" style={{ cursor: "pointer" }}>
        <span className="ico"><Icon name="file" size={20} /></span>
        <span><b>{upload.pending ? "Uploading…" : "Upload driving licence or a government photo ID"}</b><small>Photo or PDF, up to 5 MB. Only admins can see it.</small></span>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { const fd = new FormData(); fd.set("file", f); upload.run(fd); } }} />
      </label>
      <FieldMessage id="idp-msg" error={upload.error?.fields.file ?? upload.error?.message} />
    </div>
  );
}
