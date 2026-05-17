import { Link } from "react-router-dom";
import { getAdminPath } from "../config/eventProfiles";
import { useSiteAnalytics } from "../modules/Landing/siteAnalytics";

const LandingNavbar = () => {
  const { track } = useSiteAnalytics();

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-brand-700 focus:font-bold">
        본문 바로가기
      </a>
      <nav
        aria-label="메인 네비게이션"
        className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-10">
          <a href="/" className="flex items-center transition-opacity hover:opacity-80" aria-label="홈으로">
            <span className="font-black text-lg tracking-tight text-slate-900">
              Bingo <span className="text-brand-700">Networking</span>
            </span>
          </a>
          <Link
            to={getAdminPath()}
            onClick={() =>
              track("admin_login_clicked", {
                section_id: "nav",
                cta_id: "nav_admin_login",
                cta_destination: getAdminPath(),
              })
            }
            className="inline-flex rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-3 py-2 transition-colors sm:px-4"
          >
            관리자 로그인
          </Link>
        </div>
      </nav>
    </>
  );
};

export default LandingNavbar;
