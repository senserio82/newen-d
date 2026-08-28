# newen.D

키워드 + 기간으로 소셜데이터 볼륨을 확인하고, Claude에 연결해 필요한 만큼만
가져가는(1건당 1포인트 차감) B2B 데이터 플랫폼의 1차 버전입니다.

```
newen-d/
├─ web/                # Next.js 앱 (웹사이트 + 관리자 페이지 + MCP 서버 전부 포함)
├─ supabase/
│  ├─ schema.sql        # DB 테이블 + 함수 + RLS 정책
│  └─ seed_documents.csv # 업로드해주신 샘플데이터 328건 (documents 테이블용)
└─ README.md
```

MCP 서버는 **별도로 배포할 필요 없이** `web` 프로젝트 안의
`/api/mcp` 라우트로 함께 배포됩니다. 즉, **무료로 필요한 서비스는 딱 2개** 입니다.

- **Supabase** (무료 플랜): 로그인/회원가입, 데이터베이스, 포인트 저장
- **Vercel** (무료 Hobby 플랜): 웹사이트 + 관리자 페이지 + MCP 서버 호스팅

---

## 1. Supabase 프로젝트 만들기 (무료)

1. https://supabase.com → 가입 → **New project** 생성 (리전은 Seoul 권장)
2. 프로젝트가 만들어지면 좌측 메뉴 **SQL Editor** 로 이동
3. `supabase/schema.sql` 파일 내용을 전체 복사해서 붙여넣고 **Run**
   - `profiles`, `documents`, `saved_queries`, `pulls`, `point_transactions`,
     `api_keys` 테이블과 `deduct_points()` 함수, RLS 정책이 한 번에 생성됩니다.
4. (선택, 개발/테스트용) 실제 내부 데이터 API 연동 전에 먼저 화면을 테스트해
   보고 싶다면: **Table Editor** → `documents` 테이블 선택 → **Insert** →
   **Import data from CSV** → `supabase/seed_documents.csv` 업로드
   - 328건의 샘플 데이터가 채워집니다. `SOCIAL_DATA_API_BASE_URL` 환경변수를
     설정하지 않으면 이 테이블을 대신 조회합니다. 실제 운영에서는 내부
     데이터 API를 붙이면 이 테이블은 쓰지 않아도 됩니다.
5. 좌측 메뉴 **Settings → API** 에서 아래 3개 값을 복사해 두세요 (2번에서 사용):
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (절대 외부 노출 금지)

### 이메일 인증 끄기 (선택, 테스트 편의용)
Authentication → Providers → Email → **Confirm email** 옵션을 꺼두면
가입 즉시 로그인할 수 있어 초기 테스트가 편합니다. 실제 운영 시에는 켜두는
것을 권장합니다.

---

## 2. Vercel에 배포하기 (무료)

1. 이 저장소를 GitHub에 올린 뒤, https://vercel.com 에서 **Add New Project**
   → 방금 올린 저장소 선택
2. **Root Directory** 를 `web` 으로 지정 (모노레포 구조이기 때문에 필수)
3. **Environment Variables** 에 아래 값을 등록:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<1번에서 복사한 Project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public 키>
   SUPABASE_SERVICE_ROLE_KEY=<service_role 키>
   NEXT_PUBLIC_MCP_SERVER_URL=https://<배포될 도메인>/api/mcp
   SOCIAL_DATA_API_BASE_URL=<내부 데이터 서버 주소>   # 아직 없으면 비워두세요
   SOCIAL_DATA_API_KEY=<내부 데이터 서버 API 키>       # 아직 없으면 비워두세요
   ```
   (`NEXT_PUBLIC_MCP_SERVER_URL` 은 배포가 한 번 끝나 도메인이 생긴 뒤,
   그 도메인 + `/api/mcp` 로 다시 채워 넣고 재배포하면 됩니다.)
4. **Deploy** 클릭 → 완료되면 `https://your-project.vercel.app` 같은
   URL이 생깁니다.

---

## 3. 첫 관리자 계정 만들기

1. 배포된 사이트에서 일반 회원가입(`/signup`)으로 관리자가 쓸 계정을 하나
   만듭니다. (회사명은 아무거나, 예: "newen.D 운영팀")
2. Supabase **SQL Editor** 에서 아래 쿼리를 실행해 해당 계정을 관리자로
   승격합니다.
   ```sql
   update profiles set is_admin = true where email = '방금 가입한 이메일';
   ```
3. `/admin/login` 에서 로그인하면 관리자 화면(계정 목록, 포인트 부여,
   계정 비활성화)을 사용할 수 있습니다.

포인트 충전은 아직 카드결제 연동 전이므로, 관리자 화면에서 직접 포인트를
부여하는 방식으로 1차 운영하면 됩니다.

---

## 4. Claude와 연동하기

각 사용자는 로그인 후 **현황 탭**에서 "+ 연동 키 발급" 버튼으로 자신만의
API 키를 발급받고, 그 화면에 표시되는 URL(예:
`https://your-project.vercel.app/api/mcp?key=ndk_xxxx...`)을 그대로
Claude의 **Customize(설정) → Connectors → + → Add custom connector**
화면에 붙여넣으면 됩니다. (Team/Enterprise 플랜은 Owner가 조직 설정에서
먼저 커넥터를 등록해야 팀원들이 연결할 수 있습니다.)

한 번 등록해두면 이후 대화에서 newen.D가 연결된 도구로 자동 인식되어,
사용자가 매번 따로 켜지 않아도 Claude가 필요할 때 아래 도구를 알아서
호출합니다.

| 도구 | 설명 | 포인트 차감 |
|---|---|---|
| `list_saved_searches` | 검색탭에서 저장해둔 키워드+기간 목록 조회 | 없음 |
| `check_volume` | 특정 키워드/기간의 매칭 건수 미리보기 | 없음 |
| `fetch_data` | 실제 데이터 행을 가져옴 | 1건당 1P |

> 참고: Claude 커넥터 UI가 커스텀 HTTP 헤더 입력을 지원하는 경우,
> URL 없이 `Authorization: Bearer <key>` 헤더 방식으로도 연결할 수 있도록
> 서버가 두 방식 모두 지원합니다. (현황 탭의 "커스텀 헤더 방식" 접이식 메뉴 참고)

---

## 5. 로컬에서 먼저 실행해보고 싶다면

```bash
cd web
npm install
cp .env.example .env.local   # 값 채워넣기
npm run dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

---

## 6. 처음부터 끝까지 직접 구동해보기 (실전 테스트 체크리스트)

아래 순서대로 하면 요청하신 6단계(가입 → 로그인 → 가입 축하 500P → Claude 연동
→ 키워드로 1달치 데이터 수급 → Claude에서 분석)를 그대로 재현할 수 있습니다.
**1~2번(Supabase, Vercel 계정 생성)은 본인 계정으로 직접 진행하셔야 합니다** —
제가 대신 만들어드릴 수 없는 부분입니다.

1. 위 1번(Supabase 프로젝트 생성 + schema.sql 실행)과 2번(Vercel 배포)을 먼저
   완료합니다. 아직 내부 데이터 API가 준비되지 않았다면, 테스트를 위해
   `documents` 테이블에 `supabase/seed_documents.csv` 를 임포트해두세요.
   (임포트해두면 `SOCIAL_DATA_API_BASE_URL` 을 비워둔 채로 바로 테스트할 수
   있습니다.)

2. **① 가입 프로세스** — 배포된 사이트의 `/signup` 에서 회사명/이메일/비밀번호로
   가입합니다.

3. **② 실제 로그인** — `/login` 으로 로그인하면 대시보드(현황 탭)로 이동합니다.

4. **③ 가입 축하 500P** — 가입과 동시에 500P가 자동 지급되도록
   `schema.sql` 의 `handle_new_user()` 함수를 고쳐뒀습니다. 현황 탭 상단에
   **500 P** 로 표시되는지 확인하세요.

5. **④ Claude 연동** — 현황 탭의 "Claude 연동" 카드에서 "+ 연동 키 발급"을
   누르고, 표시된 URL을 복사해 Claude의 **Customize(설정) → Connectors →
   + → Add custom connector** 에 붙여넣습니다.

6. **⑤ 키워드로 1달치 데이터 수급** — 업로드해주신 샘플데이터로 테스트한다면,
   **검색 탭**에서 키워드 `위스키`, 기간 `2025-12-01 ~ 2025-12-31` 로
   조회해보세요 (약 29건 매칭되도록 샘플에 맞춰뒀습니다). 볼륨 확인 후
   "이 조건 저장하기"를 누르면 현황 탭과 Claude 양쪽에서 이 조건을 쓸 수
   있게 저장됩니다.

7. **⑥ Claude에서 분석** — 연동이 완료된 Claude 대화(커넥터를 등록하신 본인
   Claude 계정의 대화창)에서 예를 들어 "newen.D에서 2025년 12월 위스키 관련
   데이터를 가져와서 감성별로 요약해줘" 라고 요청하면, Claude가 `fetch_data`
   도구를 호출해 데이터를 가져오면서 그만큼 포인트를 차감하고, 가져온 내용을
   바로 분석합니다. 가져간 내역은 현황 탭의 "데이터 인출 이력"에 경로가
   "Claude"로 기록됩니다.

> 참고: 5~6단계는 실제로 배포하고 커넥터를 등록한 **본인 Claude 계정**에서
> 진행하셔야 합니다. 이 대화창은 별도의 세션이라 newen.D 커넥터가 연결되어
> 있지 않으면 여기서는 재현되지 않습니다.

---

## 알아두면 좋은 점 / 다음 단계 후보

- **실제 소셜데이터 연결**: 원본 데이터는 newen.D DB가 아니라 회사 내부
  데이터 서버에 있고, API 키로 호출하는 구조라고 하셔서 `web/lib/socialDataApi.ts`
  에 그 호출을 한 곳으로 모아뒀습니다. 환경변수 `SOCIAL_DATA_API_BASE_URL`,
  `SOCIAL_DATA_API_KEY` 를 채우면 그 API를 호출하고, 비워두면 개발/테스트용으로
  Supabase `documents` 테이블(샘플데이터 CSV)을 대신 씁니다. 지금은
  `GET {BASE_URL}/documents/search?keyword=&start_date=&end_date=&page=&size=`
  + `Authorization: Bearer {API_KEY}` 형태로 **가정**해서 구현해뒀는데, 실제
  API 규격(엔드포인트, 파라미터명, 인증 헤더, 응답 JSON 구조 — 특히 본문
  필드명)을 주시면 이 파일 하나만 고치면 전체가 맞춰집니다.
- **Claude "+" 로 불러오기**: 사용자가 현황 탭에서 발급받은 URL을
  Claude의 **Customize(또는 설정) → Connectors → + → Add custom connector**
  에 한 번 등록해두면, 이후 대화창에서 newen.D가 연결된 도구로 자동
  인식되어 별도 조작 없이도 Claude가 필요할 때 `list_saved_searches`,
  `check_volume`, `fetch_data` 를 호출합니다. (Team/Enterprise 플랜은
  Owner가 조직 설정에서 먼저 커넥터를 등록해야 각 팀원이 연결할 수 있습니다.)
  이 부분은 이미 구현된 `/api/mcp` 로 정상 동작하며, 추가 코드 작업은
  필요 없습니다.
- **카드결제**: 3탭(포인트 충전)은 현재 UI만 있고 실제 결제 연동은 없습니다.
  국내 서비스라면 토스페이먼츠/포트원(구 아임포트) 등이 흔히 쓰입니다.
- **무료 플랜 한도**: Supabase 무료 플랜은 DB 500MB, 월간 활성 사용자 5만명
  등의 한도가 있습니다. 데이터가 커지면 Pro 플랜 전환을 검토하세요.
  Vercel 무료 플랜은 상업적 이용에 일부 제약이 있어, 매출이 발생하는
  시점에는 Pro 플랜 전환을 검토하는 것이 좋습니다.
