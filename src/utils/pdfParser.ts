import * as pdfjsLib from 'pdfjs-dist';
import { FIR_DATA } from './firData';

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
}

export interface ParsedFlightData {
    flightNumber: string;
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
    // Basic Routing
    route: string;
    flightLevel: string;
    // Block Times
    std: string;
    sta: string;
    blkTime: string;
    tripTime: number; // minutes
    // Structured Nav Log
    waypointEntries: WaypointEntry[];
    // Legacy flat list (for backward compat)
    waypoints: string[];
}

const round100 = (val: string | null): string => {
    if (!val) return '0';
    const num = parseInt(val, 10);
    if (isNaN(num)) return '0';
    return (Math.round(num / 100) * 100).toString();
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

                // IMPROVED ICAO EXTRACTION: Look for [A-Z]{4}/[A-Z]{4} patterns flexibly
                // Specifically look for the DOH-ISB or OTHH/OPIS patterns
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

                const tripDataMatch = fullText.match(/TRIP\s+(\d+)\s+(\d{4})/i);
                const tripFuelStr = tripDataMatch ? round100(tripDataMatch[1]) : round100(extractRegex(fullText, /TRIP\s+(\d+)/i));
                const tripTimeRaw = tripDataMatch ? tripDataMatch[2] : '0000';
                const tripTimeMinutes = parseInt(tripTimeRaw.substring(0, 2), 10) * 60 + parseInt(tripTimeRaw.substring(2, 4), 10);

                const taxiFuelStr = round100(extractRegex(fullText, /TAXI\s+(\d+)/i));

                const contMatch = fullText.match(/CONT\s+(.*?)\s+(\d{3,6})/i);
                const contingencyRemarks = contMatch ? contMatch[1].trim() : '';
                const contingencyFuelStr = round100(contMatch ? contMatch[2] : (extractRegex(fullText, /CONT.*?\s+(\d{3,6})/i)));

                const altFuelStr = round100(extractRegex(fullText, /ALTN?\s+(?:[A-Z]+\s+)?(\d+)/i));
                const finResFuelStr = round100(extractRegex(fullText, /FIN(?:L|AL|RES)?\s+(\d+)/i));
                const minReqFuelStr = round100(extractRegex(fullText, /MIN.*?(?:T\/O|REQ|FUEL)\s+(\d+)/i));
                const extraFuelStr = round100(extractRegex(fullText, /EXTRA\s+(?:[A-Z]\s+)?(\d+)/i));
                const picFuelStr = round100(extractRegex(fullText, /PIC(?:D|.*?EXT(?:RA)?)?\s+(\d+)/i));

                const calculatedRampFuel = (
                    parseInt(taxiFuelStr) +
                    parseInt(tripFuelStr) +
                    parseInt(contingencyFuelStr) +
                    parseInt(altFuelStr) +
                    parseInt(finResFuelStr) +
                    parseInt(extraFuelStr) +
                    parseInt(picFuelStr)
                ).toString();

                const weightMatch = fullText.match(/MZFW\s+(\d+)\s+EZFW\s+(\d+)/i);
                const mzfwStr = weightMatch ? weightMatch[1] : (extractRegex(fullText, /MZFW\s+(\d+)/i) || '0');
                const ezfwStr = weightMatch ? weightMatch[2] : (extractRegex(fullText, /EZFW\s+(\d+)/i) || '0');
                const mtowStr = extractRegex(fullText, /MTOW\s+(\d+)/i) || '0';

                // Extract structured nav log entries, stopping at arrival ICAO
                const waypointEntries = extractNavLog(fullText, arrival);


                const waypoints = waypointEntries
                    .filter(e => !e.isFir)
                    .map(e => e.name);

                // Extract destination timezone
                // Look for patterns like P0300 OTHH/KIAD M0500 or just M0500 next to arrival ICAO
                const destTzMatch = fullText.match(/([PMZ]\d{4})\s+[A-Z]{3,4}\s*\/\s*[A-Z]{3,4}\s+([PMZ]\d{4})/)
                    || fullText.match(new RegExp(`${arrival}\\s+([PMZ]\\d{4})`));

                let destTimezoneOffset = 'Z0000';
                if (destTzMatch) {
                    destTimezoneOffset = destTzMatch[2] || destTzMatch[1];
                }

                const data: ParsedFlightData = {
                    flightNumber: extractRegex(fullText, /(QTR\d+[A-Z]?)\/QR\d+/i) || extractRegex(fullText, /COPY\s+(QR\d+)/i) || 'Unknown',
                    departure,
                    arrival,
                    destTimezoneOffset,
                    tripFuel: tripFuelStr,
                    rampFuel: calculatedRampFuel,
                    taxiFuel: taxiFuelStr,
                    contingencyFuel: contingencyFuelStr,
                    contingencyRemarks: contingencyRemarks,
                    altFuel: altFuelStr,
                    finResFuel: finResFuelStr,
                    minReqFuel: minReqFuelStr,
                    extraFuel: extraFuelStr,
                    picFuel: picFuelStr,
                    mzfw: round100(mzfwStr),
                    ezfw: round100(ezfwStr),
                    mtow: round100(mtowStr),
                    route: route || 'Not Found',
                    flightLevel: flightLevel,
                    std: extractRegex(fullText, /STD\s+([\d/]+)/i) || 'Unknown',
                    sta: extractRegex(fullText, /STA\s+([\d/]+)/i) || 'Unknown',
                    blkTime: extractRegex(fullText, /BLK\s+(\d{4})/i) || 'Unknown',
                    tripTime: tripTimeMinutes,
                    waypointEntries,
                    waypoints,
                };

                resolve(data);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

const extractRegex = (text: string, regex: RegExp): string | null => {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
};

/**
 * Enhanced Structural Nav Log Parser inspired by rriet/flightbag.
 */
function extractNavLog(fullText: string, arrivalICAO: string): WaypointEntry[] {
    const entries: WaypointEntry[] = [];

    const headerIdx = fullText.search(/AWY\s+ITT\s+FL\s+WIND/);
    if (headerIdx === -1) return entries;

    const altIdx = fullText.indexOf('DESTINATION TO ALTERNATE', headerIdx);
    const navLogText = altIdx !== -1 ? fullText.substring(headerIdx, altIdx) : fullText.substring(headerIdx);

    const tokens = navLogText.split(/\s+/).filter(t => t.length > 0);

    const IS_WAYPOINT_RE = /^(?=.*[A-Z])([A-Z0-9]{2,5}|TOC|TOD)$/;
    const IS_COORD_PATTERN = /^[NS]{1}\d{2,5}[EW][0-9.]{4,6}$/;
    const IS_ETOPS_PATTERN = /^((ENTRY)[0-9]|(ETP\([0-9A-Z]{1,4}\))|(EXIT)[0-9])$/;

    const IS_AIRWAY = /^[A-Z]{1,2}\d{1,3}$/;
    const IS_LIDO_DOTS = /^[.]{1,4}$/;
    const IS_RFOB = /^(\d{1,3}\.\d)$/; // Broadened to handle > 100t or small < 1t values
    const IS_CTM = /^\d{4}$/;
    const IS_FIR_DASHES = /^-{3,}$/;

    const IS_DATE = /^[0-9]{1,2}[A-Z]{3}$/i;
    const IS_MACH_COMP = /^[PM][0-9]{4}$/i;
    const IS_AC_TYPE = /^(A\d{3}[A-Z]?|B\d{3}[A-Z]?)$/i;
    const IS_AC_REG = /^[A-Z0-9]{1,2}-[A-Z0-9]{3,5}$|^A7[A-Z]{3}$/i;
    const IS_ALT_UNIT = /^[0-9]+(FT|KT|M|Z|MSL)$/i;

    const FIR_DESIGNATORS = new Set(Object.values(FIR_DATA).map(v => v.toUpperCase()));
    const KNOWN_HEADERS = new Set([
        'AWY', 'ITT', 'FL', 'WIND', 'ISAD', 'STM', 'ETA', 'AFOB',
        'WPT', 'FREQ', 'IMT', 'DIS', 'SPD', 'GS', 'TAS', 'MORA',
        'CTM', 'RTA', 'ATA', 'RFOB', 'PAGE', 'PLAN', 'REM', 'REQ',
        'CLB', 'DSC', 'ELEV', 'DESC', 'FUEL', 'TIME', 'DIST', 'MACH',
        'TCAS', 'ADF', 'VOR', 'VHF', 'HF', 'NAV', 'LOG', 'OFF', 'ON', 'OUT', 'IN', 'DATE',
        'DCT', 'FIR', 'UIR', 'NRP'
    ]);

    const IS_STRUCTURAL_WPT = (t: string) => {
        const up = t.toUpperCase();
        if (KNOWN_HEADERS.has(up) || up === 'DCT' || up === 'NRP' || IS_AIRWAY.test(up)) return false;
        if (IS_DATE.test(up) || IS_MACH_COMP.test(up) || IS_AC_TYPE.test(up) || IS_AC_REG.test(up) || IS_ALT_UNIT.test(up)) return false;

        if (FIR_DESIGNATORS.has(up)) return false;
        if (Object.keys(FIR_DATA).some(name => up === name)) return false;

        return IS_WAYPOINT_RE.test(up) || IS_COORD_PATTERN.test(up) || IS_ETOPS_PATTERN.test(up);
    };

    const isFirKeyword = (t: string) => t && /^\(?(FIR|UIR|FIR\/UIR)\)?$/.test(t.toUpperCase());
    const isLidoMarkerRow = (startIndex: number) => {
        for (let k = 1; k < 15; k++) {
            const peek = tokens[startIndex + k];
            if (!peek) break;
            if (IS_LIDO_DOTS.test(peek)) return true;
        }
        return false;
    };

    const IS_ITT = /^([TM]?\d{3})$/;

    let i = 0;
    const arrivalMatch = new RegExp('^' + arrivalICAO + '(/\\d+[A-Z]?)?$');

    while (i < tokens.length) {
        const tok = tokens[i];
        const tokUp = tok.toUpperCase();

        // 0. Stop condition: Arrival Airport Identifier
        if (tokUp.length >= 4 && arrivalMatch.test(tokUp)) {
            let rfobVal = 0;
            for (let j = i + 1; j < Math.min(i + 25, tokens.length); j++) {
                if (IS_RFOB.test(tokens[j])) {
                    rfobVal = parseFloat(tokens[j]);
                    break;
                }
            }
            entries.push({ name: tokUp, stm: 0, rfob: rfobVal, isToc: false, isTod: false, isFir: false });
            break;
        }

        // 1. FIR Logic (Separator Rows)
        const matchedByName = Object.keys(FIR_DATA).find(f => tokUp === f || (tokUp + ' ' + (tokens[i + 1] || '').toUpperCase()) === f);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const matchedByDesignator = Object.entries(FIR_DATA).find(([_, des]) => tokUp === des)?.[0];
        const knownFir = matchedByName || matchedByDesignator;

        if (IS_FIR_DASHES.test(tok) || knownFir) {
            let foundKeyword = false;
            let fullName = '';
            let skipCount = 0;

            for (let k = 0; k <= 4; k++) {
                const peek = tokens[i + k];
                if (!peek) break;
                if (isFirKeyword(peek)) {
                    foundKeyword = true;
                    const nameBase = knownFir ? knownFir : tokens.slice(i + 1, i + k).join(' ');
                    const icao = FIR_DATA[nameBase.toUpperCase().trim()] || (tokens[i + k + 1]?.length === 4 ? tokens[i + k + 1] : '');
                    fullName = `${nameBase.trim()} FIR (${icao})`;
                    skipCount = k + (icao && tokens[i + k + 1] === icao ? 1 : 0);
                    break;
                }
            }

            if (foundKeyword || knownFir) {
                if (!fullName && knownFir) {
                    fullName = `${knownFir} FIR (${FIR_DATA[knownFir]})`;
                }
                if (fullName) {
                    entries.push({ name: fullName, stm: 0, rfob: 0, isToc: false, isTod: false, isFir: true });
                    i += Math.max(1, skipCount + 1);
                    continue;
                }
            }
        }

        // 2. Structural Waypoint Parsing
        if (IS_STRUCTURAL_WPT(tok)) {
            if (isLidoMarkerRow(i)) {
                const name = tokUp;
                const isToc = name === 'TOC';
                const isTod = name === 'TOD';
                let ctmRaw = '';
                let rfobRaw = '';
                let stmMinutes = 0;
                let ittRaw = '';
                let disRaw = '';

                for (let j = i + 1; j < Math.min(i + 25, tokens.length); j++) {
                    const t = tokens[j].toUpperCase();
                    if (IS_STRUCTURAL_WPT(t)) break;

                    // Look for ITT, which is usually a 3-digit number (e.g. 338 or T338 or M338) near the airway/waypoint
                    // To avoid confusing it with flight levels or weights, we do this before parsing.
                    if (!ittRaw && IS_ITT.test(t)) {
                        ittRaw = t.replace(/[TM]/, '');
                    } else if (!disRaw && /^\d{1,4}$/.test(t) && !IS_CTM.test(t)) {
                        disRaw = t;
                    }

                    if (IS_RFOB.test(t)) rfobRaw = t;
                    if (IS_CTM.test(t) && !ctmRaw) ctmRaw = t;
                }

                if (ctmRaw) {
                    const hh = parseInt(ctmRaw.substring(0, 2), 10);
                    const mm = parseInt(ctmRaw.substring(2, 4), 10);
                    stmMinutes = hh * 60 + mm;
                }

                entries.push({ name, stm: stmMinutes, rfob: rfobRaw ? parseFloat(rfobRaw) : 0, isToc, isTod, isFir: false, itt: ittRaw || '-', dis: disRaw || '-' });
            }
        }
        i++;
    }
    return entries;
}

const extractRoute = (text: string): string | null => {
    const match = text.match(/ATC\s*CLEARANCE:.*?([A-Z0-9\-\s/]+FL\d+.*?)(?=FUEL|\n\n)/is)
        || text.match(/AWY.*?WPT.*?AFOB\s+([A-Z0-9\-\s]{10,})/is); // Fallback to nav log header area
    if (match) {
        return match[1].replace(/\s+/g, ' ').trim();
    }
    return null;
};
