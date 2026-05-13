import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { submitEventManagerApplication } from "../../../api/public_event_api";

type ApplicationFormState = {
  name: string;
  email: string;
  eventName: string;
  eventPurpose: string;
};

const initialFormState: ApplicationFormState = {
  name: "",
  email: "",
  eventName: "",
  eventPurpose: "",
};

const AdminApplicationForm = () => {
  const [form, setForm] = useState<ApplicationFormState>(initialFormState);
  const [formError, setFormError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) { setFormError("이름을 입력해 주세요."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim().toLowerCase())) {
      setFormError("올바른 이메일 주소를 입력해 주세요."); return;
    }
    if (!form.eventName.trim()) { setFormError("행사명을 입력해 주세요."); return; }
    try {
      setIsSubmitting(true);
      setFormError("");
      setSubmitMessage("");
      await submitEventManagerApplication({
        name: form.name,
        email: form.email,
        eventName: form.eventName,
        eventPurpose: form.eventPurpose || "미입력",
      });
      setSubmitMessage("신청을 접수했습니다. 입력하신 이메일로 검토 결과를 안내드릴게요.");
      setForm(initialFormState);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "신청을 접수하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="apply"
      className="bg-white/85 backdrop-blur rounded-[2rem] border border-white/70 shadow-soft p-7 sm:p-8 scroll-mt-24 lg:scroll-mt-28"
    >
      <p className="text-sm font-semibold text-brand-700 mb-1">이벤트 관리자 신청</p>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">
        행사 운영 권한이 필요하신가요?
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        신청 검토 후 관리자 계정을 발급해드립니다.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="app-name" className="block text-xs font-semibold text-slate-700 mb-1">
              이름
            </label>
            <input
              id="app-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="김행사"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="app-email" className="block text-xs font-semibold text-slate-700 mb-1">
              이메일
            </label>
            <input
              id="app-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="organizer@example.com"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:shadow-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="app-event" className="block text-xs font-semibold text-slate-700 mb-1">
            행사명
          </label>
          <input
            id="app-event"
            type="text"
            value={form.eventName}
            onChange={(e) => setForm((p) => ({ ...p, eventName: e.target.value }))}
            placeholder="2026 Bingo Networking Day"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:shadow-sm"
          />
        </div>

        <div>
          <label htmlFor="app-purpose" className="block text-xs font-semibold text-slate-700 mb-1">
            행사 목적 (선택)
          </label>
          <textarea
            id="app-purpose"
            value={form.eventPurpose}
            onChange={(e) => setForm((p) => ({ ...p, eventPurpose: e.target.value }))}
            rows={2}
            placeholder="예: 참가자 간 아이스브레이킹, 기술 네트워킹, 후원사 부스 유입 유도 등"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:shadow-sm resize-none"
          />
        </div>

        {formError && (
          <p role="alert" className="text-sm font-semibold text-rose-600">
            {formError}
          </p>
        )}
        {submitMessage && (
          <p role="status" className="text-sm font-semibold text-brand-700">
            {submitMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-700 hover:bg-brand-800 active:scale-[0.98] disabled:opacity-60 text-white font-bold py-3 text-sm transition-all"
        >
          {isSubmitting ? "접수 중..." : "관리자 권한 신청"}
        </button>
        <p className="text-center text-xs leading-5 text-slate-400">
          제출 시 이름, 이메일, 행사명, 행사 목적이 관리자 신청 검토와 연락을 위해
          처리됩니다. 자세한 내용은{" "}
          <Link
            to="/privacy"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            개인정보처리방침
          </Link>
          을 확인해 주세요.
        </p>
      </form>
    </div>
  );
};

export default AdminApplicationForm;
