export interface Notification {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  read: boolean;
}

export interface UIState {
  theme: "light" | "dark";
  notifications: Notification[];
  unreadCount: number;
  modals: {
    [key: string]: boolean;
  };
  // 액션들도 상태에 포함
  toggleTheme: () => void;
  addNotification: (notification: Omit<Notification, "id" | "read">) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  toggleModal: (modalId: string) => void;
}
