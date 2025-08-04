import StatsBox from "@/components/home/StatsBox";
import SearchInput from "@/components/home/SearchInput";
import ActionCards from "@/components/home/ActionCards";
import CommonDrawer from "@/components/home/CommonDrawer";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    console.log(error);
    console.log(data.user);
    //redirect("/auth/signin");
  }

  return (
    <div className="container p-4 mx-auto space-y-6">
      <StatsBox />
      {/* <SearchInput /> */}
      <ActionCards />
      <CommonDrawer />
    </div>
  );
}
