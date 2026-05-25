"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { Language, Nationality } from "@/lib/data/types";
import { LANGUAGES, NATIONALITIES } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/user/provider";
import { NATIONALITY_COLOR } from "@/lib/nationality";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LANGUAGE_NATIVE: Record<Language, string> = {
  ko: "한국어",
  ja: "日本語",
  zh: "简体中文",
  vi: "Tiếng Việt",
  en: "English",
};

const TOTAL_STEPS = 4;

export function OnboardingSteps() {
  const router = useRouter();
  const { t, lang, setLang } = useT();
  const { setUser } = useCurrentUser();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [nationality, setNationality] = useState<Nationality | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function next() {
    if (step === 1 && !name.trim()) {
      toast.error(t("onboarding.nameRequired"));
      return;
    }
    if (step === 2 && !studentId.trim()) {
      toast.error(t("onboarding.studentIdRequired"));
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    if (!nationality) return;
    setSubmitting(true);
    try {
      const repo = getRepository();
      const user = await repo.createUser({
        studentId: studentId.trim(),
        displayName: name.trim(),
        nationality,
        preferredLanguage: lang,
      });
      setUser(user);
      router.replace("/home");
    } catch {
      toast.error(t("onboarding.duplicateError"));
      setStep(2);
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("onboarding.step", { current: step + 1, total: TOTAL_STEPS })}
          </span>
        </div>

        <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {step === 0 && (
            <section className="space-y-6">
              <header className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight">
                  {t("onboarding.welcome")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("onboarding.chooseLanguage")}
                </p>
              </header>
              <div className="grid gap-2.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setLang(l);
                      setStep(1);
                    }}
                    className={cn(
                      "group flex items-center justify-between rounded-xl border bg-card px-4 py-3.5 text-left transition-all hover:border-primary hover:shadow-sm",
                      lang === l && "border-primary ring-1 ring-primary"
                    )}
                  >
                    <span className="font-medium">{LANGUAGE_NATIVE[l]}</span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-6">
              <header className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight">
                  {t("onboarding.nameTitle")}
                </h1>
              </header>
              <Input
                autoFocus
                value={name}
                placeholder={t("onboarding.namePlaceholder")}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && next()}
                className="h-12 text-base"
              />
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <header className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight">
                  {t("onboarding.studentIdTitle")}
                </h1>
              </header>
              <Input
                autoFocus
                inputMode="numeric"
                value={studentId}
                placeholder={t("onboarding.studentIdPlaceholder")}
                onChange={(e) =>
                  setStudentId(e.target.value.replace(/[^0-9]/g, ""))
                }
                onKeyDown={(e) => e.key === "Enter" && next()}
                className="h-12 text-base"
              />
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <header className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight">
                  {t("onboarding.nationalityTitle")}
                </h1>
              </header>
              <div className="grid grid-cols-2 gap-2.5">
                {NATIONALITIES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNationality(n)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3.5 text-left transition-all hover:border-primary",
                      nationality === n && "border-primary ring-1 ring-primary"
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: NATIONALITY_COLOR[n] }}
                    />
                    <span className="font-medium">{t(`nationality.${n}`)}</span>
                    {nationality === n && (
                      <Check className="ml-auto size-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

        </div>

        {step > 0 && (
          <div className="mt-8 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={back} aria-label={t("common.back")}>
              <ArrowLeft className="size-4" />
            </Button>
            {step < 3 ? (
              <Button className="flex-1" onClick={next}>
                {t("onboarding.next")}
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={submit}
                disabled={!nationality || submitting}
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {t("onboarding.start")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
