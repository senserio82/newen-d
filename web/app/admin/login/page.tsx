"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.user) {
      setLoading(false);
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", signInData.user.id)
      .single();

    setLoading(false);

    if (!profile?.is_admin) {
      await supabase.auth.signOut();
      setError("관리자 권한이 없는 계정입니다.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <Link href="/" className="text-xl font-bold text-brand-700">
          newen.D
        </Link>
        <h1 className="mt-4 text-2xl font-bold">관리자 로그인</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">이메일</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">비밀번호</label>
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "로그인 중..." : "관리자 로그인"}
        </button>
      </form>
    </main>
  );
}
