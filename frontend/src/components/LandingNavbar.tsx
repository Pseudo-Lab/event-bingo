import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAdminPath } from "../config/eventProfiles";
import { scrollToHashTarget } from "../modules/Landing/utils/scrollToHashTarget";

const NAV_LINKS = [
  { label: "이벤트 사례", to: "/#events" },
  { label: "데모 체험", to: "/experience" },
  { label: "관리자 신청", to: "/#apply" },
] as const;

const LandingNavbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLinkClick = useCallback(
    (e: React.MouseEvent, to: string) => {
      setMobileMenuOpen(false);

      // Hash link on the same page — smooth scroll
      if (to.startsWith("/#") && pathname === "/") {
        e.preventDefault();
        const hash = to.slice(1); // "#events"
        scrollToHashTarget(hash);
        return;
      }

      // Hash link from another page — navigate to / then scroll
      if (to.startsWith("/#") && pathname !== "/") {
        e.preventDefault();
        const hash = to.slice(1);
        navigate("/");
        // Wait for route transition, then scroll
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToHashTarget(hash);
          }, 100);
        });
        return;
      }

      // Regular page link — navigate and scroll to top
    },
    [pathname, navigate],
  );

  const handlePageLinkClick = useCallback(
    () => {
      setMobileMenuOpen(false);
      // Scroll to top after route change
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0 });
      });
    },
    [],
  );

  const renderLink = (link: typeof NAV_LINKS[number], className: string) => {
    // Hash links use <a> for correct href fallback
    if (link.to.startsWith("/#")) {
      return (
        <a
          key={link.label}
          href={link.to.slice(1)}
          onClick={(e) => handleLinkClick(e, link.to)}
          className={className}
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link
        key={link.label}
        to={link.to}
        onClick={handlePageLinkClick}
        className={className}
      >
        {link.label}
      </Link>
    );
  };

  const renderMobileMenuLink = (link: typeof NAV_LINKS[number]) => {
    const content = (
      <>
        <span>{link.label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-slate-300"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </>
    );

    if (link.to.startsWith("/#")) {
      return (
        <a
          key={link.label}
          href={link.to.slice(1)}
          onClick={(e) => handleLinkClick(e, link.to)}
          className="flex items-center justify-between py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={link.label}
        to={link.to}
        onClick={handlePageLinkClick}
        className="flex items-center justify-between py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
      >
        {content}
      </Link>
    );
  };

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-brand-700 focus:font-bold">
        본문 바로가기
      </a>
      <nav
        aria-label="메인 네비게이션"
        className={`sticky top-0 z-50 bg-white/80 backdrop-blur transition-[border-radius,box-shadow] duration-300 ${
          mobileMenuOpen
            ? "rounded-b-[1.4rem] border-b border-white/70 shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
            : "border-b border-white/70"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-10">
          <a href="/" onClick={(e) => handleLinkClick(e, "/")} className="flex items-center gap-2 transition-opacity hover:opacity-80" aria-label="홈으로">
            <div className="w-7 h-7 rounded-lg bg-brand-700 flex items-center justify-center">
              <span className="text-white text-xs font-black">B</span>
            </div>
            <span className="font-black text-lg tracking-tight text-slate-900">
              Bingo <span className="text-brand-700">Networking</span>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) =>
              renderLink(link, "text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors")
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={getAdminPath()}
              className="hidden sm:inline-flex rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2 transition-colors"
            >
              관리자 로그인
            </Link>
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div
          id="mobile-nav-panel"
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden ${
            mobileMenuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!mobileMenuOpen}
        >
          <div className="min-h-0">
            <div className="border-t border-white/70 px-5 py-1">
              <div className="mx-auto max-w-7xl">
                {NAV_LINKS.map((link) => (
                  <div key={link.label} className="border-b border-slate-100 last:border-b-0">
                    {renderMobileMenuLink(link)}
                  </div>
                ))}
                <div className="border-t border-slate-100/80 pt-1">
                  <Link
                    to={getAdminPath()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2.5 text-sm font-bold text-brand-700 transition-colors hover:text-brand-800"
                  >
                    <span>관리자 로그인</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default LandingNavbar;
