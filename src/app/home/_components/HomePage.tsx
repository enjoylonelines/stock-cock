import ActionCards from "./ActionCards";
import StatsBox from "./StatsBox";

/**
 * 홈 페이지 컴포넌트 (순수 UI)
 */
export default function HomePage() {
  return (
    <div className="container p-4 mx-auto space-y-6 max-w-3xl">
      <StatsBox />
      <ActionCards />
    </div>
  );
}
