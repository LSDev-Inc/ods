import { redirect } from "next/navigation";
import TopNav from "../../components/layout/TopNav";
import LogoutButton from "../../components/layout/LogoutButton";
import SessionGuard from "../../components/SessionGuard";
import { PageContainer } from "../../components/layout/PageContainer";
import { getSession } from "../../lib/auth/rbac";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    redirect("/access");
  }
  return (
    <main className="min-h-screen">
      <PageContainer>
        <SessionGuard intervalMs={5000} />
        <TopNav
          title={session ? `Ciao, ${session.username}` : "Owner"}
          role="OWNER"
          links={[
            { href: "/owner", label: "Panoramica" },
            { href: "/owner/admins", label: "Admin" },
            { href: "/owner/products", label: "Prodotti" },
            { href: "/owner/chat", label: "Chat" },
            { href: "/owner/reports", label: "Resoconti" },
            { href: "/owner/secure", label: "Riservata" }
          ]}
          actions={<LogoutButton />}
        />
        {children}
      </PageContainer>
    </main>
  );
}
