import { useState, useEffect, useCallback, useMemo } from "react";
import type { ReadingStats, Badge, Book } from "@/types";

const SESSIONS_KEY = "sanctuary_reading_sessions";
const SETTINGS_KEY = "sanctuary_stats_settings";

interface ReadingSession {
  id: string;
  bookId: string;
  bookTitle: string;
  date: string;
  duration: number;
  pagesRead: number;
}

interface StatsSettings {
  dailyGoal: number;
  weeklyGoal: number;
  themeColor: string;
  showStreakReminder: boolean;
}

const defaultSettings: StatsSettings = {
  dailyGoal: 30,
  weeklyGoal: 150,
  themeColor: "amber",
  showStreakReminder: true,
};

const defaultBadges: Badge[] = [
  { id: "first_book", name: "First Steps", icon: "📖", description: "Complete your first book", unlocked: false, progress: 0, target: 1 },
  { id: "bookworm", name: "Bookworm", icon: "📚", description: "Complete 5 books", unlocked: false, progress: 0, target: 5 },
  { id: "librarian", name: "Librarian", icon: "🏛️", description: "Complete 25 books", unlocked: false, progress: 0, target: 25 },
  { id: "streak_3", name: "Getting Started", icon: "🔥", description: "3 day reading streak", unlocked: false, progress: 0, target: 3 },
  { id: "streak_7", name: "Week Warrior", icon: "⚡", description: "7 day reading streak", unlocked: false, progress: 0, target: 7 },
  { id: "streak_30", name: "Monthly Master", icon: "👑", description: "30 day reading streak", unlocked: false, progress: 0, target: 30 },
  { id: "hour_1", name: "Time Flies", icon: "⏱️", description: "Read for 1 hour total", unlocked: false, progress: 0, target: 60 },
  { id: "hour_10", name: "Dedicated", icon: "🎯", description: "Read for 10 hours total", unlocked: false, progress: 0, target: 600 },
  { id: "pages_100", name: "Page Turner", icon: "📄", description: "Read 100 pages", unlocked: false, progress: 0, target: 100 },
  { id: "pages_1000", name: "Thousand Club", icon: "📑", description: "Read 1000 pages", unlocked: false, progress: 0, target: 1000 },
  { id: "night_owl", name: "Night Owl", icon: "🦉", description: "Read after midnight", unlocked: false },
  { id: "early_bird", name: "Early Bird", icon: "🌅", description: "Read before 6 AM", unlocked: false },
];

export function useReadingStats(books: Book[]) {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [settings, setSettings] = useState<StatsSettings>(defaultSettings);
  const [currentSessionStart, setCurrentSessionStart] = useState<number | null>(null);
  const [currentSessionBook, setCurrentSessionBook] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem(SESSIONS_KEY);
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    if (savedSettings) setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
  }, []);

  // Save sessions
  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Save settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const startSession = useCallback((bookId: string) => {
    setCurrentSessionStart(Date.now());
    setCurrentSessionBook(bookId);
  }, []);

  const endSession = useCallback((pagesRead: number) => {
    if (!currentSessionStart || !currentSessionBook) return;

    const duration = Math.round((Date.now() - currentSessionStart) / 60000);
    if (duration < 1) return;

    const book = books.find(b => b.id === currentSessionBook);
    const newSession: ReadingSession = {
      id: crypto.randomUUID(),
      bookId: currentSessionBook,
      bookTitle: book?.title || "Unknown",
      date: new Date().toISOString().split("T")[0],
      duration,
      pagesRead,
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSessionStart(null);
    setCurrentSessionBook(null);
  }, [currentSessionStart, currentSessionBook, books]);

  const updateSettings = useCallback((newSettings: Partial<StatsSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Calculate stats
  const stats: ReadingStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const completedBooks = books.filter(b => b.progress >= 100);

    // Streak calculation
    const uniqueDates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    let currentStreak = 0;
    const checkDate = new Date();

    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (uniqueDates.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = [...uniqueDates].sort();
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        tempStreak = diff === 1 ? tempStreak + 1 : 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    const totalReadingTime = sessions.reduce((a, s) => a + s.duration, 0);
    const totalPagesRead = sessions.reduce((a, s) => a + s.pagesRead, 0);
    const todaySessions = sessions.filter(s => s.date === today);
    const dailyProgress = todaySessions.reduce((a, s) => a + s.pagesRead, 0);

    // Weekly data
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = weekDays.map((day, i) => {
      const d = new Date();
      const currentDay = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - (currentDay - i));
      const dateStr = d.toISOString().split("T")[0];
      const daySessions = sessions.filter(s => s.date === dateStr);
      return {
        day,
        pages: daySessions.reduce((a, s) => a + s.pagesRead, 0),
        minutes: daySessions.reduce((a, s) => a + s.duration, 0),
      };
    });

    // Monthly data (last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const month = d.getMonth();
      const year = d.getFullYear();
      const monthSessions = sessions.filter(s => {
        const sd = new Date(s.date);
        return sd.getMonth() === month && sd.getFullYear() === year;
      });
      return {
        month: monthNames[month],
        hours: Math.round(monthSessions.reduce((a, s) => a + s.duration, 0) / 60),
        books: completedBooks.filter(b => {
          if (!b.completedAt) return false;
          const cd = new Date(b.completedAt);
          return cd.getMonth() === month && cd.getFullYear() === year;
        }).length,
      };
    });

    // Heatmap (14 weeks)
    const heatmapData: number[][] = [];
    for (let w = 13; w >= 0; w--) {
      const week: number[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date();
        date.setDate(date.getDate() - (w * 7 + (6 - d)));
        const dateStr = date.toISOString().split("T")[0];
        const dayMins = sessions.filter(s => s.date === dateStr).reduce((a, s) => a + s.duration, 0);
        week.push(dayMins === 0 ? 0 : dayMins < 15 ? 1 : dayMins < 30 ? 2 : 3);
      }
      heatmapData.push(week);
    }

    // Genre distribution
    const genreMap = new Map<string, number>();
    books.forEach(b => {
      const genre = b.genre || "Uncategorized";
      genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
    });
    const colors = ["#c7a77b", "#8b7355", "#d4b58b", "#a08060", "#e8d5b7", "#6b5344"];
    const genreDistribution = Array.from(genreMap.entries()).map(([genre, count], i) => ({
      genre, count, color: colors[i % colors.length],
    }));

    // Author network
    const authorMap = new Map<string, number>();
    books.forEach(b => authorMap.set(b.author, (authorMap.get(b.author) || 0) + 1));
    const authorNetwork = Array.from(authorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([author, booksCount]) => ({ author, books: booksCount }));

    // Badges
    const badges = defaultBadges.map(badge => {
      const b = { ...badge };
      switch (badge.id) {
        case "first_book": b.progress = completedBooks.length; b.unlocked = completedBooks.length >= 1; break;
        case "bookworm": b.progress = completedBooks.length; b.unlocked = completedBooks.length >= 5; break;
        case "librarian": b.progress = completedBooks.length; b.unlocked = completedBooks.length >= 25; break;
        case "streak_3": b.progress = currentStreak; b.unlocked = longestStreak >= 3; break;
        case "streak_7": b.progress = currentStreak; b.unlocked = longestStreak >= 7; break;
        case "streak_30": b.progress = currentStreak; b.unlocked = longestStreak >= 30; break;
        case "hour_1": b.progress = totalReadingTime; b.unlocked = totalReadingTime >= 60; break;
        case "hour_10": b.progress = totalReadingTime; b.unlocked = totalReadingTime >= 600; break;
        case "pages_100": b.progress = totalPagesRead; b.unlocked = totalPagesRead >= 100; break;
        case "pages_1000": b.progress = totalPagesRead; b.unlocked = totalPagesRead >= 1000; break;
        case "night_owl": b.unlocked = sessions.some(s => { const h = new Date(s.date).getHours(); return h >= 0 && h < 5; }); break;
        case "early_bird": b.unlocked = sessions.some(s => { const h = new Date(s.date).getHours(); return h >= 5 && h < 7; }); break;
      }
      return b;
    });

    // Reading personality
    const avgSessionLength = sessions.length > 0 ? totalReadingTime / sessions.length : 0;
    let readingPersonality = "Explorer";
    let personalityDescription = "You're just getting started on your reading journey!";

    if (sessions.length >= 10) {
      if (avgSessionLength > 45) {
        readingPersonality = "Binge Reader";
        personalityDescription = "You love diving deep, often reading for hours at a time.";
      } else if (currentStreak >= 7) {
        readingPersonality = "Consistent Reader";
        personalityDescription = "You read regularly, building strong habits.";
      } else if (totalPagesRead / Math.max(1, completedBooks.length) > 300) {
        readingPersonality = "Epic Adventurer";
        personalityDescription = "You prefer long, immersive stories.";
      } else {
        readingPersonality = "Quick Reader";
        personalityDescription = "You enjoy shorter, focused reading sessions.";
      }
    }

    return {
      currentStreak,
      longestStreak,
      totalBooksRead: completedBooks.length,
      totalPagesRead,
      totalReadingTime,
      averageReadingSpeed: totalReadingTime > 0 ? Math.round(totalPagesRead / (totalReadingTime / 60)) : 0,
      dailyProgress,
      dailyGoal: settings.dailyGoal,
      booksCompletedThisMonth: monthlyData[5]?.books || 0,
      weeklyData,
      monthlyData,
      heatmapData,
      genreDistribution,
      authorNetwork,
      badges,
      readingPersonality,
      personalityDescription,
    };
  }, [books, sessions, settings.dailyGoal]);

  // Add manual session (for testing/manual entry)
  const addManualSession = useCallback((bookId: string, date: string, duration: number, pagesRead: number) => {
    const book = books.find(b => b.id === bookId);
    const newSession: ReadingSession = {
      id: crypto.randomUUID(),
      bookId,
      bookTitle: book?.title || "Unknown",
      date,
      duration,
      pagesRead,
    };
    setSessions(prev => [...prev, newSession]);
  }, [books]);

  return {
    stats,
    settings,
    updateSettings,
    startSession,
    endSession,
    addManualSession,
    currentSessionStart,
    sessions,
  };
}
