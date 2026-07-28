import AppV3 from "./AppV3";
import AffordabilityAdjuster from "./AffordabilityAdjuster";
import DebtReceivablesPortal from "./DebtReceivablesPortal";
import DeferredIntegrityGuard from "./DeferredIntegrityGuard";
import SafeBudgetAdjuster from "./SafeBudgetAdjuster";
import TodayOverview from "./TodayOverview";
import TopBackupAdjuster from "./TopBackupAdjuster";
import UndoManagerGuard from "./UndoManager";
import UserGuide from "./UserGuide";
import V5Tools from "./V5Tools";

export default function AppV4() {
  return (
    <>
      <UndoManagerGuard />
      <AppV3 />
      <UserGuide mode="first-run" />
      <DebtReceivablesPortal />
      <DeferredIntegrityGuard />
      <SafeBudgetAdjuster />
      <AffordabilityAdjuster />
      <TodayOverview />
      <TopBackupAdjuster />
      <V5Tools />
    </>
  );
}
