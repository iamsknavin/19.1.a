"use client";

import { LazyMotion, domAnimation, m } from "motion/react";
import { Children, type ReactNode } from "react";

interface AnimatedListProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function AnimatedList({
  children,
  staggerDelay = 0.03,
  className,
}: AnimatedListProps) {
  return (
    <LazyMotion features={domAnimation}>
      <div className={className}>
        {Children.map(children, (child, index) => (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * staggerDelay,
              ease: "easeOut",
            }}
          >
            {child}
          </m.div>
        ))}
      </div>
    </LazyMotion>
  );
}
