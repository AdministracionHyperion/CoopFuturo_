"use client";

import { useEffect, useState } from "react";
import {
  Phone,
  MessageCircle,
  Radio,
  Bot,
  Shield,
  Eye,
  Cable,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/data/chart-card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fetchSettings, saveSettings } from "@/services/ops-client";

const TABS = [
  { id: "Canales", icon: Phone },
  { id: "Dialer", icon: Cable },
  { id: "Agentes", icon: Bot },
  { id: "Cumplimiento", icon: Shield },
  { id: "Privacidad", icon: Eye },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Channels = {
  voz_enabled: boolean;
  whatsapp_enabled: boolean;
  ventana_8_20: boolean;
  grabacion: boolean;
  identificacion: boolean;
};

type Dialer = {
  base_url: string;
  default_phone_number_id: string;
};

type AgentFlow = {
  name?: string;
  segment?: string;
  agent_id?: string;
  phone_number_id?: string;
  channel?: string;
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        checked ? "bg-[var(--accent)]" : "bg-white/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform",
          checked ? "left-5" : "left-0.5",
        )}
      />
    </button>
  );
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<TabId>("Canales");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<Channels>({
    voz_enabled: true,
    whatsapp_enabled: true,
    ventana_8_20: true,
    grabacion: true,
    identificacion: true,
  });
  const [dialer, setDialer] = useState<Dialer>({
    base_url: "",
    default_phone_number_id: "",
  });
  const [flujoA, setFlujoA] = useState<AgentFlow>({});
  const [flujoB, setFlujoB] = useState<AgentFlow>({});
  const [piiMasking, setPiiMasking] = useState(true);
  const [waMode, setWaMode] = useState<"mock" | "real">("mock");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetchSettings();
        if (cancelled) return;
        if (s.channels) {
          setChannels((c) => ({
            ...c,
            ...s.channels,
          }));
        }
        if (s.dialer) {
          setDialer({
            base_url: s.dialer.base_url ?? "",
            default_phone_number_id: s.dialer.default_phone_number_id ?? "",
          });
        }
        const ac = s.agent_config || {};
        if (ac.flujo_a && typeof ac.flujo_a === "object") {
          setFlujoA(ac.flujo_a as AgentFlow);
        }
        if (ac.flujo_b && typeof ac.flujo_b === "object") {
          setFlujoB(ac.flujo_b as AgentFlow);
        }
        if (s.ui && typeof s.ui.pii_masking === "boolean") {
          setPiiMasking(s.ui.pii_masking);
        }
        if (s.whatsapp?.mode === "real") setWaMode("real");
        else setWaMode("mock");
      } catch (err) {
        toast.error("No se pudo cargar configuración", {
          description: err instanceof Error ? err.message : "¿API en :8201?",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      await saveSettings({
        channels,
        dialer,
        agent_config: {
          flujo_a: flujoA,
          flujo_b: flujoB,
        },
        ui: { pii_masking: piiMasking },
      });
      toast.success("Configuración guardada");
    } catch (err) {
      toast.error("No se pudo guardar", {
        description: err instanceof Error ? err.message : "Error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Configuración de la plataforma"
        subtitle="Canales, dialer y agentes."
        actions={
          <Button size="sm" onClick={onSave} disabled={saving || loading}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition",
              tab === id
                ? "border-[var(--accent)]/40 bg-[var(--accent-dim)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{id}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Cargando desde /ops/settings…</p>
      ) : null}

      {tab === "Canales" && !loading && (
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="flex w-full items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">
              <Phone className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">Línea de voz</p>
              <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                {dialer.default_phone_number_id
                  ? `DDI: ${dialer.default_phone_number_id}`
                  : "Sin phone number ID — configúralo en Dialer / Agentes"}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm">
                <span className="text-[var(--muted)]">Estado</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5",
                    channels.voz_enabled ? "text-[var(--accent)]" : "text-[var(--muted)]",
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      channels.voz_enabled ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" : "bg-white/25",
                    )}
                  />
                  {channels.voz_enabled ? "Habilitada" : "Deshabilitada"}
                </span>
              </p>
            </div>
            <Toggle
              checked={channels.voz_enabled}
              label="Voz"
              onChange={() => setChannels((c) => ({ ...c, voz_enabled: !c.voz_enabled }))}
            />
          </div>

          <div className="flex w-full items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">
              <MessageCircle className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">WhatsApp</p>
              <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                {waMode === "real"
                  ? "Canal WhatsApp en vivo"
                  : "Canal WhatsApp en modo demo"}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={waMode === "real" ? "success" : "muted"}>
                  {waMode === "real" ? "Live" : "Demo"}
                </Badge>
              </p>
            </div>
            <Toggle
              checked={channels.whatsapp_enabled}
              label="WhatsApp"
              onChange={() =>
                setChannels((c) => ({ ...c, whatsapp_enabled: !c.whatsapp_enabled }))
              }
            />
          </div>

          <div className="flex w-full items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">
              <Radio className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">Dialer / SIP</p>
              <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                {dialer.base_url
                  ? dialer.base_url
                  : "Sin URL — voz por troncal SIP directa"}
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "Dialer" && !loading && (
        <ChartCard title="Microservicio dialer">
          <div className="space-y-3 p-1">
            <label className="block min-w-0 text-sm">
              Base URL (vacío = troncal SIP directa)
              <input
                className="mt-1 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm"
                placeholder="http://127.0.0.1:8080"
                value={dialer.base_url}
                onChange={(e) => setDialer((d) => ({ ...d, base_url: e.target.value }))}
              />
            </label>
            <label className="block min-w-0 text-sm">
              Phone number ID por defecto
              <input
                className="mt-1 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm"
                value={dialer.default_phone_number_id}
                onChange={(e) =>
                  setDialer((d) => ({ ...d, default_phone_number_id: e.target.value }))
                }
              />
            </label>
            <p className="text-xs text-[var(--muted)]">
              Al guardar, la API actualiza el dialer en caliente. Si hay URL, usa el endpoint de
              despacho interno.
            </p>
          </div>
        </ChartCard>
      )}

      {tab === "Agentes" && !loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {(
            [
              ["Flujo A · Renovación", flujoA, setFlujoA],
              ["Flujo B · Reactivación", flujoB, setFlujoB],
            ] as const
          ).map(([title, flow, setFlow]) => (
            <ChartCard
              key={title}
              title={title}
              toolbar={<Badge tone="muted">{flow.segment || "—"}</Badge>}
            >
              <div className="space-y-3">
                <label className="block min-w-0 text-sm">
                  Nombre
                  <input
                    className="mt-1 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    value={flow.name ?? ""}
                    onChange={(e) => setFlow({ ...flow, name: e.target.value })}
                  />
                </label>
                <label className="block min-w-0 text-sm">
                  ID del agente de voz
                  <input
                    className="mt-1 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs"
                    value={flow.agent_id ?? ""}
                    onChange={(e) => setFlow({ ...flow, agent_id: e.target.value })}
                  />
                </label>
                <label className="block min-w-0 text-sm">
                  Phone number ID
                  <input
                    className="mt-1 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs"
                    value={flow.phone_number_id ?? ""}
                    onChange={(e) => setFlow({ ...flow, phone_number_id: e.target.value })}
                  />
                </label>
              </div>
            </ChartCard>
          ))}
        </div>
      )}

      {tab === "Cumplimiento" && !loading && (
        <ChartCard title="Ley 1581 — Habeas Data">
          <ul className="space-y-4">
            {(
              [
                ["ventana_8_20", "Ventana horaria 8:00–20:00 COT"],
                ["grabacion", "Grabación y trazabilidad"],
                ["identificacion", "Identificación como asistente virtual"],
              ] as const
            ).map(([key, label]) => (
              <li key={key} className="flex min-w-0 items-center justify-between gap-4">
                <span className="min-w-0 truncate text-sm">{label}</span>
                <Toggle
                  checked={channels[key]}
                  label={label}
                  onChange={() => setChannels((c) => ({ ...c, [key]: !c[key] }))}
                />
              </li>
            ))}
            <li className="flex min-w-0 items-center justify-between gap-4 text-sm">
              <span className="min-w-0 truncate">Lista de exclusión (opt-out)</span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { listOptOuts } = await import("@/services/ops-client");
                    const res = await listOptOuts();
                    toast.message(`${res.total} números en exclusión`, {
                      description: res.items.slice(0, 5).join(", ") || "vacía",
                    });
                  } catch (err) {
                    toast.error("No se pudo cargar opt-outs", {
                      description: err instanceof Error ? err.message : "Error",
                    });
                  }
                }}
              >
                Ver lista
              </Button>
            </li>
          </ul>
        </ChartCard>
      )}

      {tab === "Privacidad" && !loading && (
        <ChartCard title="Enmascarado de PII">
          <ul className="space-y-4">
            <li className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm">Enmascarar PII en lecturas Ops</p>
                <p className="text-xs text-[var(--muted)]">
                  Teléfonos, cédulas y nombres en GET /ops. Laboratorio usa valores crudos para
                  pruebas.
                </p>
              </div>
              <Toggle
                checked={piiMasking}
                label="PII masking"
                onChange={() => setPiiMasking((v) => !v)}
              />
            </li>
          </ul>
        </ChartCard>
      )}
    </div>
  );
}
