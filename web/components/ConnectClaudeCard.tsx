"use client";

import { useEffect, useState } from "react";

export default function ConnectClaudeCard({ mcpUrl }: { mcpUrl: string }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/keys")
      .then((r) => r.json())
      .then((d) => setApiKey(d.apiKey))
      .finally(() => setLoading(false));
  }, []);

  async function issueKey() {
    setLoading(true);
    const res = await fetch("/api/keys", { method: "POST" });
    const data = await res.json();
    setApiKey(data.apiKey);
    setLoading(false);
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Claude 연동</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            apiKey ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {apiKey ? "연동 준비 완료" : "미연동"}
        </span>
      </div>

      {!apiKey && !loading && (
        <div>
          <p className="mb-3 text-sm text-gray-600">
            연동 키를 발급하면 Claude의 커넥터(MCP) 설정에서 newen.D를
            추가할 수 있습니다.
          </p>
          <button onClick={issueKey} className="btn-primary">
            + 연동 키 발급
          </button>
        </div>
      )}

      {apiKey && (
        <div className="space-y-3 text-sm">
          <div>
            <p className="mb-1 text-gray-500">
              Claude &gt; 설정 &gt; 커넥터(Connectors) &gt; 커스텀 커넥터 추가에서
              아래 URL을 그대로 붙여넣으세요. (인증 키가 URL에 포함되어 있습니다)
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-gray-50 px-3 py-2">
                {mcpUrl}?key={apiKey}
              </code>
              <button
                onClick={() => copy(`${mcpUrl}?key=${apiKey}`, "url")}
                className="btn-secondary shrink-0"
              >
                {copied === "url" ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer select-none">
              커스텀 헤더(Authorization) 방식을 지원하는 커넥터라면 이렇게도
              연결할 수 있어요
            </summary>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-gray-50 px-3 py-2">
                  {mcpUrl}
                </code>
                <button
                  onClick={() => copy(mcpUrl, "plainUrl")}
                  className="btn-secondary shrink-0"
                >
                  {copied === "plainUrl" ? "복사됨" : "복사"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-gray-50 px-3 py-2">
                  Authorization: Bearer {apiKey}
                </code>
                <button
                  onClick={() => copy(`Bearer ${apiKey}`, "bearer")}
                  className="btn-secondary shrink-0"
                >
                  {copied === "bearer" ? "복사됨" : "복사"}
                </button>
              </div>
            </div>
          </details>
          <p className="text-xs text-gray-400">
            이 키는 외부에 노출되지 않도록 주의하세요. 유출된 경우 관리자에게
            재발급을 요청하세요.
          </p>
        </div>
      )}
    </div>
  );
}
