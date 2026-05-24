import { create } from "zustand";
import type { MyRoom } from "@/types";

type RoomStore = {
  room: MyRoom | null;
  setRoom: (room: MyRoom) => void;
};

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  setRoom: (room) => set({ room }),
}));
