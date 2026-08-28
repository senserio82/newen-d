import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { targetUserId, delta } = await req.json();
  if (!targetUserId || !Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: "targetUserId and non-zero delta required" }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: target, error: fetchError } = await db
    .from("profiles")
    .select("points")
    .eq("id", targetUserId)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const { error: updateError } = await db
    .from("profiles")
    .update({ points: target.points + delta })
    .eq("id", targetUserId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await db.from("point_transactions").insert({
    user_id: targetUserId,
    delta,
    reason: "admin_grant",
    admin_id: user.id,
  });

  return NextResponse.json({ ok: true });
}
