import React, { useRef, useState } from "react";
import { Plus, Upload, Loader2 } from "lucide-react";

interface AddBookButtonProps {
  onAddBook: (file: File) => Promise<void>;
  variant?: "fab" | "inline";
}

const AddBookButton: React.FC<AddBookButtonProps> = ({ onAddBook, variant = "fab" }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try { await onAddBook(file); }
    catch { alert("Failed to add book. Please ensure it is a valid EPUB file."); }
    finally { setIsProcessing(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleClick = () => fileInputRef.current?.click();
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.epub')) await processFile(file);
  };

  if (variant === "inline") {
    return (
      <>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".epub" className="hidden" disabled={isProcessing} aria-label="Upload EPUB file" />
        <button onClick={handleClick} disabled={isProcessing} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          className={`btn-primary px-8 py-4 text-base ${isDragging ? "ring-4 ring-light-accent/30 dark:ring-dark-accent/30 scale-105" : ""} ${isProcessing ? "opacity-70 cursor-wait" : ""}`}>
          {isProcessing ? (<><Loader2 className="h-5 w-5 animate-spin" />Adding book...</>) : (<><Upload className="h-5 w-5" />Add Your First Book</>)}
        </button>
      </>
    );
  }

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".epub" className="hidden" disabled={isProcessing} aria-label="Upload EPUB file" />
      <button onClick={handleClick} disabled={isProcessing} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} aria-label="Add new book"
        className={`fixed bottom-28 right-6 md:right-10 z-40 group transition-all duration-300 ease-spring focus:outline-none ${isDragging ? "scale-110" : "hover:scale-105"} ${isProcessing ? "cursor-wait" : ""}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
        <div className={`relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-light-accent to-amber-600 dark:from-dark-accent dark:to-amber-500 text-white shadow-lg shadow-light-accent/30 dark:shadow-dark-accent/25 transition-all duration-300 ${isDragging ? "ring-4 ring-white/30" : ""}`}>
          {isProcessing ? <Loader2 className="h-7 w-7 animate-spin" /> : <Plus className={`h-7 w-7 transition-transform duration-300 ${isDragging ? "rotate-180" : "group-hover:rotate-90"}`} />}
        </div>
        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-light-surface dark:bg-dark-surface text-sm font-medium text-light-text dark:text-dark-text shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">Add book</div>
      </button>
    </>
  );
};

export default AddBookButton;
