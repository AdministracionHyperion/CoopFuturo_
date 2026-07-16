"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartCard } from "@/components/data/chart-card";
import {
  completeCall,
  fetchPostCalls,
  postCallAction,
} from "@/services/ops-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab = "pending" | "sent" | "skipped" | "failed";

function classify(item: Record<string, unknown>): Tab {
  const review = String(item.review_status || "");
  if (review === "skipped" || item.status === "skipped") return "skipped";
  if (review === "failed" || item.status === "failed") return "failed";
  if (item.whatsapp_sent || review === "sent") return "sent";
  if (item.wants_whatsapp || item.whatsapp_sent === false) return "pending";
  return "pending";
}

export default function RevisionPostLlamadaPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["post-calls"],
    queryFn: fetchPostCalls,
  });
  const [tab, setTab] = useState<Tab>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seedPhone, setSeedPhone] = useState("+573001112233");
  const [seedName, setSeedName] = useState("Lead revisión");

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filtered = useMemo(
    () => items.filter((x) => classify(x) === tab),
    [items, tab],
  );
  const selected =
    filtered.find((x) => String(x.id) === selectedId) ?? filtered[0] ?? null;

  async function act(action: "approve" | "skip") {
    if (!selected?.id) return;
    setBusy(true);
    try {
      await postCallAction(String(selected.id), action);
      toast.success(action === "approve" ? "WhatsApp enviado / aprobado" : "Omitido");
      await qc.invalidateQueries({ queryKey: ["post-calls"] });
      await refetch();
    } catch (err) {
      toast.error("Acción falló", {
        description: err instanceof Error ? err.message : "Error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function seedPending() {
    setBusy(true);
    try {
      await completeCall({
        phone: seedPhone,
        first_name: seedName,
        intent: "interesado",
        flow: "A",
        skip_whatsapp: true,
      });
      toast.success("Caso pendiente creado", {
        description: "skip_whatsapp=true → cola de revisión",
      });
      await refetch();
      setTab("pending");
    } catch (err) {
      toast.error("No se pudo crear caso", {
        description: err instanceof Error ? err.message : "Error",
      });
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "pending", label: "Pendientes" },
    { id: "sent", label: "Enviados" },
    { id: "skipped", label: "Omitidos" },
    { id: "failed", label: "Fallidos" },
  ];

  const previewText =
    (selected?.whatsapp as { message?: { text?: string } } | undefined)?.message?.text ||
    "Hola, le saludamos de COOPFUTURO. Tiene un cupo preaprobado. ¿Conversamos?";

  return (
    <div>
      <PageHeader
        title="Revisión post-llamada"
        subtitle="Aprueba, omite o reenvía el WhatsApp de seguimiento tras tipificar la llamada."
        actions={
          <Button variant="secondary" size="sm" disabled={busy} onClick={seedPending}>
            Crear caso demo
          </Button>
        }
      />

      {isError ? (
        <div className="py-16 text-center">
          <p className="text-[var(--muted)]">No fue posible cargar post-llamadas.</p>
          <Button className="mt-3" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <ChartCard title="Cola de revisión">
            <div className="mb-3 flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setSelectedId(null);
                  }}
                  className={cn(
                    "border-b-2 px-2 pb-2 text-sm transition",
                    tab === t.id
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-transparent text-[var(--muted)]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <p className="p-4 text-sm text-[var(--muted)]">Cargando…</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {filtered.map((item) => {
                  const id = String(item.id);
                  const active = selected && String(selected.id) === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-2 py-3 text-left hover:bg-[var(--surface-2)]",
                          active && "bg-[var(--accent-dim)]",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {String(item.first_name || "Asociado")} ·{" "}
                            <span className="font-mono text-xs text-[var(--muted)]">
                              {String(item.phone || "—")}
                            </span>
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            Intent: {String(item.intent || "—")} · Flujo{" "}
                            {String(item.flow || "A")}
                          </p>
                        </div>
                        {tab === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(id);
                              void act("approve");
                            }}
                          >
                            Aprobar
                          </Button>
                        ) : (
                          <Badge tone={tab === "sent" ? "success" : "muted"}>{tab}</Badge>
                        )}
                      </button>
                    </li>
                  );
                })}
                {!filtered.length ? (
                  <li className="px-2 py-8 text-center text-sm text-[var(--muted)]">
                    Sin casos en esta pestaña. Usa “Crear caso demo” o tipifica desde Laboratorio
                    con skip WhatsApp.
                  </li>
                ) : null}
              </ul>
            )}
          </ChartCard>

          <div className="space-y-4">
            <ChartCard title="Detalle">
              {selected ? (
                <div className="space-y-3 p-1 text-sm">
                  <p>
                    <span className="text-[var(--muted)]">Contacto · </span>
                    {String(selected.first_name || "Asociado")}
                  </p>
                  <p className="font-mono text-xs">{String(selected.phone || "—")}</p>
                  <p>
                    <span className="text-[var(--muted)]">Resumen · </span>
                    Tipificación <Badge tone="info">{String(selected.intent || "—")}</Badge>
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    ID {String(selected.id)} · {String(selected._created_at || "")}
                  </p>
                </div>
              ) : (
                <p className="p-2 text-sm text-[var(--muted)]">Selecciona un caso.</p>
              )}
            </ChartCard>

            <ChartCard title="Vista previa WhatsApp">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm leading-relaxed">
                {previewText}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!selected || busy || tab !== "pending"}
                  onClick={() => act("skip")}
                >
                  Omitir
                </Button>
                <Button
                  disabled={!selected || busy || tab !== "pending"}
                  onClick={() => act("approve")}
                >
                  Enviar WhatsApp
                </Button>
              </div>
            </ChartCard>

            <ChartCard title="Semilla rápida">
              <div className="space-y-2 p-1">
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                  value={seedPhone}
                  onChange={(e) => setSeedPhone(e.target.value)}
                  placeholder="+57…"
                />
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                  value={seedName}
                  onChange={(e) => setSeedName(e.target.value)}
                />
              </div>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
