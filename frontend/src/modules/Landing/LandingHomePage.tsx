import { useEffect, useState } from "react";
import {
  getPublicEventCatalog,
  type PublicLandingEvent,
} from "../../api/public_event_api";
import LandingNavbar from "../../components/LandingNavbar";
import EventCatalog from "./components/EventCatalog";
import HeroSection from "./components/HeroSection";
import LandingFooter from "./components/LandingFooter";

const LandingHomePage = () => {
  const [events, setEvents] = useState<PublicLandingEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      try {
        const nextEvents = await getPublicEventCatalog();
        if (!cancelled) setEvents(nextEvents);
      } catch {
        // silent
      } finally {
        if (!cancelled) setIsLoadingEvents(false);
      }
    };
    void loadEvents();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f8f4] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(29,172,121,0.18),transparent_22%),radial-gradient(circle_at_88%_12%,rgba(14,88,63,0.14),transparent_18%),linear-gradient(180deg,#f3f8f4_0%,#e8f1ed_100%)]"
      />
      <LandingNavbar />

      <main id="main-content">
        <HeroSection />
        <EventCatalog events={events} isLoading={isLoadingEvents} />
      </main>

      <LandingFooter />
    </div>
  );
};

export default LandingHomePage;
