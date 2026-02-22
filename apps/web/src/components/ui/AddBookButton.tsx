import React, { useRef, useState } from "react";
import { Plus, Upload, Loader2 } from "lucide-react";

interface AddBookButtonProps {
  onAddBook: (file: File) => Promise<void>;
  variant?: "fab" | "inline";
}

const AddBookButton: React.FC<AddBookButtonProps> = ({ onAddBook, variant = "fab" }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const toUploadErrorMessage = (error: unknown): string => {
    const raw = error instanceof Error ? error.message : "";
    const normalized = raw.toLowerCase();
    if (
      normalized.includes("already uploaded") ||
      normalized.includes("duplicate book upload") ||
      normalized.includes("409")
    ) {
      return "This book is already in your library.";
    }
    return raw || "Upload failed. Please try again.";
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".epub")) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      await onAddBook(file);
    } catch (error) {
      setErrorMessage(toUploadErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (variant === "inline") {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept=".epub"
          className="hidden"
          onChange={handleChange}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className="px-6 py-3 bg-scrap-sage text-white font-head font-bold rounded-sm border-2 border-scrap-navy shadow-scrap-card hover:shadow-scrap-lift hover:-translate-y-1 transition-all flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Adding...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Add Book</span>
            </>
          )}
        </button>
        {errorMessage && (
          <p className="max-w-xs text-center text-xs text-red-600 font-body bg-red-100 px-2 py-1 border border-red-300 transform rotate-1">{errorMessage}</p>
        )}
      </>
    );
  }

  // FAB Variant (Stamp / Sticker Style)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub"
        className="hidden"
        onChange={handleChange}
      />

      <div className={`fixed bottom-24 right-6 z-40 transition-transform duration-200 ${isDragging ? "scale-110" : ""}`}>
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          disabled={isLoading}
          className={`
            group flex items-center justify-center
            w-16 h-16 rounded-full
            bg-scrap-navy border-4 border-scrap-cream outline outline-2 outline-scrap-navy
            shadow-scrap-deep transition-all duration-300
            hover:scale-110 hover:-translate-y-1 hover:rotate-12 hover:shadow-scrap-lift
            active:scale-95 active:translate-y-0
            ${isDragging ? "bg-scrap-sage rotate-12" : ""}
          `}
          aria-label="Add book"
          title="Add a new book (EPUB)"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-scrap-cream animate-spin" />
          ) : (
            <Plus
              className={`w-8 h-8 text-scrap-cream transition-transform duration-200 stroke-[3px] ${
                isDragging ? "rotate-45" : "group-hover:rotate-90"
              }`}
            />
          )}

          {/* Sticker Edge Effect */}
          <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
        </button>

        {/* Label Tooltip (Scrap of paper) */}
        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-sm border border-scrap-navy shadow-sm transform -rotate-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <span className="font-head font-bold text-scrap-navy text-xs">ADD NEW</span>
        </div>

        {isDragging && (
          <div className="absolute -inset-4 rounded-full border-2 border-dashed border-scrap-sage animate-spin-slow pointer-events-none opacity-50" />
        )}
      </div>
      {errorMessage && (
        <div className="fixed bottom-44 right-6 z-40 max-w-[260px] bg-red-50 border-2 border-red-200 p-3 shadow-scrap-card transform -rotate-1 font-body text-xs text-red-800">
          <strong>Oops!</strong> {errorMessage}
        </div>
      )}
    </>
  );
};

export default AddBookButton;
