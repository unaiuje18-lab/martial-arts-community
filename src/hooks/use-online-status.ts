import { useEffect, useState } from "react";

export function useOnlineStatus(): { online: boolean; justReconnected: boolean } {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [justReconnected, setJust] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setJust(true);
      setTimeout(() => setJust(false), 2500);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return { online, justReconnected };
}