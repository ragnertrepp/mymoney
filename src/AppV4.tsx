import AppV3 from "./AppV3";
import BackupRestore from "./BackupRestore";
import TransactionEditor from "./TransactionEditor";
import RecurringTransactions from "./RecurringTransactions";

export default function AppV4() {
  return (
    <>
      <AppV3 />
      <aside className="v4-tools" aria-label="MyMoney V4 tööriistad">
        <RecurringTransactions />
        <TransactionEditor />
        <BackupRestore />
      </aside>
    </>
  );
}
