import { Link } from "react-router-dom";

const LandingFooter = () => (
  <footer className="bg-slate-900 text-white">
    <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <p className="font-black text-lg mb-2">DevFactory</p>
        <div className="flex gap-4 text-sm text-slate-400">
          <Link to="/privacy" className="hover:text-slate-200 transition-colors">
            이용약관
          </Link>
          <Link to="/privacy" className="hover:text-slate-200 transition-colors">
            개인정보처리방침
          </Link>
          <a href="mailto:contact@devfactory.kr" className="hover:text-slate-200 transition-colors">
            문의하기
          </a>
        </div>
      </div>
      <div className="text-right text-sm text-slate-400">
        <a href="mailto:contact@devfactory.kr" className="hover:text-slate-200 transition-colors">
          contact@devfactory.kr
        </a>
        <p>copyright &copy; DevFactory</p>
      </div>
    </div>
  </footer>
);

export default LandingFooter;
