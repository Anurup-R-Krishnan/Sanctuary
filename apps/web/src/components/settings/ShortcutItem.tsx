import { X, Plus } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

interface ShortcutItemProps {
    keys: string[];
    label: string;
    onChange: (keys: string[]) => void;
}

export const ShortcutItem = ({ label, keys, onChange }: ShortcutItemProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempKeys, setTempKeys] = useState<string[]>([]);

    const startEditing = () => {
        setTempKeys([...keys]);
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setTempKeys([]);
    };

    const saveEditing = () => {
        onChange(tempKeys);
        setIsEditing(false);
        setTempKeys([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        const key = e.key;
        if (key === "Escape") {
            cancelEditing();
        } else if (key === "Enter") {
            saveEditing();
        } else if (key === "Backspace") {
            if (tempKeys.length > 0) {
                setTempKeys(tempKeys.slice(0, -1));
            } else {
                onChange([]);
                cancelEditing();
            }
        } else if (!tempKeys.includes(key)) {
            setTempKeys([...tempKeys, key]);
        }
    };

    const removeKey = (keyToRemove: string) => {
        const newKeys = keys.filter(k => k !== keyToRemove);
        onChange(newKeys);
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">{label}</span>
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <input
                        type="text"
                        readOnly
                        autoFocus
                        aria-label={`${label} shortcut editor`}
                        className="px-3 py-1 text-xs bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent cursor-text min-w-[120px] text-center"
                        onKeyDown={handleKeyDown}
                        onBlur={cancelEditing}
                        value={tempKeys.length === 0 ? "Press keys…" : tempKeys.join(" + ")}
                        onChange={() => {/* controlled via keyDown */}}
                    />
                ) : (
                    <div className="flex items-center gap-1">
                        {keys.map((key, index) => (
                            <span key={index} className="relative group">
                                <kbd className="px-2 py-1 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded font-mono">
                                    {key === " " ? "Space" : key}
                                </kbd>
                                <IconButton
                                    onClick={() => removeKey(key)}
                                    label={`Remove ${key} key binding`}
                                    icon={<X className="w-2.5 h-2.5" />}
                                    variant="ghost"
                                    size="sm"
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 !p-0 bg-red-500 text-white !rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </span>
                        ))}
                        <Button
                            onClick={startEditing}
                            variant="ghost"
                            size="sm"
                            aria-label={`Add key binding for ${label}`}
                            className="!px-2 !py-1 !rounded-lg bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent hover:bg-light-accent/20 dark:hover:bg-dark-accent/20"
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
