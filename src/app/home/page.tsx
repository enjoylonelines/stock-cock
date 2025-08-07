import StatsBox from "@/components/home/StatsBox";
import SearchInput from "@/components/home/SearchInput";
import ActionCards from "@/components/home/ActionCards";
import CommonDrawer from "@/components/home/CommonDrawer";

export default async function Home() {
  return (
    <div className="container p-4 mx-auto space-y-6">
      <StatsBox />
      {/* <SearchInput /> */}
      <ActionCards />
      <CommonDrawer />
    </div>
  );
}
