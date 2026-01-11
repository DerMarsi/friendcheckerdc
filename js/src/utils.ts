// Utility to finding Discord modules
// In a real Revenge environment, these are often provided by the global 'metro' or 'revenge' object.
// We will mimic the common 'findByProps' pattern used in Discord client mods.

declare global {
    var modules: any;
    var revenge: any;
}

export function findByProps(...props: string[]): any {
    try {
        const globalAny = globalThis as any;

        // 1. Vendetta (Standard for plugins)
        if (globalAny.vendetta?.metro?.findByProps) {
            return globalAny.vendetta.metro.findByProps(...props);
        }

        // 2. Revenge (Alternative namespace)
        if (globalAny.revenge?.modules?.findByProps) {
            return globalAny.revenge.modules.findByProps(...props);
        }

        // 3. Webpack/Metro global (Vencord/BetterDiscord style)
        if (globalAny.modules?.find) {
            return globalAny.modules.find((m: any) => m && props.every(p => m[p] !== undefined));
        }

        // 4. Webpack chunk global (Web client)
        if (globalAny.webpackChunkdiscord_app) {
            // This is harder to iterate without specific logic, skipping for now
        }

        console.warn(`[ActivityTracker] findByProps failed to find environment for props: ${props.join(", ")}`);
        return null;
    } catch (e) {
        console.error("[ActivityTracker] findByProps error:", e);
        return null;
    }
}

export const logger = {
    log: (msg: string, ...args: any[]) => console.log(`[ActivityTracker] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[ActivityTracker] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[ActivityTracker] ${msg}`, ...args),
};
