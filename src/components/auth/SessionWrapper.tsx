import { useEffect } from "react";
import { useSessionManager } from "@/hooks/useSessionManager";
import { useSecurityAlertsSubscription } from "@/hooks/useSecurityEvents";

interface SessionWrapperProps {
  children: React.ReactNode;
}

export const SessionWrapper = ({ children }: SessionWrapperProps) => {
  // Initialize session manager
  useSessionManager();
  
  // Subscribe to security alerts
  useSecurityAlertsSubscription();

  return <>{children}</>;
};
