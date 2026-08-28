import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { countMatches, fetchMatches } from "@/lib/socialDataApi";

export const runtime = "nodejs";

// ============================================================
// newen.D MCP 서버 (Streamable HTTP, stateless 모드)
// Claude 커넥터 설정(설정 > 커넥터 > + > 커스텀 커넥터 추가)에
// 이 라우트의 절대 URL을 등록하면 됩니다.
// 인증: `Authorization: Bearer <api_key>` 헤더 또는 URL 쿼리 `?key=<api_key>`
// ============================================================

const TOOLS = [
  {
    name: "list_saved_searches",
    description:
      "newen.D 검색탭에서 저장해둔 '키워드 + 기간' 조합 목록을 가져옵니다. 각 항목의 volume 은 저장 시점의 매칭 건수입니다.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "check_volume",
    description:
      "특정 키워드가 포함된 문서 수를 지정한 기간(YYYY-MM-DD) 기준으로 조회합니다. 포인트가 차감되지 않는 미리보기용 조회입니다.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string" },
        start_date: { type: "string", description: "YYYY-MM-DD" },
        end_date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["keyword", "start_date", "end_date"],
      additionalProperties: false,
    },
  },
  {
    name: "fetch_data",
    description:
      "키워드+기간에 매칭되는 실제 데이터 행을 가져옵니다. " +
      "confirm 을 생략하거나 false 로 호출하면 실제 데이터는 가져오지 않고 예상 건수와 필요 포인트만 미리 알려줍니다 — " +
      "이 경우 반드시 사용자에게 '몇 건, 몇 포인트가 필요한데 진행할까요?' 라고 먼저 물어본 뒤, " +
      "사용자가 동의한 경우에만 confirm: true 로 다시 호출하세요. confirm: true 로 호출해야만 실제로 포인트가 차감되고 데이터가 반환됩니다. " +
      "max_rows 를 지정하지 않으면 매칭 건수와 보유 포인트 중 작은 값만큼 가져옵니다.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string" },
        start_date: { type: "string", description: "YYYY-MM-DD" },
        end_date: { type: "string", description: "YYYY-MM-DD" },
        max_rows: { type: "number", description: "최대로 가져올 행 수(선택)" },
        confirm: {
          type: "boolean",
          description:
            "true 로 호출해야 실제로 포인트를 차감하고 데이터를 가져옵니다. 생략/false 이면 미리보기(건수·필요 포인트)만 반환합니다.",
        },
      },
      required: ["keyword", "start_date", "end_date"],
      additionalProperties: false,
    },
  },
];

function textResult(obj: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function resolveUserId(apiKey: string | null) {
  if (!apiKey) return null;
  const db = createAdminClient();
  const { data } = await db
    .from("api_keys")
    .select("user_id")
    .eq("api_key", apiKey)
    .is("revoked_at", null)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function callTool(name: string, args: any, userId: string) {
  const db = createAdminClient();

  if (name === "list_saved_searches") {
    const { data, error } = await db
      .from("saved_queries")
      .select("id, keyword, start_date, end_date, volume, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return errorResult(error.message);
    return textResult({ saved_searches: data });
  }

  if (name === "check_volume") {
    const { keyword, start_date, end_date } = args ?? {};
    if (!keyword || !start_date || !end_date) {
      return errorResult("keyword, start_date, end_date are required");
    }
    try {
      const volume = await countMatches(keyword, start_date, end_date);
      return textResult({ keyword, start_date, end_date, volume });
    } catch (err: any) {
      return errorResult(err.message);
    }
  }

  if (name === "fetch_data") {
    const { keyword, start_date, end_date, max_rows, confirm } = args ?? {};
    if (!keyword || !start_date || !end_date) {
      return errorResult("keyword, start_date, end_date are required");
    }
    try {
      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("points")
        .eq("id", userId)
        .single();
      if (profileError) return errorResult(profileError.message);

      const matched = await countMatches(keyword, start_date, end_date);
      const wanted = Math.min(matched, max_rows ?? matched);
      const cap = Math.min(wanted, profile.points);

      // confirm 이 없으면 미리보기만 반환하고 실제 인출/차감은 하지 않음
      if (!confirm) {
        return textResult({
          preview: true,
          matched_count: matched,
          points_required: cap,
          current_points: profile.points,
          message:
            cap < wanted
              ? `보유 포인트(${profile.points}P)가 부족해 ${cap}건까지만 가져올 수 있습니다. 사용자에게 진행 여부를 확인한 뒤 confirm: true 로 다시 호출하세요.`
              : `${cap}건이 매칭되며, 가져오면 ${cap} 포인트가 차감됩니다. 사용자에게 진행 여부를 확인한 뒤 confirm: true 로 다시 호출하세요.`,
        });
      }

      if (cap <= 0) {
        return textResult({ row_count: 0, points_used: 0, rows: [] });
      }

      const rows = await fetchMatches(keyword, start_date, end_date, cap);

      const { data: pointsUsed, error: deductError } = await db.rpc("deduct_points", {
        p_user_id: userId,
        p_amount: rows.length,
        p_keyword: keyword,
        p_start: start_date,
        p_end: end_date,
        p_query_id: null,
        p_source: "claude_mcp",
      });
      if (deductError) return errorResult(deductError.message);

      return textResult({ row_count: rows.length, points_used: pointsUsed, rows });
    } catch (err: any) {
      return errorResult(err.message);
    }
  }

  return errorResult(`Unknown tool: ${name}`);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const apiKey =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("key");

  const body = await req.json();

  // 알림(notification)은 id 가 없고 응답이 필요 없습니다.
  if (body.method === "notifications/initialized") {
    return new NextResponse(null, { status: 202 });
  }

  const respond = (result: unknown) =>
    NextResponse.json({ jsonrpc: "2.0", id: body.id, result });

  const respondError = (code: number, message: string) =>
    NextResponse.json(
      { jsonrpc: "2.0", id: body.id, error: { code, message } },
      { status: 200 }
    );

  if (body.method === "initialize") {
    return respond({
      protocolVersion: "2025-03-26",
      capabilities: { tools: {} },
      serverInfo: { name: "newen.D", version: "0.1.0" },
    });
  }

  if (body.method === "tools/list") {
    return respond({ tools: TOOLS });
  }

  if (body.method === "tools/call") {
    const userId = await resolveUserId(apiKey);
    if (!userId) return respondError(-32001, "Invalid or missing API key");

    const { name, arguments: args } = body.params ?? {};
    const result = await callTool(name, args, userId);
    return respond(result);
  }

  if (body.method === "ping") {
    return respond({});
  }

  return respondError(-32601, `Method not found: ${body.method}`);
}

// 일부 커넥터 클라이언트가 서버 확인용으로 GET 을 보내는 경우 대비
export async function GET() {
  return NextResponse.json({ name: "newen.D MCP", status: "ok" });
}
