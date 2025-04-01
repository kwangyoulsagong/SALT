import { create } from "zustand";
import type { UIState, Notification } from "@/types/store/ui/types";

export const useUIStore = create<UIState>((set) => ({
  // 초기 상태 값
  theme: "light",
  notifications: [],
  unreadCount: 0,
  modals: {},

  // 테마 토글 (라이트/다크)
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "light" ? "dark" : "light",
    })),

  // 새로운 알림 추가
  addNotification: (notification) =>
    set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: Date.now().toString(), // 타임스탬프로 고유 ID 생성
        read: false,
      };
      return {
        notifications: [...state.notifications, newNotification],
        unreadCount: state.unreadCount + 1,
      };
    }),

  // 알림을 읽음으로 표시
  markNotificationAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      ),
      unreadCount: state.unreadCount - 1,
    })),

  // 모든 알림 초기화
  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),

  // 모달 토글 (열기/닫기)
  toggleModal: (modalId) =>
    set((state) => ({
      modals: {
        ...state.modals,
        [modalId]: !state.modals[modalId],
      },
    })),
}));
