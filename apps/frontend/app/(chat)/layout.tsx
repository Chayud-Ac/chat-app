"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * App shell shared by the first-run screen (`/`) and conversations (`/c/[id]`).
 * The sidebar persists across navigation; the active conversation is derived
 * from the URL so refresh and back/forward stay in sync.
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // `/c/<id>` → <id>; `/` → null (first-run).
  const match = pathname.match(/^\/c\/([^/]+)/);
  const selectedId = match ? decodeURIComponent(match[1]) : null;

  const handleSelect = (id: string | null) => {
    router.push(id ? `/c/${id}` : "/");
  };

  return (
    <div className="flex h-screen w-full">
      <Sidebar selectedId={selectedId} onSelect={handleSelect} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
