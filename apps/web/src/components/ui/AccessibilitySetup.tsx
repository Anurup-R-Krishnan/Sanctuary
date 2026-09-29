import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AccessibilityToggleList, ColorVisionPicker, TextSizePicker } from "@/components/settings/AccessibilityControls";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { NAVIGATION_OPTIONS, READING_SUPPORT_OPTIONS } from "@/utils/accessibility";

import { Button } from "./Button";

const STEPS = [
  { description: "Scales every menu, label and button. Book text size is set separately in the reader.", title: "Text size" },
  { description: "Adjusts colours across the app and the books you read. Highlights also get line patterns.", title: "Colour vision" },
  { description: "Contrast, font and motion.", title: "Reading support" },
  { description: "Keyboard, touch and screen reader options.", title: "Navigation" },
];

export function AccessibilitySetup() {
  const { accessibilitySetupPending, setAccessibilitySetupPending } = useSettingsShallow((s) => ({
    accessibilitySetupPending: s.accessibilitySetupPending,
    setAccessibilitySetupPending: s.setAccessibilitySetupPending,
  }));
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, accessibilitySetupPending);

  if (!accessibilitySetupPending || typeof document === "undefined") return null;

  const finish = () => {
    setAccessibilitySetupPending(false);
    setStep(0);
  };
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4">
      <div
        aria-describedby="a11y-setup-description"
        aria-labelledby="a11y-setup-title"
        aria-modal="true"
        className="paper-card flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden"
        onKeyDown={(e) => {
          if (e.key === "Escape") finish();
        }}
        ref={dialogRef}
        role="dialog"
      >
        <header className="border-b border-line px-6 pb-5 pt-6 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <p className="label-caps">Accessibility setup · {step + 1} of {STEPS.length}</p>
            <button className="text-sm font-medium text-fg-muted hover:text-fg" onClick={finish} type="button">
              Skip
            </button>
          </div>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-fg" id="a11y-setup-title">
            {current.title}
          </h2>
          <p className="mt-1.5 text-sm text-fg-muted" id="a11y-setup-description">{current.description}</p>
          <div aria-hidden="true" className="mt-5 grid grid-cols-4 gap-1.5">
            {STEPS.map((item, index) => (
              <span className={`h-1 rounded-full ${index <= step ? "bg-accent" : "bg-line"}`} key={item.title} />
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {step === 0 && (
            <div className="space-y-6">
              <TextSizePicker />
              <p className="rounded-lg border border-line bg-subtle px-4 py-3 text-base leading-relaxed text-fg">
                Sample text. Menus, buttons and labels will use this size.
              </p>
            </div>
          )}
          {step === 1 && <ColorVisionPicker />}
          {step === 2 && <AccessibilityToggleList options={READING_SUPPORT_OPTIONS} />}
          {step === 3 && <AccessibilityToggleList options={NAVIGATION_OPTIONS} />}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line px-6 py-4 sm:px-8">
          <Button disabled={step === 0} onClick={() => setStep((value) => value - 1)} variant="ghost">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <p className="hidden text-xs text-fg-muted sm:block">Change any of this later in Settings.</p>
          <Button onClick={isLast ? finish : () => setStep((value) => value + 1)}>
            {isLast ? "Done" : "Next"}
            {!isLast && <ArrowRight className="h-4 w-4" />}
          </Button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
