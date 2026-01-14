import React, { useEffect, useState } from "react";
import { View } from "@/types";
import { useSettings } from "@/context/SettingsContext";

interface ScreenReaderAnnouncerProps {
    view: View;
}

const ScreenReaderAnnouncer: React.FC<ScreenReaderAnnouncerProps> = ({ view }) => {
    const [announcement, setAnnouncement] = useState("");
    const { screenReaderMode } = useSettings();

    useEffect(() => {
        // Basic view announcements
        let message = "";
        switch (view) {
            case View.LIBRARY:
                message = "Library view loaded. Use arrow keys to navigate books.";
                break;
            case View.READER:
                message = "Reader loaded.";
                break;
            case View.SETTINGS:
                message = "Settings page loaded.";
                break;
            case View.STATS:
                message = "Statistics page loaded.";
                break;
        }
        setAnnouncement(message);
    }, [view]);

    if (!screenReaderMode && !announcement) return null;

    return (
        <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: '0',
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
                border: '0'
            }}
        >
            {announcement}
        </div>
    );
};

export default ScreenReaderAnnouncer;
