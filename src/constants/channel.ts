export const CHANNEL_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private'
} as const;

export const MESSAGE_PAGE_SIZE = 30;

export const ALLOWED_REACTIONS = ['like', 'celebrate', 'eyes', 'thanks', 'fire', 'question'] as const;

export type ChannelVisibility = (typeof CHANNEL_VISIBILITY)[keyof typeof CHANNEL_VISIBILITY];
export type Reaction = (typeof ALLOWED_REACTIONS)[number];
