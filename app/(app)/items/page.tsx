import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ItemList from "@/app/components/app/ItemList";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ItemsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.activeOrgId) {
    redirect("/onboarding/create-org");
  }

  const items = await prisma.item.findMany({
    where: { orgId: session.user.activeOrgId, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      category: true,
      isActive: true,
      lowStockThreshold: true,
    },
    orderBy: [{ name: "asc" }],
  });

  const serializedItems = items.map((item) => ({
    ...item,
    lowStockThreshold: item.lowStockThreshold?.toString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <ItemList initialItems={serializedItems} />
    </div>
  );
}
