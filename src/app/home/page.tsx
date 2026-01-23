import ActionCards from "@/components/home/ActionCards";
import StatsBox from "@/components/home/StatsBox";

export default function Home() {

return (
    <div className="container p-4 mx-auto space-y-6 max-w-3xl">
      <StatsBox/>
      <ActionCards />
    </div>
  );
}
