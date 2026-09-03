const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// We extract the meta tag and replace the CSP domains.
const cspRegex = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/;
const match = html.match(cspRegex);

if (match) {
    let policy = match[1];
    
    // Add Fontshare to style-src
    policy = policy.replace(/style-src ([^;]+);/g, "style-src $1 https://api.fontshare.com https://cdn.fontshare.com;");
    
    // Add Fontshare to style-src-elem
    policy = policy.replace(/style-src-elem ([^;]+);/g, "style-src-elem $1 https://api.fontshare.com https://cdn.fontshare.com;");
    
    // Add Fontshare to font-src
    policy = policy.replace(/font-src ([^;]+);/g, "font-src $1 https://api.fontshare.com https://cdn.fontshare.com;");
    
    html = html.replace(match[0], `<meta http-equiv="Content-Security-Policy" content="${policy}">`);
    fs.writeFileSync("index.html", html);
    console.log("Patched CSP successfully.");
} else {
    console.log("Could not find CSP meta tag");
}
