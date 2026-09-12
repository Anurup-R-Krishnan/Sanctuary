export type ChallengePaceStatus = "ahead" | "behind" | "on-pace";

export interface AnnualChallenge {
  aheadBehindCount: number;
  completedBooks: number;
  daysRemaining: number;
  expectedBooks: number;
  goal: number;
  paceStatus: ChallengePaceStatus;
  percentComplete: number;
  year: number;
}
