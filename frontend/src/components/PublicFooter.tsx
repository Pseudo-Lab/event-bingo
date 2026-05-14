import { Link } from "react-router-dom";

const linkClassName =
  "inline-flex min-h-9 items-center rounded-lg text-sm font-bold leading-5 text-slate-300 transition-colors hover:text-mint-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint-200";

const PublicFooter = () => (
  <footer className="relative z-10 bg-slate-950 text-white">
    <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 sm:px-6 sm:py-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10 md:py-10 lg:px-10">
      <div className="max-w-sm">
        <p className="mb-2 text-xl font-black tracking-[-0.03em] text-slate-50">DevFactory</p>
        <p className="text-sm leading-6 text-slate-300">
          커뮤니티와 행사를 연결하는 네트워킹 플랫폼
        </p>
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
          &copy; 2023 DevFactory. All rights reserved.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm sm:grid-cols-3 md:min-w-[28rem] md:gap-8">
        <nav aria-label="서비스" className="grid content-start gap-1">
          <p className="text-sm font-black text-slate-100">서비스</p>
          <a href="/#events" className={linkClassName}>
            이벤트 사례
          </a>
          <a href="/#apply" className={linkClassName}>
            관리자 신청
          </a>
        </nav>

        <nav aria-label="정책" className="grid content-start gap-1">
          <p className="text-sm font-black text-slate-100">정책</p>
          <Link to="/terms" target="_blank" rel="noreferrer" className={linkClassName}>
            이용약관
          </Link>
          <Link to="/privacy" target="_blank" rel="noreferrer" className={linkClassName}>
            개인정보처리방침
          </Link>
        </nav>

        <div className="col-span-2 grid content-start gap-1 sm:col-span-1">
          <p className="text-sm font-black text-slate-100">문의</p>
          <a href="mailto:soohyun.dev@gmail.com" className={`${linkClassName} break-all`}>
            soohyun.dev@gmail.com
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default PublicFooter;
