const fs = require("fs");
let c = fs.readFileSync("src/components/reader/ReaderSettings.tsx", "utf8");

// Remove unused imports
c = c.replace(/Settings, Sun, Moon, Type, /g, '');
c = c.replace(/spread, setSpread,[\s\n]*\} = useSettingsShallow/g, '} = useSettingsShallow');
c = c.replace(/spread: state\.spread, setSpread: state\.setSpread,/g, '');

// Replace any with specific types
c = c.replace(/const Slider = \(\{ label, value, min, max, step, onChange, format \}: any\) => \(/g, 
  `const Slider = ({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) => (`);

c = c.replace(/const ButtonGroup = \(\{ label, options, value, onChange \}: any\) => \(/g,
  `const ButtonGroup = ({ label, options, value, onChange }: { label: string; options: { value: string; label: string; icon?: React.ReactNode }[]; value: string; onChange: (v: string) => void }) => (`);

c = c.replace(/options\.map\(\(opt: any\) => \(/g, `options.map((opt) => (`);

c = c.replace(/onChange\{\(v: any\) => setContinuous\(v === "flow"\)\}/g, `onChange={(v) => setContinuous(v === "flow")}`); // wait, previous code was onChange={(v: any) =>
c = c.replace(/onChange\{\(\(v: any\) =>/g, `onChange={((v: string) =>`); // fallback
c = c.replace(/onChange=\{\(v: any\) => setContinuous/g, `onChange={(v: string) => setContinuous`);

fs.writeFileSync("src/components/reader/ReaderSettings.tsx", c);
