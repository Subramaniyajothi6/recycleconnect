"use client";

import { Icon } from "@/components/Icon";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="phone">
      <div className="screen-wrap">
        <div className="body auth-body">
          <div className="note warn" role="alert">
            <Icon name="alert" size={18} />
            <span>Something went wrong while loading this screen. Check your connection and try again.</span>
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={reset}>Try again</button>
        </div>
      </div>
    </main>
  );
}
