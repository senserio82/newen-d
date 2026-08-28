import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, points")
    .eq("id", user!.id)
    .single();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-brand-700">
            newen.D
          </Link>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{profile?.company_name ?? user!.email}</span>
            <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">
              {profile?.points ?? 0} P
            </span>
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-6">
          <TabLink href="/dashboard/status" label="현황" />
          <TabLink href="/dashboard/search" label="검색" />
          <TabLink href="/dashboard/billing" label="포인트 충전" />
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

function TabLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 hover:border-brand-300 hover:text-brand-700"
    >
      {label}
    </Link>
  );
}
