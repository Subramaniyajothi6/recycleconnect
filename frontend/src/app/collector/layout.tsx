import { Suspense } from "react";
import { TabBar } from "@/components/TabBar";

export default function CollectorLayout({ children }: LayoutProps<"/collector">) {
  return (
    <div className="phone">
      <div className="screen-wrap">
        <main className="body">{children}</main>
      </div>
      <Suspense fallback={<nav className="tabbar" aria-label="Main" />}>
        <TabBar role="collector" />
      </Suspense>
    </div>
  );
}
