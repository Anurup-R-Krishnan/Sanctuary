import React, { useRef, useState } from "react";
import { PlusIcon } from "./icons/PlusIcon";

interface AddBookButtonProps {
  onAddBook: (file: File) => Promise<void>;
}

const AddBookButton: React.FC<AddBookButtonProps> = ({ onAddBook }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        await onAddBook(file);
      } catch (error) {
        alert("Failed to add book. Please ensure it is a valid EPUB file.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".epub"
        className="hidden"
        disabled={isProcessing}
      />
      <button
        onClick={handleClick}
        disabled={isProcessing}
        className="fixed bottom-24 right-4 md:right-8 z-40 w-16 h-16 rounded-full bg-light-accent dark:bg-dark-accent text-white shadow-soft-xl dark:shadow-dark-soft-xl flex items-center justify-center transition-transform duration-300 ease-spring hover:scale-110 focus:outline-none focus:ring-4 focus:ring-light-accent/50 dark:focus:ring-dark-accent/50"
        aria-label="Add new book"
      >
        {isProcessing ? (
          <svg
            className="animate-spin h-7 w-7 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          <PlusIcon className="h-8 w-8" />
        )}
      </button>
    </>
  );
};

export default AddBookButton;
