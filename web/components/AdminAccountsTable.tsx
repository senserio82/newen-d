"use client";

import { useEffect, useState } from "react";

type Account = {
  id: string;
  email: string;
  company_name: string;
  points: number;
  is_admin: boolean;
  created_at: string;
  deleted_at: string | null;
  total_consumed: number;
};

export default function AdminAccountsTable() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantAmount, setGrantAmount] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/accounts");
    const data = await res.json();
    setAccounts(data.accounts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function grant(id: string) {
    const amount = Number(grantAmount[id]);
    if (!amount) return;
    setBusyId(id);
    await fetch("/api/admin/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: id, delta: amount }),
    });
    setGrantAmount((s) => ({ ...s, [id]: "" }));
    setBusyId(null);
    load();
  }

  async function deactivate(id: string) {
    if (!confirm("이 계정을 비활성화하시겠습니까?")) return;
    setBusyId(id);
    await fetch("/api/admin/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: id }),
    });
    setBusyId(null);
    load();
  }

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500">
            <th className="pb-2 pr-4 font-medium">회사명</th>
            <th className="pb-2 pr-4 font-medium">이메일</th>
            <th className="pb-2 pr-4 font-medium">가입일</th>
            <th className="pb-2 pr-4 font-medium">탈퇴일</th>
            <th className="pb-2 pr-4 font-medium">보유 포인트</th>
            <th className="pb-2 pr-4 font-medium">누적 소진</th>
            <th className="pb-2 pr-4 font-medium">포인트 부여</th>
            <th className="pb-2 pr-4 font-medium">계정</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-b border-gray-50 align-middle">
              <td className="py-2 pr-4">
                {a.company_name}
                {a.is_admin && (
                  <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">
                    관리자
                  </span>
                )}
              </td>
              <td className="py-2 pr-4">{a.email}</td>
              <td className="py-2 pr-4">
                {new Date(a.created_at).toLocaleDateString("ko-KR")}
              </td>
              <td className="py-2 pr-4">
                {a.deleted_at
                  ? new Date(a.deleted_at).toLocaleDateString("ko-KR")
                  : "-"}
              </td>
              <td className="py-2 pr-4 font-medium">{a.points.toLocaleString()} P</td>
              <td className="py-2 pr-4 text-gray-500">
                {a.total_consumed.toLocaleString()} P
              </td>
              <td className="py-2 pr-4">
                <div className="flex items-center gap-2">
                  <input
                    className="input w-24 py-1.5"
                    type="number"
                    placeholder="+1000"
                    value={grantAmount[a.id] ?? ""}
                    onChange={(e) =>
                      setGrantAmount((s) => ({ ...s, [a.id]: e.target.value }))
                    }
                  />
                  <button
                    onClick={() => grant(a.id)}
                    disabled={busyId === a.id}
                    className="btn-secondary py-1.5"
                  >
                    부여
                  </button>
                </div>
              </td>
              <td className="py-2 pr-4">
                {!a.deleted_at && (
                  <button
                    onClick={() => deactivate(a.id)}
                    disabled={busyId === a.id}
                    className="text-xs text-red-500 hover:underline"
                  >
                    비활성화
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
