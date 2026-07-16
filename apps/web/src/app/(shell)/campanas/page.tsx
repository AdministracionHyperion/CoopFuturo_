"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/data/stat-card";
import { ChartCard } from "@/components/data/chart-card";
import { ConversionHeatmap } from "@/components/charts";
import { useCampaigns } from "@/hooks/use-pulso";
import { cn, formatNumber } from "@/lib/utils";
import { Plus, Phone, MessageCircle, Search } from "lucide-react";

const statusTone = {
  activa: "success" as const,
  completada: "muted" as const,
  en_curso: "info" as const,
};

export default function CampanasPage() {
  const { data, isLoading, isError, refetch } = useCampaigns();
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "activa" | "en_curso" | "completada">(
    "all",
  );
  const [channelFilter, setChannelFilter] = useState<"all" | "voz" | "whatsapp">("all");

  const campaigns = useMemo(() => data?.campaigns ?? [], [data?.campaigns]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (channelFilter !== "all" && !c.channels.includes(channelFilter)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.segment.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
      );
    });
  }, [campaigns, query, statusFilter, channelFilter]);

  const selected =
    filtered.find((c) => c.id === selectedId) ??
    campaigns.find((c) => c.id === selectedId) ??
    filtered[0] ??
    campaigns[0];

  if (isError) {
    return (
      <div className="py-24 text-center">
        <p className="text-[var(--muted)]">No fue posible cargar las campañas.</p>
        <Button className="mt-3" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const chips = data?.dayChips;
  const heatmap = data?.heatmap;

  return (
    <div>
      <PageHeader
        title="Campañas"
        subtitle="Gestiona y monitorea tus campañas outbound."
        actions={
          <Button asChild>
            <Link href="/campanas/nueva">
              <Plus className="size-[18px]" strokeWidth={1.75} />
              Nueva campaña
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Llamadas hoy"
          value={chips?.llamadasHoy ?? 0}
          loading={isLoading}
        />
        <StatCard
          label="Msgs WhatsApp hoy"
          value={chips?.whatsappHoy ?? 0}
          loading={isLoading}
        />
        <StatCard
          label="Reintentos programados"
          value={chips?.reintentos ?? 0}
          loading={isLoading}
        />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--muted)]">Ventana horaria</p>
          <p className="mt-2 text-2xl font-semibold tabular text-[var(--accent)]">
            {chips?.ventana ?? "—"}
          </p>
          <Badge tone="success" className="mt-2">
            Activa
          </Badge>
        </div>
      </div>

      {!isLoading && campaigns.length === 0 && (
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center">
          <p className="text-sm text-[var(--muted)]">Aún no hay campañas.</p>
          <Button asChild className="mt-3">
            <Link href="/campanas/nueva">Crear la primera</Link>
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <ChartCard title="Campañas outbound">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-[var(--muted)]"
                strokeWidth={1.75}
              />
              <input
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Buscar campaña…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Buscar campañas"
              />
            </div>
            <select
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
              <option value="activa">Activa</option>
              <option value="en_curso">En curso</option>
              <option value="completada">Completada</option>
            </select>
            <select
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 text-xs"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as typeof channelFilter)}
              aria-label="Filtrar por canal"
            >
              <option value="all">Todos los canales</option>
              <option value="voz">Voz</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2 font-medium">Campaña</th>
                  <th className="py-2 font-medium">Segmento</th>
                  <th className="py-2 font-medium">Canal</th>
                  <th className="py-2 font-medium">Progreso</th>
                  <th className="py-2 font-medium">Conversión</th>
                  <th className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const pct = c.continuous
                    ? null
                    : Math.round((c.contacted / Math.max(c.total, 1)) * 100);
                  const active = c.id === selected?.id;
                  return (
                    <tr
                      key={c.id}
                      className={cn(
                        "cursor-pointer border-b border-[var(--border)]/60 hover:bg-[var(--surface-2)]",
                        active && "bg-[var(--accent-dim)]",
                      )}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td className="py-3 font-medium">{c.name}</td>
                      <td className="py-3 text-[var(--muted)]">{c.segment}</td>
                      <td className="py-3">
                        <span className="flex gap-1 text-[var(--accent)]">
                          {c.channels.includes("voz") && (
                            <Phone className="size-4" strokeWidth={1.75} />
                          )}
                          {c.channels.includes("whatsapp") && (
                            <MessageCircle className="size-4" strokeWidth={1.75} />
                          )}
                        </span>
                      </td>
                      <td className="py-3">
                        {pct === null ? (
                          <span className="text-[var(--muted)]">continuo</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full bg-[var(--accent)]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="tabular text-xs text-[var(--muted)]">
                              {formatNumber(c.contacted)}/{formatNumber(c.total)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 tabular">{c.conversion}%</td>
                      <td className="py-3">
                        <Badge tone={statusTone[c.status as keyof typeof statusTone] ?? "muted"}>
                          {c.status.replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && filtered.length === 0 && campaigns.length > 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-[var(--muted)]">
                      Ninguna campaña coincide con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <div className="flex flex-col gap-4">
          {selected?.ab && (
            <ChartCard title={`Detalle: ${selected.name}`}>
              <p className="mb-3 text-xs text-[var(--muted)]">A/B de guiones</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-dim)] p-3">
                  <p className="text-xs text-[var(--muted)]">Guion A</p>
                  <p className="text-xl font-semibold text-[var(--accent)]">{selected.ab.a}%</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted)]">Guion B</p>
                  <p className="text-xl font-semibold">{selected.ab.b}%</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-[var(--accent)]">
                Guion {selected.ab.winner} está ganando por +{selected.ab.a - selected.ab.b} pp
              </p>
            </ChartCard>
          )}

          {heatmap && (
            <ChartCard title="Mejor franja horaria">
              <ConversionHeatmap
                days={heatmap.days}
                hours={heatmap.hours}
                values={heatmap.values}
                unitLabel={heatmap.unitLabel ?? "Conversión"}
              />
            </ChartCard>
          )}

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 opacity-80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Reintentos inteligentes</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Optimiza reintentos según probabilidad de contacto.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={false}
                aria-disabled
                disabled
                title="Disponible cuando el backend exponga esta preferencia"
                className="relative h-7 w-12 shrink-0 cursor-not-allowed rounded-full bg-white/15 opacity-60"
              >
                <span className="absolute left-0.5 top-0.5 size-6 rounded-full bg-white" />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-[var(--muted)]">
              Deshabilitado · aún no hay endpoint para persistir este control
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
