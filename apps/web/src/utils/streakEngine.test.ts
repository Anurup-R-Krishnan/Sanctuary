import { beforeAll, describe, expect, it } from 'bun:test';

import { ensureTestDom } from '@/reader/foliate/testEnv';
import {
  calculateSmartStreak,
  createStreakRepairChallenge,
  evaluateFlameTier,
  evaluateRepairChallengeProgress,
  loadStreakRepairChallenge,
  loadStreakShieldState,
  MAX_SHIELD_CAPACITY,
  saveStreakRepairChallenge,
  saveStreakShieldState,
} from '@/utils/streakEngine';

beforeAll(() => {
  ensureTestDom();
});

describe('streakEngine', () => {
  describe('evaluateFlameTier', () => {
    it('categorizes 0 to 2 days as Seedling with Bronze Spark as next milestone', () => {
      const tier0 = evaluateFlameTier(0);
      expect(tier0.tier).toBe('none');
      expect(tier0.icon).toBe('🌱');
      expect(tier0.nextMilestone).toBeDefined();
      expect(tier0.nextMilestone!.daysRemaining).toBe(3);
      expect(tier0.nextMilestone!.tier).toBe('bronze_spark');

      const tier2 = evaluateFlameTier(2);
      expect(tier2.tier).toBe('none');
      expect(tier2.nextMilestone!.daysRemaining).toBe(1);
    });

    it('categorizes 3 to 6 days as Bronze Spark with Silver Blaze next', () => {
      const tier = evaluateFlameTier(3);
      expect(tier.tier).toBe('bronze_spark');
      expect(tier.icon).toBe('🔥');
      expect(tier.nextMilestone!.daysRemaining).toBe(4);
      expect(tier.nextMilestone!.tier).toBe('silver_blaze');
    });

    it('categorizes 7 to 13 days as Silver Blaze with Gold Inferno next', () => {
      const tier = evaluateFlameTier(7);
      expect(tier.tier).toBe('silver_blaze');
      expect(tier.icon).toBe('⚡');
      expect(tier.nextMilestone!.daysRemaining).toBe(7);
      expect(tier.nextMilestone!.tier).toBe('gold_inferno');
    });

    it('categorizes 14 to 29 days as Gold Inferno with Amethyst Phoenix next', () => {
      const tier = evaluateFlameTier(14);
      expect(tier.tier).toBe('gold_inferno');
      expect(tier.icon).toBe('🌟');
      expect(tier.nextMilestone!.daysRemaining).toBe(16);
      expect(tier.nextMilestone!.tier).toBe('amethyst_phoenix');
    });

    it('categorizes 30 to 99 days as Amethyst Phoenix with Diamond Eternal next', () => {
      const tier = evaluateFlameTier(30);
      expect(tier.tier).toBe('amethyst_phoenix');
      expect(tier.icon).toBe('🔮');
      expect(tier.nextMilestone!.daysRemaining).toBe(70);
      expect(tier.nextMilestone!.tier).toBe('diamond_eternal');
    });

    it('categorizes 100+ days as Diamond Eternal with no further milestone', () => {
      const tier = evaluateFlameTier(100);
      expect(tier.tier).toBe('diamond_eternal');
      expect(tier.icon).toBe('💎');
      expect(tier.nextMilestone).toBeNull();
    });
  });

  describe('createStreakRepairChallenge & evaluateRepairChallengeProgress', () => {
    it('creates a challenge with target minutes set to double the daily goal', () => {
      const now = new Date(2026, 8, 13, 10, 0, 0);
      const challenge = createStreakRepairChallenge('2026-09-12', 30, now);

      expect(challenge.lapsedDate).toBe('2026-09-12');
      expect(challenge.targetMinutes).toBe(60);
      expect(challenge.completed).toBe(false);
      expect(new Date(challenge.expiresAt).getTime()).toBeGreaterThan(now.getTime());
    });

    it('evaluates progress and marks challenge complete once target is satisfied', () => {
      const now = new Date(2026, 8, 13, 10, 0, 0);
      const challenge = createStreakRepairChallenge('2026-09-12', 20, now); // Target: 40 min

      const step1 = evaluateRepairChallengeProgress(challenge, 25, now);
      expect(step1.completed).toBe(false);
      expect(step1.progressMinutes).toBe(25);

      const step2 = evaluateRepairChallengeProgress(step1, 45, now);
      expect(step2.completed).toBe(true);
      expect(step2.progressMinutes).toBe(45);
    });
  });

  describe('calculateSmartStreak', () => {
    const fixedNow = new Date(2026, 8, 13, 9, 30, 0); // Sunday, Sep 13, 2026, 09:30 AM

    it('prevents morning premature reset when user read yesterday but not today yet', () => {
      // User read Sep 10, 11, 12 (3 consecutive days). Has NOT read today (Sep 13) yet.
      const sessionDates = new Set(['2026-09-10', '2026-09-11', '2026-09-12']);
      const result = calculateSmartStreak(sessionDates, {
        now: fixedNow,
      });

      expect(result.currentStreak).toBe(3);
      expect(result.status).toBe('pending_today');
      expect(result.flame.tier).toBe('bronze_spark');
      expect(result.statusMessage).toContain('Read today to extend');
    });

    it('increments streak when user completes reading today', () => {
      // User read Sep 10, 11, 12, and now has also read today (Sep 13)
      const sessionDates = new Set(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13']);
      const result = calculateSmartStreak(sessionDates, {
        now: fixedNow,
      });

      expect(result.currentStreak).toBe(4);
      expect(result.status).toBe('active_today');
      expect(result.statusMessage).toContain('Streak active');
    });

    it('automatically deploys Grace Shield when yesterday was skipped', () => {
      // User read Sep 10 and Sep 11. Skipped Sep 12. Evaluating on Sep 13 morning.
      const sessionDates = new Set(['2026-09-10', '2026-09-11']);
      const result = calculateSmartStreak(sessionDates, {
        availableShields: 1,
        now: fixedNow,
      });

      // Shield should protect Sep 12
      expect(result.status).toBe('protected_by_shield');
      expect(result.shields.availableShields).toBe(0);
      expect(result.shields.usedShieldDates).toContain('2026-09-12');
      expect(result.currentStreak).toBe(3); // Sep 10, Sep 11, and shielded Sep 12
      expect(result.statusMessage).toContain('Shield protected your 3-day streak');
    });

    it('marks streak as broken if yesterday was skipped and no shields are available', () => {
      // User read Sep 10 and Sep 11. Skipped Sep 12. 0 shields available.
      const sessionDates = new Set(['2026-09-10', '2026-09-11']);
      const result = calculateSmartStreak(sessionDates, {
        availableShields: 0,
        now: fixedNow,
      });

      expect(result.status).toBe('broken');
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(2);
      expect(result.statusMessage).toContain('Start a new reading streak');
    });

    it('preserves historical longest streak even when current streak breaks', () => {
      // Long streak in August, current broken in September
      const sessionDates = new Set([
        '2026-08-01',
        '2026-08-02',
        '2026-08-03',
        '2026-08-04',
        '2026-08-05',
        '2026-08-06',
        '2026-08-07',
        '2026-08-08', // 8-day streak
        '2026-09-01', // Broken isolated day
      ]);
      const result = calculateSmartStreak(sessionDates, {
        availableShields: 0,
        now: fixedNow,
      });

      expect(result.longestStreak).toBe(8);
      expect(result.currentStreak).toBe(0);
      expect(result.status).toBe('broken');
    });

    it('awards new grace shields every 7 active days up to max capacity', () => {
      // 14 distinct session dates
      const sessionDates = new Set([
        '2026-09-01',
        '2026-09-02',
        '2026-09-03',
        '2026-09-04',
        '2026-09-05',
        '2026-09-06',
        '2026-09-07',
        '2026-09-08',
        '2026-09-09',
        '2026-09-10',
        '2026-09-11',
        '2026-09-12',
        '2026-09-13',
        '2026-09-14',
      ]);
      const result = calculateSmartStreak(sessionDates, {
        availableShields: 0,
        earnedShieldCount: 0,
        now: new Date(2026, 8, 14),
      });

      expect(result.shields.availableShields).toBe(MAX_SHIELD_CAPACITY);
      expect(result.shields.earnedShieldCount).toBe(2);
    });
  });

  describe('Storage Persistence', () => {
    it('handles localStorage saving and loading seamlessly', () => {
      const mockShieldState = {
        availableShields: 2,
        earnedShieldCount: 3,
        lastShieldUsedDate: '2026-09-10',
        usedShieldDates: ['2026-09-10'],
      };

      saveStreakShieldState(mockShieldState);
      const loadedShields = loadStreakShieldState();
      expect(loadedShields.availableShields).toBe(2);
      expect(loadedShields.lastShieldUsedDate).toBe('2026-09-10');
      expect(loadedShields.usedShieldDates).toContain('2026-09-10');

      const mockChallenge = {
        completed: false,
        expiresAt: '2026-09-14T12:00:00.000Z',
        lapsedDate: '2026-09-12',
        progressMinutes: 15,
        targetMinutes: 60,
      };

      saveStreakRepairChallenge(mockChallenge);
      const loadedChallenge = loadStreakRepairChallenge();
      expect(loadedChallenge).not.toBeNull();
      expect(loadedChallenge?.targetMinutes).toBe(60);
      expect(loadedChallenge?.lapsedDate).toBe('2026-09-12');

      saveStreakRepairChallenge(null);
      expect(loadStreakRepairChallenge()).toBeNull();
    });
  });
});
