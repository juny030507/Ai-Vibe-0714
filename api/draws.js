const TABLE_NAME = 'lotto_draws';

function isValidNumbers(numbers) {
  return Array.isArray(numbers)
    && numbers.length === 6
    && numbers.every(number => Number.isInteger(number) && number >= 1 && number <= 45)
    && new Set(numbers).size === 6;
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

export default {
  async fetch(request) {
    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !secretKey) {
      return json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' }, 503);
    }

    const endpoint = `${supabaseUrl}/rest/v1/${TABLE_NAME}`;
    const headers = {
      apikey: secretKey,
      'Content-Type': 'application/json'
    };

    // 기존 service_role 키는 JWT이므로 Authorization 헤더도 함께 보냅니다.
    // 새 sb_secret 키는 공식 권장 방식대로 apikey 헤더에만 담습니다.
    if (!secretKey.startsWith('sb_secret_')) {
      headers.Authorization = `Bearer ${secretKey}`;
    }

    try {
      if (request.method === 'POST') {
        const body = await request.json().catch(() => null);
        const numbers = body?.numbers;
        if (!isValidNumbers(numbers)) {
          return json({ error: '1부터 45까지 중복 없는 숫자 6개가 필요합니다.' }, 400);
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify({ numbers: [...numbers].sort((a, b) => a - b) })
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          console.error('Supabase insert failed', response.status, data);
          return json({ error: '번호를 데이터베이스에 저장하지 못했습니다.' }, 502);
        }

        return json({ draw: data?.[0] ?? null }, 201);
      }

      if (request.method === 'GET') {
        const response = await fetch(`${endpoint}?select=id,numbers,created_at&order=created_at.desc&limit=10`, { headers });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          console.error('Supabase select failed', response.status, data);
          return json({ error: '저장된 번호를 불러오지 못했습니다.' }, 502);
        }

        return json({ draws: data });
      }

      return new Response(JSON.stringify({ error: '지원하지 않는 요청 방식입니다.' }), {
        status: 405,
        headers: {
          'Allow': 'GET, POST',
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    } catch (error) {
      console.error('Draw API error', error);
      return json({ error: '서버에서 요청을 처리하지 못했습니다.' }, 500);
    }
  }
};
