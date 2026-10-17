import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CustomerForm } from "./CustomerForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterCustomerPage() {
  return (
    <main className="phone">
      <div className="screen-wrap">
        <div className="body">
          <div className="app-top">
            <Link href="/login" className="icon-btn" aria-label="Back to sign in"><Icon name="back" /></Link>
            <h1 className="title">Create account</h1>
            <span className="muted" style={{ fontSize: 13 }}>Customer</span>
          </div>
          <div className="reg-body">
            <CustomerForm />
          </div>
        </div>
      </div>
    </main>
  );
}
