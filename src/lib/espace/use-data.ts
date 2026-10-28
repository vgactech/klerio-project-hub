import { useEffect, useState } from "react";
import { api, type Doc, type MemEvent, type Reminder } from "./api";

export function useEspaceData() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [events, setEvents] = useState<MemEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ documents: Doc[] }>("/api/documents").then((r) => setDocs(r.documents)).catch((e: Error) => (setError(e.message), setDocs([])));
    api<{ data: Reminder[] }>("/api/espace/reminders").then((r) => setReminders(Array.isArray(r.data) ? r.data : [])).catch((e: Error) => (setError(e.message), setReminders([])));
    api<{ events: MemEvent[] }>("/api/memory?all=1").then((r) => setEvents(r.events)).catch(() => setEvents([]));
  }, []);
  return { docs, reminders, events, error, setReminders };
}

