"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: companyName },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-3 text-2xl font-bold">가입이 완료되었습니다</h1>
        <p className="mb-6 text-gray-600">
          이메일 인증이 켜져 있는 프로젝트라면 받은편지함에서 인증 메일을
          확인해 주세요. 인증이 필요 없다면 바로 로그인할 수 있습니다.
        </p>
        <Link href="/login" className="btn-primary">
          로그인하러 가기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <Link href="/" className="text-xl font-bold text-brand-700">
          newen.D
        </Link>
        <h1 className="mt-4 text-2xl font-bold">회원가입</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">회사명</label>
          <input
            className="input"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="예: (주)뉴엔에이아이"
          />
        </div>
        <div>
          <label className="label">이메일</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="label">비밀번호</label>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "가입 처리 중..." : "가입하기"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-brand-600">
          로그인
        </Link>
      </p>
    </main>
  );
}
