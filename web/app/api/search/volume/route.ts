import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { countMatches } from "@/lib/socialDataApi";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { keyword, startDate, endDate } = await req.json();
  if (!keyword || !startDate || !endDate) {
    return NextResponse.json({ error: "keyword, startDate, endDate is required" }, { status: 400 });
  }

  try {
    const volume = await countMatches(keyword, startDate, endDate);
    return NextResponse.json({ volume });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
