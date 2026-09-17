import { isColorDark } from "../foliate/FoliateRendition";

export interface ReaderThemeConfig {
    bionicReading?: boolean;
    continuous: boolean;
    fontPairing: string;
    fontSize: number;
    fontWeight?: number;
    hyphenation: boolean;
    letterSpacing?: number;
    lineHeight: number;
    maxTextWidth: number;
    pageMargin: number;
    paragraphSpacing: number;
    readerAccent?: string;
    readerBackground: string;
    readerForeground: string;
    textAlignment: "left" | "center" | "right" | "justify";
}

const FONT_FAMILIES: Record<string, string> = {
    "crimson-pro": "'Crimson Pro', Georgia, serif",
    "inter": "'Inter', system-ui, sans-serif",
    "inter-sf": "'Inter', 'Satoshi', system-ui, sans-serif",
    "jetbrains-mono": "'JetBrains Mono', 'Fira Code', monospace",
    "libre-baskerville": "'Libre Baskerville', Georgia, serif",
    "lora": "'Lora', Georgia, serif",
    "merriweather-georgia": "'Merriweather', Georgia, serif",
    "opendyslexic": "'OpenDyslexic', 'Comic Sans MS', sans-serif",
    "satoshi": "'Satoshi', system-ui, sans-serif",
    "source-serif": "'Source Serif Pro', Georgia, serif",
};

export class ReaderThemeController {
    public buildStyles(config: ReaderThemeConfig): Record<string, Record<string, string>> {
        const {
            fontSize,
            fontWeight,
            lineHeight,
            letterSpacing,
            fontPairing,
            textAlignment,
            hyphenation,
            readerForeground,
            readerBackground,
            readerAccent,
            continuous,
            pageMargin,
            paragraphSpacing,
            maxTextWidth,
        } = config;

        const resolvedWeight = fontWeight ?? 400;
        const fontFamily = FONT_FAMILIES[fontPairing] ?? `'${fontPairing}', Georgia, serif`;
        const horizontalPadding = continuous ? pageMargin : Math.max(8, pageMargin);

        return {
            "html": {
                "color-scheme": isColorDark(readerBackground) ? "dark" : "light",
                "background-color": readerBackground,
            },
            "body": {
                "font-family": fontFamily,
                "font-size": `${fontSize}px`,
                "font-weight": `${resolvedWeight}`,
                "line-height": `${lineHeight}`,
                "letter-spacing": letterSpacing ? `${letterSpacing}px` : "normal",
                "color": readerForeground,
                "background-color": readerBackground,
                "padding-top": `${pageMargin}px`,
                "padding-bottom": `${Math.max(pageMargin, 24)}px`,
                "padding-left": `${horizontalPadding}px`,
                "padding-right": `${horizontalPadding}px`,
                "max-width": continuous ? `${maxTextWidth}ch` : "none",
                "margin": continuous ? "0 auto" : "0",
                "box-sizing": "border-box",
                "overflow-wrap": "break-word",
                "word-break": "normal",
                "-webkit-font-smoothing": "antialiased",
                "text-rendering": "optimizeLegibility",
            },
            "p, li, dd": {
                "font-family": "inherit",
                "font-size": "inherit",
                "line-height": "inherit",
                "color": "inherit",
                "margin-top": "0",
                "margin-bottom": `${paragraphSpacing}px`,
                "text-align": textAlignment,
                "hyphens": hyphenation ? "auto" : "none",
                "-webkit-hyphens": hyphenation ? "auto" : "none",
                "orphans": "2",
                "widows": "2",
            },
            "h1, h2, h3, h4, h5, h6": {
                "font-family": "inherit",
                "color": "inherit",
            },
            "a": {
                "color": "inherit",
                "text-decoration-thickness": "0.08em",
                "text-underline-offset": "0.15em",
                "text-decoration-color": readerAccent ? readerAccent : "currentColor",
            },
            "img, svg, video": {
                "max-width": "100%",
                "height": "auto",
                "object-fit": "contain",
            },
            "table": {
                "max-width": "100%",
                "border-collapse": "collapse",
            },
            "pre": {
                "white-space": "pre",
                "word-break": "normal",
                "overflow-wrap": "normal",
                "max-width": "100%",
                "overflow-x": "auto",
            },
            "blockquote": {
                "max-width": "100%",
                "color": "inherit",
            },
            "::selection": {
                "background": "rgba(128, 128, 128, 0.35)",
            },
            ".bionic-fixation": {
                "font-weight": "700",
                "display": "inline",
            },
        };
    }
}
