import { useOrderNotifications } from "@/hooks/useOrderNotifications";

/**
 * Component that listens for new order notifications
 * Should be placed in the main layout to always be active
 */
const OrderNotificationListener = () => {
  useOrderNotifications();
  return null;
};

export default OrderNotificationListener;
