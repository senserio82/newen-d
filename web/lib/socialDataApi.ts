import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// 실제 소셜데이터는 newen.D DB가 아니라 회사 내부 데이터 서버에 있고,
// 그 서버는 API 키로 호출하는 구조라고 하셨으므로, 여기서 그 호출을
// 한 곳으로 모읍니다. 지금은 아래 "가정한 규격(ASSUMED CONTRACT)"으로
// 구현해뒀고, 실제 API 문서를 주시면 이 파일만 고치면 됩니다.
//
// 환경변수:
//   SOCIAL_DATA_API_BASE_URL  - 내부 데이터 서버 주소 (예: https://data.newenai.com)
//   SOCIAL_DATA_API_KEY       - 내부 데이터 서버 호출용 API 키
// 두 값이 없으면 로컬 개발/테스트용으로 Supabase `documents` 테이블
// (샘플데이터 CSV로 채워둔 것)을 대신 조회합니다.
// ============================================================

export type SocialDoc = {
  collect_doc_no?: string;
  doc_no?: string;
  title: string;
  body?: string; // 본문 필드 (실제 API 응답 필드명이 다르면 여기만 맞추면 됩니다)
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

const BASE_URL = process.env.SOCIAL_DATA_API_BASE_URL;
const API_KEY = process.env.SOCIAL_DATA_API_KEY;

function usingExternalApi() {
  return Boolean(BASE_URL && API_KEY);
}

// ------------------------------------------------------------
// 가정한 외부 API 규격 (ASSUMED CONTRACT — 실제 문서로 교체 필요)
//   GET {BASE_URL}/documents/search
//     ?keyword=...&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&page=1&size=100
//   Header: Authorization: Bearer {API_KEY}
//   Response: { total: number, items: SocialDoc[] }
// ------------------------------------------------------------
async function callExternalApi(
  keyword: string,
  startDate: string,
  endDate: string,
  page: number,
  size: number
): Promise<{ total: number; items: SocialDoc[] }> {
  const url = new URL("/documents/search", BASE_URL);
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${API_KEY}` },
    // 내부 API 응답이 매번 달라질 수 있으니 캐시하지 않습니다.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`social data api error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

// 매칭 건수만 필요할 때 (포인트 차감 없음)
export async function countMatches(
  keyword: string,
  startDate: string,
  endDate: string
): Promise<number> {
  if (usingExternalApi()) {
    // size=1 로 호출해 total 값만 사용 (실제 API가 count 전용 엔드포인트를
    // 제공한다면 그걸로 바꾸는 게 더 효율적입니다)
    const { total } = await callExternalApi(keyword, startDate, endDate, 1, 1);
    return total;
  }

  // --- 로컬 개발/테스트 fallback: Supabase documents 테이블 ---
  const db = createAdminClient();
  const orFilter = [
    `title.ilike.%${keyword}%`,
    `hashtags.ilike.%${keyword}%`,
    `related_words.ilike.%${keyword}%`,
  ].join(",");
  const { count, error } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .or(orFilter)
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
  if (usingExternalApi()) {
    const { items } = await callExternalApi(keyword, startDate, endDate, 1, maxRows);
    return items.slice(0, maxRows);
  }

  // --- 로컬 개발/테스트 fallback ---
  const db = createAdminClient();
  const orFilter = [
    `title.ilike.%${keyword}%`,
    `hashtags.ilike.%${keyword}%`,
    `related_words.ilike.%${keyword}%`,
  ].join(",");
  const { data, error } = await db
    .from("documents")
    .select("*")
    .or(orFilter)
    .gte("collected_date", startDate)
    .lte("collected_date", endDate)
    .order("collected_date", { ascending: false })
    .limit(maxRows);
  if (error) throw new Error(error.message);
  return (data ?? []) as SocialDoc[];
}
