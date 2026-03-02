export type AppSection =
    | 'flight-init'
    | 'performance'
    | 'techlog'
    | 'dangerous-goods'
    | 'inflight'
    | 'briefing'
    | 'pa-guide'
    | 'inflight-rest'
    | 'about';

export interface Waypoint {
    name: string;
    plnEta: string;
    ata: string;
    plnFuel: string;
    actFuel: string;
    diff: string;
}
