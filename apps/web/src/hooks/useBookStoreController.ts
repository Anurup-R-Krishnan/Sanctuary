import { useBookLibrary } from "@/hooks/useBookLibrary";

type UseBookStoreControllerOptions = {
  persistent: boolean;
};

export function useBookStoreController(options: UseBookStoreControllerOptions): void {
  // This hook initializes and binds book actions into useBookStore.
  useBookLibrary(options);
}
