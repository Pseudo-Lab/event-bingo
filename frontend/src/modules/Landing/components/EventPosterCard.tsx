import type { PublicLandingEvent } from "../../../api/public_event_api";
import {
  formatLandingDate,
  formatPosterDate,
  generatePosterMeta,
  POSTER_THEMES,
} from "../utils/landingHelpers";

/* ── Poster Decoration ───────────────────────────────────── */

const PosterDecoration = ({ accent }: { accent: string }) => (
  <>
    <div className={`absolute -top-8 -right-8 w-36 h-36 rounded-full ${accent} transition-transform duration-500 group-hover:scale-110`} />
    <div className={`absolute bottom-12 -left-6 w-20 h-20 rounded-full ${accent} transition-transform duration-500 group-hover:translate-x-1`} />
    <div className={`absolute top-16 right-12 w-10 h-10 rounded-full ${accent} transition-transform duration-500 group-hover:-translate-y-1`} />
  </>
);

/* ── EventPosterCard ─────────────────────────────────────── */

type EventPosterCardProps = {
  event: PublicLandingEvent;
  index: number;
};

const EventPosterCard = ({ event, index }: EventPosterCardProps) => {
  const theme = POSTER_THEMES[index % POSTER_THEMES.length];
  const meta = generatePosterMeta(event);

  return (
    <div
      className="animate-soft-rise group block overflow-hidden rounded-[2rem] border border-white/70 shadow-soft transition-shadow duration-300 hover:shadow-lg"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Poster */}
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${theme.bg} aspect-[3/2] sm:aspect-[4/3] lg:aspect-[5/4] px-5 pb-5 pt-4 flex flex-col justify-between`}
      >
        <div aria-hidden="true">
          <PosterDecoration accent={theme.accent} />
        </div>
        <div className="relative z-10">
          <h3 className={`text-xl font-bold leading-tight tracking-tight ${theme.text}`}>
            {event.name}
          </h3>
          <p className={`text-sm mt-2 font-medium ${theme.sub}`}>{meta.tagline}</p>
        </div>
        <div className="relative z-10 space-y-2">
          <p className={`text-xs ${theme.date}`}>{formatPosterDate(event.startAt)}</p>
          <div className="flex flex-wrap gap-1.5">
            {meta.tags.map((tag) => (
              <span
                key={tag}
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${theme.badge}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* Info strip */}
      <div className="bg-white/85 backdrop-blur border-t border-white/70 px-5 py-4">
        <h4 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-brand-700 transition-colors">
          {event.name}
        </h4>
        <p className="text-xs text-slate-500 mb-3">{meta.desc}</p>
        <p className="text-xs text-slate-400">{formatLandingDate(event.startAt)}</p>
      </div>
    </div>
  );
};

export default EventPosterCard;
