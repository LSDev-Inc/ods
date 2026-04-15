import { redirect } from "next/navigation";
import TopNav from "../../components/layout/TopNav";
import LogoutButton from "../../components/layout/LogoutButton";
import SessionGuard from "../../components/SessionGuard";
import { PageContainer } from "../../components/layout/PageContainer";
import { getSession } from "../../lib/auth/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role === "user") {
    redirect("/access");
  }
  return (
    <main className="min-h-screen">
      <PageContainer>
        <SessionGuard intervalMs={5000} />
        <TopNav
          title={session ? `Ciao, ${session.username}` : "Dashboard Admin"}
          role={session?.role?.toUpperCase() ?? "ADMIN"}
          links={[
            { href: "/admin", label: "Richieste" },
            { href: "/admin/products", label: "Prodotti" },
            { href: "/admin/chat", label: "Chat" },
            { href: "/admin/reports", label: "Resoconti" }
          ]}
          actions={<LogoutButton />}
        />
        {children}
      </PageContainer>
    </main>
  );
}
