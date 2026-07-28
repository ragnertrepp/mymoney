import AppV3 from "./AppV3";
import AffordabilityAdjuster from "./AffordabilityAdjuster";
import SafeBudgetAdjuster from "./SafeBudgetAdjuster";
import TodayOverview from "./TodayOverview";
import V5Tools from "./V5Tools";

export default function AppV4() {
  return (
    <>
      <AppV3 />
      <SafeBudgetAdjuster />
      <AffordabilityAdjuster />
      <TodayOverview />
      <V5Tools />
    </>
  );
}
