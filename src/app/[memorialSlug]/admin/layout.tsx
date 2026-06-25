import { AdminNav } from "./nav";

type AdminLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    memorialSlug: string;
  }>;
};

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { memorialSlug } = await params;

  return (
    <div className="space-y-6">
      <AdminNav memorialSlug={memorialSlug} />
      {children}
    </div>
  );
}
