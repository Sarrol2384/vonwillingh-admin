"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f4f1ea",
  padding: 24,
  fontFamily: "system-ui, sans-serif",
  color: "#1e3a5f",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#ffffff",
  border: "1px solid #c5d0de",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 8px 24px rgba(30, 58, 95, 0.08)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "0 12px",
  fontSize: 14,
  color: "#1e3a5f",
  background: "#fff",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: 0,
  borderRadius: 8,
  background: "#1e3a5f",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const error = searchParams.get("error");
  const supabaseConfigured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!supabaseConfigured) {
      setMessage(
        "Supabase is not configured. Check .env.local and restart npm run dev.",
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      const redirectTo = searchParams.get("redirectTo");
      const safeRedirect =
        redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/dashboard";
      router.replace(safeRedirect === "/" ? "/dashboard" : safeRedirect);
      router.refresh();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Invalid email or password",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Sign in</h1>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 14 }}>
          VonWillingh Admin — invoices & quotes
        </p>

        {(error === "supabase_not_configured" || !supabaseConfigured) && (
          <p
            style={{
              marginBottom: 16,
              padding: 12,
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            Supabase is not configured. Open <code>.env.local</code>, add your
            project URL and anon key, then restart the dev server.
          </p>
        )}

        {message && (
          <p
            style={{
              marginBottom: 16,
              padding: 12,
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="email"
            style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ ...inputStyle, marginBottom: 14 }}
          />

          <label
            htmlFor="password"
            style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ ...inputStyle, marginBottom: 18 }}
          />

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={pageStyle}>
          <p>Loading sign-in…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
