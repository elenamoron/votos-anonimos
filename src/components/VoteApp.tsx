"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

type VoteOption = {
  id: string;
  label: string;
  sort_order: number;
};

type VoteQuestion = {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  hasVoted: boolean;
};

export function VoteApp() {
  const [questions, setQuestions] = useState<VoteQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/questions");
        if (!res.ok) throw new Error("No se pudieron cargar las preguntas");
        const data = await res.json();
        setQuestions(data.questions);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error de carga");
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function vote(questionId: string) {
    const optionId = selected[questionId];
    if (!optionId) return;

    setSubmitting(questionId);
    setMessage((m) => ({ ...m, [questionId]: "" }));

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, optionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage((m) => ({
          ...m,
          [questionId]: data.error ?? "No se pudo registrar el voto",
        }));
        return;
      }
      setQuestions(
        (prev) =>
          prev?.map((q) =>
            q.id === questionId ? { ...q, hasVoted: true } : q,
          ) ?? null,
      );
    } catch {
      setMessage((m) => ({
        ...m,
        [questionId]: "Error de red. Inténtalo de nuevo.",
      }));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-16 pt-10">
      <header className="animate-rise mb-10">
        <p className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Urna
        </p>
        <p className="mt-2 max-w-sm text-base leading-relaxed text-ink-soft">
          Votación anónima. Tu elección no se asocia a tu identidad.
        </p>
      </header>

      {error && (
        <p className="rounded-lg bg-warn/10 px-4 py-3 text-sm text-warn">
          {error}
        </p>
      )}

      {questions === null && !error && (
        <p className="animate-pulse-soft text-ink-soft">Cargando…</p>
      )}

      {questions && questions.length === 0 && (
        <div className="animate-rise-delay-1 border-t border-line pt-8">
          <h2 className="font-display text-2xl text-ink">Nada abierto</h2>
          <p className="mt-2 text-ink-soft">
            No hay preguntas activas en este momento. Vuelve más tarde.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-12">
        {questions?.map((q, index) => (
          <section
            key={q.id}
            className={`border-t border-line pt-8 ${
              index === 0
                ? "animate-rise-delay-1"
                : index === 1
                  ? "animate-rise-delay-2"
                  : "animate-rise"
            }`}
          >
            <h2 className="font-display text-2xl leading-snug text-ink">
              {q.title}
            </h2>
            {q.description ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {q.description}
              </p>
            ) : null}

            {q.hasVoted ? (
              <p className="mt-6 text-accent font-medium">
                Ya has votado en esta pregunta. Gracias.
              </p>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                {q.options.map((opt) => {
                  const isSelected = selected[q.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setSelected((s) => ({ ...s, [q.id]: opt.id }))
                      }
                      className={`min-h-14 rounded-xl border px-4 py-3 text-left text-base transition-all duration-200 ${
                        isSelected
                          ? "border-accent bg-accent text-white shadow-md shadow-accent/20"
                          : "border-line bg-white/70 text-ink hover:border-accent/40 hover:bg-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={!selected[q.id] || submitting === q.id || isPending}
                  onClick={() => vote(q.id)}
                  className="mt-2 min-h-14 rounded-xl bg-ink px-4 text-base font-medium text-white transition enabled:hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting === q.id ? "Enviando…" : "Confirmar voto"}
                </button>

                {message[q.id] ? (
                  <p className="text-sm text-warn">{message[q.id]}</p>
                ) : null}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
