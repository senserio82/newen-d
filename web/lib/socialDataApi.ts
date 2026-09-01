import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// 실제 소셜데이터는 newen.D 팀에서 documents 테이블에 주기적으로
// upsert 해주는 방식으로 운영하기로 했습니다 (외부 API 호출 아님).
// Claude/웹 UI 쪽 도구 인터페이스(countMatches, fetchMatches)는 그대로 두고,
// 내부 구현만 Supabase documents 테이블을 직접 조회하도록 되어 있습니다.
// 제목(title) · 본문(body) · 해시태그(hashtags) · 연관어(related_words)
// 4개 필드를 기준으로 키워드를 매칭합니다.
// ============================================================

export type SocialDoc = {
  id?: number;
  collect_doc_no?: string;
  doc_no?: string;
  title: string;
  body?: string;
  url?: string;
  channel_name?: string;
  site_name?: string;
  source_name?: string;
  collected_date: string; // YYYY-MM-DD
  sentiment?: string;
  hashtags?: string;
  related_words?: string;
  eval_words?: string;
};

function matchFilter(keyword: string) {
  return [
    `title.ilike.%${keyword}%`,
    `body.ilike.%${keyword}%`,
    `hashtags.ilike.%${keyword}%`,
    `related_words.ilike.%${keyword}%`,
  ].join(",");
}

// 매칭 건수만 필요할 때 (포인트 차감 없음)
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
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// 실제 행 데이터를 최대 maxRows 건 가져올 때 (호출 전 포인트 검증은 호출부 책임)
export async function fetchMatches(
  keyword: string,
  startDate: string,
  endDate: string,
  maxRows: number
): Promise<SocialDoc[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("documents")
    .select("*")
    .or(matchFilter(keyword))
    .gte("collected_date", startDate)
    .lte("collected_date", endDate)
    .order("collected_date", { ascending: false })
    .limit(maxRows);
  if (error) throw new Error(error.message);
  return (data ?? []) as SocialDoc[];
}
