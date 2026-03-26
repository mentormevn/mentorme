import Script from "next/script";

import BodyClassSync from "./BodyClassSync";

export default function LegacyPageView({ page }) {
  return (
    <>
      <BodyClassSync bodyClass={page.bodyClass} />
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
      {page.scripts.map((script, index) =>
        script.src ? (
          <Script
            key={script.src + "-" + index}
            src={script.src}
            strategy="afterInteractive"
          />
        ) : (
          <Script
            key={"legacy-inline-" + index}
            id={"legacy-inline-" + index}
            strategy="afterInteractive"
          >
            {script.content}
          </Script>
        )
      )}
    </>
  );
}
