import React, { useEffect } from "react";

export default function AdSlot({ client, slot, className = "" }) {
  useEffect(() => {
    try {
      // AdSense pushes only if script loaded + approved
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {}
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
