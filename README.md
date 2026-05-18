# 날인 (Nalin) — 서류 서명 시스템

서류를 만들어 링크로 보내면, 고객(어르신)이 링크를 눌러 **서명만** 하고,
관리자는 서명된 서류를 **PDF로 다운로드**하는 시스템입니다.

- 고객은 코드 입력·앱 설치·가입이 전혀 없습니다. 링크를 누르면 바로 서명 화면입니다.
- 관리자는 비밀번호로 로그인해 서류를 만들고, 수정·복사하고, 결과를 받습니다.
- 데이터는 클라우드(Supabase)에 저장되어 관리자 기기와 고객 기기가 서로 떨어져 있어도 함께 동작합니다.

---

## 1. 무엇이 들어 있나요

```
nalin-server/
 ├─ public/
 │   └─ index.html              실제 화면 (앱, SPA)
 ├─ api/                        Vercel Serverless Functions
 │   ├─ _lib/                   공용 헬퍼 (Supabase 클라이언트, JWT, 변환)
 │   ├─ login.js                관리자 로그인
 │   ├─ health.js               상태 점검 (keepalive)
 │   └─ docs/
 │       ├─ index.js            목록(GET) / 생성(POST)
 │       └─ [id]/
 │           ├─ index.js        조회(GET) / 수정(PUT) / 삭제(DELETE)
 │           └─ sign.js         서명 제출(POST)
 ├─ vercel.json                 라우팅·함수 설정
 ├─ package.json                의존성 (@supabase/supabase-js, jsonwebtoken)
 ├─ .env.example                환경변수 예시
 └─ .github/workflows/
     └─ keepalive.yml           Supabase 슬립 방지 cron
```

---

## 2. 인터넷에 올리는 방법 (Vercel + Supabase, 무료)

전체 비용 **월 0원**으로 운영합니다. 한 번만 설정하면 됩니다.

### 2-1. Supabase 프로젝트 만들기

1. https://supabase.com 가입 → **New Project** → 리전은 **Tokyo (Northeast Asia 1)** 추천.
2. 프로젝트가 만들어지면 **SQL Editor** 에서 아래 스키마를 실행합니다.

   ```sql
   create table public.docs (
     id             text primary key,
     template_id    text not null,
     values         jsonb not null default '{}'::jsonb,
     status         text not null default 'pending'
                      check (status in ('pending','signed')),
     signer_name    text default '',
     signature_path text default '',
     created_at     timestamptz not null default now(),
     signed_at      timestamptz
   );
   create index docs_created_at_idx on public.docs (created_at desc);

   -- 익명 직접 접근을 차단하고, 모든 접근은 서버 측 service_role 키로만 허용
   alter table public.docs enable row level security;
   ```

3. **Storage** 메뉴 → **New bucket** → 이름 `signatures` → **Public bucket** 옵션 ON.
4. **Settings → API** 에서 두 값을 복사해 두세요. 다음 단계에서 씁니다.
   - `Project URL` → `SUPABASE_URL`
   - `service_role` 키 (secret) → `SUPABASE_SERVICE_ROLE_KEY`
   - ※ `service_role` 키는 **절대 외부에 노출하면 안 됩니다.** Vercel 환경변수에만 보관합니다.

### 2-2. Vercel 에 배포

1. 이 폴더를 GitHub 저장소에 올립니다.
2. https://vercel.com 가입 → **Add New… → Project** → 위 저장소 선택 → 별다른 설정 없이 **Deploy**.
3. 배포 후 **Project → Settings → Environment Variables** 에서 다음 4개를 추가합니다.
   | Key | Value |
   |---|---|
   | `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 |
   | `JWT_SECRET` | 32바이트 무작위 문자열 (`openssl rand -hex 32`) |
   | `SUPABASE_URL` | 위에서 복사한 Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | 위에서 복사한 service_role 키 |
4. **Deployments → Redeploy** 로 환경변수를 적용합니다.
5. **Settings → Domains** 에서 보유한 도메인을 연결합니다. DNS 레코드(A/CNAME)를
   안내된 대로 추가하면 자동으로 HTTPS 가 켜집니다.

### 2-3. Supabase 슬립 방지 (자동)

Supabase 무료 플랜은 **1주일간 활동이 없으면 프로젝트가 일시정지** 됩니다.
이 저장소에 포함된 GitHub Actions 워크플로가 매일 1회 `/api/health` 를 호출해
자동으로 활동을 유지합니다.

1. GitHub 저장소 **Settings → Secrets and variables → Actions** 에서
   `NALIN_DOMAIN` 시크릿을 추가합니다. (값 예: `signing.example.com`)
2. **Actions** 탭에서 `keepalive` 워크플로를 한 번 수동 실행해 200 OK 인지 확인합니다.

---

## 3. 로컬에서 테스트해 보기

Vercel CLI 로 로컬 함수 환경을 띄울 수 있습니다.

```powershell
npm install -g vercel
npm install
# .env.example 을 복사해 .env 작성 (모든 키를 채움)
Copy-Item .env.example .env
vercel dev
```

브라우저로 http://localhost:3000 접속 → 관리자 로그인 → 서류 만들기.

> 참고: Supabase 프로젝트가 먼저 만들어져 있어야 로컬 테스트도 동작합니다.
> 단순히 화면만 확인하려면 `public/index.html` 을 그대로 브라우저에서 열어도
> UI 가 보이지만, API 호출은 실패합니다.

---

## 4. 사용 방법

### 관리자 (부모님)
1. 서비스 주소 접속 → "관리자로 시작" → 비밀번호 로그인
2. "새 서류 만들기" → 양식 선택 → 항목 입력
   - 필수 항목은 없습니다. 빈 칸이 있어도 만들 수 있습니다.
   - 작성일은 오늘 날짜로 자동 입력되며, 달력에서 바꿀 수 있습니다.
3. 만들면 **고객용 링크**가 나옵니다 → "보내기"로 카카오톡·문자 전송
4. 고객이 서명하면 목록에 "완료"로 표시 → 서류를 열어 **PDF 다운로드**
5. 같은 양식을 여러 명에게 보낼 땐, 목록의 **복사 버튼**으로 복제해
   바뀌는 항목(이름·연락처 등)만 고쳐 보내면 됩니다.
6. 서명 전 서류는 "서류 수정"으로 내용을 고칠 수 있습니다. (보낸 링크는 그대로 유지)

### 고객 (어르신)
1. 전달받은 링크를 누릅니다 → 신청서가 바로 열립니다
2. 내용을 확인하고, 아래 칸에 손가락으로 서명합니다
3. "서명 완료" 버튼을 누르면 끝입니다

---

## 5. 백업

서류 데이터는 Supabase 의 Postgres + Storage 에 저장됩니다.
별도 백업이 필요할 때:

- **DB 백업**: Supabase Dashboard → Database → Backups (Pro 플랜은 자동, 무료 플랜은 수동 export)
- **수동 export**: SQL Editor 에서 `select * from docs` 결과를 CSV 로 저장
- **Storage 백업**: `signatures` 버킷의 파일을 일괄 다운로드

---

## 6. 새 양식 추가 (개발자용)

`public/index.html` 파일 안의 `TEMPLATES` 부분에 새 양식을 추가하면 됩니다.
파일 윗부분에 추가 방법이 주석으로 설명되어 있습니다. 양식 하나는
`name`, `desc`, `fields`(입력 항목 목록), `buildPaper`(서류 모양) 로 구성됩니다.

---

## 7. 자주 묻는 질문

**Q. 비밀번호를 잊었어요.**
Vercel Dashboard → 프로젝트 → Settings → Environment Variables 에서
`ADMIN_PASSWORD` 값을 새로 정한 뒤, Deployments → Redeploy 로 재배포하면 됩니다.

**Q. 로그인했는데 자꾸 풀려요.**
관리자 로그인 토큰은 7일간 유효합니다. 7일이 지나면 다시 로그인하시면 됩니다.
또는 `JWT_SECRET` 환경변수를 바꾸면 기존 토큰이 모두 무효화됩니다.

**Q. 고객이 링크를 눌렀는데 "서류를 열 수 없습니다" 라고 나와요.**
서류가 삭제되었거나 링크가 잘못된 경우입니다. 관리자 화면에서 해당 서류를
다시 확인하고 링크를 새로 보내 주세요.

**Q. 처음 한참 만에 접속했는데 오류가 나요.**
GitHub Actions `keepalive` 가 정상 동작 중이라면 발생하지 않습니다.
만약 Supabase 가 일시정지되었다면 Supabase Dashboard 에서 **Restore project**
버튼을 누르면 1~2분 내에 복구됩니다.
