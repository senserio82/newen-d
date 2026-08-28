import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-xl font-bold text-brand-700">newen.D</div>
        <nav className="flex gap-3">
          <Link href="/login" className="btn-secondary">
            로그인
          </Link>
          <Link href="/signup" className="btn-primary">
            무료로 시작하기
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-24 pt-16 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-600">
          Social Data × Claude
        </p>
        <h1 className="text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
          키워드와 기간만 정하면,
          <br />
          소셜데이터를 Claude가 바로 분석합니다
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          newen.D에서 원하는 키워드와 기간의 데이터 볼륨을 먼저 확인하고, Claude에
          연결해 필요한 만큼만 가져가 분석하세요. 가져간 데이터 1건당 1포인트가
          차감됩니다.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            지금 시작하기
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            로그인
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-3">
        <div className="card">
          <div className="mb-2 text-sm font-semibold text-brand-600">01</div>
          <h3 className="mb-2 font-semibold">키워드 + 기간 검색</h3>
          <p className="text-sm text-gray-600">
            검색탭에서 키워드와 기간을 입력해 해당 조건에 맞는 데이터 볼륨을
            먼저 확인하세요.
          </p>
        </div>
        <div className="card">
          <div className="mb-2 text-sm font-semibold text-brand-600">02</div>
          <h3 className="mb-2 font-semibold">Claude와 연동</h3>
          <p className="text-sm text-gray-600">
            발급받은 연동 키로 Claude에 newen.D를 커넥터로 추가하면, 저장한
            검색 조건을 Claude에서 바로 불러올 수 있습니다.
          </p>
        </div>
        <div className="card">
          <div className="mb-2 text-sm font-semibold text-brand-600">03</div>
          <h3 className="mb-2 font-semibold">포인트로 정산</h3>
          <p className="text-sm text-gray-600">
            가져간 데이터 1건당 1포인트가 차감됩니다. 포인트는 충전탭에서
            언제든 채울 수 있습니다.
          </p>
        </div>
      </section>
    </main>
  );
}
