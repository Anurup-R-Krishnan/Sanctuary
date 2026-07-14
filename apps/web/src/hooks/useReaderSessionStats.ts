import { useState, useEffect, useRef } from "react";

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
    const locationsReadRef = useRef(0);
    const lastLocationRef = useRef<number | null>(null);

    // Initial load
    useEffect(() => {
        if (!bookId) return;
        activeSecondsRef.current = 0;
        setStats(s => ({ ...s, activeSeconds: 0, sessionStartedAt: Date.now() }));
    }, [bookId]);

    // Active ticking
    useEffect(() => {
        if (!bookId) return;
        
        const tick = () => {
            // Only tick if the document is visible
            if (document.visibilityState !== "visible") return;
            
            activeSecondsRef.current += 1;
            incrementReadingTime(bookId);

            setStats(prev => {
                const next: ReaderSessionStats = {
                    ...prev,
                    activeSeconds: activeSecondsRef.current,
                };

                // Calculate reading speed if we have enough data (e.g. 1 minute)
                if (activeSecondsRef.current > 60 && locationsReadRef.current > 0) {
                    const lpm = (locationsReadRef.current / activeSecondsRef.current) * 60;
                    next.locationsPerMinute = lpm;

                    if (currentTotalLocations > 0 && lastLocationRef.current !== null) {
                        const remainingLocations = currentTotalLocations - lastLocationRef.current;
                        if (remainingLocations > 0 && lpm > 0) {
                            next.estimatedMinutesRemaining = remainingLocations / lpm;
                        } else if (remainingLocations <= 0) {
                            next.estimatedMinutesRemaining = 0;
                        }
                    }
                }
                
                return next;
            });
        };

        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [bookId, currentTotalLocations]);

    // Track location changes to calculate speed
    const trackLocationProgress = (currentLocation: number) => {
        if (lastLocationRef.current !== null) {
            const diff = currentLocation - lastLocationRef.current;
            // Only count forward progress, and ignore massive jumps (like jumping to chapter)
            if (diff > 0 && diff < 100) {
                locationsReadRef.current += diff;
            }
        }
        lastLocationRef.current = currentLocation;
    };

    return {
        stats,
        trackLocationProgress
    };
};
