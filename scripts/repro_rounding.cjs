const round100 = (val) => {
    if (!val) return '0';
    const num = parseInt(val, 10);
    if (isNaN(num)) return '0';
    return (Math.ceil(num / 100) * 100).toString();
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

const fullText = `**************FLIGHT DISPATCH RELEASE**************

STATION COPY QR094   08MAR LSZH/OTHH A359 A7ALE     

OFP: 24/0/0/19:16                   DISP:AST. MARIE  PIC:-

REMARKS: PLEASE DO NOT TO DEPART EARLY OR ACCEPT SHORT CUT UNLESS
REALLY NECESSARY TO AVOID ARRIVING EARLIER THAN THE ARRIVAL WINDOW
ALLOWED.
EXTRA FUEL FOR INFLIGHT CONTINGENCIES. ANTICIPATE SAUDI FIR EXIT
POINT CHANGES DUE TO CONGESTION DO NOT USE COMPANY VHF 125.15, WHICH
IS NOT MONITORED. ANTICIPATE RE-ROUTE, HOLDING WITHIN

                    FUEL   TIME
TAXI                 383   0013              STD 08/2130
TRIP               34557   0623              STA 09/0410
CONT 3P/C OEDF       857   0009              BLK    0640
ALTN      OERK      8915   0156
FINL                2073   0030              ETD ../....
MIN FUEL REQ       46790   0911              ETA ../....
EXTRA H            18157   0400
PICD                ....   ....              T/O ALTN   : LIMC
RAMP FUEL          64950   1311
........ ........ ........ ........ ........ ........ ........ .....
CONT 3P/C AT DEP    1037   0011   (180KG INCLUDED IN TRIP)
........ ........ ........ ........ ........ ........ ........ .....
FUEL SUMMARY

RAMP  64950  ........
TAXI    383  ........                            T/O 64567  ........
TRIP  34557  ........

CREW ../..

MZFW 195700 EZFW 149000    MZFW........
MTOW 275000 ETOW 213559    RTOW........
MLWT 207000 ELWT 179002`;

function test() {
    console.log('--- REPRO TEST ---');

    // Ramp Fuel match
    const rampMatch = fullText.match(/RAMP FUEL\s+(\d+)/i);
    const rampVal = rampMatch ? rampMatch[1] : null;
    const rampRounded = round100(rampVal);

    console.log(`Ramp Fuel Match: "${rampVal}" -> Rounded: ${rampRounded}`);

    // Weights
    const weightMatch = fullText.match(/MZFW\s+(\d+)\s+EZFW\s+(\d+)/i);
    const mzfwStr = weightMatch ? weightMatch[1] : (extractRegex(fullText, /MZFW\s+(\d+)/i) || '0');
    const mzfwRounded = round100(mzfwStr);
    console.log(`MZFW: "${mzfwStr}" -> Rounded: ${mzfwRounded}`);

    const mtowStr = extractRegex(fullText, /MTOW\s+(\d+)/i) || '0';
    const mtowRounded = round100(mtowStr);
    console.log(`MTOW: "${mtowStr}" -> Rounded: ${mtowRounded}`);

    // Check Calculated Ramp
    const taxiFuelStr = parseNum(extractRegex(fullText, /TAXI\s+(\d+)/i));
    const tripFuelStr = parseNum(extractRegex(fullText, /TRIP\s+(\d+)/i));
    const contingencyFuelStr = parseNum(extractRegex(fullText, /CONT.*?\s+(\d+)/i));
    const altFuelStr = parseNum(extractRegex(fullText, /ALTN?\s+(?:[A-Z]+\s+)?(\d+)/i));
    const finResFuelStr = parseNum(extractRegex(fullText, /FIN(?:L|AL|RES)?\s+(\d+)/i));
    const extraFuelStr = parseNum(extractRegex(fullText, /EXTRA\s+(?:[A-Z]\s+)?(\d+)/i));
    const picFuelStr = parseNum(extractRegex(fullText, /PIC(?:D|.*?EXT(?:RA)?)?\s+(\d+)/i));

    console.log('\nComponents:');
    console.log(`Taxi: ${taxiFuelStr}, Trip: ${tripFuelStr}, Cont: ${contingencyFuelStr}, Alt: ${altFuelStr}, Finl: ${finResFuelStr}, Extra: ${extraFuelStr}, Pic: ${picFuelStr}`);

    const calculatedRampFuel = (
        parseInt(taxiFuelStr) +
        parseInt(tripFuelStr) +
        parseInt(contingencyFuelStr) +
        parseInt(altFuelStr) +
        parseInt(finResFuelStr) +
        parseInt(extraFuelStr) +
        parseInt(picFuelStr)
    ).toString();

    console.log(`Calculated Ramp Sum: ${calculatedRampFuel}`);
    console.log(`Rounded Calculated Ramp: ${round100(calculatedRampFuel)}`);
}

test();
