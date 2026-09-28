import { create } from "zustand";
import { useUserStore } from "./userStore";

export const useChatStore = create((set) => ({
  chatId: null,
  user: null,
  isCurrentUserBlocked: false,
  isReceiverBlocked: false,
  showDetail: false,

  changeChat: (chatId, user) => {
    const currentUser = useUserStore.getState().currentUser;

    if (user?.blocked?.includes(currentUser?.id)) {
      return set({
        chatId,
        user: null,
        isCurrentUserBlocked: true,
        isReceiverBlocked: false,
        showDetail: false,
      });
    }

    if (currentUser?.blocked?.includes(user?.id)) {
      return set({
        chatId,
        user,
        isCurrentUserBlocked: false,
        isReceiverBlocked: true,
        showDetail: false,
      });
    }

    return set({
      chatId,
      user,
      isCurrentUserBlocked: false,
      isReceiverBlocked: false,
      showDetail: false,
    });
  },

  changeBlock: () => {
    set((state) => ({ isReceiverBlocked: !state.isReceiverBlocked }));
  },

  toggleDetail: () => {
    set((state) => ({ showDetail: !state.showDetail }));
  },

  resetChat: () => {
    set({
      chatId: null,
      user: null,
      isCurrentUserBlocked: false,
      isReceiverBlocked: false,
      showDetail: false,
    });
  },
}));