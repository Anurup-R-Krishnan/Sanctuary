interface ReaderFilterOverlayProps {
  brightness: number;
  grayscale?: boolean;
}

export function ReaderFilterOverlay({ brightness, grayscale }: ReaderFilterOverlayProps) {
  if (brightness >= 100 && !grayscale) return null;

  return (
    <>
      {brightness < 100 && (
        <div
          className="fixed inset-0 z-[200] pointer-events-none"
          style={{
            backgroundColor: "black",
            opacity: 1 - brightness / 100,
            mixBlendMode: "multiply",
          }}
          aria-hidden="true"
        />
      )}
      {grayscale && (
        <div
          className="fixed inset-0 z-[200] pointer-events-none"
          style={{
            backdropFilter: "grayscale(1)",
            WebkitBackdropFilter: "grayscale(1)",
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
