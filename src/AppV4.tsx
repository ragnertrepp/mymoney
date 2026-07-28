import AppV3 from "./AppV3";
import SafeBudgetAdjuster from "./SafeBudgetAdjuster";
import TodayOverview from "./TodayOverview";
import V5Tools from "./V5Tools";

export default function AppV4() {
  return (
    <>
      <AppV3 />
      <SafeBudgetAdjuster />
      <TodayOverview />
      <V5Tools />
    </>
  );
}
