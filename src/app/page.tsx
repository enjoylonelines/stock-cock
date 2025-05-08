import StatsBox from "@/components/home/StatsBox";
import SearchInput from "@/components/home/SearchInput";
import ActionCards from "@/components/home/ActionCards";
import CommonDrawer from "@/components/home/CommonDrawer";
import { ReceiptProvider } from "@/contexts/ReceiptContext";
export default function Home() {
  return (
    <div className="container p-4 mx-auto space-y-6">
      <StatsBox />
      <SearchInput />
      <ActionCards />
      <ReceiptProvider>
        <CommonDrawer />
      </ReceiptProvider>
    </div>
  );
}
