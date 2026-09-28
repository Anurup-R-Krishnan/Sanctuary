export function SkeletonCard() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-surface-raised shadow-paper animate-pulse-soft">
      <div className="aspect-[2/3] w-full bg-subtle" />
      <div className="space-y-2.5 px-4 pb-4 pt-3.5">
        <div className="h-4 w-5/6 rounded bg-line/60" />
        <div className="h-3 w-2/5 rounded bg-line/45" />
        <div className="border-t border-line/60 pt-3">
          <div className="h-3 w-1/3 rounded bg-line/45" />
        </div>
      </div>
    </div>
  );
}
