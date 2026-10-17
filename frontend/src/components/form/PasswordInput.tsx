"use client";

import { useState, type InputHTMLAttributes } from "react";

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="pw">
      <input {...props} type={shown ? "text" : "password"} className={props.className ?? "input"} />
      <button type="button" onClick={() => setShown(!shown)} aria-pressed={shown} aria-label={shown ? "Hide password" : "Show password"}>
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
