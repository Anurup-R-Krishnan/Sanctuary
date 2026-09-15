import { useState, useEffect, useRef, useCallback } from "react";

import type { ReaderPosition, ReaderSessionStats } from "@/types/reader";

import { useSettingsStore } from "@/store/useSettingsStore";

import { incrementReadingTime } from "../reader/persistence/readingTimeRepository";

export const useReaderSessionStats = (
    bookId: string,
    currentTotalLocations: number,
    position?: Partial<ReaderPosition> | null
) => {
    const [stats, setStats] = useState<ReaderSessionStats>({
        activeSeconds: 0,
        chapterEstimatedMinutesRemaining: null,
        estimatedMinutesRemaining: null,
        locationsPerMinute: null,
        readingSpeedWpm: null,
        sessionStartedAt: Date.now(),
    });

    const activeSecondsRef = useRef(0);
    const unsavedSecondsRef = useRef(0);
    const charsReadRef = useRef(0);
    const lastLocationRef = useRef<number | null>(null);
    const lastTotalRemainingRef = useRef<number | null>(null);
    const positionRef = useRef<Partial<ReaderPosition> | null>(position ?? null);

    useEffect(() => {
        positionRef.current = position ?? null;
    }, [position]);

    const flushReadingTime = useCallback(() => {
        const trackingEnabled = useSettingsStore.getState().trackingEnabled;
        if (!bookId || unsavedSecondsRef.current === 0 || !trackingEnabled) {
            unsavedSecondsRef.current = 0;
            return;
        }
        const toSave = unsavedSecondsRef.current;
        unsavedSecondsRef.current = 0;
        for (let i = 0; i < toSave; i++) {
            incrementReadingTime(bookId);
        }
    }, [bookId]);

    // Initial load
    useEffect(() => {
        if (!bookId) return;
        activeSecondsRef.current = 0;
        unsavedSecondsRef.current = 0;
        setStats({
            activeSeconds: 0,
            chapterEstimatedMinutesRemaining: null,
            estimatedMinutesRemaining: null,
            locationsPerMinute: null,
            readingSpeedWpm: null,
            sessionStartedAt: Date.now(),
        });
    }, [bookId]);

    // Compute estimates from velocity and remaining weights
    const computeEstimates = useCallback((
        activeSec: number,
        charsRead: number,
        loc: number | null,
        pos: Partial<ReaderPosition> | null
    ) => {
        let lpm: number | null = null;
        let wpm: number | null = null;

        if (activeSec >= 20 && charsRead > 0) {
            wpm = Math.max(80, Math.min(800, Math.round((charsRead / 6) / (activeSec / 60))));
            lpm = Math.round((wpm / 250) * 100) / 100;
        }

        const effectiveWpm = wpm ?? 230;
        const charsPerMinute = effectiveWpm * 6;

        let chapterEstimated: number | null = null;
        if (typeof pos?.chapterRemainingWeight === "number") {
            chapterEstimated = Math.round((pos.chapterRemainingWeight / charsPerMinute) * 10) / 10;
        } else if (typeof pos?.chapterProgress === "number") {
            const remFraction = Math.max(0, (100 - pos.chapterProgress) / 100);
            chapterEstimated = Math.round(remFraction * 4 * 10) / 10;
        }

        let bookEstimated: number | null = null;
        if (typeof pos?.totalRemainingWeight === "number") {
            bookEstimated = Math.round((pos.totalRemainingWeight / charsPerMinute) * 10) / 10;
        } else if (currentTotalLocations > 0 && loc !== null) {
            const remainingLocations = currentTotalLocations - loc;
            if (remainingLocations > 0 && (lpm ?? 1) > 0) {
                bookEstimated = Math.round((remainingLocations / (lpm ?? 1)) * 10) / 10;
            } else if (remainingLocations <= 0) {
                bookEstimated = 0;
            }
        }

        return { bookEstimated, chapterEstimated, lpm, wpm };
    }, [currentTotalLocations]);

    // Active ticking
    useEffect(() => {
        if (!bookId) return;
        
        const tick = () => {
            const trackingEnabled = useSettingsStore.getState().trackingEnabled;
            if (document.visibilityState !== "visible" || !trackingEnabled) return;
            
            activeSecondsRef.current += 1;
            unsavedSecondsRef.current += 1;

            if (unsavedSecondsRef.current >= 15) {
                flushReadingTime();
            }

            // Recalculate stats periodically
            if (activeSecondsRef.current % 5 === 0) {
                const { bookEstimated, chapterEstimated, lpm, wpm } = computeEstimates(
                    activeSecondsRef.current,
                    charsReadRef.current,
                    lastLocationRef.current,
                    positionRef.current
                );

                setStats(prev => {
                    if (
                        prev.activeSeconds === activeSecondsRef.current &&
                        prev.chapterEstimatedMinutesRemaining === chapterEstimated &&
                        prev.estimatedMinutesRemaining === bookEstimated &&
                        prev.locationsPerMinute === lpm &&
                        prev.readingSpeedWpm === wpm
                    ) {
                        return prev;
                    }
                    return {
                        activeSeconds: activeSecondsRef.current,
                        chapterEstimatedMinutesRemaining: chapterEstimated,
                        estimatedMinutesRemaining: bookEstimated,
                        locationsPerMinute: lpm,
                        readingSpeedWpm: wpm,
                        sessionStartedAt: prev.sessionStartedAt,
                    };
                });
            }
        };

        const interval = setInterval(tick, 1000);
        return () => {
            clearInterval(interval);
            flushReadingTime();
        };
    }, [bookId, computeEstimates, flushReadingTime]);

    // Record location changes to calculate speed and refresh estimates
    const recordLocationProgress = useCallback((
        currentLocation: number,
        chapterRemainingWeight?: number,
        totalRemainingWeight?: number
    ) => {
        const trackingEnabled = useSettingsStore.getState().trackingEnabled;
        if (!trackingEnabled) return;

        lastLocationRef.current = currentLocation;

        if (typeof totalRemainingWeight === "number") {
            if (lastTotalRemainingRef.current !== null) {
                const charsDelta = lastTotalRemainingRef.current - totalRemainingWeight;
                if (charsDelta > 0 && charsDelta < 20000) {
                    charsReadRef.current += charsDelta;
                }
            }
            lastTotalRemainingRef.current = totalRemainingWeight;
        }

        if (chapterRemainingWeight !== undefined || totalRemainingWeight !== undefined) {
            positionRef.current = {
                ...positionRef.current,
                ...(chapterRemainingWeight !== undefined ? { chapterRemainingWeight } : {}),
                ...(totalRemainingWeight !== undefined ? { totalRemainingWeight } : {}),
            };
        }

        const { bookEstimated, chapterEstimated, lpm, wpm } = computeEstimates(
            activeSecondsRef.current,
            charsReadRef.current,
            currentLocation,
            positionRef.current
        );

        setStats(prev => ({
            ...prev,
            chapterEstimatedMinutesRemaining: chapterEstimated,
            estimatedMinutesRemaining: bookEstimated,
            locationsPerMinute: lpm,
            readingSpeedWpm: wpm,
        }));
    }, [computeEstimates]);

    return {
        recordLocationProgress,
        stats,
    };
};
