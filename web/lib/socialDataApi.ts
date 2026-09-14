import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// 실제 소셜데이터는 newen.D 팀에서 documents 테이블에 주기적으로
// upsert 해주는 방식으로 운영합니다 (외부 API 호출 아님).
// 제목(title) · 본문(body) 2개 필드를 기준으로 키워드를 매칭합니다.
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

function matchFilter(keyword: string) {
  return [`title.ilike.%${keyword}%`, `body.ilike.%${keyword}%`].join(",");
}

// Supabase 에러 객체(PostgrestError)의 message 가 빈 문자열인 경우가 있어서
// code/details/hint 까지 합쳐서 진짜 원인이 보이도록 만듭니다.
function describeError(error: any, fallback: string): string {
  if (!error) return fallback;
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
    .lte("collected_date", endDate);
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
    .limit(limit);
  if (error) throw new Error(describeError(error, "fetchPreviewSamples: 알 수 없는 DB 오류"));
  return (data ?? []) as SocialDocPreview[];
}

export async function fetchMatches(
  keyword: string,
  startDate: string,
  endDate: string,
  maxRows: number
): Promise<SocialDoc[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("documents")
    .select(FETCH_COLUMNS)
    .or(matchFilter(keyword))
    .gte("collected_date", startDate)
    .lte("collected_date", endDate)
    .order("collected_date", { ascending: false })
    .limit(maxRows);
  if (error) throw new Error(describeError(error, "fetchMatches: 알 수 없는 DB 오류"));
  return (data ?? []) as SocialDoc[];
}
