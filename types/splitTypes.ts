export const SPLIT_TYPES = [
  'upper',
  'lower', 
  'chest',
  'back',
  'legs',
  'arms',
  'cardio',
  'rest',
  'other',
] as const;

export type SplitType = typeof SPLIT_TYPES[number];

export const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  arms: 'Arms',
  cardio: 'Cardio',
  rest: 'Rest',
  other: 'Other',
};

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

// Maps split types to image file names
export const SPLIT_IMAGE_MAP: Record<string, string> = {
  upper: 'upper',
  lower: 'lower',
  chest: 'benchpress',
  back: 'back',
  legs: 'squats',
  arms: 'arms',
  cardio: 'cardio',
  rest: 'rest',
  other: 'rest',
};

export const MIN_STAKE = 0.5;

