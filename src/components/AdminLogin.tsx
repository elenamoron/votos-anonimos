"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
      <header className="animate-rise mb-10">
        <p className="font-display text-4xl font-semibold text-ink">Urna</p>
        <h1 className="mt-3 text-lg text-ink-soft">Acceso administración</h1>
      </header>

      <form onSubmit={onSubmit} className="animate-rise-delay-1 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="min-h-12 w-full rounded-xl border border-line bg-white/80 px-4 text-ink outline-none focus:border-accent"
          />
        </label>

        {error ? <p className="text-sm text-warn">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="min-h-12 w-full rounded-xl bg-ink font-medium text-white transition hover:bg-ink-soft disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
