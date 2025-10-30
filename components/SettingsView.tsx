import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const SettingsView: React.FC = () => {
    const { fontSize, setFontSize, lineHeight, setLineHeight } = useSettings();
    const [notifications, setNotifications] = useState(true);

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-[fadeInUp_0.5s_ease-out]">
            <h2 className="text-3xl font-serif font-bold text-light-text dark:text-dark-text">Settings</h2>

            {/* Reading Preferences Card */}
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-2xl shadow-soft-lg dark:shadow-dark-soft-lg">
                <h3 className="text-xl font-semibold font-serif mb-6 text-light-accent dark:text-dark-accent">Reading Preferences</h3>
                <div className="space-y-6">
                    {/* Font Size Slider */}
                    <div>
                        <label htmlFor="fontSize" className="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-2">Font Size: {fontSize}px</label>
                        <input
                            id="fontSize"
                            type="range"
                            min="14"
                            max="28"
                            step="1"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="w-full h-2 bg-light-primary dark:bg-dark-primary rounded-lg appearance-none cursor-pointer accent-light-accent dark:accent-dark-accent"
                        />
                    </div>

                    {/* Line Height Slider */}
                     <div>
                        <label htmlFor="lineHeight" className="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-2">Line Height: {lineHeight.toFixed(1)}</label>
                        <input
                            id="lineHeight"
                            type="range"
                            min="1.2"
                            max="2.2"
                            step="0.1"
                            value={lineHeight}
                            onChange={(e) => setLineHeight(Number(e.target.value))}
                            className="w-full h-2 bg-light-primary dark:bg-dark-primary rounded-lg appearance-none cursor-pointer accent-light-accent dark:accent-dark-accent"
                        />
                    </div>

                    {/* Live Preview */}
                    <div className="bg-light-primary dark:bg-dark-primary p-4 rounded-lg transition-all duration-300">
                        <p 
                            className="font-serif text-light-text dark:text-dark-text"
                            style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
                        >
                            This is a live preview of your text settings. Adjust the sliders above to see the changes in real-time. The quick brown fox jumps over the lazy dog.
                        </p>
                    </div>
                </div>
            </div>

            {/* Account Settings Card */}
             <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-2xl shadow-soft-lg dark:shadow-dark-soft-lg">
                <h3 className="text-xl font-semibold font-serif mb-6 text-light-accent dark:text-dark-accent">Account</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-light-text dark:text-dark-text">Enable Notifications</span>
                        <button
                            onClick={() => setNotifications(!notifications)}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-accent dark:focus:ring-offset-dark-surface dark:focus:ring-dark-accent ${notifications ? 'bg-light-accent dark:bg-dark-accent' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                     <div className="flex items-center justify-between">
                        <span className="font-medium text-light-text dark:text-dark-text">Sync Across Devices</span>
                         <button
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-accent dark:focus:ring-offset-dark-surface dark:focus:ring-dark-accent bg-light-accent dark:bg-dark-accent`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 translate-x-6`} />
                        </button>
                    </div>
                    <button className="w-full text-left font-medium text-light-text dark:text-dark-text hover:bg-light-primary dark:hover:bg-dark-primary p-3 rounded-lg transition-colors">Manage Subscription</button>
                    <button className="w-full text-left font-medium text-red-500 hover:bg-red-500/10 p-3 rounded-lg transition-colors">Sign Out</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
