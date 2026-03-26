import { useEffect } from "react";

export default function BodyClassSync({ bodyClass }) {
  useEffect(() => {
    const previousClassName = document.body.className;
    document.body.className = bodyClass || "";

    return () => {
      document.body.className = previousClassName;
    };
  }, [bodyClass]);

  return null;
}
