export const CARD_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

export const CARD_PRIORITY_WEIGHT = {
  [CARD_PRIORITY.LOW]: 1,
  [CARD_PRIORITY.NORMAL]: 2,
  [CARD_PRIORITY.HIGH]: 3,
  [CARD_PRIORITY.URGENT]: 4
};

export const DEFAULT_LISTS = ['Backlog', 'In Progress', 'Review', 'Done'];
