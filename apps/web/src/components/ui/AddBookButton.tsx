import { Plus, Upload, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "./Button";
import { IconButton } from "./IconButton";

interface AddBookButtonProps {
  onAddBook: (file: File) => Promise<void>;
  variant?: "fab" | "inline";
}

function AddBookButton({ onAddBook, variant = "fab" }: AddBookButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(null), 5000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".epub")) {
      setErrorMessage("Only EPUB files are supported.");
      return;
    }
    setIsLoading(true);
    try {
      await onAddBook(file);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add book.");
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
        <div className="flex items-center gap-3">
          <Button
            onClick={() => inputRef.current?.click()}
            isLoading={isLoading}
            variant="primary"
          >
            <Upload className="w-4 h-4 mr-2" />
            <span>Add Book</span>
          </Button>
          {errorMessage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 animate-fadeIn">
              <span className="text-sm text-red-600 dark:text-red-400">{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub"
        className="hidden"
        onChange={handleChange}
      />

      <div className={`fixed bottom-24 right-6 z-40 transition-transform duration-instant ${isDragging ? "scale-110" : ""}`}>
        <IconButton
          icon={<Plus className={`w-6 h-6 text-white transition-transform duration-instant ${isDragging ? "rotate-45" : "group-hover:rotate-90"}`} />}
          label="Add book"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          isLoading={isLoading}
          className={`w-14 h-14 !rounded-2xl shadow-lg border-0 group transition-all duration-instant ${
            isDragging
              ? "bg-light-accent dark:bg-dark-accent scale-110"
              : "bg-light-accent dark:bg-dark-accent hover:shadow-xl hover:scale-105"
          }`}
        />

        {isDragging && (
          <div className="absolute -inset-4 rounded-3xl border-2 border-dashed border-light-accent dark:border-dark-accent animate-pulse pointer-events-none" />
        )}

        {errorMessage && (
          <div className="absolute bottom-full right-0 mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-light-surface dark:bg-dark-surface border border-red-200 dark:border-red-800/40 shadow-lg animate-slideIn whitespace-nowrap">
            <span className="text-sm text-red-600 dark:text-red-400">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default AddBookButton;
