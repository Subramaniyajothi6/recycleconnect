"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/actions/auth";
import { FormError } from "@/components/form/FieldMessage";
import { PasswordInput } from "@/components/form/PasswordInput";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(signIn, undefined);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="form" noValidate>
      <FormError message={state?.message} />
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label className="field-label" htmlFor="li-user">Mobile number or email</label>
        <input className="input" id="li-user" name="identifier" autoComplete="username" required
          value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="li-pw">Password</label>
        <PasswordInput id="li-pw" name="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
