import { createContext, useContext, type ReactNode } from "react";

export interface ShellNavValue {
  onGoHome: () => void;
}

const ShellNavContext = createContext<ShellNavValue | null>(null);

export function ShellNavProvider({
  value,
  children,
}: {
  value: ShellNavValue;
  children: ReactNode;
}) {
  return <ShellNavContext.Provider value={value}>{children}</ShellNavContext.Provider>;
}

export function useShellNav(): ShellNavValue | null {
  return useContext(ShellNavContext);
}
