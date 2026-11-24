const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000";
const MODEL_CACHE_MS = 10 * 60 * 1000;
let modelCache = { expires: 0, models: [] };

// Explicit allowlist: only models Google documents for the Interactions API.
const INTERACTIONS_MODELS = [
  "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash",
  "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-4-hydrogen"
];
const MODEL_PREFERENCE = [
  "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash",
  "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.8-flash", "gemini-4-hydrogen"
];

async function discoverModels(apiKey) {
  const now = Date.now();
  if (modelCache.expires > now && modelCache.models.length) return modelCache.models;
  try {
    const response = await fetch(MODELS_URL, {
      headers: { "x-goog-api-key": apiKey }
    });
    if (!response.ok) throw new Error("Models list unavailable");
    const data = await response.json();
    const available = new Set((data.models || [])
      .filter(model => (model.supportedGenerationMethods || []).includes("generateContent"))
      .map(model => (model.baseModelId || model.name || "").replace(/^models\\//, "")));
    const discovered = MODEL_PREFERENCE.filter(name =>
      INTERACTIONS_MODELS.includes(name) && available.has(name)
    );
    if (discovered.length) {
      modelCache = { expires: now + MODEL_CACHE_MS, models: discovered };
      return discovered;
    }
  } catch (error) {
    console.error("Gemini model discovery failed; using documented compatibility list.");
  }
  const fallback = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash"];
  modelCache = { expires: now + 60_000, models: fallback };
  return fallback;
}
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
    .split(",").map(value => value.trim()).filter(Boolean);
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  const ownOrigin = new URL(request.url).origin;
  return origin === ownOrigin || allowedOrigins(env).includes(origin);
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
    return step.content
      .filter(item => item && item.type === "text" && typeof item.text === "string")
      .map(item => item.text).join("\n");
  }
  return "";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const originAllowed = isAllowedOrigin(request, env);

    if (origin && !originAllowed) {
      return json({ error: "هذا الموقع غير مسموح له باستخدام الخدمة." }, 403);
    }

    if (request.method === "OPTIONS") {
      if (url.pathname !== "/chat" || !originAllowed) {
        return json({ error: "Origin not allowed" }, 403);
      }
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        configured: Boolean(env.GEMINI_API_KEY),
        model: "automatic",
        discovery: "Google Models API with Interactions compatibility filter",
        service: "MUKHTABAR AI"
      }, 200, originAllowed ? origin : null);
    }

    if (url.pathname !== "/chat") {
      return json({ error: "المسار غير موجود." }, 404);
    }
    if (request.method !== "POST") {
      return json({ error: "الطريقة غير مدعومة." }, 405, originAllowed ? origin : null);
    }
    if (!originAllowed) {
      return json({ error: "Origin not allowed" }, 403);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "مفتاح Gemini غير مضبوط في إعدادات الخادم." }, 503, origin);
    }
    if (hitRateLimit(request)) {
      return json({ error: "طلبات كثيرة خلال دقيقة واحدة. انتظر قليلاً ثم حاول." }, 429, origin);
    }

    try {
      const declaredLength = Number(request.headers.get("Content-Length") || 0);
      if (declaredLength > 30_000) {
        return json({ error: "المحادثة طويلة جداً. ابدأ محادثة جديدة." }, 413, origin);
      }

      const raw = await request.text();
      if (raw.length > 30_000) {
        return json({ error: "المحادثة طويلة جداً. ابدأ محادثة جديدة." }, 413, origin);
      }

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
          if (!text || text.length > 2_000) {
            return json({ error: "كل رسالة يجب أن تكون نصاً وأقل من 2000 حرف." }, 400, origin);
          }
          userTurns += 1;
        } else if (!["thought", "model_output"].includes(step.type)) {
          return json({ error: "نوع خطوة غير مدعوم في المحادثة." }, 400, origin);
        }
      }

      if (userTurns < 1 || userTurns > 8 || history[history.length - 1].type !== "user_input") {
        return json({ error: "ابدأ رسالة جديدة أو امسح المحادثة القديمة." }, 400, origin);
      }

      const candidates = await discoverModels(env.GEMINI_API_KEY);
      let upstream;
      let payload = {};
      let activeModel = candidates[0];
      for (const candidate of candidates.slice(0, 5)) {
        activeModel = candidate;
        upstream = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY,
            "Api-Revision": "2026-05-20"
          },
          body: JSON.stringify({
            model: candidate,
            store: false,
            system_instruction: SYSTEM_INSTRUCTION,
            input: history,
            generation_config: {
              thinking_level: "low",
              max_output_tokens: 1_000
            }
          })
        });
        payload = await upstream.json().catch(() => ({}));
        if (upstream.ok || ![429, 503, 404].includes(upstream.status)) break;
      }
      if (!upstream.ok) {
        const upstreamMessage = typeof payload?.error?.message === "string"
          ? payload.error.message.slice(0, 500)
          : "لم يرسل الخادم تفاصيل إضافية.";
        console.error("Gemini upstream error", {
          status: upstream.status,
          code: payload?.error?.status || null,
          message: upstreamMessage,
          model: activeModel,
          tried_models: candidates.slice(0, 5)
        });
        if (upstream.status === 429) {
          return json({ error: "وصلت إلى حد الطلبات المتاح في Gemini حالياً. " + upstreamMessage + " (HTTP " + upstream.status + ", model " + activeModel + ")" }, 429, origin);
        }
        if (upstream.status === 401 || upstream.status === 403) {
          return json({ error: "مفتاح Gemini غير صالح أو لا يملك صلاحية الوصول. " + upstreamMessage + " (HTTP " + upstream.status + ", model " + activeModel + ")" }, 502, origin);
        }
        return json({ error: "تعذر على Gemini إكمال الطلب حالياً. " + upstreamMessage + " (HTTP " + upstream.status + ", model " + activeModel + ")" }, 502, origin);
      }

      const steps = Array.isArray(payload.steps) ? payload.steps : [];
      const reply = steps
        .filter(step => step && step.type === "model_output" && Array.isArray(step.content))
        .flatMap(step => step.content
          .filter(item => item && item.type === "text" && typeof item.text === "string")
          .map(item => item.text))
        .join("\n").trim();

      if (!reply) {
        return json({ error: "وصل رد فارغ من النموذج. أعد صياغة السؤال." }, 502, origin);
      }

      return json({ reply, steps, usage: payload.usage || null }, 200, origin);
    } catch (error) {
      return json({ error: "حدث خطأ في معالجة الرسالة. حاول مرة أخرى." }, 500, origin);
    }
  }
};
