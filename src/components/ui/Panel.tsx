import React from "react";
import { X } from "lucide-react";

interface PanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    side?: "left" | "right";
}

const Panel: React.FC<PanelProps> = ({ isOpen, onClose, title, children, side = "left" }) => (
    <>
        <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={onClose}
        />
        <div
            className={`fixed top-0 ${side === "left" ? "left-0" : "right-0"} h-full w-80 max-w-[85vw] z-[60] bg-light-surface dark:bg-dark-surface shadow-2xl transition-transform duration-300 ${isOpen ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full"
                }`}
        >
            <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
                <h3 className="font-semibold text-light-text dark:text-dark-text">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                    <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">{children}</div>
        </div>
    </>
);

export default Panel;
