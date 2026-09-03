import { useState, useEffect, useRef, useCallback } from "react";

import type { ReaderSessionStats } from "@/types/reader";

import { incrementReadingTime } from "../reader/persistence/readingTimeRepository";

export const useReaderSessionStats = (bookId: string, currentTotalLocations: number) => {
    const [stats, setStats] = useState<ReaderSessionStats>({
        activeSeconds: 0,
        sessionStartedAt: Date.now(),
        estimatedMinutesRemaining: null,
        locationsPerMinute: null,
    });

    const activeSecondsRef = useRef(0);
    const unsavedSecondsRef = useRef(0);
    const locationsReadRef = useRef(0);
    const lastLocationRef = useRef<number | null>(null);

    const flushReadingTime = useCallback(() => {
        if (!bookId || unsavedSecondsRef.current === 0) return;
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
            sessionStartedAt: Date.now(),
            estimatedMinutesRemaining: null,
            locationsPerMinute: null,
        });
    }, [bookId]);

    // Active ticking
    useEffect(() => {
        if (!bookId) return;
        
        const tick = () => {
            if (document.visibilityState !== "visible") return;
            
            activeSecondsRef.current += 1;
            unsavedSecondsRef.current += 1;

            if (unsavedSecondsRef.current >= 15) {
                flushReadingTime();
            }

            // Recalculate stats every 10s or when minute estimates change
            if (activeSecondsRef.current % 10 === 0 && activeSecondsRef.current > 60 && locationsReadRef.current > 0) {
                const lpm = (locationsReadRef.current / activeSecondsRef.current) * 60;
                let estimated: number | null = null;

                if (currentTotalLocations > 0 && lastLocationRef.current !== null) {
                    const remainingLocations = currentTotalLocations - lastLocationRef.current;
                    if (remainingLocations > 0 && lpm > 0) {
                        estimated = Math.round((remainingLocations / lpm) * 10) / 10;
                    } else if (remainingLocations <= 0) {
                        estimated = 0;
                    }
                }

                setStats(prev => {
                    if (prev.estimatedMinutesRemaining === estimated && prev.locationsPerMinute === lpm) {
                        return prev;
                    }
                    return {
                        ...prev,
                        activeSeconds: activeSecondsRef.current,
                        locationsPerMinute: lpm,
                        estimatedMinutesRemaining: estimated,
                    };
                });
            }
        };

        const interval = setInterval(tick, 1000);
        return () => {
            clearInterval(interval);
            flushReadingTime();
        };
    }, [bookId, currentTotalLocations, flushReadingTime]);

    // Track location changes to calculate speed
    const trackLocationProgress = useCallback((currentLocation: number) => {
        if (lastLocationRef.current !== null) {
            const diff = currentLocation - lastLocationRef.current;
            if (diff > 0 && diff < 100) {
                locationsReadRef.current += diff;
            }
        }
        lastLocationRef.current = currentLocation;
    }, []);

    return {
        stats,
        trackLocationProgress,
    };
};
