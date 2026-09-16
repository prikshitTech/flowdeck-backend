export const CARD_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export type CardPriority = (typeof CARD_PRIORITY)[keyof typeof CARD_PRIORITY];

export const CARD_PRIORITY_WEIGHT: Record<CardPriority, number> = {
  [CARD_PRIORITY.LOW]: 1,
  [CARD_PRIORITY.NORMAL]: 2,
  [CARD_PRIORITY.HIGH]: 3,
  [CARD_PRIORITY.URGENT]: 4
};

export const DEFAULT_LISTS = ['Backlog', 'In Progress', 'Review', 'Done'] as const;
