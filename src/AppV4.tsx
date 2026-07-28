import AppV3 from "./AppV3";
import BackupRestore from "./BackupRestore";

export default function AppV4() {
  return (
    <>
      <AppV3 />
      <aside className="backup-restore-panel" aria-label="Varukoopia taastamine">
        <BackupRestore />
      </aside>
    </>
  );
}
