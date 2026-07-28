import AppV3 from "./AppV3";
import BackupRestore from "./BackupRestore";
import TransactionEditor from "./TransactionEditor";
import RecurringTransactions from "./RecurringTransactions";
import PlannedPayments from "./PlannedPayments";
import MonthlyView from "./MonthlyView";

export default function AppV4() {
  return (
    <>
      <AppV3 />
      <aside className="v4-tools" aria-label="MyMoney V4 tööriistad">
        <MonthlyView />
        <PlannedPayments />
        <RecurringTransactions />
        <TransactionEditor />
        <BackupRestore />
      </aside>
    </>
  );
}
