import * as pdfjsLib from 'pdfjs-dist';
import { FIR_DATA } from '../data/firData';

// We need to set the workerSrc for pdf.js to work.
// Since we are using Vite, we can point it to the local worker file copied to public
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
    // IMPROVED ICAO EXTRACTION: Use word boundaries cautiously to support single-line PDF text
    const icaoPairMatch = fullText.match(/([A-Z]{4})\s*\/\s*([A-Z]{4})/)
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
    const fullRouteString = extractRoute(fullText) || 'Not Found';
    let route = fullRouteString;
    let flightLevel = 'Not Found';

    const flMatch = fullRouteString.match(/(FL\d+.*)/);
    if (flMatch) {
        flightLevel = flMatch[1].trim();
        route = fullRouteString.replace(flMatch[1], '').trim();
    }

    // Ensure we handle multiline dots and clean up the route
    route = route.replace(/\.+/g, '').trim();

    const tripDataMatch = fullText.match(/TRIP\s+(\d+)\s+(\d{4})/i);
    const tripFuelStr = tripDataMatch ? parseNum(tripDataMatch[1]) : parseNum(extractRegex(fullText, /TRIP\s+(\d{3,})(?:\s+|\.)/i));
    const tripTimeRaw = tripDataMatch ? tripDataMatch[2] : '0000';
    const tripTimeMinutes = parseInt(tripTimeRaw.substring(0, 2), 10) * 60 + parseInt(tripTimeRaw.substring(2, 4), 10);

    const taxiMatch = fullText.match(/TAXI\s+(\d+)\s+(\d{4})/i);
    const taxiFuelStr = parseNum(taxiMatch ? taxiMatch[1] : extractRegex(fullText, /TAXI\s+(\d+)(?:\s+|\.)/i));
    const taxiTimeRaw = taxiMatch?.[2] || '0000';
    const taxiTimeMinutes = parseInt(taxiTimeRaw.substring(0, 2), 10) * 60 + parseInt(taxiTimeRaw.substring(2, 4), 10);

    // Look for FUEL followed by TIME (digits or dots) to avoid labels like 3P/C
    const contMatch = fullText.match(/CONT.*?\s+(\d+)\s+(\d{4}|\.\.\.\.)/i);
    const contingencyRemarks = extractRegex(fullText, /CONT\s+(.*?)\s+\d+/i) || '';
    const contingencyFuelStr = parseNum(contMatch ? contMatch[1] : (extractRegex(fullText, /CONT.*?\s+(\d{3,})\b/i)));
    const contTimeRaw = contMatch?.[2] || '0000';
    const contTimeMinutes = (contTimeRaw !== '....') ? (parseInt(contTimeRaw.substring(0, 2), 10) * 60 + parseInt(contTimeRaw.substring(2, 4), 10)) : 0;

    const altMatch = fullText.match(/ALTN?\s+(?:[A-Z]+\s+)?(\d+)\s+(\d{4})/i);
    const altFuelStr = parseNum(altMatch ? altMatch[1] : extractRegex(fullText, /ALTN?\s+(?:[A-Z]+\s+)?(\d+)(?:\s+|\.)/i));
    const altTimeRaw = altMatch?.[2] || '0000';
    const altTimeMinutes = altTimeRaw !== '....' ? (parseInt(altTimeRaw.substring(0, 2), 10) * 60 + parseInt(altTimeRaw.substring(2, 4), 10)) : 0;

    const finlMatch = fullText.match(/FIN(?:L|AL|RES)?\s+(\d+)\s+(\d{4})/i);
    const finResFuelStr = parseNum(finlMatch ? finlMatch[1] : extractRegex(fullText, /FIN(?:L|AL|RES)?\s+(\d+)(?:\s+|\.)/i));
    const finlTimeRaw = finlMatch?.[2] || '0000';
    const finlTimeMinutes = finlTimeRaw !== '....' ? (parseInt(finlTimeRaw.substring(0, 2), 10) * 60 + parseInt(finlTimeRaw.substring(2, 4), 10)) : 0;

    const extraMatch = fullText.match(/EXTRA\s+(?:[A-Z]\s+)?(\d+)\s+(\d{4})/i);
    const extraFuelStr = parseNum(extraMatch ? extraMatch[1] : extractRegex(fullText, /EXTRA\s+(?:[A-Z]\s+)?(\d+)(?:\s+|\.)/i));
    const extraTimeRaw = extraMatch?.[2] || '0000';
    const extraTimeMinutes = extraTimeRaw !== '....' ? (parseInt(extraTimeRaw.substring(0, 2), 10) * 60 + parseInt(extraTimeRaw.substring(2, 4), 10)) : 0;

    const minReqMatch = fullText.match(/MIN.*?(?:T\/O|REQ|FUEL)\s+(\d+)\s+(\d{4})/i);
    const minReqFuelStr = parseNum(minReqMatch ? minReqMatch[1] : extractRegex(fullText, /MIN.*?(?:T\/O|REQ|FUEL)\s+(\d+)(?:\s+|\.)/i));
    const minReqTimeRaw = minReqMatch?.[2] || '0000';
    const minReqTimeMinutes = minReqTimeRaw !== '....' ? (parseInt(minReqTimeRaw.substring(0, 2), 10) * 60 + parseInt(minReqTimeRaw.substring(2, 4), 10)) : 0;

    const picFuelStrRaw = extractRegex(fullText, /PIC(?:D|.*?EXT(?:RA)?)?\s+(\d+)(?:\s+|\.)/i) || '0';
    const picFuelStr = parseNum(picFuelStrRaw);

    const calculatedRampFuelVal =
        parseInt(taxiFuelStr) +
        parseInt(tripFuelStr) +
        parseInt(contingencyFuelStr) +
        parseInt(altFuelStr) +
        parseInt(finResFuelStr) +
        parseInt(extraFuelStr) +
        parseInt(picFuelStr);

    // THE CRITICAL FIX: Ensure the fallback sum is also rounded!
    const calculatedRampFuelRounded = round100(calculatedRampFuelVal.toString());

    const weightMatch = fullText.match(/MZFW\s+(\d+)\s+EZFW\s+(\d+)/i) || fullText.match(/MZFW\s+(\d+).*?EZFW\s+(\d+)/is);
    const mzfwStr = round100(weightMatch ? weightMatch[1] : (extractRegex(fullText, /MZFW\s+(\d+)/i) || '0'));
    const ezfwStr = round100(weightMatch ? weightMatch[2] : (extractRegex(fullText, /EZFW\s+(\d+)/i) || '0'));
    const mtowStr = round100(extractRegex(fullText, /MTOW\s+(\d+)/i) || '0');

    // ETOW calculation: if not found, it must be (EZFW + Ramp Fuel - Taxi) -> must be rounded
    const etowRegexMatch = extractRegex(fullText, /ETOW\s+(\d+)/i);
    const etowStr = etowRegexMatch ? round100(etowRegexMatch) : round100((parseInt(ezfwStr) + parseInt(calculatedRampFuelRounded) - parseInt(taxiFuelStr)).toString());

    const mlwStr = round100(extractRegex(fullText, /MLWT?\s+(\d+)/i) || extractRegex(fullText, /LAW\s+(\d+)/i) || '0');

    const rampRegex = /RAMP(?:\s*FUEL)?\s+(\d+)/gi;
    const rampMatches: string[] = [];
    let rMatch;
    while ((rMatch = rampRegex.exec(fullText)) !== null) {
        rampMatches.push(rMatch[1]);
    }
    // Main table ramp fuel vs fallback
    const bestRampMatch = rampMatches.length > 0 ? round100(rampMatches[0]) : calculatedRampFuelRounded;

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

    return {
        flightNumber: extractRegex(fullText, /(QTR\d+[A-Z]?)\/QR\d+/i) || extractRegex(fullText, /COPY\s+(QR\d+)/i) || 'Unknown',
        aircraftType: extractRegex(fullText, /(?:[A-Z]{4}\s*\/\s*[A-Z]{4}|A\/C)\s+(?:[PMZ]\d{4}\s+)?([A-Z\d]{4})/)
            || extractRegex(fullText, /(?:TYPE|A\/C TYPE)\s*[:]?\s*(A3\d{2,3}[A-Z]?|B\d{3}[A-Z]?)/i)
            || extractRegex(fullText, /A\/C\s.*?(A3\d{2,3}[A-Z]?|B\d{3}[A-Z]?)/i) || 'Unknown',
        registration,
        departure,
        arrival,
        destTimezoneOffset,
        tripFuel: tripFuelStr,
        rampFuel: bestRampMatch, // Already rounded
        rawRampFuel: (rampMatches.length > 0 ? rampMatches[0] : calculatedRampFuelVal.toString()),
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
                if ((IS_STRUCTURAL_WPT(t) && t !== '....' && t !== 'TOC' && t !== 'TOD') || KNOWN_HEADERS.has(t)) break;
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
                            name: tokUp, stm: 0, rfob: 0,
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

const extractRoute = (text: string): string | null => {
    // PDF text often lacks newlines, so we use \\s+ instead of \\n\\s*
    const match = text.match(/(?:ATC\s*CLEARANCE|DEFRTE):[\s.]*([\s\S]+?)(?=\s+(?:FUEL|AWY|ITT|PAGE|MZFW|MTOW|RAMP|TRIP|$))/i)
        || text.match(/AWY.*?WPT.*?AFOB\s+([A-Z0-9\-\s]{10,})/is); // Fallback to nav log header area
    if (match) {
        return match[1].replace(/\s+/g, ' ').trim();
    }
    return null;
};
