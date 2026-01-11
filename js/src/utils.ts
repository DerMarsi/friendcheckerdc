// Utility to finding Discord modules
// In a real Revenge environment, these are often provided by the global 'metro' or 'revenge' object.
// We will mimic the common 'findByProps' pattern used in Discord client mods.

declare global {
    var modules: any;
    var revenge: any;
}

export function findByProps(...props: string[]): any {
    try {
        if (typeof (window as any).modules !== 'undefined') {
            // Standard Web/Desktop Client Mod way (sometimes works on RN)
            return (window as any).modules.find((m: any) => m && props.every(p => m[p] !== undefined));
        }

        // Revenge/Metro way (Generic placeholder logic)
        // In actual execution, Revenge provides specific API for this.
        // We will assume a global 'findByProps' exists or 'revenge.modules.findByProps'

        if (typeof (globalThis as any).revenge !== 'undefined' && (globalThis as any).revenge.modules) {
            return (globalThis as any).revenge.modules.findByProps(...props);
        }

        // Common ReVanced/Revenge pattern fallback
        if (typeof (globalThis as any).modules !== 'undefined') {
            return (globalThis as any).modules.find((m: any) => m && props.every(p => m[p] !== undefined));
        }

        console.warn("findByProps: Environment not found, returning mock");
        return null;
    } catch (e) {
        console.error("findByProps error:", e);
        return null;
    }
}

export const logger = {
    log: (msg: string, ...args: any[]) => console.log(`[ActivityTracker] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[ActivityTracker] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[ActivityTracker] ${msg}`, ...args),
};
