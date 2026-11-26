import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MAYO_CONTENIDOS,
  MAYO_HTG,
  MAYO_PACKAGES,
  MONTH_CARDS,
  PREVIOUS_MONTHS,
  SHEETS_LINKS,
} from "@/data/fortunaDeliverables";
import DeliverablesMonthClient from "./DeliverablesMonthClient";

export async function generateStaticParams() {
  return MONTH_CARDS.map((c) => ({ mes: c.slug }));
}

export default async function MonthDeliverablesPage({
  params,
}: {
  params: Promise<{ mes: string }>;
}) {
  const { mes } = await params;
  const card = MONTH_CARDS.find((c) => c.slug === mes);
  if (!card) notFound();

  const isMayo = mes === "mayo-2026";
  const prevItems = !isMayo ? PREVIOUS_MONTHS[card.label] || [] : [];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-7">
          <Link
            href="/entregables/fortuna"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            ← Volver al tablero por mes
          </Link>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Entregables · {card.label}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {card.subtitle} · {card.totalItems} elementos registrados
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={SHEETS_LINKS.contenidos}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Hoja Contenidos ↗
              </a>
              {isMayo && (
                <>
                  <a
                    href={SHEETS_LINKS.htgFolder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Carpeta How to Get ↗
                  </a>
                  <a
                    href={SHEETS_LINKS.docsFolder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    Carpeta Paquetes ↗
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {isMayo ? (
          <DeliverablesMonthClient
            monthSlug={mes}
            htgItems={MAYO_HTG}
            packageItems={MAYO_PACKAGES}
            otherItems={MAYO_CONTENIDOS}
            driveFolders={{
              htgFolder: SHEETS_LINKS.htgFolder,
              packagesFolder: SHEETS_LINKS.docsFolder,
              contenidosSheet: SHEETS_LINKS.contenidos,
              combosRefSheet: SHEETS_LINKS.combosRef,
            }}
          />
        ) : (
          <section className="rounded-2xl border border-slate-200/80 bg-white">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Registro de {card.label} ({prevItems.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">#</th>
                    <th className="px-6 py-3 font-medium">Tipo</th>
                    <th className="px-6 py-3 font-medium">Título</th>
                    <th className="px-6 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prevItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 text-xs text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-3 text-xs font-medium text-slate-600">{item.type}</td>
                      <td className="px-6 py-3 text-slate-900">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-600 hover:underline"
                          >
                            {item.title} ↗
                          </a>
                        ) : (
                          item.title
                        )}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-600">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
