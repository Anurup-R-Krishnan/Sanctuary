import { AlertCircle, RotateCcw, Home } from "lucide-react";
import React, { useRef, useState } from "react";

import type { ReaderError } from "@/types/reader";

import { Button } from "@/components/ui/Button";
import { SUPPORTED_FILE_ACCEPT } from "@/reader/formats/FormatDetector";

interface ReaderErrorOverlayProps {
    error: ReaderError;
    onClose: () => void;
    onReplaceContent?: (file: File) => Promise<void>;
    onRetry: () => void;
    onRetryFromStart?: () => void;
}

export function ReaderErrorOverlay({ error, onRetry, onRetryFromStart, onReplaceContent, onClose }: ReaderErrorOverlayProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isReplacing, setIsReplacing] = useState(false);
    const [replaceError, setReplaceError] = useState<string | null>(null);

    const handleReplacement = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !onReplaceContent) return;
        setIsReplacing(true);
        setReplaceError(null);
        try {
            await onReplaceContent(file);
            onRetry();
        } catch (cause) {
            setReplaceError(cause instanceof Error ? cause.message : "The replacement EPUB could not be saved.");
        } finally {
            setIsReplacing(false);
        }
    };

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-sm p-6 pointer-events-auto">
            <div className="max-w-md w-full bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-8 text-center animate-scaleIn">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8" />
                </div>
                
                <h2 className="text-xl font-bold text-light-text dark:text-dark-text mb-2">
                    {error.title}
                </h2>
                
                <p className="text-light-text-muted dark:text-dark-text-muted mb-8">
                    {error.message}
                </p>
                {replaceError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{replaceError}</p>}
                <input ref={inputRef} type="file" accept={SUPPORTED_FILE_ACCEPT} className="hidden" onChange={handleReplacement} />
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Library
                    </Button>
                    
                    {error.recoverable && (
                        <Button
                            variant="primary"
                            onClick={onRetry}
                            className="flex-1"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Retry
                        </Button>
                    )}
                    {onRetryFromStart && (
                        <Button
                            variant="secondary"
                            onClick={onRetryFromStart}
                            className="flex-1"
                        >
                            Open from start
                        </Button>
                    )}
                    {onReplaceContent && (
                        <Button
                            variant="secondary"
                            onClick={() => inputRef.current?.click()}
                            isLoading={isReplacing}
                            className="flex-1"
                        >
                            Replace EPUB
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
