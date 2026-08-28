import AdminAccountsTable from "@/components/AdminAccountsTable";

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">계정 관리</h1>
        <p className="mt-1 text-sm text-gray-600">
          가입 계정 현황, 포인트 부여, 계정 비활성화를 관리합니다.
        </p>
      </div>
      <AdminAccountsTable />
    </div>
  );
}
