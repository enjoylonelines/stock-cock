import SettingsPage from "@/components/setting/SettingsPage";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

export default async function Settings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="container p-4 mx-auto space-y-6 max-w-3xl">
        <Card className="p-0 bg-white">
          <CardContent className="overflow-hidden relative p-0 h-48 rounded-xl">
            <Skeleton className="absolute inset-0" />
            <div className="absolute right-0 bottom-0 left-0 p-4">
              <Skeleton className="mb-2 w-32 h-8" />
              <Skeleton className="w-48 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // 품목(products) 개수 조회
  const { count: productsCount } = await supabase.from("products").select("*", { count: "exact", head: true });

  // 멤버(profiles) 개수 조회
  const { count: membersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });

  // 입고처(warehouses) 개수 조회
  const { count: warehousesCount } = await supabase.from("warehouses").select("*", { count: "exact", head: true });

  // 출고처(suppliers) 개수 조회
  const { count: suppliersCount } = await supabase.from("suppliers").select("*", { count: "exact", head: true });

  const info = {
    productCount: productsCount || 0,
    memberCount: membersCount || 0,
    locationCount: warehousesCount || 0,
    supplierCount: suppliersCount || 0,
  };

  return <SettingsPage user={profile} info={info} />;
}
