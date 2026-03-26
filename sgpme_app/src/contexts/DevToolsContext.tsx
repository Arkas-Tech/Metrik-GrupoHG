"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import dynamic from "next/dynamic";

const DevToolsPanel = dynamic(() => import("@/components/DevToolsPanel"), {
  ssr: false,
});

interface DevToolsContextType {
  openDevTools: (tab?: string) => void;
  closeDevTools: () => void;
}

const DevToolsContext = createContext<DevToolsContextType>({
  openDevTools: () => {},
  closeDevTools: () => {},
});

export function DevToolsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("system");

  const openDevTools = useCallback((tab = "system") => {
    setInitialTab(tab);
    setIsOpen(true);
  }, []);

  const closeDevTools = useCallback(() => setIsOpen(false), []);

  return (
    <DevToolsContext.Provider value={{ openDevTools, closeDevTools }}>
      {children}
      {isOpen && (
        <DevToolsPanel onClose={closeDevTools} initialTab={initialTab} />
      )}
    </DevToolsContext.Provider>
  );
}

export function useDevTools() {
  return useContext(DevToolsContext);
}
