import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type LegalDocumentKey = "terms" | "privacy";

type LegalDocumentLayoutProps = {
  activeDocument: LegalDocumentKey;
  eyebrow: string;
  title: string;
  meta?: string;
  description: string;
  children: ReactNode;
};

const LEGAL_DOCUMENTS: Array<{ key: LegalDocumentKey; label: string; to: string }> = [
  { key: "terms", label: "이용약관", to: "/terms" },
  { key: "privacy", label: "개인정보처리방침", to: "/privacy" },
];

const LegalDocumentLayout = ({
  activeDocument,
  eyebrow,
  title,
  meta,
  description,
  children,
}: LegalDocumentLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#f4f8f2] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,172,121,0.18),transparent_26%),radial-gradient(circle_at_90%_15%,rgba(12,73,53,0.12),transparent_18%),linear-gradient(180deg,#f4f8f2_0%,#edf5f0_100%)]"
      />

      <main className="relative mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-10 lg:py-10">
        <aside className="self-start rounded-[1.75rem] border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur lg:sticky lg:top-6">
          <p className="mb-3 text-xs font-black tracking-[0.2em] text-slate-400">
            정책 문서
          </p>
          <nav className="grid gap-2" aria-label="법적 고지 문서">
            {LEGAL_DOCUMENTS.map((document) => {
              const isActive = document.key === activeDocument;

              return (
                <Link
                  key={document.key}
                  to={document.to}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-2xl px-4 py-3 text-sm font-extrabold transition-colors ${
                    isActive
                      ? "bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
                      : "text-slate-500 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  {document.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 rounded-[2rem] border border-white/70 bg-white/85 px-6 py-6 shadow-soft backdrop-blur sm:px-8 sm:py-8">
          <header className="mb-8 border-b border-slate-100 pb-6">
            <p className="text-sm font-bold uppercase tracking-[0.26em] text-brand-700">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
              {title}
            </h1>
            {meta ? (
              <p className="mt-3 text-sm font-bold text-slate-500">{meta}</p>
            ) : null}
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              {description}
            </p>
          </header>

          {children}
        </section>
      </main>
    </div>
  );
};

export default LegalDocumentLayout;
