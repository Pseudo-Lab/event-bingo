import AdminApplicationForm from "./AdminApplicationForm";
import { scrollToHashTarget } from "../utils/scrollToHashTarget";

const HeroSection = () => (
  <section className="relative border-b border-slate-100 overflow-hidden">
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/hero-networking.jpg')" }}
      aria-hidden="true"
    />
    <div
      className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/70 to-slate-900/30"
      aria-hidden="true"
    />

    <div className="relative mx-auto grid max-w-7xl items-start gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-20">
      {/* Left — headline + CTA */}
      <div className="animate-soft-rise space-y-6">
        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black tracking-[-0.03em] text-white leading-[1.15]">
          행사 네트워킹을<br />
          더 쉽고 재밌게
        </h1>
        <p className="text-base lg:text-lg text-slate-200 leading-7 max-w-md">
          행사 목적에 맞는 키워드로 참가자 대화를 유도하고,
          운영자는 결과와 참여 현황을 한 화면에서 관리합니다.
        </p>
        <a
          href="#events"
          onClick={(event) => {
            event.preventDefault();
            scrollToHashTarget("#events");
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.97] text-white px-6 py-3 text-sm font-bold transition-all"
        >
          이벤트 사례 보기 <span aria-hidden="true">&rarr;</span>
        </a>
      </div>

      {/* Right — application form */}
      <div className="animate-soft-rise" style={{ animationDelay: "90ms" }}>
        <AdminApplicationForm />
      </div>
    </div>
  </section>
);

export default HeroSection;
