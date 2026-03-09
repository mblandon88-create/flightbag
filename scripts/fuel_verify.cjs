const fs = require('fs');

// Mock helpers from pdfParser.ts
const round100 = (val) => {
    if (!val) return '0';
    const num = parseInt(val, 10);
    if (isNaN(num)) return '0';
    return (Math.round(num / 100) * 100).toString();
};

const parseNum = (val) => {
    if (!val) return '0';
    const num = parseInt(val, 10);
    if (isNaN(num)) return '0';
    return num.toString();
};

const extractRegex = (text, regex) => {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
};

function testFuelRounding(fullText) {
    // Exact match patterns as in pdfParser.ts
    const tripDataMatch = fullText.match(/TRIP\s+(\d+)\s+(\d{4})/i);
    const tripFuelStr = tripDataMatch ? parseNum(tripDataMatch[1]) : parseNum(extractRegex(fullText, /TRIP\s+(\d+)/i));

    const taxiMatch = fullText.match(/TAXI\s+(\d+)(?:\s+(\d{4}))?/i);
    const taxiFuelStr = parseNum(taxiMatch ? taxiMatch[1] : extractRegex(fullText, /TAXI\s+(\d+)/i));

    const rampMatch = fullText.match(/RAMP FUEL\s+(\d+)/i);
    const rampFuelStr = rampMatch ? rampMatch[1] : 'Unknown';

    const weightMatch = fullText.match(/MZFW\s+(\d+)\s+EZFW\s+(\d+)/i);
    const mzfwStr = weightMatch ? weightMatch[1] : (extractRegex(fullText, /MZFW\s+(\d+)/i) || '0');
    const roundedMzfw = round100(mzfwStr);

    const mtowStr = extractRegex(fullText, /MTOW\s+(\d+)/i) || '0';
    const roundedMtow = round100(mtowStr);

    console.log('--- FUEL VERIFICATION ---');
    console.log('Trip Fuel (Target: 34557):', tripFuelStr);
    console.log('Taxi Fuel (Target: 383):', taxiFuelStr);
    console.log('Ramp Fuel (Target: 64950):', rampFuelStr);

    console.log('--- WEIGHT VERIFICATION (Should still be rounded) ---');
    console.log('MZFW Raw:', mzfwStr, '-> Rounded:', roundedMzfw);
    console.log('MTOW Raw:', mtowStr, '-> Rounded:', roundedMtow);

    if (tripFuelStr === '34557' && roundedMzfw === '195700') {
        console.log('[PASS] Fuel is precise, Weight is rounded.');
    } else {
        console.log('[FAIL] Verification failed.');
    }
}

const sampleText = fs.readFileSync('sample_lido.txt', 'utf8');
testFuelRounding(sampleText);
