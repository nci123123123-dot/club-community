import Link from "next/link";

const QUICK_LINKS = [
  { label: "홈", href: "/home" },
  { label: "게시판", href: "/board" },
  { label: "내 활동", href: "/activity" },
  { label: "설정", href: "/settings" },
];

const LANGS = ["한국어", "日本語", "中文", "Tiếng Việt", "English"];

export function Footer() {
  return (
    <footer
      className="mt-8 text-sm md:mt-12"
      style={{ background: "linear-gradient(180deg, #0d285a, #07111f)" }}
    >
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #103f8f, #3b93f0)" }}
              >
                동
              </span>
              <span className="font-bold text-white">동의대학교</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              동의대학교 동아리연합회 · 국제교류처
              <br />
              부산광역시 부산진구 엄광로 176
            </p>
            <p className="mt-3 text-xs text-white/40">
              다국어 지원: {LANGS.join(" · ")}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              바로가기
            </p>
            <ul className="space-y-2">
              {QUICK_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-white/60 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              커뮤니티
            </p>
            <p className="text-xs leading-relaxed text-white/60">
              외국인 유학생과 재학생이 함께하는
              <br />
              동의대학교 공식 동아리 커뮤니티입니다.
            </p>
            <p className="mt-3 text-xs text-white/40">
              글 작성 시 커피 기프티콘 룰렛 이벤트 참여 가능!
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-white/30">
          © 2025 동의대학교 동아리 커뮤니티. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
