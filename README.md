# 행운 번호 연구소

로또 6/45 번호 생성, 최근 100회 통계 추천, 공식 당첨번호 비교, 결과 공유 및 이미지 저장을 제공하는 웹앱입니다. 생성하거나 선택한 번호는 Vercel 서버 API를 거쳐 Supabase에 누적 저장하며, 화면에서 최근 50개 기록을 조회할 수 있습니다.

통계 추천은 최근 100회 빈도 45점, 최근 20회 흐름 25점, 미출현 기간 30점으로 추천지수를 계산합니다. 추천지수에 비례한 가중 추첨으로 무작위성을 남긴 뒤 홀짝, 번호대, 합계 균형을 적용하며, 화면에서 추천번호별 점수와 세부 근거를 확인할 수 있습니다.

추천지수는 당첨확률이 아닙니다. 번호 하나가 다음 추첨에 포함될 이론적 확률은 모두 13.3333%이고, 특정 6개 조합의 1등 확률은 모두 1/8,145,060입니다.

## Supabase 설정

1. Supabase 프로젝트의 SQL Editor에서 `supabase.sql`을 실행합니다.
2. Vercel 프로젝트의 **Settings → Environment Variables**에 다음 값을 추가합니다.

   - `SUPABASE_URL`: Supabase Project URL
   - `SUPABASE_SECRET_KEY`: Supabase의 Secret key (`sb_secret_...`)

   기존 프로젝트에서 새 Secret key를 사용할 수 없다면 `SUPABASE_SERVICE_ROLE_KEY`도 호환됩니다.

3. 환경변수를 추가한 뒤 Vercel에서 다시 배포합니다.

`SUPABASE_SECRET_KEY`와 `SUPABASE_SERVICE_ROLE_KEY`는 브라우저 코드에 넣으면 안 됩니다. 이 프로젝트에서는 키를 `api/draws.js` 서버 함수에서만 읽습니다.

`lotto_draws` 테이블의 번호는 삭제 없이 계속 누적됩니다. `GET /api/draws`는 기본 50개를 반환하며 `?limit=100`처럼 요청하면 최대 100개까지 조회할 수 있습니다. 앱 화면에는 처음 10개가 표시되고 `더보기`를 누를 때마다 10개씩, 최대 최근 50개까지 펼쳐집니다.

## 로컬 실행

Vercel CLI가 설치되어 있다면 `.env.example`을 참고해 `.env.local`을 만들고 아래 명령으로 실행합니다.

```bash
vercel dev
```

정적 파일만 열어도 번호 생성·통계 추천·공식 결과 조회·공유 기능은 사용할 수 있지만, Supabase 저장은 Vercel API 환경에서 동작합니다.
