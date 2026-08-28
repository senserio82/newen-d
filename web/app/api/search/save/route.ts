import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { keyword, startDate, endDate, volume } = await req.json();
  if (!keyword || !startDate || !endDate) {
    return NextResponse.json({ error: "keyword, startDate, endDate is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_queries")
    .insert({
      user_id: user.id,
      keyword,
      start_date: startDate,
      end_date: endDate,
      volume: volume ?? 0,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
