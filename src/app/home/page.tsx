"use client";

import ActionCards from "@/components/home/ActionCards";
import HomeSkeleton from "@/components/home/HomeSkeleton";
import SearchInput from "@/components/home/SearchInput";
import StatsBox from "@/components/home/StatsBox";
import { useStats } from "@/hooks/useStats";
import { useEffect, useState } from "react";

export default function Home() {
  const { summary, isLoading } = useStats();

  if (isLoading) {
    return (
      <div className="container p-4 mx-auto space-y-6 max-w-3xl">
        <HomeSkeleton />
      </div>
    );
  }

  return (
    <div className="container p-4 mx-auto space-y-6 max-w-3xl">
      <StatsBox />
      {/* <SearchInput /> */}
      <ActionCards />
    </div>
  );
}
