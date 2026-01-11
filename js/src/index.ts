import { findByProps, logger } from './utils';
import { Settings } from './Settings';

// CONFIGURATION
const settings = {
    targetUserId: "561478149184028673"
};

let Dispatcher: any;
let UserStore: any;
let PresenceStore: any;

const onPresenceUpdate = (data: any) => {
    if (data.user.id !== settings.targetUserId) return;

    // Status can be: 'online', 'dnd', 'idle', 'invisible', 'offline'
    // ClientStatus details: { desktop: 'online', mobile: 'online', web: 'online' }
    const status = data.status;
    const clientStatus = data.client_status ? JSON.stringify(data.client_status) : 'unknown';

    logger.log(`[PRESENCE] Status: ${status} | Clients: ${clientStatus}`);

    // Inspect activities (games, spotify, etc)
    if (data.activities && data.activities.length > 0) {
        data.activities.forEach((activity: any) => {
            logger.log(`[ACTIVITY] ${activity.name}: ${activity.state || ''} ${activity.details || ''}`);
        });
    }
};

const onTypingStart = (data: any) => {
    if (data.userId !== settings.targetUserId) return;
    logger.log(`[TYPING] User is typing in channel ${data.channelId}`);
};

const onMessageCreate = (data: any) => {
    if (data.message.author.id !== settings.targetUserId) return;
    logger.log(`[MESSAGE] User sent a message in channel ${data.channelId}: ${data.message.content}`);
};

const onVoiceStateUpdate = (data: any) => {
    if (data.userId !== settings.targetUserId) return;

    if (data.channelId) {
        logger.log(`[VOICE] User joined/moved to voice channel ${data.channelId}`);
    } else {
        logger.log(`[VOICE] User left voice channel`);
    }
};

export default {
    name: "Activity Tracker",
    description: "Logs specific user activity to the console",
    author: "DerMarsi",
    version: "1.0.0",

    start: () => {
        try {
            logger.log("Activity Tracker Plugin Loading...");

            // Find required modules
            Dispatcher = findByProps("subscribe", "dispatch", "register");
            UserStore = findByProps("getCurrentUser", "getUser");
            PresenceStore = findByProps("getStatus", "getPresence");
            const UserProfileStore = findByProps("getUserProfile"); // Internal store (may vary by version)
            const GuildStore = findByProps("getGuild", "getGuilds");
            const GuildMemberStore = findByProps("getMember", "getMembers");
            const ProfileActions = findByProps("fetchProfile"); // Action to request profile data

            if (!Dispatcher) {
                logger.error("Failed to find Dispatcher module! Plugins modules might be missing.");
                // We don't return here, we try to proceed or just let it be, but logging is crucial.
                // Actually if dispatcher is missing, we can't do much.
                return;
            }

            // Subscribe to events
            Dispatcher.subscribe("PRESENCE_UPDATE", onPresenceUpdate);
            Dispatcher.subscribe("TYPING_START", onTypingStart);
            Dispatcher.subscribe("MESSAGE_CREATE", onMessageCreate);
            Dispatcher.subscribe("VOICE_STATE_UPDATE", onVoiceStateUpdate);

            // --- ENHANCED DISCOVERY ---
            logger.log(`[INIT] Starting enhanced discovery for ${settings.targetUserId}...`);

            // 1. Mutual Guilds discovery
            if (GuildStore && GuildMemberStore) {
                const allGuilds = Object.values(GuildStore.getGuilds());
                const mutualGuilds = allGuilds.filter((g: any) => GuildMemberStore.getMember(g.id, settings.targetUserId));

                logger.log(`[DATA] Found ${mutualGuilds.length} Mutual Guilds:`);
                mutualGuilds.forEach((g: any) => {
                    const member = GuildMemberStore.getMember(g.id, settings.targetUserId);
                    const roles = member?.roles || [];
                    logger.log(` - Guild: ${g.name} (ID: ${g.id}) | Roles: ${roles.length}`);
                });
            }

            // 2. Fetch Profile (Bio, Connected Accounts)
            try {
                if (ProfileActions) {
                    logger.log(`[DATA] Attempting to fetch full profile...`);
                    ProfileActions.fetchProfile(settings.targetUserId);
                    // We need to listen for user profile update or just check store later
                    setTimeout(() => {
                        const profile = UserProfileStore?.getUserProfile(settings.targetUserId);
                        if (profile) {
                            logger.log(`[PROFILE] Bio: ${profile.bio || 'None'}`);
                            if (profile.connected_accounts) {
                                logger.log(`[PROFILE] Connections: ${profile.connected_accounts.map((c: any) => c.type).join(', ')}`);
                            }
                            if (profile.premium_since) {
                                logger.log(`[PROFILE] Nitro since: ${profile.premium_since}`);
                            }
                        } else {
                            logger.log(`[PROFILE] Profile data not available yet.`);
                        }
                    }, 2000);
                } else {
                    logger.warn("[DATA] ProfileActions module not found, cannot fetch full profile.");
                }
            } catch (e) {
                logger.error("[DATA] Error fetching profile", e);
            }

            // Initial check if user is cached
            const currentUser = UserStore?.getUser(settings.targetUserId);
            if (currentUser) {
                const status = PresenceStore?.getStatus(settings.targetUserId);
                logger.log(`[INIT] Target found in cache! Current Status: ${status}`);
                logger.log(`[USER] Username: ${currentUser.username}#${currentUser.discriminator}`);
            } else {
                logger.log(`[INIT] Target user ${settings.targetUserId} not currently cached or found in mutual guilds.`);
            }
        } catch (e) {
            logger.error("FATAL: Failed to start Activity Tracker plugin:", e);
        }
    },

    stop: () => {
        try {
            logger.log("Activity Tracker Plugin Unloading...");
            if (Dispatcher) {
                Dispatcher.unsubscribe("PRESENCE_UPDATE", onPresenceUpdate);
                Dispatcher.unsubscribe("TYPING_START", onTypingStart);
                Dispatcher.unsubscribe("MESSAGE_CREATE", onMessageCreate);
                Dispatcher.unsubscribe("VOICE_STATE_UPDATE", onVoiceStateUpdate);
            }
        } catch (e) {
            logger.error("FATAL: Failed to stop Activity Tracker plugin:", e);
        }
    },

    getSettingsPanel: ({ settings: _settings }: { settings: any }) => {
        // In some environments, settings are passed in. 
        // We can ignore them if we use our own simple object, or sync them.
        return Settings({ settings, refresh: () => { } });
    }
}
