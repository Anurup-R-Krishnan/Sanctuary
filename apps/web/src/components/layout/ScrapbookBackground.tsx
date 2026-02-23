import React from 'react';

const ScrapbookBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f4ebd8]">
            {/* Global Noise Overlay */}
            <div
                className="pointer-events-none fixed inset-0 z-50 opacity-[0.035] mix-blend-multiply"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Background Collage Layers */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">

                {/* Layer 1: Celestial Map Scrap (Top Right) */}
                <div
                    className="absolute -top-[10%] -right-[5%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] opacity-[0.06] rotate-[-5deg] mix-blend-color-burn"
                    style={{
                        backgroundImage: `radial-gradient(circle at center, transparent 0%, #f4ebd8 70%), url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg stroke='%233e2723' stroke-width='1' fill='none'%3E%3Ccircle cx='50' cy='50' r='40' stroke-dasharray='4,4'/%3E%3Ccircle cx='50' cy='50' r='30'/%3E%3Ccircle cx='50' cy='50' r='20' stroke-dasharray='2,2'/%3E%3Cpath d='M10 50 L90 50 M50 10 L50 90 M22 22 L78 78 M22 78 L78 22' opacity='0.3'/%3E%3Ccircle cx='70' cy='30' r='2' fill='%233e2723'/%3E%3Ccircle cx='30' cy='70' r='1.5' fill='%233e2723'/%3E%3Ccircle cx='60' cy='80' r='1' fill='%233e2723'/%3E%3C/g%3E%3C/svg%3E")`,
                        backgroundSize: '100% 100%, 150px 150px'
                    }}
                />

                {/* Layer 2: Sheet Music Scrap (Bottom Left) */}
                <div
                    className="absolute -bottom-[5%] -left-[10%] w-[70vw] h-[50vw] max-w-[900px] max-h-[700px] opacity-[0.05] rotate-[3deg] mix-blend-multiply"
                    style={{
                        backgroundImage: `linear-gradient(to right, transparent, #f4ebd8 90%), url("data:image/svg+xml,%3Csvg width='200' height='100' viewBox='0 0 200 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg stroke='%232c1e16' stroke-width='0.75' opacity='0.8'%3E%3Cline x1='0' y1='20' x2='200' y2='20'/%3E%3Cline x1='0' y1='30' x2='200' y2='30'/%3E%3Cline x1='0' y1='40' x2='200' y2='40'/%3E%3Cline x1='0' y1='50' x2='200' y2='50'/%3E%3Cline x1='0' y1='60' x2='200' y2='60'/%3E%3Cpath d='M30,15 C40,40 20,60 30,85' fill='none' stroke-width='2'/%3E%3Ccircle cx='60' cy='35' r='4' fill='%232c1e16'/%3E%3Cline x1='64' y1='35' x2='64' y2='10' stroke-width='1.5'/%3E%3Ccircle cx='110' cy='45' r='4' fill='%232c1e16'/%3E%3Cline x1='114' y1='45' x2='114' y2='20' stroke-width='1.5'/%3E%3Ccircle cx='150' cy='25' r='4' fill='%232c1e16'/%3E%3Cline x1='154' y1='25' x2='154' y2='50' stroke-width='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
                        backgroundSize: '100% 100%, 200px 100px'
                    }}
                />

                {/* Layer 3: Night Sky / Starry Scrap (Center / Right margin) */}
                <div
                    className="absolute top-[30%] right-[10%] w-[30vw] h-[80vw] max-w-[400px] max-h-[1000px] opacity-[0.04] mix-blend-color-burn"
                    style={{
                        backgroundImage: `linear-gradient(to bottom, transparent, #f4ebd8 95%), url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%231a2332'%3E%3Cpolygon points='50,10 55,45 90,50 55,55 50,90 45,55 10,50 45,45' opacity='0.8' transform='scale(0.2) translate(100, 100)'/%3E%3Cpolygon points='50,10 55,45 90,50 55,55 50,90 45,55 10,50 45,45' opacity='0.5' transform='scale(0.15) translate(400, 300)'/%3E%3Ccircle cx='80' cy='20' r='1'/%3E%3Ccircle cx='20' cy='80' r='1.5'/%3E%3Ccircle cx='70' cy='70' r='0.5'/%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
                        backgroundSize: '100% 100%, 150px 150px'
                    }}
                />

                {/* Torn Paper Edge Overlay on the right side to add structure */}
                <div className="absolute top-0 -right-4 w-12 h-full bg-black/5 blur-[2px] opacity-20" />
            </div>

            {/* Main Content Layer */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default ScrapbookBackground;
