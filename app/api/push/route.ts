interface PushBody {
  type: "new_post" | "new_comment";
  title: string;
  body: string;
  targetUserId?: string;
  url: string;
}

export async function POST(req: Request) {
  const { type, title, body, targetUserId, url } =
    (await req.json()) as PushBody;

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    return Response.json({ error: "OneSignal not configured" }, { status: 500 });
  }

  const payload = {
    app_id: appId,
    headings: { en: title, ko: title },
    contents: { en: body, ko: body },
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
