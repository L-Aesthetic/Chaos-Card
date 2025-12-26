import React, { useEffect } from "react";

export default function AdSlot({ client, slot, className = "" }) {
 useEffect(() => {
  try {
    // ✅ guard for SSR / weird runtime
    if (typeof window === "undefined") return;

    // AdSense pushes only if script loaded + approved
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  } catch (e) {
    // ✅ Ads blocked/unavailable — ignore so UI never breaks
    // (optional: comment this out if you don't want console noise)
    console.warn("AdSense not available (blocked or failed).", e);
  }
}, []);


  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
