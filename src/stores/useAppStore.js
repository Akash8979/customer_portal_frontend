import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: localStorage.getItem('theme') || 'light',
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : '');
    set({ theme: next });
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),

  // ── AI Panel ──────────────────────────────────────────────────────────────
  aiPanelOpen: false,
  aiAction: null,
  aiLoading: false,
  aiOutput: null,
  aiHistory: [],

  openAiPanel: (action, output = null) =>
    set({ aiPanelOpen: true, aiAction: action, aiOutput: output, aiLoading: !output }),

  setAiLoading: (loading) => set({ aiLoading: loading }),

  setAiOutput: (output) => {
    const { aiAction, aiHistory } = get();
    const entry = { action: aiAction, output, timestamp: new Date().toISOString() };
    set({ aiOutput: output, aiLoading: false, aiHistory: [entry, ...aiHistory].slice(0, 20) });
  },

  closeAiPanel: () => set({ aiPanelOpen: false, aiAction: null, aiOutput: null, aiLoading: false }),

  // ── Toast ─────────────────────────────────────────────────────────────────
  toasts: [],
  addToast: (toast) => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: [],
  unreadCount: 0,
  setNotifications: (list) =>
    set({ notifications: list, unreadCount: list.filter((n) => !n.read).length }),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));

export default useAppStore;
