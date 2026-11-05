// POST /api/toast — 조건을 받아 Gemini로 건배사를 만든다. API 키는 서버 환경변수에만 있다.
const { PLACES, TONES, acroTarget, buildPrompt, pickItems } = require("../toast-core.js");

// 첫 모델이 붐비거나(503·429) 글자가 안 맞는 답만 주면 다음 모델로 넘어간다.
// ponytail: 한 모델씩 차례로 시도. 느린 날 대기가 길면 메뉴 추천 때처럼 겹쳐 띄우기(hedge)로 바꾼다.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite"]
  .filter((m, i, all) => all.indexOf(m) === i);
const CALL_TIMEOUT_MS = 18_000;

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// 브라우저가 보낸 값을 그대로 믿지 않고 길이와 선택지를 잘라 둔다.
function readInput(b) {
  const kws = (Array.isArray(b.kws) ? b.kws : []).map(k => str(k, 30)).filter(Boolean).slice(0, 5);
  return {
    acro: acroTarget(str(b.acro, 8).replace(/\s+/g, ""), kws),
    kws,
    place: PLACES.includes(b.place) ? b.place : "",
    tone: TONES.includes(b.tone) ? b.tone : "",
    ctx: str(b.ctx, 300),
  };
}

// 코드 울타리나 앞뒤 설명이 섞여 와도 JSON 배열만 건져낸다.
function parseLoose(text) {
  const s = text.indexOf("["), e = text.lastIndexOf("]");
  try { return JSON.parse(s >= 0 && e > s ? text.slice(s, e + 1) : text); } catch { return null; }
}

async function ask(model, prompt, key) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  }).catch(() => ({ ok: false, status: 503 }));
  if (!res.ok) return { status: res.status };
  const data = await res.json().catch(() => ({}));
  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
  return { status: 200, out: parseLoose(text) };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST로만 부를 수 있어요." });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았어요." });

  let body = req.body || {};
  if (typeof body === "string") try { body = JSON.parse(body); } catch { body = {}; }
  const input = readInput(body);
  const prompt = buildPrompt(input.acro, input.kws, input.place, input.tone, input.ctx);

  let last = 503;
  for (const model of MODELS) {
    const r = await ask(model, prompt, key);
    if (r.status === 401 || r.status === 403) return res.status(500).json({ error: "API 키가 거부됐어요. 키를 다시 확인해 주세요." });
    if (r.status !== 200) { last = r.status; continue; }
    const items = pickItems(r.out, input.acro);
    if (items.length) return res.status(200).json({ items, acro: input.acro });
    last = 502; // 답은 왔지만 쓸 만한 게 없으면 다음 모델로
  }
  const msg = last === 429 ? "지금 요청이 몰렸어요. 잠시 뒤에 다시 눌러 주세요."
    : last === 502 ? "결과를 제대로 만들지 못했어요. 한 번 더 눌러 주세요."
    : "AI가 붐벼요. 10초쯤 뒤에 다시 눌러 주세요.";
  res.status(last === 429 ? 429 : 502).json({ error: msg });
};
