import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { countMatches, fetchMatches } from "@/lib/socialDataApi";

// 이 라우트는 두 가지 방식으로 인증됩니다:
// 1) 웹 대시보드에서: 로그인 쿠키(세션)
// 2) Claude MCP 서버에서: 헤더 `x-newend-api-key`
export async function POST(req: Request) {
  const admin = createAdminClient();

  let userId: string | null = null;

  const apiKey = req.headers.get("x-newend-api-key");
  if (apiKey) {
    const { data } = await admin
      .from("api_keys")
      .select("user_id")
      .eq("api_key", apiKey)
      .is("revoked_at", null)
      .maybeSingle();
    userId = data?.user_id ?? null;
    if (!userId) {
      return NextResponse.json({ error: "invalid api key" }, { status: 401 });
    }
  } else {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { keyword, startDate, endDate, maxRows, queryId } = body;

  if (!keyword || !startDate || !endDate) {
    return NextResponse.json(
      { error: "keyword, startDate, endDate is required" },
      { status: 400 }
    );
  }

  try {
    // 1) 현재 보유 포인트 확인 (있는 만큼만 차감되도록 요청 상한을 정함)
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single();
    if (profileError) throw new Error(profileError.message);

    const matched = await countMatches(keyword, startDate, endDate);
    const wanted = Math.min(matched, maxRows ?? matched);
    const cap = Math.min(wanted, profile.points);

    if (cap <= 0) {
      return NextResponse.json({ rowCount: 0, pointsUsed: 0, rows: [] });
    }

    // 2) 실제 데이터를 cap 건만큼 가져옴
    const rows = await fetchMatches(keyword, startDate, endDate, cap);

    // 3) 가져온 건수(rows.length)만큼만 포인트 차감 (원자적, race condition 방지)
    const { data: pointsUsed, error: deductError } = await admin.rpc("deduct_points", {
      p_user_id: userId,
      p_amount: rows.length,
      p_keyword: keyword,
      p_start: startDate,
      p_end: endDate,
      p_query_id: queryId ?? null,
      p_source: apiKey ? "claude_mcp" : "web",
    });
    if (deductError) throw new Error(deductError.message);

    return NextResponse.json({ rowCount: rows.length, pointsUsed, rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
