"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [volume, setVolume] = useState<number | null>(null);
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
    try {
      const res = await fetch("/api/search/volume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVolume(data.volume);
    } catch (err: any) {
      setError(err.message ?? "볼륨 조회에 실패했습니다.");
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
      if (!res.ok) throw new Error(data.error);
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "저장에 실패했습니다.");
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
          <p className="mt-1 text-xs text-gray-400">
            제목 · 본문 기준으로 매칭됩니다.
          </p>
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
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">매칭된 데이터 건수</p>
            <p className="text-3xl font-bold text-brand-700">
              {volume.toLocaleString()}건
            </p>
          </div>
          <button
            onClick={saveQuery}
            disabled={saving || saved}
            className="btn-primary"
          >
            {saved ? "저장됨 ✓" : saving ? "저장 중..." : "이 조건 저장하기"}
          </button>
        </div>
      )}

      {saved && (
        <p className="text-sm text-gray-600">
          저장되었습니다. &lsquo;현황&rsquo; 탭에서 확인하거나 Claude에서
          바로 불러올 수 있습니다.
        </p>
      )}
    </div>
  );
}
