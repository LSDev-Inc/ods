import Link from "next/link";
import { Badge } from "../ui/badge";

export type NavLink = {
  href: string;
  label: string;
};

export default function TopNav({
  title,
  links,
  role,
  actions
}: {
  title: string;
  links: NavLink[];
  role?: string;
  actions?: React.ReactNode;
}) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-6 py-6">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-lg font-semibold">{title}</p>
          {role ? <Badge className="mt-2 bg-ember/20 text-ember">{role}</Badge> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-fog/80 hover:text-fog">
            {link.label}
          </Link>
        ))}
        {actions}
      </div>
    </nav>
  );
}
