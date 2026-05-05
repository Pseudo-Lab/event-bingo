import { useMemo } from "react";
import type { PublicLandingEvent } from "../../../api/public_event_api";
import EventPosterCard from "./EventPosterCard";
import { scrollToHashTarget } from "../utils/scrollToHashTarget";

type EventCatalogProps = {
  events: PublicLandingEvent[];
  isLoading: boolean;
};

const EventCatalog = ({ events, isLoading }: EventCatalogProps) => {
  const displayEvents = useMemo(() => events.slice(0, 4), [events]);
  const gridCols =
    displayEvents.length <= 2
      ? "lg:grid-cols-2"
      : displayEvents.length === 3
        ? "lg:grid-cols-3"
        : "lg:grid-cols-4";

  return (
    <section id="events" className="relative scroll-mt-16 pb-16 pt-14 lg:pb-20 lg:pt-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="animate-soft-rise mb-12 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-700 mb-3">
            Event Cases
          </p>
          <h2 className="text-3xl font-bold tracking-[-0.05em] text-slate-950 mb-3">
            이벤트 사례
          </h2>
          <p className="text-slate-500 text-base">
            다양한 개발자 네트워킹 행사에서 Bingo Networking이 함께했습니다.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-[360px]" />
            ))}
          </div>
        ) : displayEvents.length > 0 ? (
          <div className={`animate-soft-fade grid grid-cols-1 gap-6 sm:grid-cols-2 ${gridCols}`}>
            {displayEvents.map((eventItem, index) => (
              <EventPosterCard key={eventItem.id} event={eventItem} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 text-sm">
            아직 공개된 행사가 없습니다.
          </div>
        )}

        <div className="animate-soft-rise mt-12 text-center" style={{ animationDelay: "140ms" }}>
          <p className="text-slate-600 mb-4">
            우리 행사에서도 빙고 네트워킹을 시작해 보세요.
          </p>
          <a
            href="#apply"
            onClick={(event) => {
              event.preventDefault();
              scrollToHashTarget("#apply");
            }}
            className="inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 active:scale-[0.97] text-white px-6 py-3 text-sm font-semibold transition-all"
          >
            관리자 신청하기 <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default EventCatalog;
