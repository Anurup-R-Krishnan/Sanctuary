import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";

interface Settings {
  fontSize: number;
  lineHeight: number;
  immersiveMode: boolean;
  continuousMode: boolean;
  pageMargin: number;
  paragraphSpacing: number;
  textAlignment: "left" | "justify" | "center";
  fontPairing: string;
  dropCaps: boolean;
  readerForeground: string;
  readerBackground: string;
  readerAccent: string;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setImmersiveMode: (enabled: boolean) => void;
  setContinuousMode: (enabled: boolean) => void;
  setPageMargin: (value: number) => void;
  setParagraphSpacing: (value: number) => void;
  setTextAlignment: (
    alignment: "left" | "justify" | "center",
  ) => void;
  setFontPairing: (key: string) => void;
  setDropCaps: (enabled: boolean) => void;
  setReaderForeground: (color: string) => void;
  setReaderBackground: (color: string) => void;
  setReaderAccent: (color: string) => void;
}

const SettingsContext = createContext<Settings | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem("sanctuary-fontSize");
    return saved ? parseInt(saved, 10) : 18;
  });

  const [lineHeight, setLineHeight] = useState<number>(() => {
    const saved = localStorage.getItem("sanctuary-lineHeight");
    return saved ? parseFloat(saved) : 1.6;
  });

  const [immersiveMode, setImmersiveMode] = useState<boolean>(
    () => {
      const saved = localStorage.getItem(
        "sanctuary-immersiveMode",
      );
      return saved ? saved === "true" : false;
    },
  );

  const [continuousMode, setContinuousMode] = useState<boolean>(
    () => {
      const saved = localStorage.getItem(
        "sanctuary-continuousMode",
      );
      return saved ? saved === "true" : false;
    },
  );

  const [pageMargin, setPageMargin] = useState<number>(() => {
    const saved = localStorage.getItem("sanctuary-pageMargin");
    return saved ? parseFloat(saved) : 24;
  });

  const [paragraphSpacing, setParagraphSpacing] =
    useState<number>(() => {
      const saved = localStorage.getItem(
        "sanctuary-paragraphSpacing",
      );
      return saved ? parseFloat(saved) : 16;
    });

  const [textAlignment, setTextAlignment] = useState<
    "left" | "justify" | "center"
  >(() => {
    const saved = localStorage.getItem(
      "sanctuary-textAlignment",
    );
    if (
      saved === "left" ||
      saved === "justify" ||
      saved === "center"
    ) {
      return saved;
    }
    return "left";
  });

  const [fontPairing, setFontPairing] = useState<string>(() => {
    return (
      localStorage.getItem("sanctuary-fontPairing") ||
      "merriweather-georgia"
    );
  });

  const [dropCaps, setDropCaps] = useState<boolean>(() => {
    const saved = localStorage.getItem("sanctuary-dropCaps");
    return saved ? saved === "true" : false;
  });

  const [readerForeground, setReaderForeground] =
    useState<string>(() => {
      return (
        localStorage.getItem("sanctuary-readerForeground") ||
        "#1f2933"
      );
    });

  const [readerBackground, setReaderBackground] =
    useState<string>(() => {
      return (
        localStorage.getItem("sanctuary-readerBackground") ||
        "transparent"
      );
    });

  const [readerAccent, setReaderAccent] = useState<string>(
    () => {
      return (
        localStorage.getItem("sanctuary-readerAccent") ||
        "#3b82f6"
      );
    },
  );

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-fontSize",
      fontSize.toString(),
    );
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-lineHeight",
      lineHeight.toString(),
    );
  }, [lineHeight]);

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-immersiveMode",
      immersiveMode.toString(),
    );
  }, [immersiveMode]);

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-continuousMode",
      continuousMode.toString(),
    );
  }, [continuousMode]);

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-pageMargin",
      pageMargin.toString(),
    );
  }, [pageMargin]);

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-paragraphSpacing",
      paragraphSpacing.toString(),
    );
  }, [paragraphSpacing]);

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-textAlignment",
      textAlignment,
    );
  }, [textAlignment]);

  useEffect(() => {
    localStorage.setItem("sanctuary-fontPairing", fontPairing);
  }, [fontPairing]);

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-dropCaps",
      dropCaps.toString(),
    );
  }, [dropCaps]);

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-readerForeground",
      readerForeground,
    );
  }, [readerForeground]);

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-readerBackground",
      readerBackground,
    );
  }, [readerBackground]);

  useEffect(() => {
    localStorage.setItem(
      "sanctuary-readerAccent",
      readerAccent,
    );
  }, [readerAccent]);

  return (
    <SettingsContext.Provider
      value={{
        fontSize,
        setFontSize,
        lineHeight,
        setLineHeight,
        immersiveMode,
        setImmersiveMode,
        continuousMode,
        setContinuousMode,
        pageMargin,
        setPageMargin,
        paragraphSpacing,
        setParagraphSpacing,
        textAlignment,
        setTextAlignment,
        fontPairing,
        setFontPairing,
        dropCaps,
        setDropCaps,
        readerForeground,
        setReaderForeground,
        readerBackground,
        setReaderBackground,
        readerAccent,
        setReaderAccent,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): Settings => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error(
      "useSettings must be used within a SettingsProvider",
    );
  }
  return context;
};
