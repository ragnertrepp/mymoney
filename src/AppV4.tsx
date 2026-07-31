import { lazy, Suspense } from "react";
import AppV3 from "./AppV3";
import AffordabilityAdjuster from "./AffordabilityAdjuster";
import BudgetControlAdjuster from "./BudgetControlAdjuster";
import DebtReceivablesPortal from "./DebtReceivablesPortal";
import DeferredIntegrityGuard from "./DeferredIntegrityGuard";
import MainNavigation from "./MainNavigation";
import NavigationAdjuster from "./NavigationAdjuster";
import NotesPage from "./NotesPage";
import QuickAdd from "./QuickAdd";
import ReminderNotifications from "./ReminderNotifications";
import SafeBudgetAdjuster from "./SafeBudgetAdjuster";
import SecurityGate from "./SecurityGate";
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
  return <Suspense fallback={null}><UserGuide mode="first-run" /></Suspense>;
}

export default function AppV4() {
  return (
    <SecurityGate>
      <UndoManagerGuard />
      <AppV3 />
      <MainNavigation />
      <FirstRunGuide />
      <DebtReceivablesPortal />
      <NavigationAdjuster />
      <BudgetControlAdjuster />
      <DeferredIntegrityGuard />
      <SafeBudgetAdjuster />
      <AffordabilityAdjuster />
      <TodayOverview />
      <TopBackupAdjuster />
      <NotesPage />
      <ReminderNotifications />
      <QuickAdd />
      <V5Tools />
    </SecurityGate>
  );
}
