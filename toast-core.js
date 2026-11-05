// 페이지와 서버 함수가 같이 쓰는 부분: 선택지, n행시 첫 글자 검사, 프롬프트, 결과 고르기.
// 브라우저에서는 <script src>로, 서버에서는 require로 읽는다.

const PLACES = ["회사 회식", "송년·신년회", "동창회·친구", "MT·동아리", "가족 모임", "축하 자리", "거래처·접대", "연인·부부"];
const TONES = ["웃기게", "감동적으로", "짧고 굵게", "파이팅 넘치게", "품격 있게", "아재개그"];

// 두음법칙: 첫소리 ㄹ→ㄴ/ㅇ, ㄴ→ㅇ 은 같은 글자로 친다 (래→내일, 려→여행)
function sameHead(want, got) {
  if (want === got) return true;
  const a = want.charCodeAt(0) - 0xAC00, b = got.charCodeAt(0) - 0xAC00;
  if (a < 0 || a > 11171 || b < 0 || b > 11171 || a % 588 !== b % 588) return false;
  const ca = Math.floor(a / 588), cb = Math.floor(b / 588); // 초성 번호: ㄴ=2, ㄹ=5, ㅇ=11
  return (ca === 5 && (cb === 2 || cb === 11)) || (ca === 2 && cb === 11);
}
// n행시 줄이 각각 단어의 해당 글자로 시작하는지
function validAcrostic(word, lines) {
  const heads = [...word];
  return Array.isArray(lines) && lines.length === heads.length &&
    lines.every((l, i) => sameHead(heads[i], String(l).trim()[0] || ""));
}
// n행시 단어가 비었으면, 짧은 한글 키워드(예: 노원갑)를 n행시 단어로 쓴다
function acroTarget(acro, kws) {
  return acro || kws.find(k => /^[가-힣]{2,5}$/.test(k)) || "";
}

function buildPrompt(acro, kws, place, tone, ctx) {
  const heads = [...acro];
  const lineSpec = heads.map((h, i) => `${i + 1}번째 줄: 반드시 "${h}"(으)로 시작`).join("\n");
  return `너는 한국 술자리 건배사 작가야. 지금 누군가 갑자기 건배사를 하게 됐어. 바로 외칠 수 있는 건배사를 만들어 줘.

조건
- 자리: ${place || "(정하지 않음, 어느 자리에서나 무난하게)"}
- 느낌: ${tone || "(정하지 않음, 밝고 무난하게)"}
- 꼭 넣을 키워드: ${kws.length ? kws.join(", ") : "(없음)"}
- 모임 맥락과 하고 싶은 말: ${ctx || "(없음)"}

만들 것
${acro
  ? `1) "${acro}" ${heads.length}행시 4개 (kind "nhaengsi", title은 반드시 "${acro}")
   lines는 정확히 ${heads.length}줄이고 각 줄의 첫 글자가 정해져 있다:
${lineSpec}
   첫 글자는 줄 맨 앞 글자 그대로여야 한다. 예: "${heads[0]}"(으)로 시작하는 줄은 "${heads[0]}..."처럼 쓴다. 키워드 글자로 시작하면 안 된다. 두음법칙(래→내, 려→여)만 예외로 허용한다.
   4개는 서로 다른 단어로 시작해서 내용이 겹치지 않게 한다.
2) 30초 안에 말할 수 있는 짧은 건배 멘트 1개 (kind "speech")`
  : `1) 자리에 어울리는 2~4글자 단어를 골라 n행시 4개 (kind "nhaengsi"). 각 줄 첫 글자는 title의 각 글자와 같아야 한다 (title "진달래" → "진…", "달…", "래…").
2) 30초 안에 말할 수 있는 짧은 건배 멘트 1개 (kind "speech")`}

규칙
- 맥락이 있으면 그게 이 건배사의 목적이다. 누가 모인 자리인지, 무엇을 강조하고 응원하려는지를 모든 건배사의 중심 메시지로 삼는다. 말하는 사람은 그 모임의 일원이다.
- 키워드는 맥락 속 의미로 쓴다. 이름만 스치듯 언급하거나 "~같은 이름이 오가는", "~처럼 뜨겁게"처럼 겉도는 비유로 때우지 않는다. 예: 어떤 인물의 성과를 강조하라고 했으면 그 성과를 직접 치켜세우는 문장으로 쓴다.
- 뜬구름 잡는 일반론 대신, 이 모임 사람들이 들으면 "우리 얘기네" 할 만큼 구체적으로 쓴다.
- 키워드가 있으면 n행시 줄 안이나 선창·후창에 자연스럽게 넣는다. 키워드 때문에 줄 첫 글자를 바꾸지 않는다.
- 실제로 소리 내서 외치기 좋게 짧고 리듬감 있게. 각 줄은 15자 이내, 앞뒤 줄이 한 문장처럼 이어지면 좋다.
- 선창(lead)은 건배사 하는 사람이 외칠 말, 후창(call)은 모두가 따라 외칠 짧은 구호.
- intro는 잔 들기 전에 할 한 문장 멘트.
- 자리에 맞는 예의를 지키고, 특정인을 비하하거나 음주를 강요하는 내용은 넣지 않는다.
- 답하기 전에 n행시 각 줄의 첫 글자가 규칙과 맞는지 하나씩 확인한다.

JSON 배열만 답해. 형식:
[{"kind":"nhaengsi","title":"진달래","intro":"...","lines":["진하고","달콤한","래일을 위하여"],"lead":"...","call":"..."},
 {"kind":"speech","title":"짧은 제목","intro":"...","speech":"...","lead":"...","call":"..."}]`;
}

// AI 답에서 보여줄 것만 고른다: 첫 글자가 맞는 n행시 최대 2개 + 멘트 1개
function pickItems(out, acro) {
  const all = (Array.isArray(out) ? out : []).filter(r => r && typeof r === "object");
  const poems = all.filter(r => r.kind === "nhaengsi" && (!acro || r.title === acro) && validAcrostic(String(r.title || ""), r.lines)).slice(0, 2);
  const speech = all.find(r => r.kind === "speech" && r.speech);
  return [...poems, ...(speech ? [speech] : [])];
}

if (typeof module !== "undefined") module.exports = { PLACES, TONES, sameHead, validAcrostic, acroTarget, buildPrompt, pickItems };
