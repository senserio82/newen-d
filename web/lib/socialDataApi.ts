import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// 실제 소셜데이터는 newen.D 팀에서 documents 테이블에 주기적으로
// upsert 해주는 방식으로 운영합니다 (외부 API 호출 아님).
//
// 키워드 매칭 규칙:
//  - 3자 이상: 제목(title) + 본문(body) 둘 다 검색
//  - 2자 이하: 제목(title)만 검색 (본문은 trigram 인덱스가 지원하지
//    않는 길이라 전체 스캔이 필요해 매우 느려지므로 제외합니다)
// ============================================================

export type SocialDoc = {
  id?: number;
  collect_doc_no?: string;
  doc_no?: string;
  title: string;
  url?: string;
  channel_name?: string;
  site_name?: string;
  source_name?: string;
  collected_date: string; // YYYY-MM-DD
  sentiment?: string;
  hashtags?: string;
  related_words?: string;
  eval_words?: string;
  // body(본문)는 검색 매칭에만 쓰이고, 실제 인출 데이터에는 포함되지 않습니다.
};

// 실제로 가져갈 때(fetchMatches) 반환하는 컬럼 목록 — body 제외
const FETCH_COLUMNS =
  "id, collect_doc_no, doc_no, title, url, channel_name, site_name, source_name, collected_date, sentiment, hashtags, related_words, eval_words";

export type SocialDocPreview = {
  title: string;
  url?: string;
  channel_name?: string;
  site_name?: string;
  collected_date: string;
  sentiment?: string;
};

const SHORT_KEYWORD_THRESHOLD = 3; // 이 값 미만이면 제목만 검색
const QUERY_TIMEOUT_MS = 15000;

function matchFilter(keyword: string) {
  if (keyword.length < SHORT_KEYWORD_THRESHOLD) {
    // 짧은 키워드는 trigram 인덱스를 못 써서 본문 검색 시 전체 스캔이 걸립니다.
    // 속도를 위해 제목만 검색합니다.
    return `title.ilike.%${keyword}%`;
  }
  return [`title.ilike.%${keyword}%`, `body.ilike.%${keyword}%`].join(",");
}

function timeoutSignal() {
  return AbortSignal.timeout(QUERY_TIMEOUT_MS);
}

// Supabase 에러 객체(PostgrestError)의 message 가 빈 문자열인 경우가 있어서
// code/details/hint 까지 합쳐서 진짜 원인이 보이도록 만듭니다.
function describeError(error: any, fallback: string): string {
  if (!error) return fallback;
  // AbortError(타임아웃)는 사용자에게 명확한 안내로 바꿔줍니다.
  if (error.name === "AbortError" || /aborted|timeout/i.test(String(error.message ?? ""))) {
    return "쿼리 시간이 너무 오래 걸려 중단되었습니다. 키워드를 3자 이상으로 입력하거나 기간을 좁혀서 다시 시도해주세요.";
  }
  const parts = [error.message, error.details, error.hint, error.code]
    .filter((v) => typeof v === "string" && v.trim().length > 0);
  if (parts.length > 0) return parts.join(" | ");
  try {
    const json = JSON.stringify(error);
    if (json && json !== "{}") return json;
  } catch {}
  return fallback;
}

export async function countMatches(
  keyword: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const db = createAdminClient();
  const { count, error } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .or(matchFilter(keyword))
    .gte("collected_date", startDate)
    .lte("collected_date", endDate)
    .abortSignal(timeoutSignal());
  if (error) throw new Error(describeError(error, "countMatches: 알 수 없는 DB 오류"));
  return count ?? 0;
}

export async function fetchPreviewSamples(
  keyword: string,
  startDate: string,
  endDate: string,
  limit = 5
): Promise<SocialDocPreview[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("documents")
    .select("title, url, channel_name, site_name, collected_date, sentiment")
    .or(matchFilter(keyword))
    .gte("collected_date", startDate)
    .lte("collected_date", endDate)
    .order("collected_date", { ascending: false })
    .limit(limit)
    .abortSignal(timeoutSignal());
  if (error) throw new Error(describeError(error, "fetchPreviewSamples: 알 수 없는 DB 오류"));
  return (data ?? []) as SocialDocPreview[];
}

// Supabase(PostgREST)는 한 번의 요청당 최대 1,000행까지만 돌려주고
// 초과분은 에러 없이 조용히 잘라버립니다. 그래서 maxRows 가 1,000을
// 넘으면 1,000건씩 나눠서(range 페이지네이션) 반복 조회합니다.
const SUPABASE_PAGE_SIZE = 1000;

export async function fetchMatches(
  keyword: string,
  startDate: string,
  endDate: string,
  maxRows: number
): Promise<SocialDoc[]> {
  const db = createAdminClient();
  const results: SocialDoc[] = [];

  let offset = 0;
  while (results.length < maxRows) {
    const remaining = maxRows - results.length;
    const pageSize = Math.min(SUPABASE_PAGE_SIZE, remaining);
    const rangeEnd = offset + pageSize - 1;

    const { data, error } = await db
      .from("documents")
      .select(FETCH_COLUMNS)
      .or(matchFilter(keyword))
      .gte("collected_date", startDate)
      .lte("collected_date", endDate)
      .order("collected_date", { ascending: false })
      .order("id", { ascending: false }) // 동일 날짜 항목의 순서를 안정적으로 고정 (페이지 간 중복/누락 방지)
      .range(offset, rangeEnd)
      .abortSignal(timeoutSignal());

    if (error) throw new Error(describeError(error, "fetchMatches: 알 수 없는 DB 오류"));
    if (!data || data.length === 0) break;

    results.push(...(data as SocialDoc[]));
    offset += data.length;

    if (data.length < pageSize) break; // 더 이상 가져올 데이터가 없음
  }

  return results;
}
