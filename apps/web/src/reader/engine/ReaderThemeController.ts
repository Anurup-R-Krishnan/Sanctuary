export interface ReaderThemeConfig {
    continuous: boolean;
    fontPairing: string;
    fontSize: number;
    hyphenation: boolean;
    lineHeight: number;
    maxTextWidth: number;
    pageMargin: number;
    paragraphSpacing: number;
    readerBackground: string;
    readerForeground: string;
    textAlignment: "left" | "center" | "right" | "justify";
}

const FONT_FAMILIES: Record<string, string> = {
    "merriweather-georgia": "'Merriweather', Georgia, serif",
    "crimson-pro": "'Crimson Pro', Georgia, serif",
    "libre-baskerville": "'Libre Baskerville', Georgia, serif",
    "lora": "'Lora', Georgia, serif",
    "source-serif": "'Source Serif Pro', Georgia, serif",
    "inter": "'Inter', system-ui, sans-serif",
};

export class ReaderThemeController {
    public buildStyles(config: ReaderThemeConfig): Record<string, Record<string, string>> {
        const {
            fontSize,
            lineHeight,
            fontPairing,
            textAlignment,
            hyphenation,
            readerForeground,
            readerBackground,
            continuous,
            pageMargin,
            paragraphSpacing,
            maxTextWidth,
        } = config;

        const fontFamily = FONT_FAMILIES[fontPairing] ?? "'Merriweather', Georgia, serif";
        const horizontalPadding = continuous ? pageMargin : Math.max(8, pageMargin);

        return {
            "html": {
                "color-scheme": readerBackground.toLowerCase() === "#000000" ? "dark" : "light",
                "background-color": readerBackground,
            },
            "body": {
                "font-family": fontFamily,
                "font-size": `${fontSize}px`,
                "line-height": `${lineHeight}`,
                "color": `${readerForeground} !important`,
                "background-color": `${readerBackground} !important`,
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
            "p": {
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
            "a": {
                "color": "inherit",
                "text-decoration-thickness": "0.08em",
                "text-underline-offset": "0.15em",
            },
            "img, svg, video": {
                "max-width": "100% !important",
                "height": "auto !important",
                "object-fit": "contain",
            },
            "table": {
                "max-width": "100%",
                "border-collapse": "collapse",
            },
            "pre": {
                "white-space": "pre-wrap",
                "overflow-wrap": "anywhere",
                "max-width": "100%",
            },
            "blockquote": {
                "max-width": "100%",
            },
            "::selection": {
                "background": "rgba(128, 128, 128, 0.35)",
            },
        };
    }
}
