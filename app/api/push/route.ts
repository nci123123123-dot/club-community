type PostCategory = "question" | "gathering" | "notice" | string;

interface PushBody {
  type: "new_post" | "new_comment";
  category?: PostCategory;
  title: string;
  body?: string;
  targetUserId?: string;
  url: string;
}

const POST_TITLES: Record<string, string> = {
  question:  "❓ 질문게시판에 새 글이 올라왔어요!",
  gathering: "🤝 새로운 모임이 개설되었어요!",
  notice:    "📢 새 공지사항이 등록되었어요!",
};

function buildMessages(type: PushBody["type"], category: PostCategory | undefined, title: string, body?: string) {
  if (type === "new_post") {
    const heading = POST_TITLES[category ?? ""] ?? "📬 새 글이 올라왔어요!";
    const content =
      category === "gathering"
        ? `"${title}" — 투표에 참여해보세요!`
        : `"${title}"`;
    return { heading, content };
  }
  // new_comment
  return {
    heading: "💬 새 댓글이 달렸습니다",
    content: body ?? title,
  };
}

export async function POST(req: Request) {
  const { type, category, title, body, targetUserId, url } =
    (await req.json()) as PushBody;

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    return Response.json({ error: "OneSignal not configured" }, { status: 500 });
  }

  const { heading, content } = buildMessages(type, category, title, body);

  const payload = {
    app_id: appId,
    headings: { en: heading, ko: heading },
    contents: { en: content, ko: content },
    url,
    ...(targetUserId
      ? {
          include_aliases: { external_id: [targetUserId] },
          target_channel: "push",
        }
      : { included_segments: ["All"] }),
  };

  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as unknown;
    return Response.json({ ok: res.ok, data });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
