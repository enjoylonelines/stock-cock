"use client";

import StatsBox from "@/components/home/StatsBox";
import ActionCards from "@/components/home/ActionCards";
import CommonDrawer from "@/components/home/CommonDrawer";

export default function Home() {
  return (
    <div className="container p-4 mx-auto space-y-6 max-w-3xl">
      <StatsBox />
      {/* <SearchInput /> */}
      <ActionCards />
      <CommonDrawer />
    </div>
  );
}
