const MODEL = "gemini-3.8-flash";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const SYSTEM_INSTRUCTION = `أنت مساعد مختبر MUKHTABAR العلمي باللغة العربية الواضحة. اشرح الفيزياء والرياضيات والأحياء والكيمياء بمستوى تدريجي، وابدأ بالفكرة ثم المعادلة ثم التعويض والوحدات. كن دقيقاً، وميّز بين النموذج المثالي والواقع، ولا تخترع قيماً أو نتائج. عندما يرسل المستخدم سياق تجربة حاضرة، استخدم متغيراتها الفعلية في الشرح. إذا لم تكن متأكداً فقل ذلك. لا تدّعِ أنك نفذت محاكاة أو قياساً لم تنفذه. اجعل الإجابة واضحة ومباشرة.`;

const rateBuckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

function json(data, status, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "https://abd7iz.github.io")
    .split(",").map(v => v.trim()).filter(Boolean);
}

function hitRateLimit(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const record = rateBuckets.get(ip);
  if (!record || now - record.start >= WINDOW_MS) {
    rateBuckets.set(ip, { start: now, count: 1 });
    return false;
  }
  record.count += 1;
  return record.count > MAX_REQUESTS_PER_WINDOW;
}

function getUserText(step) {
  if (!step || typeof step !== "object" || step.type !== "user_input") return "";
  if (typeof step.content === "string") return step.content;
  if (Array.isArray(step.content)) {
    return step.content.filter(x => x && x.type === "text" && typeof x.text === "string")
      .map(x => x.text).join("\n");
  }
  return "";
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowed = allowedOrigins(env);
    if (origin && !allowed.includes(origin)) {
      return json({ error: "هذا الموقع غير مسموح له باستخدام الخدمة." }, 403);
    }

    if (request.method === "OPTIONS") {
      if (!origin || !allowed.includes(origin)) return json({ error: "Origin not allowed" }, 403);
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname.endsWith("/health")) {
      return json({ ok: true, configured: Boolean(env.GEMINI_API_KEY), model: MODEL }, 200, origin && allowed.includes(origin) ? origin : null);
    }

    if (request.method !== "POST" || !url.pathname.endsWith("/chat")) {
      return json({ error: "المسار غير موجود." }, 404, origin);
    }
    if (!origin || !allowed.includes(origin)) {
      return json({ error: "Origin not allowed" }, 403);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "مفتاح Gemini غير مضبوط في إعدادات الخادم." }, 503, origin);
    }
    if (hitRateLimit(request)) {
      return json({ error: "طلبات كثيرة خلال دقيقة واحدة. انتظر قليلاً ثم حاول." }, 429, origin);
    }

    try {
      const raw = await request.text();
      if (raw.length > 30_000) return json({ error: "المحادثة طويلة جداً. ابدأ محادثة جديدة." }, 413, origin);
      const body = JSON.parse(raw);
      const history = body && body.history;
      if (!Array.isArray(history) || history.length < 1 || history.length > 26) {
        return json({ error: "صيغة المحادثة غير صحيحة." }, 400, origin);
      }

      let userTurns = 0;
      for (const step of history) {
        if (!step || typeof step !== "object" || Array.isArray(step)) {
          return json({ error: "صيغة سجل المحادثة غير صحيحة." }, 400, origin);
        }
        if (step.type === "user_input") {
          const text = getUserText(step);
          if (!text || text.length > 2_000) return json({ error: "كل رسالة يجب أن تكون نصاً وأقل من 2000 حرف." }, 400, origin);
          userTurns += 1;
        } else if (!["thought", "model_output"].includes(step.type)) {
          return json({ error: "نوع خطوة غير مدعوم في المحادثة." }, 400, origin);
        }
      }
      if (userTurns < 1 || userTurns > 8 || history[history.length - 1].type !== "user_input") {
        return json({ error: "ابدأ رسالة جديدة أو امسح المحادثة القديمة." }, 400, origin);
      }

      const upstream = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
          "Api-Revision": "2026-05-20"
        },
        body: JSON.stringify({
          model: MODEL,
          store: false,
          system_instruction: SYSTEM_INSTRUCTION,
          input: history,
          generation_config: { max_output_tokens: 900 }
        })
      });

      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        if (upstream.status === 429) return json({ error: "وصلت إلى حد الطلبات المتاح في Gemini حالياً. جرّب لاحقاً." }, 429, origin);
        if (upstream.status === 401 || upstream.status === 403) return json({ error: "مفتاح Gemini غير صالح أو لا يملك صلاحية الوصول." }, 502, origin);
        return json({ error: "تعذر على Gemini إكمال الطلب حالياً. حاول مرة أخرى." }, 502, origin);
      }

      const steps = Array.isArray(payload.steps) ? payload.steps : [];
      const reply = steps
        .filter(step => step && step.type === "model_output" && Array.isArray(step.content))
        .flatMap(step => step.content.filter(item => item && item.type === "text" && typeof item.text === "string").map(item => item.text))
        .join("\n").trim();

      if (!reply) return json({ error: "وصل رد فارغ من النموذج. أعد صياغة السؤال." }, 502, origin);
      return json({ reply, steps, usage: payload.usage || null }, 200, origin);
    } catch (error) {
      return json({ error: "حدث خطأ في معالجة الرسالة. حاول مرة أخرى." }, 500, origin);
    }
  }
};
