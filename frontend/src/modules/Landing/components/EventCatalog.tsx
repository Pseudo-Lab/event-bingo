import EventPosterCard from "./EventPosterCard";
import { EVENT_CASES } from "../utils/landingHelpers";
import { scrollToHashTarget } from "../utils/scrollToHashTarget";

const EventCatalog = () => {
  return (
    <section id="events" className="relative scroll-mt-16 pb-16 pt-14 lg:pb-20 lg:pt-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="animate-soft-rise mb-12 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-700 mb-3">
            Event Cases
          </p>
          <h2 className="text-3xl font-bold tracking-[-0.05em] text-slate-950 mb-3">
            행사 사례
          </h2>
          <p className="text-slate-500 text-base">
            Bingo Networking을 진행한 행사들입니다.
          </p>
        </div>

        <div className="animate-soft-fade grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {EVENT_CASES.map((eventItem, index) => (
            <EventPosterCard key={eventItem.id} event={eventItem} index={index} />
          ))}
        </div>

        <div className="animate-soft-rise mt-12 text-center" style={{ animationDelay: "140ms" }}>
          <p className="text-slate-600 mb-4">
            준비 중인 행사에서 Bingo Networking을 활용해 보세요.
          </p>
          <a
            href="#apply"
            onClick={(event) => {
              event.preventDefault();
              scrollToHashTarget("#apply");
            }}
            className="inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 active:scale-[0.97] text-white px-6 py-3 text-sm font-semibold transition-all"
          >
            신청하기 <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default EventCatalog;
