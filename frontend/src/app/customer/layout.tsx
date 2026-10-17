import { Suspense } from "react";
import { TabBar } from "@/components/TabBar";

export default function CustomerLayout({ children }: LayoutProps<"/customer">) {
  return (
    <div className="phone">
      <div className="screen-wrap">
        <main className="body">{children}</main>
      </div>
      <Suspense fallback={<nav className="tabbar" aria-label="Main" />}>
        <TabBar role="customer" />
      </Suspense>
    </div>
  );
}
