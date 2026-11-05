# ONE SHOT 건배사

n행시 단어·키워드·자리·느낌·모임 맥락을 넣으면 Gemini가 바로 외칠 수 있는 건배사를 만들어 준다.
단골 건배사 48개는 페이지 안에 들어 있어서 AI 없이도 추천된다.

## 구조

```
index.html      화면 전체 (단골 목록, 잔 애니메이션 포함)
toast-core.js   페이지와 서버가 같이 쓰는 것: 선택지, n행시 첫 글자 검사, 프롬프트
api/toast.js    POST /api/toast → Gemini 호출 (키는 서버 환경변수에만)
check.js        가짜 Gemini 응답으로 서버 함수 점검: node check.js
```

의존성 없음. Gemini는 REST(fetch)로 부른다.

## 배포 (Vercel)

1. GitHub에 푸시
2. Vercel → Add New → Project → 이 저장소 Import (Framework Preset: Other, 설정 그대로)
3. Settings → Environment Variables 에 `GEMINI_API_KEY` 추가 → Redeploy

키는 [aistudio.google.com](https://aistudio.google.com) → API 키에서 만든다. 메뉴 추천 때 쓴 키를 그대로 써도 된다.
모델을 바꾸려면 `GEMINI_MODEL` 환경변수를 넣는다 (기본 gemini-3.6-flash, 붐비면 flash-lite 두 개로 넘어감).

## 알아둘 것

- 사이트를 쓰는 모든 사람이 이 키의 무료 할당량을 같이 쓴다. 몰리면 "요청이 몰렸어요"가 뜬다.
- 로컬에서 index.html만 열면 AI 생성은 안 된다 (서버 함수가 없어서). 단골 추천은 된다.
