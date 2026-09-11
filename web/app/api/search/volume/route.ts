import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { countMatches, fetchPreviewSamples } from "@/lib/socialDataApi";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { keyword, startDate, endDate } = await req.json();
  if (!keyword || !startDate || !endDate) {
    return NextResponse.json(
      { error: "keyword, startDate, endDate is required" },
      { status: 400 }
    );
  }

  try {
    const [volume, samples] = await Promise.all([
      countMatches(keyword, startDate, endDate),
      fetchPreviewSamples(keyword, startDate, endDate, 5),
    ]);
    return NextResponse.json({ volume, samples });
  } catch (err: any) {
    const message =
      (typeof err?.message === "string" && err.message.trim().length > 0
        ? err.message
        : null) ?? "볼륨 조회 중 알 수 없는 오류가 발생했습니다.";
    console.error("[/api/search/volume] error:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
