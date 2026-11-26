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
                <a
                  href={SHEETS_LINKS.docsFolder}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Carpeta Google Docs ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {isMayo ? (
          <>
            {/* Summary KPIs */}
            <section className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                <p className="text-xs text-slate-500">Guías How to Get</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{MAYO_HTG.length}</p>
                <p className="mt-0.5 text-xs text-slate-400">En Supabase + 120 fotos WebP</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                <p className="text-xs text-slate-500">Packages &amp; Combos</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{MAYO_PACKAGES.length}</p>
                <p className="mt-0.5 text-xs text-slate-400">Docs completos + Ficha SEO</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                <p className="text-xs text-slate-500">Otros de Contenidos</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{MAYO_CONTENIDOS.length}</p>
                <p className="mt-0.5 text-xs text-slate-400">Blogs &amp; Travel Tips de Mayo</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                <p className="text-xs text-slate-500">Auditoría Imágenes</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">51</p>
                <p className="mt-0.5 text-xs text-slate-400">Artículos corregidos + citas minimalistas</p>
              </div>
            </section>

            {/* Section 1: 30 How to Get */}
            <section className="rounded-2xl border border-slate-200/80 bg-white">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  1. Guías «How to Get» ({MAYO_HTG.length})
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Redactadas con estructura SEO a medida, enlaces internos a transporte y 4 imágenes WebP por guía en Supabase.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">#</th>
                      <th className="px-6 py-3 font-medium">Título</th>
                      <th className="px-6 py-3 font-medium">Keyword</th>
                      <th className="px-6 py-3 font-medium text-right">Vol. US</th>
                      <th className="px-6 py-3 font-medium text-right">Palabras</th>
                      <th className="px-6 py-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MAYO_HTG.map((item, i) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 text-xs text-slate-400">{i + 1}</td>
                        <td className="px-6 py-3 font-medium text-slate-900">
                          <div>{item.title}</div>
                          <div className="mt-0.5 text-xs font-normal text-slate-400">{item.slug}</div>
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-600">{item.keyword}</td>
                        <td className="px-6 py-3 text-right text-xs text-slate-600">
                          {item.volume.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right text-xs text-slate-600">{item.words}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 2: 36 Packages & Combos */}
            <section className="rounded-2xl border border-slate-200/80 bg-white">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  2. Paquetes y Combos (/packages/) ({MAYO_PACKAGES.length})
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Fichas completas en Google Docs con metadatos SEO al inicio, itinerario detallado y FAQs.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">#</th>
                      <th className="px-6 py-3 font-medium">Categoría</th>
                      <th className="px-6 py-3 font-medium">Paquete / Combo</th>
                      <th className="px-6 py-3 font-medium">Duración</th>
                      <th className="px-6 py-3 font-medium">Precio Ref.</th>
                      <th className="px-6 py-3 font-medium">Documento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MAYO_PACKAGES.map((pkg) => (
                      <tr key={pkg.num} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 text-xs text-slate-400">{pkg.num}</td>
                        <td className="px-6 py-3">
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
                        <td className="px-6 py-3 font-medium text-slate-900">
                          <div>{pkg.title}</div>
                          <div className="mt-0.5 text-xs font-normal text-slate-400">{pkg.slug}</div>
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-600">{pkg.duration}</td>
                        <td className="px-6 py-3 text-xs font-medium text-slate-800">{pkg.price}</td>
                        <td className="px-6 py-3">
                          <a
                            href={pkg.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Abrir Doc ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3: Other Mayo Contenidos */}
            {MAYO_CONTENIDOS.length > 0 && (
              <section className="rounded-2xl border border-slate-200/80 bg-white">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h2 className="text-base font-semibold text-slate-900">
                    3. Otros Contenidos de Mayo ({MAYO_CONTENIDOS.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-medium">Tipo</th>
                        <th className="px-6 py-3 font-medium">Título</th>
                        <th className="px-6 py-3 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MAYO_CONTENIDOS.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3 text-xs font-medium text-slate-600">{item.type}</td>
                          <td className="px-6 py-3 text-slate-900">{item.title}</td>
                          <td className="px-6 py-3 text-xs text-slate-600">{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
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
