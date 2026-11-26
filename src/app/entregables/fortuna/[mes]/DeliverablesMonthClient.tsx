"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  GeneralDeliverable,
  HtgDeliverable,
  PackageDeliverable,
} from "@/data/fortunaDeliverables";

type ReviewStatus =
  | "por_revisar"
  | "en_revision"
  | "aprobado"
  | "cambios_solicitados"
  | "publicado";

interface ReviewRecord {
  status: ReviewStatus;
  client_note?: string;
}

const STATUS_OPTIONS: {
  value: ReviewStatus;
  label: string;
  pillClass: string;
}[] = [
  {
    value: "por_revisar",
    label: "Por revisar",
    pillClass: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    value: "en_revision",
    label: "En revisión",
    pillClass: "border-sky-200 bg-sky-50 text-sky-800",
  },
  {
    value: "aprobado",
    label: "Aprobado",
    pillClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    value: "cambios_solicitados",
    label: "Cambios solicitados",
    pillClass: "border-rose-200 bg-rose-50 text-rose-800",
  },
  {
    value: "publicado",
    label: "Publicado",
    pillClass: "border-indigo-200 bg-indigo-50 text-indigo-800",
  },
];

function getStatusStyle(status: ReviewStatus) {
  return (
    STATUS_OPTIONS.find((o) => o.value === status)?.pillClass ||
    "border-slate-200 bg-slate-50 text-slate-700"
  );
}

export default function DeliverablesMonthClient({
  monthSlug,
  htgItems,
  packageItems,
  otherItems,
  driveFolders,
}: {
  monthSlug: string;
  htgItems: (HtgDeliverable & { docUrl?: string })[];
  packageItems: PackageDeliverable[];
  otherItems: GeneralDeliverable[];
  driveFolders: {
    htgFolder: string;
    packagesFolder: string;
    contenidosSheet: string;
    combosRefSheet: string;
  };
}) {
  const [reviews, setReviews] = useState<Record<string, ReviewRecord>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | ReviewStatus>("all");
  const [query, setQuery] = useState("");
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/entregables/status?month=${encodeURIComponent(monthSlug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active || !Array.isArray(d?.items)) return;
        const map: Record<string, ReviewRecord> = {};
        for (const row of d.items) {
          map[row.item_key] = {
            status: row.status,
            client_note: row.client_note || "",
          };
        }
        setReviews(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [monthSlug]);

  async function updateStatus(itemKey: string, nextStatus: ReviewStatus, note?: string) {
    setSavingKey(itemKey);
    setReviews((prev) => ({
      ...prev,
      [itemKey]: {
        status: nextStatus,
        client_note: note !== undefined ? note : prev[itemKey]?.client_note || "",
      },
    }));

    try {
      await fetch("/api/entregables/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_key: itemKey,
          month_slug: monthSlug,
          status: nextStatus,
          ...(note !== undefined ? { client_note: note } : {}),
        }),
      });
      setSavedKey(itemKey);
      setTimeout(() => {
        setSavedKey((curr) => (curr === itemKey ? null : curr));
      }, 1800);
    } finally {
      setSavingKey(null);
    }
  }

  function getStatus(key: string): ReviewStatus {
    return reviews[key]?.status || "por_revisar";
  }

  const q = query.trim().toLowerCase();

  const filteredHtg = useMemo(
    () =>
      htgItems.filter((item) => {
        const key = `htg:${item.id}`;
        const st = getStatus(key);
        if (filterStatus !== "all" && st !== filterStatus) return false;
        if (q && !`${item.title} ${item.keyword} ${item.slug}`.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      }),
    [htgItems, reviews, filterStatus, q]
  );

  const filteredPackages = useMemo(
    () =>
      packageItems.filter((item) => {
        const key = `pkg:${item.num}`;
        const st = getStatus(key);
        if (filterStatus !== "all" && st !== filterStatus) return false;
        if (q && !`${item.title} ${item.category} ${item.keyword} ${item.slug}`.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      }),
    [packageItems, reviews, filterStatus, q]
  );

  const filteredOthers = useMemo(
    () =>
      otherItems.filter((item, idx) => {
        const key = `other:${idx}`;
        const st = getStatus(key);
        if (filterStatus !== "all" && st !== filterStatus) return false;
        if (q && !`${item.title} ${item.type}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [otherItems, reviews, filterStatus, q]
  );

  const counts = useMemo(() => {
    const allKeys = [
      ...htgItems.map((i) => `htg:${i.id}`),
      ...packageItems.map((p) => `pkg:${p.num}`),
      ...otherItems.map((_, idx) => `other:${idx}`),
    ];
    const map: Record<ReviewStatus, number> = {
      por_revisar: 0,
      en_revision: 0,
      aprobado: 0,
      cambios_solicitados: 0,
      publicado: 0,
    };
    for (const k of allKeys) map[getStatus(k)]++;
    return map;
  }, [htgItems, packageItems, otherItems, reviews]);

  function renderStatusCell(itemKey: string) {
    const st = getStatus(itemKey);
    const note = reviews[itemKey]?.client_note || "";
    const isEditing = editingNoteKey === itemKey;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <select
            value={st}
            onChange={(e) => {
              const val = e.target.value as ReviewStatus;
              updateStatus(itemKey, val);
              if (val === "cambios_solicitados") {
                setEditingNoteKey(itemKey);
                setNoteDraft(note);
              }
            }}
            className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition ${getStatusStyle(
              st
            )}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
          {savingKey === itemKey && (
            <span className="text-[11px] text-slate-400">Guardando…</span>
          )}
          {savedKey === itemKey && (
            <span className="text-[11px] font-medium text-emerald-600">Guardado ✓</span>
          )}
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                setEditingNoteKey(null);
              } else {
                setEditingNoteKey(itemKey);
                setNoteDraft(note);
              }
            }}
            title={note ? "Editar nota" : "Agregar nota"}
            className="text-[11px] text-slate-400 hover:text-slate-700"
          >
            {note ? "✎ Nota" : "+ Nota"}
          </button>
        </div>

        {note && !isEditing && (
          <p className="max-w-xs text-[11px] text-slate-500 italic">“{note}”</p>
        )}

        {isEditing && (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Comentario o ajuste…"
              className="w-44 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-800 outline-none focus:border-slate-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateStatus(itemKey, st, noteDraft);
                  setEditingNoteKey(null);
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                updateStatus(itemKey, st, noteDraft);
                setEditingNoteKey(null);
              }}
              className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
            >
              OK
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Drive Folders & Subfolders Quick Access */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Carpetas de Google Drive y Documentos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href={driveFolders.htgFolder}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div>
              <p className="text-xs font-medium text-slate-400">Subcarpeta Drive</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                How to Get ({htgItems.length} Docs)
              </p>
            </div>
            <span className="text-sm text-slate-400 group-hover:text-indigo-600">↗</span>
          </a>

          <a
            href={driveFolders.packagesFolder}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div>
              <p className="text-xs font-medium text-slate-400">Subcarpeta Drive</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                Paquetes y Combos ({packageItems.length} Docs)
              </p>
            </div>
            <span className="text-sm text-slate-400 group-hover:text-indigo-600">↗</span>
          </a>

          <a
            href={driveFolders.contenidosSheet}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div>
              <p className="text-xs font-medium text-slate-400">Google Sheets</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                Hoja Maestra Contenidos
              </p>
            </div>
            <span className="text-sm text-slate-400 group-hover:text-indigo-600">↗</span>
          </a>

          <a
            href={driveFolders.combosRefSheet}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div>
              <p className="text-xs font-medium text-slate-400">Google Sheets</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                Referencias Combos
              </p>
            </div>
            <span className="text-sm text-slate-400 group-hover:text-indigo-600">↗</span>
          </a>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filterStatus === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos ({htgItems.length + packageItems.length + otherItems.length})
          </button>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterStatus(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filterStatus === opt.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label} ({counts[opt.value]})
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar título, keyword o slug…"
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 sm:w-64"
        />
      </section>

      {/* Section 1: 30 How to Get */}
      <section className="rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              1. Guías «How to Get» ({filteredHtg.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Acceso directo a cada Google Doc con su Ficha SEO, contenido completo e imágenes WebP.
            </p>
          </div>
          <a
            href={driveFolders.htgFolder}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Abrir carpeta completa en Drive ↗
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Título &amp; Slug</th>
                <th className="px-5 py-3 font-medium">Keyword / Vol.</th>
                <th className="px-5 py-3 font-medium">Documento</th>
                <th className="px-5 py-3 font-medium">Estatus Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHtg.map((item, i) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    <div>{item.title}</div>
                    <div className="mt-0.5 text-xs font-normal text-slate-400">{item.slug}</div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    <div>{item.keyword}</div>
                    <div className="text-slate-400">
                      {item.volume.toLocaleString()}/mo · {item.words} pal.
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {item.docUrl ? (
                      <a
                        href={item.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Abrir Doc ↗
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">En Nous</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">{renderStatusCell(`htg:${item.id}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: 36 Packages & Combos */}
      <section className="rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              2. Paquetes y Combos (/packages/) ({filteredPackages.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Fichas completas en Google Docs con metadatos SEO al inicio, itinerario detallado y FAQs.
            </p>
          </div>
          <a
            href={driveFolders.packagesFolder}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Abrir carpeta completa en Drive ↗
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Paquete / Combo</th>
                <th className="px-5 py-3 font-medium">Precio / Duración</th>
                <th className="px-5 py-3 font-medium">Documento</th>
                <th className="px-5 py-3 font-medium">Estatus Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPackages.map((pkg) => (
                <tr key={pkg.num} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 text-xs text-slate-400">{pkg.num}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        pkg.category === "Combo 1 Día"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {pkg.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    <div>{pkg.title}</div>
                    <div className="mt-0.5 text-xs font-normal text-slate-400">{pkg.slug}</div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    <div className="font-medium text-slate-800">{pkg.price}</div>
                    <div className="text-slate-400">{pkg.duration}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <a
                      href={pkg.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Abrir Doc ↗
                    </a>
                  </td>
                  <td className="px-5 py-3.5">{renderStatusCell(`pkg:${pkg.num}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Other Mayo Contenidos */}
      {filteredOthers.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              3. Otros Contenidos de Mayo ({filteredOthers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Título</th>
                  <th className="px-5 py-3 font-medium">Estatus Cliente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOthers.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-xs font-medium text-slate-600">{item.type}</td>
                    <td className="px-5 py-3 text-slate-900">{item.title}</td>
                    <td className="px-5 py-3">{renderStatusCell(`other:${idx}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
