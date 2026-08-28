import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ⚠️ service_role 키는 RLS 를 완전히 우회합니다.
// 절대 브라우저로 전송되는 코드(클라이언트 컴포넌트 등)에서 import 하지 마세요.
// 관리자 API route, 포인트 차감/정산 로직, MCP 서버에서만 사용합니다.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
