"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Option = {
  id: string;
  label: string;
  sort_order: number;
  votes: number;
};

type Question = {
  id: string;
  title: string;
  description: string;
  is_active: number;
  created_at: string;
  options: Option[];
  total_votes: number;
};

export function AdminDashboard() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voteUrl, setVoteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionInputs, setOptionInputs] = useState(["", ""]);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/questions");
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (!res.ok) throw new Error("Error al cargar");
        const data = await res.json();
        setQuestions(data.questions);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }, [router]);

  useEffect(() => {
    setVoteUrl(`${window.location.origin}/`);
    load();
  }, [load]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(voteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function createQuestion(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);

    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          options: optionInputs,
          is_active: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "No se pudo crear");
        return;
      }
      setTitle("");
      setDescription("");
      setOptionInputs(["", ""]);
      load();
    } catch {
      setFormError("Error de red");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(q: Question) {
    await fetch(`/api/admin/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !q.is_active }),
    });
    load();
  }

  async function removeQuestion(id: string) {
    if (!confirm("¿Eliminar esta pregunta y todos sus votos?")) return;
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    load();
  }

  async function addOption(questionId: string, label: string) {
    if (!label.trim()) return;
    await fetch(`/api/admin/questions/${questionId}/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    load();
  }

  async function removeOption(optionId: string) {
    if (!confirm("¿Eliminar esta opción y sus votos?")) return;
    await fetch(`/api/admin/options/${optionId}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-10">
      <header className="animate-rise mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-4xl font-semibold text-ink">Urna</p>
          <p className="mt-1 text-ink-soft">Panel de administración</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-ink-soft underline-offset-2 hover:underline"
        >
          Salir
        </button>
      </header>

      <section className="animate-rise-delay-1 mb-10 border-t border-line pt-6">
        <h2 className="font-display text-xl text-ink">Enlace para votar</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Comparte este enlace o un QR con los votantes. Un dispositivo = un voto
          por pregunta.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={voteUrl}
            className="min-h-12 flex-1 rounded-xl border border-line bg-white/80 px-4 text-sm text-ink"
          />
          <button
            type="button"
            onClick={copyLink}
            className="min-h-12 rounded-xl bg-accent px-5 font-medium text-white hover:bg-accent-deep"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Los votos son anónimos: solo verás totales, nunca quién eligió qué.
          Borrar cookies o usar otro navegador cuenta como otro dispositivo.
        </p>
      </section>

      <section className="animate-rise-delay-2 mb-12 border-t border-line pt-6">
        <h2 className="font-display text-xl text-ink">Nueva pregunta</h2>
        <form onSubmit={createQuestion} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-ink-soft">Título</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="min-h-12 w-full rounded-xl border border-line bg-white/80 px-4 text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-ink-soft">
              Descripción (opcional)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-line bg-white/80 px-4 py-3 text-ink outline-none focus:border-accent"
            />
          </label>

          <div className="space-y-2">
            <span className="block text-sm text-ink-soft">Opciones</span>
            {optionInputs.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...optionInputs];
                    next[i] = e.target.value;
                    setOptionInputs(next);
                  }}
                  placeholder={`Opción ${i + 1}`}
                  required
                  className="min-h-11 flex-1 rounded-xl border border-line bg-white/80 px-4 text-ink outline-none focus:border-accent"
                />
                {optionInputs.length > 2 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOptionInputs(optionInputs.filter((_, j) => j !== i))
                    }
                    className="px-2 text-sm text-ink-soft hover:text-warn"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setOptionInputs([...optionInputs, ""])}
              className="text-sm font-medium text-accent hover:text-accent-deep"
            >
              + Añadir opción
            </button>
          </div>

          {formError ? <p className="text-sm text-warn">{formError}</p> : null}

          <button
            type="submit"
            disabled={creating}
            className="min-h-12 rounded-xl bg-ink px-6 font-medium text-white hover:bg-ink-soft disabled:opacity-50"
          >
            {creating ? "Creando…" : "Crear pregunta"}
          </button>
        </form>
      </section>

      <section className="border-t border-line pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Preguntas</h2>
          <button
            type="button"
            onClick={load}
            disabled={isPending}
            className="text-sm text-accent hover:text-accent-deep"
          >
            Actualizar
          </button>
        </div>

        {error ? <p className="text-sm text-warn">{error}</p> : null}
        {questions === null && !error ? (
          <p className="animate-pulse-soft text-ink-soft">Cargando…</p>
        ) : null}
        {questions?.length === 0 ? (
          <p className="text-ink-soft">Aún no hay preguntas.</p>
        ) : null}

        <ul className="flex flex-col gap-8">
          {questions?.map((q) => (
            <li key={q.id} className="border-b border-line pb-8 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium text-ink">{q.title}</h3>
                  {q.description ? (
                    <p className="mt-1 text-sm text-ink-soft">{q.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-ink-soft">
                    {q.is_active ? (
                      <span className="font-medium text-accent">Activa</span>
                    ) : (
                      <span>Inactiva</span>
                    )}{" "}
                    · {q.total_votes} voto{q.total_votes === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(q)}
                    className={`min-h-10 rounded-lg px-3 text-sm font-medium ${
                      q.is_active
                        ? "bg-mist text-ink-soft"
                        : "bg-accent text-white"
                    }`}
                  >
                    {q.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="min-h-10 rounded-lg px-3 text-sm text-warn hover:bg-warn/10"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <ul className="mt-5 space-y-3">
                {q.options.map((opt) => {
                  const pct =
                    q.total_votes > 0
                      ? Math.round((opt.votes / q.total_votes) * 100)
                      : 0;
                  return (
                    <li key={opt.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-ink">{opt.label}</span>
                        <span className="shrink-0 tabular-nums text-ink-soft">
                          {opt.votes} ({pct}%)
                          <button
                            type="button"
                            onClick={() => removeOption(opt.id)}
                            className="ml-2 text-xs text-ink-soft/70 hover:text-warn"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-mist">
                        <div
                          className="animate-bar h-full rounded-full bg-accent-glow"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <AddOptionRow
                onAdd={(label) => addOption(q.id, label)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AddOptionRow({ onAdd }: { onAdd: (label: string) => void }) {
  const [label, setLabel] = useState("");

  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(label);
        setLabel("");
      }}
    >
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Nueva opción"
        className="min-h-10 flex-1 rounded-lg border border-line bg-white/60 px-3 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        className="min-h-10 rounded-lg px-3 text-sm font-medium text-accent hover:text-accent-deep"
      >
        Añadir
      </button>
    </form>
  );
}
