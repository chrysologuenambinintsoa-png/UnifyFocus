"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/store/app-store";

// Polling interval for notifications (30 seconds)
const NOTIFICATION_POLL_INTERVAL = 30000;

export function useNotifications() {
  const { user, fetchNotifications, notifications, setNotifications, addNotification } = useAppStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // Create a notification (client-side only, for demo purposes)
  const createNotification = useCallback(async (data: {
    title: string;
    message: string;
    type?: "info" | "success" | "warning" | "error";
    actionUrl?: string;
  }) => {
    if (!user) return null;

    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          ...data,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        addNotification(result.notification);
        return result.notification;
      }
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
    return null;
  }, [user, addNotification]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;

    const state = useAppStore.getState();
    const notification = state.notifications.find(n => n.id === id);
    if (notification?.read) return;

    // Optimistic update
    useAppStore.getState().markNotificationAsRead(id);

    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true, userId: user.id }),
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      // Revert on failure
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const state = useAppStore.getState();
    if (state.unreadNotificationCount === 0) return;

    // Optimistic update
    useAppStore.getState().markAllNotificationsAsRead();

    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    if (!user) return;

    // Optimistic update
    useAppStore.getState().deleteNotification(id);

    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch (error) {
      console.error("Failed to delete notification:", error);
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Poll for new notifications
  const pollNotifications = useCallback(async () => {
    if (!user) return;

    const now = Date.now();
    // Only fetch if last fetch was more than interval ago
    if (now - lastFetchTimeRef.current < NOTIFICATION_POLL_INTERVAL) {
      return;
    }

    lastFetchTimeRef.current = now;
    await fetchNotifications();
  }, [user, fetchNotifications]);

  // Set up polling
  useEffect(() => {
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Set up polling interval
    intervalRef.current = setInterval(pollNotifications, NOTIFICATION_POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, fetchNotifications, pollNotifications]);

  // Visibility change handler - refetch when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        fetchNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}