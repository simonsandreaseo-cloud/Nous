import Link from "next/link";
import { MONTH_CARDS, SHEETS_LINKS } from "@/data/fortunaDeliverables";

export const metadata = {
  title: "Entregables · Fortuna Expeditions",
  description: "Tablero mensual de entregables SEO, contenidos How to Get y paquetes turísticos de Fortuna Expeditions.",
};

export default function FortunaDeliverablesHub() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Portal de Entregables · Cliente
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Fortuna Expeditions
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tablero organizado por mes. Selecciona una ficha para revisar el detalle completo de cada entrega.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={SHEETS_LINKS.contenidos}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Hoja Contenidos ↗
            </a>
            <a
              href={SHEETS_LINKS.htgFolder}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Carpeta How to Get (Drive) ↗
            </a>
            <a
              href={SHEETS_LINKS.docsFolder}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Carpeta Paquetes (Drive) ↗
            </a>
            <a
              href={SHEETS_LINKS.combosRef}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Referencias Combos ↗
            </a>
            <a
              href={SHEETS_LINKS.competidores}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Competidores SEO ↗
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MONTH_CARDS.map((card) => (
            <Link
              key={card.slug}
              href={`/entregables/fortuna/${card.slug}`}
              className={`group flex flex-col justify-between rounded-2xl border p-6 transition ${
                card.isCurrent
                  ? "border-slate-900 bg-white shadow-sm ring-1 ring-slate-900/5 hover:shadow-md sm:col-span-2 lg:col-span-2"
                  : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      card.isCurrent
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {card.isCurrent ? "Mes Actual" : "Histórico"}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {card.totalItems} entregables
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {card.label}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{card.subtitle}</p>

                <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
                  {card.highlights.map((h, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-medium text-slate-900">
                <span>Ver entregables de {card.label}</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
