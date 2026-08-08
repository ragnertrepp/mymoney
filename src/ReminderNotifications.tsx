import { useEffect, useState } from "react";

const DATA_KEY = "rebuildme-mymoney-v2";
const RECEIVABLES_KEY = "rebuildme-mymoney-receivables-v1";
const today = () => new Date().toISOString().slice(0, 10);

function read(key: string, fallback: unknown) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

async function showReminder(body: string) {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("MyMoney reminder", {
      body,
      icon: `${import.meta.env.BASE_URL}pwa-192x192.png`,
      badge: `${import.meta.env.BASE_URL}pwa-192x192.png`,
      tag: `mymoney-reminder-${today()}`,
    });
  } catch (error) {
    console.warn("MyMoney notification could not be shown", error);
  }
}

export default function ReminderNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    "Notification" in window ? Notification.permission : "denied",
  );

  async function check() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const data = read(DATA_KEY, {}) as Record<string, unknown>;
    const receivables = read(RECEIVABLES_KEY, []);
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const debts = Array.isArray(data.debts) ? data.debts : [];

    const dueTasks = tasks.filter((t: any) => !t.completed && t.date && t.date <= today());
    const overdueDebts = debts.filter((d: any) => d.dueDate && d.dueDate < today() && Number(d.balance || 0) > 0);
    const overdueIn = Array.isArray(receivables)
      ? receivables.filter((r: any) => r.status !== "paid" && r.dueDate && r.dueDate < today())
      : [];

    const count = dueTasks.length + overdueDebts.length + overdueIn.length;
    const key = `mymoney-reminder-${today()}-${count}`;

    if (count > 0 && localStorage.getItem("mymoney-last-notification") !== key) {
      await showReminder(`${count} item${count === 1 ? "" : "s"} need attention.`);
      localStorage.setItem("mymoney-last-notification", key);
    }
  }

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), 60 * 60 * 1000);
    const handleDataChanged = () => void check();
    window.addEventListener("mymoney-data-changed", handleDataChanged);

    return () => {
      clearInterval(timer);
      window.removeEventListener("mymoney-data-changed", handleDataChanged);
    };
  }, []);

  async function enable() {
    if (!("Notification" in window)) return;
    const next = await Notification.requestPermission();
    setPermission(next);
    if (next === "granted") await check();
  }

  if (permission !== "default") return null;
  return <button className="reminder-enable" onClick={enable}>🔔 Enable reminders</button>;
}
