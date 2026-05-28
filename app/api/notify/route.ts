import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const ADMIN_EMAIL = "nci123123123@gmail.com";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://club-community.vercel.app";

interface NotifyPayload {
  postId: string;
  title: string;
  authorName: string;
  nationality: string;
  contentPreview: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ skipped: true }, { status: 200 });
  }

  let body: NotifyPayload;
  try {
    body = (await req.json()) as NotifyPayload;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { postId, title, authorName, nationality, contentPreview } = body;

  const resend = new Resend(apiKey);

  const postUrl = `${SITE_URL}/board/${postId}`;
  const safePreview = (contentPreview ?? "").slice(0, 200);

  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: ADMIN_EMAIL,
      subject: `[동아리] 새 글: ${title}`,
      html: `
<div style="font-family:sans-serif;max-width:520px;color:#111">
  <h2 style="margin-bottom:4px">${escapeHtml(title)}</h2>
  <p style="margin:0 0 16px;color:#555;font-size:14px">
    작성자: <strong>${escapeHtml(authorName)}</strong> (${escapeHtml(nationality)})
  </p>
  <div style="background:#f5f5f5;border-radius:8px;padding:14px 16px;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(safePreview)}</div>
  <a href="${postUrl}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#18181b;color:#fff;border-radius:8px;text-decoration:none;font-size:14px">
    글 보러 가기 →
  </a>
</div>`,
    });

    if (error) {
      console.error("[notify] Resend error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[notify] Unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
