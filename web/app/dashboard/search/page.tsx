"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Sample = {
  title: string;
  url?: string;
  channel_name?: string;
  site_name?: string;
  collected_date: string;
  sentiment?: string;
};

export default function SearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [volume, setVolume] = useState<number | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkVolume(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    setVolume(null);
    setSamples([]);
    try {
      const res = await fetch("/api/search/volume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, startDate, endDate }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          `서버 응답을 해석하지 못했습니다 (status ${res.status}). 잠시 후 다시 시도해주세요.`
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || `조회에 실패했습니다 (status ${res.status}).`);
      }

      setVolume(data.volume ?? 0);
      setSamples(Array.isArray(data.samples) ? data.samples : []);
    } catch (err: any) {
      setError(err?.message || "볼륨 조회에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function saveQuery() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/search/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, startDate, endDate, volume }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "저장에 실패했습니다.");
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">검색</h1>
        <p className="mt-1 text-sm text-gray-600">
          키워드와 기간을 입력해 매칭되는 데이터 건수(볼륨)를 먼저 확인하세요.
          저장한 조건은 &lsquo;현황&rsquo; 탭과 Claude에서 불러올 수 있습니다.
        </p>
      </div>

      <form onSubmit={checkVolume} className="card space-y-4">
        <div>
          <label className="label">키워드</label>
          <input
            className="input"
            required
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 위스키"
          />
          <p className="mt-1 text-xs text-gray-400">제목 · 본문 기준으로 매칭됩니다.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">시작일</label>
            <input
              className="input"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">종료일</label>
            <input
              className="input"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "조회 중..." : "볼륨 확인"}
        </button>
      </form>

      {volume !== null && (
        <>
          <div className="card flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">매칭된 데이터 건수</p>
              <p className="text-3xl font-bold text-brand-700">
                {volume.toLocaleString()}건
              </p>
            </div>
            <button onClick={saveQuery} disabled={saving || saved} className="btn-primary">
              {saved ? "저장됨 ✓" : saving ? "저장 중..." : "이 조건 저장하기"}
            </button>
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold">샘플 미리보기 (본문 제외, 최대 5건)</h2>
            {samples.length === 0 ? (
              <p className="text-sm text-gray-400">매칭된 데이터가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="pb-2 pr-4 font-medium">제목</th>
                      <th className="pb-2 pr-4 font-medium">채널</th>
                      <th className="pb-2 pr-4 font-medium">수집일</th>
                      <th className="pb-2 pr-4 font-medium">감성</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((s, i) => (
                      <tr key={i} className="border-b border-gray-50 align-top">
                        <td className="py-2 pr-4">
                          {s.url ? (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 hover:underline"
                            >
                              {s.title}
                            </a>
                          ) : (
                            s.title
                          )}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">
                          {s.channel_name || s.site_name || "-"}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">{s.collected_date}</td>
                        <td className="py-2 pr-4 text-gray-600">{s.sentiment || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {saved && (
        <p className="text-sm text-gray-600">
          저장되었습니다. &lsquo;현황&rsquo; 탭에서 확인하거나 Claude에서 바로 불러올 수
          있습니다.
        </p>
      )}
    </div>
  );
}
