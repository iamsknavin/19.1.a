"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatter?: (n: number) => string;
}

export function CountUp({
  end,
  duration = 800,
  prefix = "",
  suffix = "",
  className,
  formatter,
}: CountUpProps) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    // Check for reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(end);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * end));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration]);

  const display = formatter ? formatter(current) : current.toLocaleString("en-IN");

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}{display}{suffix}
    </span>
  );
}
