import { useReadingStats } from "@/hooks/useReadingStats";
import { useBookStore } from "@/store/useBookStore";

type UseStatsStoreControllerOptions = {
  persistent: boolean;
  compute: boolean;
};

export function useStatsStoreController(options: UseStatsStoreControllerOptions) {
  const books = useBookStore((state) => state.books);
  return useReadingStats(books, options.persistent, { compute: options.compute });
}
