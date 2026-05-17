import { Link } from "react-router-dom";

const linkClassName =
  "inline-flex min-h-8 items-center rounded-lg text-sm font-bold leading-5 text-slate-300 transition-colors hover:text-mint-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint-200";

const PublicFooter = () => (
  <footer className="relative z-10 border-t border-white/10 bg-slate-950 text-white">
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10 md:py-10 lg:px-10">
      <div className="max-w-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700">
            <span className="text-xs font-black text-white">B</span>
          </div>
          <p className="text-xl font-black tracking-tight text-slate-50">
            Bingo <span className="text-mint-200">Networking</span>
          </p>
        </div>
        <p className="text-sm leading-6 text-slate-300">
          커뮤니티와 행사를 연결하는 네트워킹 플랫폼
        </p>
        <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
          &copy; 2023 DevFactory.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-6 text-sm sm:grid-cols-2 md:min-w-[22rem] md:gap-8">
        <nav aria-label="정책" className="grid content-start gap-1">
          <p className="text-sm font-black text-slate-100">정책</p>
          <Link to="/terms" target="_blank" rel="noreferrer" className={linkClassName}>
            이용약관
          </Link>
          <Link to="/privacy" target="_blank" rel="noreferrer" className={linkClassName}>
            개인정보처리방침
          </Link>
        </nav>

        <div className="grid content-start gap-1">
          <p className="text-sm font-black text-slate-100">문의</p>
          <a href="mailto:devfactory.ops@gmail.com" className={`${linkClassName} break-all`}>
            devfactory.ops@gmail.com
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default PublicFooter;
