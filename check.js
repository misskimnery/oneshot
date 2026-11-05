// 가짜 Gemini 응답으로 서버 함수를 돌려 보는 점검. 실행: node check.js
const assert = require("assert");
const handler = require("./api/toast.js");

const poem = (lines) => ({ kind: "nhaengsi", title: "노원갑", lines, lead: "노원갑!", call: "파이팅!" });
const fakeAnswer = [
  poem(["노을처럼", "원 없이", "갑시다"]),                 // 맞음
  poem(["함께라서", "원 없이", "갑시다"]),                 // 첫 줄 틀림 → 걸러져야 함
  poem(["노원의 자랑", "원팀으로", "갑니다 파이팅"]),      // 맞음
  poem(["노력하는", "원동력", "갑시다"]),                  // 맞지만 2개까지만
  { kind: "speech", title: "한마디", speech: "노원갑 파이팅!" },
];

let calls = [];
global.fetch = async (url, opts) => {
  calls.push(url);
  if (calls.length === 1) return { ok: false, status: 503 };  // 첫 모델은 붐빔
  return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "```json\n" + JSON.stringify(fakeAnswer) + "\n```" }] } }] }) };
};

function run(body) {
  return new Promise((resolve) => {
    const res = { code: 0, status(c) { this.code = c; return this; }, json(d) { resolve({ code: this.code, data: d }); } };
    handler({ method: "POST", body }, res);
  });
}

(async () => {
  process.env.GEMINI_API_KEY = "test";
  const r = await run({ acro: "", kws: ["노원갑", "파이팅"], place: "이상한값", tone: "웃기게", ctx: "청년위 회식" });
  assert.equal(r.code, 200);
  assert.equal(r.data.acro, "노원갑");                       // 키워드가 n행시 단어가 됨
  assert.equal(calls.length, 2);                              // 503 뒤 다음 모델로 넘어감
  assert.deepEqual(r.data.items.map(i => i.lines?.[0] || i.speech), ["노을처럼", "노원의 자랑", "노원갑 파이팅!"]);

  calls = [];
  global.fetch = async () => ({ ok: false, status: 429 });
  const q = await run({ kws: [] });
  assert.equal(q.code, 429);

  delete process.env.GEMINI_API_KEY;
  assert.equal((await run({})).code, 503);
  console.log("ok");
})();
