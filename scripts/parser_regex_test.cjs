const FIR_DATA = {}; // Mocked for regex test

function extractRegex(text, regex) {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

function testParser(fullText) {
    const registration = extractRegex(fullText, /REG(?:\s*[:])?\s*([A-Z0-9]{1,2}-[A-Z0-9]{3,5}|A7[A-Z]{3})/i)
        || extractRegex(fullText, /([A-Z0-9]{1,2}-[A-Z0-9]{3,5})\s+Reg/i)
        || extractRegex(fullText, /\s(?:A3\d{2,3}[A-Z]?|B\d{3}[A-Z]?)\s+(A7[A-Z]{3})\b/i)
        || 'Unknown';

    const wlIdx = fullText.toUpperCase().search(/LAT\/LONG\s+WAYPT/);

    console.log('--- TEST RESULTS ---');
    console.log('Registration Found:', registration);
    console.log('Waypoint Header Index:', wlIdx);

    if (wlIdx !== -1) {
        const wlSection = fullText.substring(wlIdx, wlIdx + 50000);
        const coordRegex = /[NS]\d{2,4}(?:\.\d)?\/[EW]\d{3,5}(?:\.\d)?/g;
        let m;
        const whitelist = new Set();
        while ((m = coordRegex.exec(wlSection)) !== null) {
            const after = wlSection.substring(m.index + m[0].length).trim();
            const firstWord = after.split(/\s+/)[0].toUpperCase();
            if (/^[A-Z0-9]{2,10}$/.test(firstWord)) {
                whitelist.add(firstWord);
            }
        }
        console.log('Whitelist Size:', whitelist.size);
        const wlArray = Array.from(whitelist);
        console.log('First 10 Waypoints:', wlArray.slice(0, 10).join(', '));

        // Check if certain expected waypoints are there
        const expected = ['LSZH', 'ZH552', 'KLO', 'MOMOL', 'KOLUL', 'OTHH'];
        expected.forEach(wp => {
            if (whitelist.has(wp)) {
                console.log(`[PASS] Waypoint ${wp} found in whitelist.`);
            } else {
                console.log(`[FAIL] Waypoint ${wp} NOT found in whitelist.`);
            }
        });
    }
}

const fs = require('fs');
const sampleText = fs.readFileSync('sample_lido.txt', 'utf8');
testParser(sampleText);
