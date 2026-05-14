import {
  type EventCase,
  formatEventCaseDate,
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
  event: EventCase;
  index: number;
};

const EventPosterCard = ({ event, index }: EventPosterCardProps) => {
  const theme = POSTER_THEMES[index % POSTER_THEMES.length];

  return (
    <article
      className="animate-soft-rise group flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-soft transition-shadow duration-300 hover:shadow-lg"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Poster */}
      <div className={`relative flex min-h-[18rem] flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br ${theme.bg} px-6 py-6`}>
        <div aria-hidden="true">
          <PosterDecoration accent={theme.accent} />
        </div>
        <div className="relative z-10 flex flex-col items-start">
          <div className="flex min-h-24 items-start">
            <h3 className={`text-xl font-bold leading-tight tracking-tight ${theme.text}`}>
              {event.name}
            </h3>
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex flex-wrap gap-1.5">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${theme.badge}`}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-5 space-y-1">
            <p className={`text-sm font-semibold ${theme.date}`}>
              {formatEventCaseDate(event.startAt)}
            </p>
            <p className="text-sm font-semibold leading-5 text-slate-600">{event.place}</p>
          </div>
        </div>
      </div>
    </article>
  );
};

export default EventPosterCard;
