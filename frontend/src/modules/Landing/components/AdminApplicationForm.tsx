import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { submitEventManagerApplication } from "../../../api/public_event_api";
import { Dialog } from "../../../components/ui/dialog";
import { useSiteAnalytics, useSiteSectionExposure } from "../siteAnalytics";

type ApplicationFormState = {
  name: string;
  email: string;
  eventName: string;
  expectedEventDate: string;
  expectedAttendeeRange: string;
  eventPurpose: string;
};

const initialFormState: ApplicationFormState = {
  name: "",
  email: "",
  eventName: "",
  expectedEventDate: "",
  expectedAttendeeRange: "",
  eventPurpose: "",
};

const ATTENDEE_RANGE_OPTIONS = [
  { value: "50", label: "50명 이하" },
  { value: "100", label: "51-100명" },
  { value: "200", label: "101-200명" },
  { value: "201", label: "201명 이상" },
] as const;

const getFilledFieldCount = (form: ApplicationFormState) =>
  Object.values(form).filter((value) => value.trim().length > 0).length;

const AdminApplicationForm = () => {
  const [form, setForm] = useState<ApplicationFormState>(initialFormState);
  const [formError, setFormError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const applyRef = useSiteSectionExposure<HTMLDivElement>("apply", 2);
  const { track } = useSiteAnalytics();
  const hasTrackedFormViewRef = useRef(false);
  const hasTrackedFormStartRef = useRef(false);
  const formStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const element = applyRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35 && !hasTrackedFormViewRef.current) {
          hasTrackedFormViewRef.current = true;
          track("application_form_viewed", { section_id: "apply" });
          observer.disconnect();
        }
      },
      { threshold: [0.35, 0.6] }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [applyRef, track]);

  const updateFormField = (field: keyof ApplicationFormState, value: string) => {
    setForm((previousForm) => {
      const nextForm = { ...previousForm, [field]: value };
      if (!hasTrackedFormStartRef.current) {
        hasTrackedFormStartRef.current = true;
        formStartedAtRef.current = Date.now();
        track("application_form_started", {
          field_id: field,
          filled_field_count: getFilledFieldCount(nextForm),
        });
      }
      return nextForm;
    });
  };

  const trackValidationFailure = (fieldId: string, validationErrorType: string) => {
    track("application_validation_failed", {
      field_id: fieldId,
      validation_error_type: validationErrorType,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const filledFieldCount = getFilledFieldCount(form);
    track("application_submit_clicked", {
      filled_field_count: filledFieldCount,
      has_expected_date: Boolean(form.expectedEventDate),
      has_attendee_range: Boolean(form.expectedAttendeeRange),
      has_purpose: Boolean(form.eventPurpose.trim()),
    });

    if (!form.name.trim()) {
      trackValidationFailure("name", "required");
      setFormError("이름을 입력해 주세요."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim().toLowerCase())) {
      trackValidationFailure("email", "invalid_email");
      setFormError("올바른 이메일 주소를 입력해 주세요."); return;
    }
    if (!form.eventName.trim()) {
      trackValidationFailure("eventName", "required");
      setFormError("행사명을 입력해 주세요."); return;
    }
    if (!form.expectedAttendeeRange) {
      trackValidationFailure("expectedAttendeeRange", "required");
      setFormError("예상 참가자 수를 선택해 주세요."); return;
    }
    try {
      setIsSubmitting(true);
      setFormError("");
      setSubmitMessage("");
      await submitEventManagerApplication({
        name: form.name,
        email: form.email,
        eventName: form.eventName,
        expectedEventDate: form.expectedEventDate
          ? `${form.expectedEventDate}T09:00:00+09:00`
          : undefined,
        expectedAttendeeCount: Number(form.expectedAttendeeRange),
        eventPurpose: form.eventPurpose || "미입력",
      });
      setSubmitMessage(
        "입력하신 이메일로 접수 확인 메일을 발송했습니다."
      );
      track("application_submitted", {
        elapsed_ms_from_form_start: formStartedAtRef.current ? Date.now() - formStartedAtRef.current : 0,
        filled_field_count: filledFieldCount,
      });
      setForm(initialFormState);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "신청을 접수하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={applyRef}
      id="apply"
      className="bg-white/85 backdrop-blur rounded-[2rem] border border-white/70 shadow-soft px-6 pt-6 pb-4 sm:px-7 sm:pt-7 sm:pb-5 scroll-mt-24 lg:scroll-mt-28"
    >
      <p className="text-sm font-semibold text-brand-700 mb-1">Bingo Networking 신청</p>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">
        행사 네트워킹이 필요하신가요?
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        행사 정보와 예상 규모를 남겨주시면 검토 후 접속 방법을 안내해드립니다.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="app-name" className="block text-xs font-semibold text-slate-700 mb-1">
              이름 <span className="text-sm font-bold text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="app-name"
              type="text"
              value={form.name}
              onChange={(e) => updateFormField("name", e.target.value)}
              placeholder="홍길동"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="app-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Google 로그인에 사용할 이메일 <span className="text-sm font-bold text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="app-email"
              type="email"
              value={form.email}
              onChange={(e) => updateFormField("email", e.target.value)}
              placeholder="organizer@example.com"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="app-event" className="block text-xs font-semibold text-slate-700 mb-1">
              행사명 <span className="text-sm font-bold text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="app-event"
              type="text"
              value={form.eventName}
              onChange={(e) => updateFormField("eventName", e.target.value)}
              placeholder="2026 Bingo Networking Day"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="app-date" className="block text-xs font-semibold text-slate-700 mb-1">
              예상 행사 날짜
            </label>
            <input
              id="app-date"
              type="date"
              value={form.expectedEventDate}
              onChange={(e) => updateFormField("expectedEventDate", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:shadow-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="app-attendees" className="block text-xs font-semibold text-slate-700 mb-1">
            예상 참가자 수 <span className="text-sm font-bold text-red-600" aria-hidden="true">*</span>
          </label>
          <select
            id="app-attendees"
            value={form.expectedAttendeeRange}
            onChange={(e) => updateFormField("expectedAttendeeRange", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:shadow-sm"
          >
            <option value="" disabled>
              예상 규모 선택
            </option>
            {ATTENDEE_RANGE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="app-purpose" className="block text-xs font-semibold text-slate-700 mb-1">
            행사 목적
          </label>
          <textarea
            id="app-purpose"
            value={form.eventPurpose}
            onChange={(e) => updateFormField("eventPurpose", e.target.value)}
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-700 hover:bg-brand-800 active:scale-[0.98] disabled:opacity-60 text-white font-bold py-3 text-sm transition-all"
        >
          {isSubmitting ? "신청 중..." : "신청하기"}
        </button>
        <p className="-mt-4 text-center text-xs leading-5 text-slate-500">
          <span className="block">신청 접수 및 승인 안내는 입력하신 이메일로 발송됩니다.</span>
          <span className="block">신청을 제출하면 개인정보 수집 및 이용에 동의한 것으로 간주됩니다.</span>
          <span className="block">
            자세한 내용은{" "}
            <Link
              to="/privacy"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              개인정보처리방침
            </Link>
            에서 확인할 수 있습니다.
          </span>
        </p>
      </form>
      <Dialog
        open={Boolean(submitMessage)}
        onClose={() => setSubmitMessage("")}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft"
      >
        <div className="space-y-5 text-center">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">신청이 접수되었습니다</h3>
            <p role="status" className="text-sm leading-6 text-slate-600">
              {submitMessage}
              <br />
              메일이 보이지 않으면 스팸 보관함을 확인하거나 devfactory.ops@gmail.com으로 문의해 주세요.
            </p>
          </div>
          <button
            type="button"
            className="w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-800"
            onClick={() => setSubmitMessage("")}
          >
            확인
          </button>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminApplicationForm;
