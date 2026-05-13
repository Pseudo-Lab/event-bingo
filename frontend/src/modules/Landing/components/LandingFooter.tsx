import { Link } from "react-router-dom";

const LandingFooter = () => (
  <footer className="relative z-10 bg-slate-900 text-white">
    <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[minmax(0,1fr)_auto] lg:px-10">
      <div className="max-w-sm">
        <p className="mb-3 text-xl font-black tracking-[-0.03em] text-slate-100">DevFactory</p>
        <p className="text-sm leading-6 text-slate-500">
          커뮤니티와 행사를 연결하는 네트워킹 플랫폼
        </p>
        <p className="mt-7 text-sm text-slate-500">
          &copy; 2023 DevFactory. All rights reserved.
        </p>
      </div>

      <div className="grid gap-8 text-sm sm:grid-cols-3 md:min-w-[28rem]">
        <nav aria-label="서비스" className="grid content-start gap-3">
          <p className="font-black text-slate-300">서비스</p>
          <a href="/#events" className="text-slate-500 transition-colors hover:text-slate-300">
            이벤트 사례
          </a>
          <a href="/#apply" className="text-slate-500 transition-colors hover:text-slate-300">
            관리자 신청
          </a>
        </nav>

        <nav aria-label="정책" className="grid content-start gap-3">
          <p className="font-black text-slate-300">정책</p>
          <Link
            to="/terms"
            target="_blank"
            rel="noreferrer"
            className="text-slate-500 transition-colors hover:text-slate-300"
          >
            이용약관
          </Link>
          <Link
            to="/privacy"
            target="_blank"
            rel="noreferrer"
            className="text-slate-500 transition-colors hover:text-slate-300"
          >
            개인정보처리방침
          </Link>
        </nav>

        <div className="grid content-start gap-3">
          <p className="font-black text-slate-300">문의</p>
          <a
            href="mailto:soohyun.dev@gmail.com"
            className="break-all text-slate-500 transition-colors hover:text-slate-300"
          >
            soohyun.dev@gmail.com
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default LandingFooter;
