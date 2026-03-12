# eFlightbag Future Feature Ideas

This document contains a list of potential features and improvements for the eFlightbag application to revisit later.

## 🌤️ Flight Operations & Situational Awareness
1. **Live Weather Integration (METAR/TAF)**
   - Since we already parse the departure, destination, and alternate ICAO codes from the LIDO plan, we can automatically fetch and display real-time METARs and TAFs for the route using a free aviation weather API.
2. **Interactive Route Map (Offline Capable)**
   - Extract Lat/Lon coordinates of waypoints to plot the entire flight plan on an interactive map (using `react-leaflet`). Show the active leg, ETOPS alternates, and visually represent the route.
3. **NOTAMs Fetcher**
   - Automatically pull and organize relevant NOTAMs for the parsed airports.
4. **Visual Fuel Trend Graph**
   - In the `InflightDisplay`, alongside tabular RFOB/EFOB data, add a line chart showing **Planned vs. Actual Fuel** burn. Helps instantly identify trends like fuel leaks or higher burn rates.

## 🧮 Calculators & Quick Tools
5. **Top of Descent (TOD) & Descent Rate Calculator**
   - A quick-access tool to calculate the exact distance to start the descent based on current altitude, target altitude, and standard glide path, plus the required vertical speed based on current ground speed.
6. **Crosswind & Headwind Calculator**
   - Rapid input tool for runway heading and wind conditions to instantly give crosswind and head/tailwind components.
7. **Holding Pattern Entry Calculator**
   - Input the holding fix inbound course and current heading to visually show the recommended entry (Direct, Teardrop, or Parallel) and calculate wind correction angles.
8. **Built-in Aviation Timers**
   - Add a floating or docked stopwatch tailored for holding patterns, procedural turns, or non-precision approaches.

## 🎨 UX & Infrastructure Enhancements
9. **Full Offline PWA (Progressive Web App)**
   - Configure a Service Worker to allow installing the web app on an iPad, giving it a native app icon and enabling 100% offline functionality in the cockpit (caching the LIDO plan, manual, calculators).
10. **Cockpit Night Mode (Red/Dark Theme)**
    - Add a dedicated "Night Vision" mode that shifts the UI primarily to deep blacks and reds to preserve night vision during red-eye flights.
