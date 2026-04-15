import { Link } from "react-router-dom";

type PublicEventStatePageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800";
const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:text-slate-950";

const PublicEventStatePage = ({
  eyebrow = "Event Access",
  title,
  description,
  secondaryActionLabel,
  onSecondaryAction,
}: PublicEventStatePageProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eff8f4] px-4 py-10 text-slate-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(88,190,158,0.28),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(15,118,110,0.18),_transparent_34%)]"
        aria-hidden="true"
      />

      <main className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-[2.2rem]">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className={primaryButtonClassName}>
              메인으로 이동
            </Link>
            {secondaryActionLabel && onSecondaryAction ? (
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={onSecondaryAction}
              >
                {secondaryActionLabel}
              </button>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
};

export default PublicEventStatePage;
