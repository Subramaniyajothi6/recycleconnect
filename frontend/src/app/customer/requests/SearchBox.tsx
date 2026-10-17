"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form className="search-m search-joined" role="search" onSubmit={(e) => { e.preventDefault(); router.replace(`/customer/requests?tab=past&q=${encodeURIComponent(q)}`); }}>
      <label>
        <Icon name="search" size={16} />
        <input type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by request ID or material" aria-label="Search past requests" />
        {initial && (
          <button type="button" className="clear" aria-label="Clear search" title="Clear search"
            onClick={() => { setQ(""); router.replace("/customer/requests?tab=past"); }}><Icon name="x" size={12} /></button>
        )}
      </label>
      <button type="submit" className="go">Search</button>
    </form>
  );
}
