import LandingNavbar from "../../components/LandingNavbar";
import EventCatalog from "./components/EventCatalog";
import HeroSection from "./components/HeroSection";
import LandingFooter from "./components/LandingFooter";

const LandingHomePage = () => {
  return (
    <div className="min-h-screen bg-[#f3f8f4] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(29,172,121,0.18),transparent_22%),radial-gradient(circle_at_88%_12%,rgba(14,88,63,0.14),transparent_18%),linear-gradient(180deg,#f3f8f4_0%,#e8f1ed_100%)]"
      />
      <LandingNavbar />

      <main id="main-content">
        <HeroSection />
        <EventCatalog />
      </main>

      <LandingFooter />
    </div>
  );
};

export default LandingHomePage;
