/** 전역 UI 상태 타입. 열거값은 enum 이다 (`layered-architecture.md` §6). */

export enum Theme {
  Light = "light",
  Dark = "dark",
}

export enum NotificationType {
  Success = "success",
  Error = "error",
  Info = "info",
}

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  read: boolean;
}

export interface UIState {
  theme: Theme;
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
