"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    setMsg(error ? error.message : "Logged in ✅ ارجع للـ /");
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Login</h1>

      <div style={{ marginTop: 16 }}>
        <label>Email</label>
        <input
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Password</label>
        <input
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
      </div>

      <button
        onClick={onLogin}
        disabled={loading}
        style={{ marginTop: 16, width: "100%", padding: 12 }}
      >
        {loading ? "Loading..." : "Login"}
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}