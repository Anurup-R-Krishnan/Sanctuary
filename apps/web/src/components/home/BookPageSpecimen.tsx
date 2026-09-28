const OPENING =
  "all me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; then, I account it high time to get to sea as soon as I can.";

export function BookPageSpecimen() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[25rem] select-none">
      <div className="absolute inset-0 translate-x-3 translate-y-2 rotate-[2.5deg] rounded-[6px] border border-line/70 bg-surface-raised shadow-sm" />
      <div className="absolute inset-0 translate-x-1.5 translate-y-1 rotate-[1.2deg] rounded-[6px] border border-line/70 bg-surface-raised shadow-sm" />
      <div className="relative rotate-[-0.6deg] rounded-[6px] border border-line bg-surface-raised px-8 pb-8 pt-7 shadow-xl sm:px-11">
        <div className="flex items-center justify-between border-b border-line/70 pb-2">
          <span className="label-caps !text-2xs !tracking-[0.2em]">Moby-Dick</span>
          <span className="label-caps !text-2xs !tracking-[0.2em]">Chapter I</span>
        </div>

        <h3 className="mt-7 text-center font-display text-2xl font-medium tracking-tight text-fg">Loomings</h3>
        <div className="mx-auto mt-3 h-px w-10 bg-accent/60" />

        <p className="mt-6 font-serif text-[0.97rem] leading-[1.68] text-fg/90 [hyphens:auto] [text-align:justify] [text-wrap:pretty]" lang="en">
          <span className="float-left -ml-0.5 mr-[3px] mt-[0.3rem] font-display text-[3.5rem] font-medium leading-[0.78] text-accent">C</span>
          {OPENING}
        </p>

        <div className="mt-6 text-center">
          <span className="folio text-sm text-fg-muted">1</span>
        </div>
      </div>
    </div>
  );
}
