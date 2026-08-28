import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("api_keys")
    .select("api_key, created_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ apiKey: data?.api_key ?? null });
}

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 기존 키가 있으면 그대로 재사용, 없으면 새로 발급
  const { data: existing } = await supabase
    .from("api_keys")
    .select("api_key")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing) return NextResponse.json({ apiKey: existing.api_key });

  const newKey = `ndk_${randomBytes(24).toString("hex")}`;

  const { error } = await supabase
    .from("api_keys")
    .insert({ user_id: user.id, api_key: newKey });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ apiKey: newKey });
}
