export type User = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  mood_current: string | null;
};

export type MyRoom = {
  id: string;
  user_id: string;
  theme_primary_color: string;
  theme_secondary_color: string;
  theme_atmosphere: string;
  furniture_layout: Record<string, unknown>;
};

export type SoulPost = {
  id: string;
  user_id: string;
  content: string;
  emotion_color: string;
  emotion_intensity: number;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  msg_type: "user" | "ai" | "system";
  created_at: string;
};
