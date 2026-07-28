import { lazy, Suspense } from "react";
import AppV3 from "./AppV3";
import AffordabilityAdjuster from "./AffordabilityAdjuster";
import DebtReceivablesPortal from "./DebtReceivablesPortal";
import DeferredIntegrityGuard from "./DeferredIntegrityGuard";
import NavigationAdjuster from "./NavigationAdjuster";
import SafeBudgetAdjuster from "./SafeBudgetAdjuster";
import TodayOverview from "./TodayOverview";
import TopBackupAdjuster from "./TopBackupAdjuster";
import UndoManagerGuard from "./UndoManager";
import V5Tools from "./V5Tools";

const UserGuide = lazy(() => import("./UserGuide"));
const GUIDE_SEEN_KEY = "rebuildme-mymoney-guide-seen-v1";

function FirstRunGuide() {
  let shouldShow = false;
  try {
    shouldShow = localStorage.getItem(GUIDE_SEEN_KEY) !== "1";
  } catch {
    shouldShow = false;
  }

  if (!shouldShow) return null;

  return (
    <Suspense fallback={null}>
      <UserGuide mode="first-run" />
    </Suspense>
  );
}

export default function AppV4() {
  return (
    <>
      <UndoManagerGuard />
      <AppV3 />
      <FirstRunGuide />
      <DebtReceivablesPortal />
      <NavigationAdjuster />
      <DeferredIntegrityGuard />
      <SafeBudgetAdjuster />
      <AffordabilityAdjuster />
      <TodayOverview />
      <TopBackupAdjuster />
      <V5Tools />
    </>
  );
}
