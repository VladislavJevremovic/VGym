"use client";

import { useCallback, useEffect, useState } from "react";

export default function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
      if (registration.waiting) {
        setWaiting(registration.waiting);
      }
      registration.addEventListener("updatefound", () => {
        const sw = registration.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(sw);
          }
        });
      });
    }).catch(() => {});
  }, []);

  const onUpdate = useCallback(() => {
    if (!waiting) return;
    waiting.postMessage({ type: "SKIP_WAITING" });
    setWaiting(null);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, [waiting]);

  if (!waiting) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-emerald-600 px-4 py-2 text-sm text-white">
      <span>New version available</span>
      <button onClick={onUpdate} className="ml-4 rounded bg-white px-3 py-1 text-emerald-700 font-medium">
        Update
      </button>
    </div>
  );
}
