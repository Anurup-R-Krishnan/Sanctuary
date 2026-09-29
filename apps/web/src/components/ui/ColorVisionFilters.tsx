import { COLOR_VISION_MATRICES } from "@/utils/accessibility";

export function ColorVisionFilters() {
  return (
    <svg aria-hidden="true" focusable="false" height="0" style={{ position: "absolute" }} width="0">
      <defs>
        {Object.entries(COLOR_VISION_MATRICES).map(([mode, matrix]) => (
          <filter colorInterpolationFilters="linearRGB" id={`sanctuary-cvd-${mode}`} key={mode}>
            <feColorMatrix type="matrix" values={matrix} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
