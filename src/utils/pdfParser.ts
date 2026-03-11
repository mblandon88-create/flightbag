import * as pdfjsLib from 'pdfjs-dist';
import { FIR_DATA } from '../data/firData';

// We need to set the workerSrc for pdf.js to work.
// Since we are using Vite, we can point it to the local worker file copied to public
if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

/** A single entry in the Nav Log — either a waypoint, TOC/TOD marker, or FIR boundary row. */
export interface WaypointEntry {
    name: string;       // e.g. "MIBRU", "TOC", "TOD", or FIR name "MUSCAT FIR"
    stm: number;        // Segment time in minutes (from nav log: time to NEXT fix)
    rfob: number;       // Planned remaining fuel on board at this fix (tonnes)
    isToc: boolean;
    isTod: boolean;
    isFir: boolean;     // true if this is a FIR/UIR boundary separator row
    itt?: string;       // Initial True Track (or Magnetic Track)
    dis?: string;       // Leg Distance (NM)
    procedure?: string; // Optional SID/STAR name (e.g. "DEGES3W")
}

export interface ParsedFlightData {
    flightNumber: string;
    aircraftType: string;
    registration: string;
    departure: string;
    arrival: string;
    destTimezoneOffset: string; // e.g. "M0500", "P0300", "Z0000"
    // Performance
    tripFuel: string;
    rampFuel: string;
    taxiFuel: string;
    contingencyFuel: string;
    contingencyRemarks: string;
    altFuel: string;
    finResFuel: string;
    minReqFuel: string;
    extraFuel: string;
    picFuel: string;
    mtow: string;
    mzfw: string;
    ezfw: string;
    rawEzfw: string; // Unrounded value for precise downstream calculations
    etow: string;
    mlw: string;
    rawRampFuel: string; // Unrounded value for precise downstream calculations
    route: string;
    flightLevel: string;
    // Block Times
    std: string;
    sta: string;
    blkTime: string;
    tripTime: number; // minutes
    taxiTime: number; // minutes
    contTime: number; // minutes
    altTime: number;  // minutes
    finlTime: number; // minutes
    extraTime: number; // minutes
    minReqTime: number; // minutes
    rampTime: number; // minutes
    // Structured Nav Log
    waypointEntries: WaypointEntry[];
    // Legacy flat list (for backward compat)
    waypoints: string[];
    remarks?: string;
}

const round100 = (val: string | number | null): string => {
    if (!val || val === '....') {
        console.log(`[round100] Input: "${val}" -> Returning "0"`);
        return '0';
    }
    const cleanStr = val.toString().replace(/[^\d]/g, '');
    const num = parseInt(cleanStr, 10);
    if (isNaN(num)) {
        console.log(`[round100] Input: "${val}" (Clean: "${cleanStr}") -> NaN -> Returning "0"`);
        return '0';
    }
    const result = (Math.ceil(num / 100) * 100).toString();
    console.log(`[round100] Input: "${val}" -> Numeric: ${num} -> Output: "${result}"`);
    return result;
};

const parseNum = (val: string | null): string => {
    if (!val) return '0';
    const num = parseInt(val, 10);
    if (isNaN(num)) return '0';
    return num.toString();
};

export const parseLidoPDF = async (file: File): Promise<ParsedFlightData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const result = e.target?.result;
                if (!result) throw new Error("Could not read file");

                const typedArray = new Uint8Array(result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;

                // Combine text from all pages
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: unknown) => (item as { str?: string }).str || '').join(' ');
                    fullText += pageText + ' ';
                }

                resolve(parseLidoText(fullText));
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const parseLidoText = (fullText: string): ParsedFlightData => {
    // IMPROVED ICAO EXTRACTION:
    // Priority 1: Match from known LIDO header lines like "STATION COPY QR3257 09MAR OOMS/OTHH"
    //             or PAGE headers like "PAGE 1/7 QTR3257/QR3257 09MAR P0400 OOMS/OTHH"
    //             These always contain the correct departure/arrival pair.
    // Priority 2: General fallback using word boundaries to avoid substring matches
    //             like "LERT/BULL" inside "ALERT/BULLETIN" from web UI nav text.
    const icaoPairMatch =
        fullText.match(/(?:STATION COPY|PAGE\s+\d+\/\d+)\s+\S+\s+\d+[A-Z]+\s+(?:[PMZ]\d{4}\s+)?([A-Z]{4})\s*\/\s*([A-Z]{4})/i)
        || fullText.match(/\b([A-Z]{4})\/([A-Z]{4})\b/)
        || fullText.match(/([A-Z]{3,4})-([A-Z]{3,4})\s+Reg/);

    let departure = 'Unknown';
    let arrival = 'Unknown';

    if (icaoPairMatch) {
        departure = icaoPairMatch[1].length === 3 ? `O${icaoPairMatch[1]}` : icaoPairMatch[1];
        arrival = icaoPairMatch[2].length === 3 ? `O${icaoPairMatch[2]}` : icaoPairMatch[2];
    } else {
        departure = extractRegex(fullText, /([A-Z]{4})\/[A-Z]{4}\s+A\d{2}[A-Z]{1}/i) || 'Unknown';
        arrival = extractRegex(fullText, /[A-Z]{4}\/([A-Z]{4})\s+A\d{2}[A-Z]{1}/i) || 'Unknown';
    }

    // The main route extraction
    const fullRouteString = extractRoute(fullText, departure, arrival) || '';
    let route = fullRouteString;
    let flightLevel = 'Not Found';

    const flProfileRegex = /\b(FL\d{3}(?:[\s\n/]+[A-Z0-9]{2,7}\/FL\d{3})*(?:[\s\n/]+\/FL\d{3})?)\b/i;
    const flMatch = fullRouteString.match(flProfileRegex);
    if (flMatch) {
        // Normalize whitespace and keep the complete FL profile
        flightLevel = flMatch[1].replace(/[\r\n\s]+/g, ' ').toUpperCase().trim();
        // Cut the route just before the flight level starts
        route = fullRouteString.substring(0, flMatch.index).trim();
    }

    // Independent Flight Level Fallback (if not found in route string)
    if (flightLevel === 'Not Found') {
        const flFallback = fullText.match(/\b(FL\d{3}(?:[\s\n/]+[A-Z0-9]{2,7}\/FL\d{3})*(?:[\s\n/]+\/FL\d{3})?)\b/i);
        if (flFallback) flightLevel = flFallback[1].replace(/[\r\n]+/g, ' ').toUpperCase();
    }

    // Final route cleanup or placeholder
    if (!route) route = 'Not Found';

    // Ensure we handle multiline dots and clean up the route
    route = route.replace(/\.+/g, '').replace(/\bFL\d+\b.*$/i, '').trim();

    // ==========================================
    // FUEL EXTRACTION BLOCK
    // Isolate the payload section before REMARKS or clearances
    // to prevent mistakenly parsing fuel for next sectors.
    // ==========================================
    let fuelText = fullText;
    const mzfwIdx = fuelText.toUpperCase().indexOf("MZFW");
    if (mzfwIdx !== -1) {
        // Cut off shortly after the weight section to avoid remarks at the bottom
        fuelText = fuelText.substring(0, mzfwIdx + 300);
    } else {
        // Fallback truncation just in case
        const remIdx = fuelText.toUpperCase().lastIndexOf("REMARKS:");
        if (remIdx !== -1) fuelText = fuelText.substring(0, remIdx);
    }

    const tripDataMatch = fuelText.match(/TRIP\s+(\d+)\s+(\d{4})/i);
    const tripFuelStr = parseNum(tripDataMatch ? tripDataMatch[1] : extractRegex(fuelText, /TRIP\s+(\d{3,})(?:\s+|\.)/i));
    const tripTimeRaw = tripDataMatch ? tripDataMatch[2] : '0000';
    const tripTimeMinutes = parseInt(tripTimeRaw.substring(0, 2), 10) * 60 + parseInt(tripTimeRaw.substring(2, 4), 10);

    const taxiMatch = fuelText.match(/TAXI\s+(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const taxiFuelStr = parseNum(taxiMatch ? taxiMatch[1] : extractRegex(fuelText, /TAXI\s+(\d+)(?:\s+|\.)/i));
    const taxiTimeRaw = taxiMatch?.[2] && taxiMatch[2] !== '....' ? taxiMatch[2] : '0000';
    const taxiTimeMinutes = parseInt(taxiTimeRaw.substring(0, 2), 10) * 60 + parseInt(taxiTimeRaw.substring(2, 4), 10);

    // CONT can have remarks like "CONT 5% 0857 0013" or "CONT 15 MIN 1000 0015". We map exactly to the numbers.
    const contMatch = fuelText.match(/CONT\s+(?:[A-Z0-9%./]+\s+){0,4}(\d{3,6})\s+(\d{4}|\.\.\.\.)/i);
    const contingencyRemarks = extractRegex(fuelText, /CONT\s+([A-Z0-9%./]+)\s+\d{3,6}/i) || '';
    const contingencyFuelStr = parseNum(contMatch ? contMatch[1] : extractRegex(fuelText, /CONT\s+(?:[A-Z0-9%./]+\s+){0,4}(\d{3,6})\b/i));
    const contTimeRaw = contMatch?.[2] || '....';
    const contTimeMinutes = (contTimeRaw !== '....') ? (parseInt(contTimeRaw.substring(0, 2), 10) * 60 + parseInt(contTimeRaw.substring(2, 4), 10)) : 0;

    const altMatch = fuelText.match(/ALTN?\s+(?:[A-Z0-9]+\s+){0,2}(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const altFuelStr = parseNum(altMatch ? altMatch[1] : extractRegex(fuelText, /ALTN?\s+(?:[A-Z0-9]+\s+){0,2}(\d+)(?:\s+|\.)/i));
    const altTimeRaw = altMatch?.[2] || '....';
    const altTimeMinutes = altTimeRaw !== '....' ? (parseInt(altTimeRaw.substring(0, 2), 10) * 60 + parseInt(altTimeRaw.substring(2, 4), 10)) : 0;

    const finlMatch = fuelText.match(/FIN(?:L|AL|RES)?\s+(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const finResFuelStr = parseNum(finlMatch ? finlMatch[1] : extractRegex(fuelText, /FIN(?:L|AL|RES)?\s+(\d+)(?:\s+|\.)/i));
    const finlTimeRaw = finlMatch?.[2] || '....';
    const finlTimeMinutes = finlTimeRaw !== '....' ? (parseInt(finlTimeRaw.substring(0, 2), 10) * 60 + parseInt(finlTimeRaw.substring(2, 4), 10)) : 0;

    const minReqMatch = fuelText.match(/MIN.*?(?:T\/O|REQ|FUEL)\s+(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const minReqFuelStr = parseNum(minReqMatch ? minReqMatch[1] : extractRegex(fuelText, /MIN.*?(?:T\/O|REQ|FUEL)\s+(\d+)(?:\s+|\.)/i));
    const minReqTimeRaw = minReqMatch?.[2] || '....';
    const minReqTimeMinutes = minReqTimeRaw !== '....' ? (parseInt(minReqTimeRaw.substring(0, 2), 10) * 60 + parseInt(minReqTimeRaw.substring(2, 4), 10)) : 0;

    const extraMatch = fuelText.match(/EXTRA\s+(?:[A-Z0-9]+\s+){0,3}(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const extraFuelStr = parseNum(extraMatch ? extraMatch[1] : extractRegex(fuelText, /EXTRA\s+(?:[A-Z0-9]+\s+){0,3}(\d+)(?:\s+|\.)/i));
    const extraTimeRaw = extraMatch?.[2] || '....';
    const extraTimeMinutes = extraTimeRaw !== '....' ? (parseInt(extraTimeRaw.substring(0, 2), 10) * 60 + parseInt(extraTimeRaw.substring(2, 4), 10)) : 0;

    const picFuelStrRaw = extractRegex(fuelText, /PIC(?:D|.*?EXT(?:RA)?)?\s+(\d+)(?:\s+|\.)/i) || '0';
    const picFuelStr = parseNum(picFuelStrRaw);

    const calculatedRampFuelVal =
        parseInt(taxiFuelStr) +
        parseInt(tripFuelStr) +
        parseInt(contingencyFuelStr) +
        parseInt(altFuelStr) +
        parseInt(finResFuelStr) +
        parseInt(extraFuelStr) +
        parseInt(picFuelStr);

    // Search for RAMP or TOTAL FUEL labels explicitly
    const rampRegex = /(?:RAMP|TOTAL)\s+(?:FUEL\s+)?(?:PKG\s+)?(\d{4,6})/gi;
    const rampMatches: number[] = [];
    let rMatch;
    while ((rMatch = rampRegex.exec(fuelText)) !== null) {
        rampMatches.push(parseInt(rMatch[1], 10));
    }

    /**
     * RAMP FUEL SELECTION LOGIC:
     * 1. If we find an explicit RAMP/TOTAL match:
     *    - Check if it's "close enough" (within 100kg) to our calculated sum.
     *    - If it's a match, use it.
     * 2. If no "close enough" match exists, or no match found:
     *    - Trust the calculated sum (which is derived from individual LIDO labels).
     */
    let bestRampFuelRaw = calculatedRampFuelVal.toString();
    const closeMatch = rampMatches.find(m => Math.abs(m - calculatedRampFuelVal) <= 150);

    if (closeMatch) {
        bestRampFuelRaw = closeMatch.toString();
    } else {
        console.log(`[parseLidoText] No matching Ramp Fuel found (Matches: ${rampMatches.join(', ')}). Falling back to calculated sum: ${calculatedRampFuelVal}`);
    }

    const weightMatch = fullText.match(/MZFW\s+(\d+)\s+EZFW\s+(\d+)/i) || fullText.match(/MZFW\s+(\d+).*?EZFW\s+(\d+)/is);
    const mzfwStr = round100(weightMatch ? weightMatch[1] : (extractRegex(fullText, /MZFW\s+(\d+)/i) || '0'));
    const ezfwStr = round100(weightMatch ? weightMatch[2] : (extractRegex(fullText, /EZFW\s+(\d+)/i) || '0'));
    const mtowStr = round100(extractRegex(fullText, /MTOW\s+(\d+)/i) || '0');

    // ETOW calculation: if not found, it must be (EZFW + Ramp Fuel - Taxi) -> must be rounded
    const etowRegexMatch = extractRegex(fullText, /ETOW\s+(\d+)/i);
    const etowStr = etowRegexMatch ? round100(etowRegexMatch) : round100((parseInt(ezfwStr) + parseInt(bestRampFuelRaw) - parseInt(taxiFuelStr)).toString());

    const mlwStr = round100(extractRegex(fullText, /MLWT?\s+(\d+)/i) || extractRegex(fullText, /LAW\s+(\d+)/i) || '0');

    const registration = extractRegex(fullText, /REG(?:\s*[:])?\s*([A-Z0-9]{1,2}-[A-Z0-9]{3,5}|A7[A-Z]{3})/i)
        || extractRegex(fullText, /([A-Z0-9]{1,2}-[A-Z0-9]{3,5})\s+Reg/i)
        || extractRegex(fullText, /\s(?:A3\d{2,3}[A-Z]?|B\d{3}[A-Z]?)\s+(A7[A-Z]{3})\b/i)
        || 'Unknown';

    // Extract structured nav log entries, stopping at arrival ICAO
    const waypointEntries = extractNavLog(fullText, arrival, registration);


    const waypoints = waypointEntries
        .filter(e => !e.isFir)
        .map(e => e.name);

    // Extract destination timezone
    // Look for patterns like P0300 OTHH/KIAD M0500 or just M0500 next to arrival ICAO
    const destTzMatch = fullText.match(/([PMZ]\d{4})\s+[A-Z]{4}\s*\/\s*[A-Z]{4}\s+([PMZ]\d{4})/)
        || fullText.match(new RegExp(`${arrival}\\s+([PMZ]\\d{4})`))
        || fullText.match(/OTHH\/[A-Z]{4}\s+([PMZ]\d{4})/);

    let destTimezoneOffset = 'Z0000';
    if (destTzMatch) {
        destTimezoneOffset = destTzMatch[2] || destTzMatch[1];
    }

    let remarks: string | undefined = undefined;
    const remarksMatch = fullText.match(/REMARKS:\s+((?:(?!REMARKS:).)*?)(?=\s+(?:ATC\s+CLEARANCE:|DEFRTE:|ROUTE:))/is);
    if (remarksMatch && remarksMatch[1].length < 1500) {
        remarks = remarksMatch[1]
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .replace(/\s*={3,}\s*/g, '')
            .trim();
    }

    return {
        flightNumber: extractRegex(fullText, /(QTR\d+[A-Z]?)\/QR\d+/i)
            || extractRegex(fullText, /COPY\s+(QR\d+)/i)
            || extractRegex(fullText, /(?:STATION COPY|Briefing Package)[:\s]+(QR\d+)/i)
            || extractRegex(fullText, /\bQR(\d{3,4})\b/i)?.replace(/^/, 'QR') // fallback
            || 'Unknown',
        aircraftType: extractRegex(fullText, /(?:[A-Z]{4}\s*\/\s*[A-Z]{4}|A\/C)\s+(?:[PMZ]\d{4}\s+)?([A-Z\d]{4})/)
            || extractRegex(fullText, /(?:TYPE|A\/C TYPE)\s*[:]?\s*(A3\d{2,3}[A-Z]?|B\d{3}[A-Z]?)/i)
            || extractRegex(fullText, /A\/C\s.*?(A3\d{2,3}[A-Z]?|B\d{3}[A-Z]?)/i) || 'Unknown',
        registration,
        departure,
        arrival,
        destTimezoneOffset,
        tripFuel: tripFuelStr,
        rampFuel: bestRampFuelRaw,
        rawRampFuel: (rampMatches.length > 0 ? rampMatches[0].toString() : calculatedRampFuelVal.toString()),
        taxiFuel: taxiFuelStr,
        contingencyFuel: contingencyFuelStr,
        contingencyRemarks: contingencyRemarks,
        altFuel: altFuelStr,
        finResFuel: finResFuelStr,
        minReqFuel: minReqFuelStr,
        extraFuel: extraFuelStr,
        picFuel: picFuelStr,
        mzfw: mzfwStr,
        ezfw: ezfwStr,
        rawEzfw: (weightMatch ? weightMatch[2] : (extractRegex(fullText, /EZFW\s+(\d+)/i) || '0')),
        mtow: mtowStr,
        etow: etowStr,
        mlw: mlwStr,
        route: route || 'Not Found',
        flightLevel: flightLevel,
        std: extractRegex(fullText, /STD\s+([\d/]+)/i) || 'Unknown',
        sta: extractRegex(fullText, /STA\s+([\d/]+)/i) || 'Unknown',
        blkTime: extractRegex(fullText, /BLK\s+(\d{4})/i) || 'Unknown',
        tripTime: tripTimeMinutes,
        taxiTime: taxiTimeMinutes,
        contTime: contTimeMinutes,
        altTime: altTimeMinutes,
        finlTime: finlTimeMinutes,
        extraTime: extraTimeMinutes,
        minReqTime: minReqTimeMinutes,
        rampTime: taxiTimeMinutes + tripTimeMinutes + contTimeMinutes + altTimeMinutes + finlTimeMinutes + extraTimeMinutes,
        waypointEntries,
        waypoints,
        remarks,
    };
};

export const parseLidoClipboard = (fullText: string): ParsedFlightData => {
    // A duplicate of parseLidoText specifically separated to optimize for standard clipboard text formatting.
    const icaoPairMatch =
        fullText.match(/(?:STATION COPY|PAGE\s+\d+\/\d+)\s+\S+\s+\d+[A-Z]+\s+(?:[PMZ]\d{4}\s+)?([A-Z]{4})\s*\/\s*([A-Z]{4})/i)
        || fullText.match(/\b([A-Z]{4})\/([A-Z]{4})\b/)
        || fullText.match(/([A-Z]{3,4})-([A-Z]{3,4})\s+Reg/);

    let departure = 'Unknown';
    let arrival = 'Unknown';

    if (icaoPairMatch) {
        departure = icaoPairMatch[1].length === 3 ? `O${icaoPairMatch[1]}` : icaoPairMatch[1];
        arrival = icaoPairMatch[2].length === 3 ? `O${icaoPairMatch[2]}` : icaoPairMatch[2];
    } else {
        departure = extractRegex(fullText, /([A-Z]{4})\/[A-Z]{4}\s+A\d{2}[A-Z]{1}/i) || 'Unknown';
        arrival = extractRegex(fullText, /[A-Z]{4}\/([A-Z]{4})\s+A\d{2}[A-Z]{1}/i) || 'Unknown';
    }

    const fullRouteString = extractRoute(fullText, departure, arrival) || '';
    let route = fullRouteString;
    let flightLevel = 'Not Found';

    const flProfileRegex = /\b(FL\d{3}(?:[\s\n/]+[A-Z0-9]{2,7}\/FL\d{3})*(?:[\s\n/]+\/FL\d{3})?)\b/i;
    const flMatch = fullRouteString.match(flProfileRegex);
    if (flMatch) {
        flightLevel = flMatch[1].replace(/[\r\n\s]+/g, ' ').toUpperCase().trim();
        route = fullRouteString.substring(0, flMatch.index).trim();
    }

    if (flightLevel === 'Not Found') {
        const flFallback = fullText.match(/\b(FL\d{3}(?:[\s\n/]+[A-Z0-9]{2,7}\/FL\d{3})*(?:[\s\n/]+\/FL\d{3})?)\b/i);
        if (flFallback) flightLevel = flFallback[1].replace(/[\r\n]+/g, ' ').toUpperCase();
    }

    if (!route) route = 'Not Found';
    route = route.replace(/\.+/g, '').replace(/\bFL\d+\b.*$/i, '').trim();

    // FUEL EXTRACTION BLOCK - Utilizing Native Newlines
    let fuelText = fullText;
    const mzfwIdx = fuelText.toUpperCase().indexOf("MZFW");
    if (mzfwIdx !== -1) {
        fuelText = fuelText.substring(0, mzfwIdx + 300);
    } else {
        const remIdx = fuelText.toUpperCase().lastIndexOf("REMARKS:");
        if (remIdx !== -1) fuelText = fuelText.substring(0, remIdx);
    }

    const tripDataMatch = fuelText.match(/TRIP\s+(\d+)\s+(\d{4})/i);
    const tripFuelStr = parseNum(tripDataMatch ? tripDataMatch[1] : extractRegex(fuelText, /TRIP\s+(\d{3,})(?:\s+|\.)/i));
    const tripTimeRaw = tripDataMatch ? tripDataMatch[2] : '0000';
    const tripTimeMinutes = parseInt(tripTimeRaw.substring(0, 2), 10) * 60 + parseInt(tripTimeRaw.substring(2, 4), 10);

    const taxiMatch = fuelText.match(/TAXI\s+(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const taxiFuelStr = parseNum(taxiMatch ? taxiMatch[1] : extractRegex(fuelText, /TAXI\s+(\d+)(?:\s+|\.)/i));
    const taxiTimeRaw = taxiMatch?.[2] && taxiMatch[2] !== '....' ? taxiMatch[2] : '0000';
    const taxiTimeMinutes = parseInt(taxiTimeRaw.substring(0, 2), 10) * 60 + parseInt(taxiTimeRaw.substring(2, 4), 10);

    const contMatch = fuelText.match(/CONT\s+(?:[A-Z0-9%./]+\s+){0,4}(\d{3,6})\s+(\d{4}|\.\.\.\.)/i);
    const contingencyRemarks = extractRegex(fuelText, /CONT\s+([A-Z0-9%./]+)\s+\d{3,6}/i) || '';
    const contingencyFuelStr = parseNum(contMatch ? contMatch[1] : extractRegex(fuelText, /CONT\s+(?:[A-Z0-9%./]+\s+){0,4}(\d{3,6})\b/i));
    const contTimeRaw = contMatch?.[2] || '....';
    const contTimeMinutes = (contTimeRaw !== '....') ? (parseInt(contTimeRaw.substring(0, 2), 10) * 60 + parseInt(contTimeRaw.substring(2, 4), 10)) : 0;

    const altMatch = fuelText.match(/ALTN?\s+(?:[A-Z0-9]+\s+){0,2}(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const altFuelStr = parseNum(altMatch ? altMatch[1] : extractRegex(fuelText, /ALTN?\s+(?:[A-Z0-9]+\s+){0,2}(\d+)(?:\s+|\.)/i));
    const altTimeRaw = altMatch?.[2] || '....';
    const altTimeMinutes = altTimeRaw !== '....' ? (parseInt(altTimeRaw.substring(0, 2), 10) * 60 + parseInt(altTimeRaw.substring(2, 4), 10)) : 0;

    const finlMatch = fuelText.match(/FIN(?:L|AL|RES)?\s+(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const finResFuelStr = parseNum(finlMatch ? finlMatch[1] : extractRegex(fuelText, /FIN(?:L|AL|RES)?\s+(\d+)(?:\s+|\.)/i));
    const finlTimeRaw = finlMatch?.[2] || '....';
    const finlTimeMinutes = finlTimeRaw !== '....' ? (parseInt(finlTimeRaw.substring(0, 2), 10) * 60 + parseInt(finlTimeRaw.substring(2, 4), 10)) : 0;

    const minReqMatch = fuelText.match(/MIN.*?(?:T\/O|REQ|FUEL)\s+(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const minReqFuelStr = parseNum(minReqMatch ? minReqMatch[1] : extractRegex(fuelText, /MIN.*?(?:T\/O|REQ|FUEL)\s+(\d+)(?:\s+|\.)/i));
    const minReqTimeRaw = minReqMatch?.[2] || '....';
    const minReqTimeMinutes = minReqTimeRaw !== '....' ? (parseInt(minReqTimeRaw.substring(0, 2), 10) * 60 + parseInt(minReqTimeRaw.substring(2, 4), 10)) : 0;

    const extraMatch = fuelText.match(/EXTRA\s+(?:[A-Z0-9]+\s+){0,3}(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const extraFuelStr = parseNum(extraMatch ? extraMatch[1] : extractRegex(fuelText, /EXTRA\s+(?:[A-Z0-9]+\s+){0,3}(\d+)(?:\s+|\.)/i));
    const extraTimeRaw = extraMatch?.[2] || '....';
    const extraTimeMinutes = extraTimeRaw !== '....' ? (parseInt(extraTimeRaw.substring(0, 2), 10) * 60 + parseInt(extraTimeRaw.substring(2, 4), 10)) : 0;

    const picFuelStrRaw = extractRegex(fuelText, /PIC(?:D|.*?EXT(?:RA)?)?\s+(\d+)(?:\s+|\.)/i) || '0';
    const picFuelStr = parseNum(picFuelStrRaw);

    const calculatedRampFuelVal =
        parseInt(taxiFuelStr) +
        parseInt(tripFuelStr) +
        parseInt(contingencyFuelStr) +
        parseInt(altFuelStr) +
        parseInt(finResFuelStr) +
        parseInt(extraFuelStr) +
        parseInt(picFuelStr);

    const rampRegex = /(?:RAMP|TOTAL)\s+(?:FUEL\s+)?(?:PKG\s+)?(\d{4,6})/gi;
    const rampMatches: number[] = [];
    let rMatch;
    while ((rMatch = rampRegex.exec(fuelText)) !== null) {
        rampMatches.push(parseInt(rMatch[1], 10));
    }

    let bestRampFuelRaw = calculatedRampFuelVal.toString();
    const closeMatch = rampMatches.find(m => Math.abs(m - calculatedRampFuelVal) <= 150);
    if (closeMatch) {
        bestRampFuelRaw = closeMatch.toString();
    }

    const weightMatch = fullText.match(/MZFW\s+(\d+)\s+EZFW\s+(\d+)/i) || fullText.match(/MZFW\s+(\d+).*?EZFW\s+(\d+)/is);
    const mzfwStr = round100(weightMatch ? weightMatch[1] : (extractRegex(fullText, /MZFW\s+(\d+)/i) || '0'));
    const ezfwStr = round100(weightMatch ? weightMatch[2] : (extractRegex(fullText, /EZFW\s+(\d+)/i) || '0'));
    const mtowStr = round100(extractRegex(fullText, /MTOW\s+(\d+)/i) || '0');

    const etowRegexMatch = extractRegex(fullText, /ETOW\s+(\d+)/i);
    const etowStr = etowRegexMatch ? round100(etowRegexMatch) : round100((parseInt(ezfwStr) + parseInt(bestRampFuelRaw) - parseInt(taxiFuelStr)).toString());

    const mlwStr = round100(extractRegex(fullText, /MLWT?\s+(\d+)/i) || extractRegex(fullText, /LAW\s+(\d+)/i) || '0');

    // FIXED REGISTRATION FOR CLIPBOARD
    // Supports "A35K A7ANF" or "A350 A7AEE" across newlines/tabs
    const registration = extractRegex(fullText, /REG(?:\s*[:])?\s*([A-Z0-9]{1,2}-[A-Z0-9]{3,5}|A7[A-Z]{3})/i)
        || extractRegex(fullText, /([A-Z0-9]{1,2}-[A-Z0-9]{3,5})\s+Reg/i)
        || extractRegex(fullText, /\s(?:A3[\dK]{2,3}[A-Z]?|B\d{3}[A-Z]?|A[A-Z0-9]{3})\s+(A7[A-Z]{3})\b/i) // E.g. A35K A7ANF
        || 'Unknown';

    const waypointEntries = extractNavLog(fullText, arrival, registration);
    const waypoints = waypointEntries.filter(e => !e.isFir).map(e => e.name);

    const destTzMatch = fullText.match(/([PMZ]\d{4})\s+[A-Z]{4}\s*\/\s*[A-Z]{4}\s+([PMZ]\d{4})/)
        || fullText.match(new RegExp(`${arrival}\\s+([PMZ]\\d{4})`))
        || fullText.match(/OTHH\/[A-Z]{4}\s+([PMZ]\d{4})/);

    let destTimezoneOffset = 'Z0000';
    if (destTzMatch) destTimezoneOffset = destTzMatch[2] || destTzMatch[1];

    let remarks: string | undefined = undefined;
    const remarksMatch = fullText.match(/REMARKS:\s+((?:(?!REMARKS:).)*?)(?=\s+(?:ATC\s+CLEARANCE:|DEFRTE:|ROUTE:))/is);
    if (remarksMatch && remarksMatch[1].length < 1500) {
        remarks = remarksMatch[1]
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .replace(/\s*={3,}\s*/g, '')
            .trim();
    }

    return {
        flightNumber: extractRegex(fullText, /(QTR\d+[A-Z]?)\/QR\d+/i)
            || extractRegex(fullText, /COPY\s+(QR\d+)/i)
            || extractRegex(fullText, /(?:STATION COPY|Briefing Package)[:\s]+(QR\d+)/i)
            || extractRegex(fullText, /\bQR(\d{3,4})\b/i)?.replace(/^/, 'QR') // fallback
            || 'Unknown',
        aircraftType: extractRegex(fullText, /(?:[A-Z]{4}\s*\/\s*[A-Z]{4}|A\/C)\s+(?:[PMZ]\d{4}\s+)?([A-Z\d]{4})/)
            || extractRegex(fullText, /(?:TYPE|A\/C TYPE)\s*[:]?\s*(A3\d{2,3}[A-Z]?|B\d{3}[A-Z]?)/i)
            || extractRegex(fullText, /A\/C\s.*?(A3[\dK]{2,3}[A-Z]?|B\d{3}[A-Z]?)/i) || 'Unknown',
        registration,
        departure,
        arrival,
        destTimezoneOffset,
        tripFuel: tripFuelStr,
        rampFuel: bestRampFuelRaw,
        rawRampFuel: (rampMatches.length > 0 ? rampMatches[0].toString() : calculatedRampFuelVal.toString()),
        taxiFuel: taxiFuelStr,
        contingencyFuel: contingencyFuelStr,
        contingencyRemarks: contingencyRemarks,
        altFuel: altFuelStr,
        finResFuel: finResFuelStr,
        minReqFuel: minReqFuelStr,
        extraFuel: extraFuelStr,
        picFuel: picFuelStr,
        mzfw: mzfwStr,
        ezfw: ezfwStr,
        rawEzfw: (weightMatch ? weightMatch[2] : (extractRegex(fullText, /EZFW\s+(\d+)/i) || '0')),
        mtow: mtowStr,
        etow: etowStr,
        mlw: mlwStr,
        route: route || 'Not Found',
        flightLevel: flightLevel,
        std: extractRegex(fullText, /STD\s+([\d/]+)/i) || 'Unknown',
        sta: extractRegex(fullText, /STA\s+([\d/]+)/i) || 'Unknown',
        blkTime: extractRegex(fullText, /BLK\s+(\d{4})/i) || 'Unknown',
        tripTime: tripTimeMinutes,
        taxiTime: taxiTimeMinutes,
        contTime: contTimeMinutes,
        altTime: altTimeMinutes,
        finlTime: finlTimeMinutes,
        extraTime: extraTimeMinutes,
        minReqTime: minReqTimeMinutes,
        rampTime: taxiTimeMinutes + tripTimeMinutes + contTimeMinutes + altTimeMinutes + finlTimeMinutes + extraTimeMinutes,
        waypointEntries,
        waypoints,
        remarks,
    };
};

const extractRegex = (text: string, regex: RegExp): string | null => {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
};

/**
 * Enhanced Structural Nav Log Parser inspired by rriet/flightbag.
 */
/**
 * Ultimate structural parser using a two-pass approach:
 * 1. Extract official whitelist from "LAT/LONG WAYPT" section.
 * 2. Parse Nav Log using whitelist + Start Signatures.
 */
function extractNavLog(fullText: string, arrivalICAO: string, registration: string): WaypointEntry[] {
    const entries: WaypointEntry[] = [];

    // PASS 1: Build Whitelist from the official coordinate table
    const whitelist = new Set<string>();
    const wlIdx = fullText.toUpperCase().search(/LAT\/LONG\s+WAYPT/);
    if (wlIdx !== -1) {
        const wlSection = fullText.substring(wlIdx, wlIdx + 15000); // Usually long
        const coordRegex = /[NS]\d{2,4}(?:\.\d)?\/[EW]\d{3,5}(?:\.\d)?/g;
        let m;
        while ((m = coordRegex.exec(wlSection)) !== null) {
            const after = wlSection.substring(m.index + m[0].length).trim();
            const firstWord = after.split(/\s+/)[0].toUpperCase();
            if (/^[A-Z0-9]{2,10}$/.test(firstWord)) {
                whitelist.add(firstWord);
            }
        }
    }

    // PASS 2: Parse Nav Log
    const headerIdx = fullText.search(/AWY\s+ITT\s+FL\s+WIND/);
    if (headerIdx === -1) return entries;

    const altIdx = fullText.indexOf('DESTINATION TO ALTERNATE', headerIdx);
    const navLogText = altIdx !== -1 ? fullText.substring(headerIdx, altIdx) : fullText.substring(headerIdx);

    const tokens = navLogText.split(/\s+/).filter(t => t.length > 0);

    const IS_WAYPOINT_RE = /^(?=.*[A-Z])([A-Z0-9/]{2,10}|TOC|TOD)$/;
    const IS_COORD_PATTERN = /^[NS]\d{2,5}(?:\.\d)?[EW]\d{2,6}(?:\.\d)?$/;

    const IS_RFOB = /^(\d{1,4}\.\d)$/;
    const IS_CTM = /^\d{4}$/;
    const IS_FIR_DASHES = /^-{3,}$/;
    const IS_ALT_UNIT = /^[0-9]+(FT|KT|M|Z|MSL)$/i;
    const IS_ITT = /^([TM]?\d{3})$/;

    const FIR_DESIGNATORS = new Set(Object.values(FIR_DATA).map(v => v.toUpperCase()));
    const KNOWN_HEADERS = new Set([
        'AWY', 'ITT', 'FL', 'WIND', 'ISAD', 'STM', 'ETA', 'AFOB',
        'WPT', 'FREQ', 'IMT', 'DIS', 'SPD', 'GS', 'TAS', 'MORA', 'GS/TAS', 'WPT/FREQ',
        'CTM', 'RTA', 'ATA', 'RFOB', 'PAGE', 'PLAN', 'REM', 'REQ',
        'CLB', 'DSC', 'ELEV', 'DESC', 'FUEL', 'TIME', 'DIST', 'MACH',
        'TCAS', 'ADF', 'VOR', 'VHF', 'HF', 'NAV', 'LOG', 'OFF', 'ON', 'OUT', 'IN', 'DATE',
        'DCT', 'FIR', 'UIR', 'NRP', 'EAST', 'WEST', 'NORTH', 'SOUTH'
    ]);

    const IS_STRUCTURAL_WPT = (t: string) => {
        const up = t.toUpperCase();
        if (KNOWN_HEADERS.has(up) || up === 'DCT' || up === 'NRP' || IS_ALT_UNIT.test(up) || up === '....') return false;
        if (FIR_DESIGNATORS.has(up)) return false;
        if (Object.keys(FIR_DATA).some(name => up === name)) return false;
        return IS_WAYPOINT_RE.test(up) || IS_COORD_PATTERN.test(up);
    };

    let i = 0;
    let pendingProcedure = '';
    let lastAttachedProcedure = '';
    const regClean = registration.toUpperCase().replace('-', '');
    const arrivalMatch = new RegExp('^' + arrivalICAO + '(/\\d+[A-Z]?)?$');

    while (i < tokens.length) {
        const tok = tokens[i];
        const tokUp = tok.toUpperCase();

        // Stop condition: Arrival Airport Identifier
        if (tokUp.length >= 4 && arrivalMatch.test(tokUp)) {
            let rfobVal = 0;
            for (let j = i + 1; j < Math.min(i + 25, tokens.length); j++) {
                if (IS_RFOB.test(tokens[j])) {
                    rfobVal = parseFloat(tokens[j]);
                    break;
                }
            }
            entries.push({
                name: tokUp,
                stm: 0,
                rfob: rfobVal,
                isToc: false,
                isTod: false,
                isFir: false,
                procedure: pendingProcedure
            });
            pendingProcedure = '';
            break;
        }

        // FIR Logic
        const matchedByName = Object.keys(FIR_DATA).find(f => tokUp === f || (tokUp + ' ' + (tokens[i + 1] || '').toUpperCase()) === f);
        const knownFir = matchedByName || Object.entries(FIR_DATA).find(([, des]) => tokUp === des)?.[0];

        if (IS_FIR_DASHES.test(tok) || knownFir) {
            let fullName = '';
            for (let k = 0; k <= 4; k++) {
                const peek = tokens[i + k];
                if (peek && /^\(?(FIR|UIR|FIR\/UIR)\)?$/.test(peek.toUpperCase())) {
                    const nameBase = knownFir ? knownFir : tokens.slice(i + 1, i + k).join(' ');
                    const icao = FIR_DATA[nameBase.toUpperCase().trim()] || (tokens[i + k + 1]?.length === 4 ? tokens[i + k + 1] : '');
                    fullName = `${nameBase.trim()} FIR (${icao})`;
                    i += k + (icao && tokens[i + k + 1] === icao ? 1 : 0);
                    break;
                }
            }
            if (fullName) {
                entries.push({ name: fullName, stm: 0, rfob: 0, isToc: false, isTod: false, isFir: true });
                i++; continue;
            }
        }

        // Waypoint Logic
        if (IS_STRUCTURAL_WPT(tok)) {
            let hasOwnTimeOrFuel = false;
            let hasStartPattern = false;
            let ctmRaw = '', rfobRaw = '', ittRaw = '', disRaw = '';

            for (let j = i + 1; j < Math.min(i + 20, tokens.length); j++) {
                const t = tokens[j].toUpperCase();
                if (IS_RFOB.test(t)) rfobRaw = t;
                if (IS_CTM.test(t)) ctmRaw = t;
                if (rfobRaw || ctmRaw) hasOwnTimeOrFuel = true;
                if (!ittRaw && IS_ITT.test(t)) ittRaw = t.replace(/[TM]/, '');
                else if (!disRaw && /^\d{1,4}$/.test(t) && !IS_CTM.test(t)) disRaw = t;

                if (j <= i + 4 && IS_ITT.test(t) && tokens[j + 1]?.toUpperCase() === '....') hasStartPattern = true;
                
                // Stop if we hit what looks like the NEXT waypoint or a major section header
                // We exclude common value labels like ELEV, AFOB, RFOB that might appear on the same line
                const isValueLabel = ['ELEV', 'AFOB', 'RFOB', 'GS', 'TAS', 'DIS', 'SPD', 'MORA'].includes(t);
                if ((IS_STRUCTURAL_WPT(t) && t !== '....' && t !== 'TOC' && t !== 'TOD') || (KNOWN_HEADERS.has(t) && !isValueLabel)) break;
            }

            // FILTER: Whitelist OR Special Signature OR Marker
            const isWhitelisted = whitelist.has(tokUp) || whitelist.has(tokUp.split('/')[0]);
            if (hasOwnTimeOrFuel || hasStartPattern || tokUp === 'TOC' || tokUp === 'TOD') {
                if (IS_COORD_PATTERN.test(tokUp)) {
                    // Coordinate: Always skip adding to entries, acts as stop condition only
                } else if (isWhitelisted || hasStartPattern || tokUp === 'TOC' || tokUp === 'TOD') {
                    const procToAttach = (pendingProcedure && pendingProcedure !== lastAttachedProcedure) ? pendingProcedure : undefined;
                    if (ctmRaw) {
                        const hh = parseInt(ctmRaw.substring(0, 2), 10), mm = parseInt(ctmRaw.substring(2, 4), 10);
                        entries.push({
                            name: tokUp,
                            stm: hh * 60 + mm,
                            rfob: rfobRaw ? parseFloat(rfobRaw) : 0,
                            isToc: tokUp === 'TOC', isTod: tokUp === 'TOD', isFir: false,
                            itt: ittRaw || '-', dis: disRaw || '-',
                            procedure: procToAttach
                        });
                        if (procToAttach) lastAttachedProcedure = procToAttach;
                        pendingProcedure = ''; // Clear after attaching
                    } else if (hasStartPattern) {
                        entries.push({
                            name: tokUp, stm: 0, rfob: rfobRaw ? parseFloat(rfobRaw) : 0,
                            isToc: false, isTod: false, isFir: false,
                            itt: ittRaw || '-', dis: disRaw || '-',
                            procedure: procToAttach
                        });
                        if (procToAttach) lastAttachedProcedure = procToAttach;
                        pendingProcedure = ''; // Clear after attaching
                    }
                }
            } else if (!isWhitelisted && !IS_COORD_PATTERN.test(tokUp)) {
                // If it's building up to a waypoint and looks like a procedure (not a header)
                // Procedure names often have letters ending in a digit and optional letter (e.g. DEGES3W, KUPRO2E)
                // We also strictly exclude the aircraft registration to prevent leakage
                const isReg = tokUp === regClean || tokUp.replace('-', '') === regClean;
                if (!isReg && tokUp.length >= 5 && /[A-Z]{2,}\d[A-Z]?$/.test(tokUp)) {
                    pendingProcedure = tokUp;
                }
            }
        }
        i++;
    }
    return entries;
}

/**
 * Removes generic prefixes from a route string (like "E/MCT/R:OTHH...")
 * and ensures it perfectly begins with the departure airport if present near the start.
 */
function cleanRouteStart(routeStr: string, departure?: string): string {
    let clean = routeStr;
    if (departure && departure !== 'Unknown') {
        const depStr = departure.substring(0, 4);
        const depIdx = clean.indexOf(depStr);
        // If departure ICAO is found at the very beginning (within first 30 chars), slice it
        if (depIdx > 0 && depIdx < 30) {
            clean = clean.substring(depIdx);
        }
    }
    // Final fallback: strip anything up to a colon (e.g. E/MCT/R:) immediately preceding a 4-letter code
    return clean.replace(/^.*?:\s*(?=[A-Z]{4})/, '').trim();
}

const extractRoute = (text: string, departure?: string, arrival?: string): string | null => {
    // Strategy 1: Look for the ICAO-derived prefix pattern like 'MCT-90T:OOMS 26R ...'
    // Anchor to the prefix and capture everything until a major "stop" section
    const atcHeaderRegex = /[A-Z]{3,4}-\d+[A-Z]*:[A-Z]{3,4}\s+/i;
    const atcHeaderMatch = text.match(atcHeaderRegex);
    if (atcHeaderMatch) {
        const startIdx = atcHeaderMatch.index! + atcHeaderMatch[0].length;
        const subText = text.substring(startIdx);
        // Look for the stop marker (Fuel, Weights, or Nav Log headers)
        // Modified to not rely solely on \n, since pdf.js text doesn't always have newlines here.
        const endMatch = subText.match(/(?:\bFUEL\s+TIME\b|\bAWY\s+ITT\b|\bPAGE\s+\d+\b|\bMZFW\b|\bMTOW\b|\bRAMP\s+FUEL\b|\bTRIP\s+(?:\d{2,}|PS|MS)\b|\bDEST\s+ALTN\b|\bFUEL\s+ADJ\b)/i);
        const endIdx = endMatch ? endMatch.index : 2000; // Default limit
        const rawBlock = subText.substring(0, endIdx);

        // Clean metadata from the block
        let cleaned = rawBlock.replace(/[\r\n]+/g, ' ');
        cleaned = cleaned.replace(/\d{2}[A-Z]{3}\d{4}Z/g, ''); // Timestamps
        cleaned = cleaned.replace(/PAGE\s+\d+\/\d+/gi, ''); // Page numbers
        cleaned = cleaned.replace(/\b(QTR|QR)\d+\b/gi, ''); // Flight numbers
        cleaned = cleaned.replace(/\bSTATION\s+COPY\b/gi, ''); // Station copy
        return cleanRouteStart(cleaned.replace(/\s+/g, ' ').trim(), departure);
    }

    // Strategy 2: Look for ATC CLEARANCE: with the actual route content on same/next line
    const atcMatch = text.match(/(?:ATC\s*CLEARANCE|DEFRTE):[\s.]*([A-Z].+?)(?=\s{2,}(?:FUEL|AWY|ITT|PAGE|MZFW|MTOW|RAMP|TRIP)|$)/is);
    if (atcMatch && atcMatch[1].length > 10) {
        return cleanRouteStart(atcMatch[1].replace(/\s+/g, ' ').trim(), departure);
    }

    // Strategy 3: Sequence of Waypoints (Broad fallback)
    // Support 2-char IDs (like PG) and check for airway markers
    const potentialWaypoints = text.matchAll(/\b([A-Z0-9/]{2,15}(?:\s+[A-Z0-9/]{2,15}){5,})\b/g);
    for (const m of potentialWaypoints) {
        const candidate = m[1].trim();
        // Exclude common header patterns and advisory text keywords
        const isAdvisory = /STATION|COPY|PAGE|BRIEFING|PACKAGE|BOARD|IDENT|REG|QR\d+|[0-9]{2}[A-Z]{3}|DUE|EFFECT|COLD|SOAK|POSSIBLE|CHECK|INFO|NOTAM|WEATHER|REMARK|RMK/i.test(candidate);

        // A real route usually contains 'DCT' or at least one airway (Letter+Number, e.g., M677, UP574)
        const hasRouteMarkers = /\bDCT\b|\b[A-Z]\d{1,4}\b/i.test(candidate);

        if (!isAdvisory && hasRouteMarkers) {
            if (candidate.length > 20) {
                return candidate;
            }
        }
    }

    // Strategy 4: Anchor between airports (Final safety net)
    if (departure && arrival && departure !== 'Unknown' && arrival !== 'Unknown') {
        const depStr = departure.substring(0, 4);
        const arrStr = arrival.substring(0, 4);
        const escapedDep = depStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedArr = arrStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Find text between 1st occurrence of Dep and 1st occurrence of Arr after it
        const anchorRegex = new RegExp(`${escapedDep}\\s+(.*?)\\s+${escapedArr}`, 'is');
        const anchorMatch = text.match(anchorRegex);
        if (anchorMatch && anchorMatch[1].length > 20) {
            let cleaned = anchorMatch[1].replace(/\d{2}[A-Z]{3}\d{4}Z/g, ''); // Remove timestamps
            cleaned = cleaned.replace(/PAGE\s+\d+\/\d+/gi, ''); // Remove page numbers
            cleaned = cleaned.replace(/\b(QTR|QR)\d+\b/gi, ''); // Remove flight numbers
            return cleaned.replace(/\s+/g, ' ').trim();
        }
    }

    return null;
};
