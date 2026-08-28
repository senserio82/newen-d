import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = createAdminClient();

  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, email, company_name, points, is_admin, created_at, deleted_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: pulls } = await db.from("pulls").select("user_id, points_used");

  const consumedByUser = new Map<string, number>();
  for (const p of pulls ?? []) {
    consumedByUser.set(p.user_id, (consumedByUser.get(p.user_id) ?? 0) + p.points_used);
  }

  const accounts = (profiles ?? []).map((p) => ({
    ...p,
    total_consumed: consumedByUser.get(p.id) ?? 0,
  }));

  return NextResponse.json({ accounts });
}

// 계정 비활성화(소프트 삭제) — 실제 auth.users 는 남기고 deleted_at 만 기록합니다.
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { targetUserId } = await req.json();
  if (!targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 발급된 API 키도 함께 무효화합니다.
  await db
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", targetUserId)
    .is("revoked_at", null);

  return NextResponse.json({ ok: true });
}
