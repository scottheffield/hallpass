import type { ReactNode } from "react";

export interface StackProps {
  children: ReactNode;
  gap?: "xs" | "sm" | "md" | "lg";
  as?: "div" | "section" | "ul";
}

const GAP = {
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
} as const;

export function Stack({ children, gap = "md", as: Tag = "div" }: StackProps) {
  return <Tag className={`flex flex-col ${GAP[gap]}`}>{children}</Tag>;
}
