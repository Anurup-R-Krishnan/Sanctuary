import React, { useRef, useState } from "react";
import { Plus, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface AddBookButtonProps {
  onAddBook: (file: File) => Promise<void>;
  variant?: "fab" | "inline";
}

const AddBookButton: React.FC<AddBookButtonProps> = ({ onAddBook, variant = "fab" }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".epub")) {
      setError("Only EPUB files are supported");
      addToast("Only EPUB files are supported", "error");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onAddBook(file);
      addToast(`Successfully added "${file.name.replace(".epub", "")}"`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add book";
      setError(msg);
      addToast(msg, "error");
      setTimeout(() => setError(null), 3000);
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
          className="btn-primary"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Adding...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Add Book</span>
            </>
          )}
        </button>
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

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`fixed bottom-32 sm:bottom-12 right-6 z-40 transition-transform duration-200 ${isDragging ? "scale-110" : ""
          }`}
      >
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className={`group flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg transition-all duration-200 ${isDragging
            ? "bg-light-accent dark:bg-dark-accent scale-110"
            : "bg-light-accent dark:bg-dark-accent hover:shadow-xl hover:scale-105"
            }`}
          aria-label="Add book"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Plus
              className={`w-6 h-6 text-white transition-transform duration-200 ${isDragging ? "rotate-45" : "group-hover:rotate-90"
                }`}
            />
          )}
        </button>

        {isDragging && (
          <div className="absolute -inset-4 rounded-3xl border-2 border-dashed border-light-accent dark:border-dark-accent animate-pulse pointer-events-none" />
        )}

        {error && (
          <div className="absolute bottom-full mb-2 right-0 px-3 py-2 bg-red-500 text-white text-sm rounded-lg whitespace-nowrap shadow-lg">
            {error}
          </div>
        )}
      </div>
    </>
  );
};

export default AddBookButton;
