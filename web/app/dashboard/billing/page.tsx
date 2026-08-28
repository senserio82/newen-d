"use client";

import { useState } from "react";

const PACKAGES = [
  { points: 5500, price: "100,000원" },
  { points: 29000, price: "500,000원" },
  { points: 60000, price: "1,000,000원" },
];

export default function BillingPage() {
  const [selected, setSelected] = useState<typeof PACKAGES[number] | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cvc, setCvc] = useState("");
  const [pwPrefix, setPwPrefix] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function openModal(pkg: typeof PACKAGES[number]) {
    setSelected(pkg);
    setCardNumber("");
    setCvc("");
    setPwPrefix("");
    setDone(false);
  }

  function closeModal() {
    setSelected(null);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: 실제 결제 연동(예: 토스페이먼츠/포트원) 전 UI 단계입니다.
    // 카드 원문 정보는 이 서버가 직접 보관/전송하지 않고, 반드시 PG사의
    // 결제창(SDK)을 통해 토큰화된 값만 주고받도록 교체해야 합니다.
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setDone(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">포인트 충전</h1>
        <p className="mt-1 text-sm text-gray-600">
          데이터 1건을 가져갈 때마다 1포인트가 차감됩니다. 원하는 충전 금액을
          선택해 주세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <div key={pkg.points} className="card text-center">
            <p className="text-2xl font-bold text-brand-700">
              {pkg.points.toLocaleString()} P
            </p>
            <p className="mt-1 text-sm text-gray-500">{pkg.price}</p>
            <button onClick={() => openModal(pkg)} className="btn-primary mt-4 w-full">
              결제
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">문의를 통한 충전</h2>
        <p className="text-sm text-gray-600">
          결제에 문제가 있다면 담당 관리자에게 요청해 확인 후 포인트를
          충전받을 수도 있습니다.
        </p>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            {!done ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">카드 결제</h3>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-700">
                    ✕
                  </button>
                </div>
                <div className="mb-5 rounded-lg bg-brand-50 px-4 py-3 text-sm">
                  <span className="font-semibold text-brand-700">
                    {selected.points.toLocaleString()} P
                  </span>{" "}
                  · {selected.price}
                </div>
                <form onSubmit={submitPayment} className="space-y-4">
                  <div>
                    <label className="label">카드 번호</label>
                    <input
                      className="input tracking-widest"
                      required
                      inputMode="numeric"
                      maxLength={19}
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">CVC</label>
                      <input
                        className="input"
                        required
                        inputMode="numeric"
                        maxLength={3}
                        placeholder="000"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">비밀번호 앞 2자리</label>
                      <input
                        className="input"
                        required
                        type="password"
                        inputMode="numeric"
                        maxLength={2}
                        placeholder="••"
                        value={pwPrefix}
                        onChange={(e) => setPwPrefix(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} className="btn-primary w-full">
                    {submitting ? "결제 처리 중..." : `${selected.price} 결제하기`}
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    입력하신 카드 정보는 결제 처리 외 다른 목적으로 저장되지
                    않습니다.
                  </p>
                </form>
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="mb-2 text-2xl">✓</p>
                <h3 className="mb-1 font-semibold">결제가 완료되었습니다</h3>
                <p className="mb-6 text-sm text-gray-600">
                  {selected.points.toLocaleString()} P가 충전되었습니다.
                </p>
                <button onClick={closeModal} className="btn-primary w-full">
                  확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
