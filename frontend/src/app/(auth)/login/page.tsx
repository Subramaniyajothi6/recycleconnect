import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { Strip } from "@/components/Strip";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

const HERO_MIX = [
  { code: "paper", value: 30, label: "Paper" },
  { code: "cardboard", value: 25, label: "Cardboard" },
  { code: "plastic", value: 19, label: "Plastic" },
  { code: "metal", value: 9, label: "Metal" },
  { code: "glass", value: 7, label: "Glass" },
  { code: "ewaste", value: 4, label: "E-waste" },
  { code: "textile", value: 4, label: "Textile" },
];

export default function LoginPage() {
  return (
    <main className="phone">
      <div className="screen-wrap">
        <div className="body">
          <div className="auth-hero">
            <Brand />
            <h1>Book a pickup for your recyclables</h1>
            <p>Paper, plastic, metal, e-waste and more, collected from your door at a time you choose.</p>
            <Strip parts={HERO_MIX} />
          </div>
          <div className="auth-body">
            <h2 style={{ fontSize: 22 }}>Sign in</h2>
            {/* The form reads ?next= from the URL, which is only known at request time. */}
            <Suspense fallback={<div className="skeleton" style={{ height: 220 }} />}>
              <LoginForm />
            </Suspense>
            <p className="muted" style={{ fontSize: 12.5, textAlign: "center" }}>
              Customers, collectors and admins all sign in here. You’ll see the screens for your role.
            </p>
            <div className="divider">New to RecycleConnect?</div>
            <div className="auth-links">
              <Link className="auth-link" href="/register/customer">
                <span className="ico"><Icon name="home" /></span>
                <span><b>Create a customer account</b><small>For homes, shops, offices and institutions</small></span>
                <Icon name="chev" size={18} />
              </Link>
              <Link className="auth-link" href="/register/collector">
                <span className="ico"><Icon name="truck" /></span>
                <span><b>Register as a collector</b><small>Collect recyclables in your area</small></span>
                <Icon name="chev" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
