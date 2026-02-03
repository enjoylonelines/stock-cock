import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import SettingsPage from "./_components/SettingsPage";
import { settingsService } from "./_services/settings-service";

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

  // 병렬로 모든 데이터 가져오기
  const [profileResult, info] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    settingsService.getSettingsInfo(user.id),
  ]);

  const { data: profile } = profileResult;

  return <SettingsPage user={profile} info={info} />;
}
