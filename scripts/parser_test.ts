import { parseLidoText } from './src/utils/pdfParser.ts';
import fs from 'fs';

const sampleText = fs.readFileSync('sample_lido.txt', 'utf8');

const result = parseLidoText(sampleText);
console.log('Registration:', result.registration);
console.log('Waypoints Count:', result.waypointEntries.length);
console.log('Waypoints:', result.waypoints.join(', '));
console.log('Departure:', result.departure);
console.log('Arrival:', result.arrival);
console.log('Flight Number:', result.flightNumber);
