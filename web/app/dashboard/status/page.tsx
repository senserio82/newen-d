import { createClient } from "@/lib/supabase/server";
import ConnectClaudeCard from "@/components/ConnectClaudeCard";

export default async function StatusPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("points, company_name, created_at")
    .eq("id", user!.id)
    .single();

  const { data: savedQueries } = await supabase
    .from("saved_queries")
    .select("id, keyword, start_date, end_date, volume, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: pulls } = await supabase
    .from("pulls")
    .select("id, keyword, start_date, end_date, row_count, points_used, source, pulled_at")
    .order("pulled_at", { ascending: false })
    .limit(20);

  const mcpUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? "https://YOUR-DOMAIN.vercel.app/api/mcp";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">현황</h1>
        <p className="mt-1 text-sm text-gray-600">
          보유 포인트, Claude 연동 상태, 데이터 인출 이력을 확인하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="card sm:col-span-1">
          <p className="text-sm text-gray-500">보유 포인트</p>
          <p className="mt-1 text-3xl font-bold text-brand-700">
            {(profile?.points ?? 0).toLocaleString()} P
          </p>
        </div>
        <div className="sm:col-span-2">
          <ConnectClaudeCard mcpUrl={mcpUrl} />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">저장된 검색 조건 (Claude에서 불러올 수 있는 목록)</h2>
        {!savedQueries || savedQueries.length === 0 ? (
          <p className="text-sm text-gray-400">
            아직 저장된 검색 조건이 없습니다. &lsquo;검색&rsquo; 탭에서 먼저 만들어보세요.
          </p>
        ) : (
          <Table
            columns={["키워드", "기간", "볼륨", "생성일"]}
            rows={savedQueries.map((q) => [
              q.keyword,
              `${q.start_date} ~ ${q.end_date}`,
              `${q.volume.toLocaleString()}건`,
              new Date(q.created_at).toLocaleString("ko-KR"),
            ])}
          />
        )}
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">데이터 인출 이력</h2>
        {!pulls || pulls.length === 0 ? (
          <p className="text-sm text-gray-400">아직 가져간 데이터가 없습니다.</p>
        ) : (
          <Table
            columns={["일시", "키워드", "기간", "건수", "사용 포인트", "경로"]}
            rows={pulls.map((p) => [
              new Date(p.pulled_at).toLocaleString("ko-KR"),
              p.keyword,
              `${p.start_date} ~ ${p.end_date}`,
              `${p.row_count.toLocaleString()}건`,
              `${p.points_used.toLocaleString()} P`,
              p.source === "claude_mcp" ? "Claude" : "웹",
            ])}
          />
        )}
      </div>
    </div>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500">
            {columns.map((c) => (
              <th key={c} className="pb-2 pr-4 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
