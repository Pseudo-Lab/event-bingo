import { type FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  completeAdminInvitation,
  getAdminInvitationPreview,
} from "../../api/admin_api";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { getAdminPath } from "../../config/eventProfiles";
import type { AdminInvitationPreview } from "./adminTypes";

const AdminInviteSetupPage = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token")?.trim() ?? "";

  const [preview, setPreview] = useState<AdminInvitationPreview | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadInvitation = async () => {
      if (!inviteToken) {
        setErrorMessage("초대 링크가 올바르지 않습니다.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        const invitation = await getAdminInvitationPreview(inviteToken);
        if (!cancelled) {
          setPreview(invitation);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "초대 정보를 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!inviteToken) {
      setErrorMessage("초대 링크가 올바르지 않습니다.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const result = await completeAdminInvitation(inviteToken, password);
      setSuccessMessage(result.message);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "비밀번호 설정을 완료하지 못했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f8f2] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,172,121,0.18),transparent_26%),radial-gradient(circle_at_90%_15%,rgba(12,73,53,0.12),transparent_18%),linear-gradient(180deg,#f4f8f2_0%,#edf5f0_100%)]"
      />

      <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center justify-center">
        <Card className="w-full rounded-[2.2rem] border-white/70 bg-white/85 shadow-soft">
          <CardContent className="space-y-6 p-7 sm:p-9">
            <div className="space-y-3 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-brand-700">
                Admin Invite
              </p>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                관리자 비밀번호 설정
              </h1>
              <p className="text-sm leading-6 text-slate-500">
                승인된 초대 링크에서 비밀번호를 설정하면 관리자 콘솔에 로그인할 수 있습니다.
              </p>
            </div>

            {isLoading ? (
              <div className="rounded-[1.5rem] bg-[#f6f9f5] px-5 py-6 text-center text-sm font-semibold text-slate-500">
                초대 정보를 확인하는 중입니다.
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-600">
                {errorMessage}
              </div>
            ) : null}

            {preview && !successMessage ? (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="rounded-[1.6rem] bg-[#f6f9f5] px-5 py-5">
                  <p className="text-sm font-semibold text-slate-500">초대된 계정</p>
                  <p className="mt-2 text-lg font-black tracking-[-0.04em] text-slate-950">
                    {preview.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{preview.email}</p>
                  <p className="mt-3 text-xs font-semibold text-brand-700">
                    링크 만료: {new Date(preview.expiresAt).toLocaleString("ko-KR")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-password">비밀번호</Label>
                  <Input
                    id="invite-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="영문 대문자를 포함해 8자 이상"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-confirm-password">비밀번호 확인</Label>
                  <Input
                    id="invite-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="비밀번호를 다시 입력해 주세요"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-2xl"
                >
                  {isSubmitting ? "설정 중" : "비밀번호 설정 완료"}
                </Button>
              </form>
            ) : null}

            {successMessage ? (
              <div className="space-y-4 rounded-[1.6rem] border border-brand-100 bg-brand-50 px-5 py-5">
                <p className="text-base font-bold text-brand-800">{successMessage}</p>
                <Link to={getAdminPath()}>
                  <Button className="rounded-full px-5">관리자 로그인으로 이동</Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminInviteSetupPage;
