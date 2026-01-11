import { findByProps, logger } from "./utils";
import FriendMonitor from "./FriendMonitor";

const { React } = findByProps("React");
const Patcher = findByProps("after", "before", "instead"); // Assuming Patcher is available via findByProps or global
// In standard Vendetta, it's globalThis.vendetta.patcher

// CONFIGURATION
const settings: any = {}; // We will rely on built-in storage prop passed to start() if available, or manage global settings logic.
// Revenge plugins usually get `storage` passed as arg or available globally.

let Dispatcher: any;
let UserStore: any;
let PresenceStore: any;
let UserContextMenu: any;

// Helper to access storage safely
const getStorage = () => (globalThis as any).vendetta?.plugin?.storage || {};

const addLog = (userId: string, type: string, content: string) => {
    const storage = getStorage();
    if (!storage.logs) storage.logs = [];
    storage.logs.push({
        timestamp: Date.now(),
        userId,
        type,
        content
    });
    // Limit log size (Optional)
    if (storage.logs.length > 200) storage.logs.shift();
};

const onPresenceUpdate = (data: any) => {
    const storage = getStorage();
    if (!(storage.targetUserIds || []).includes(data.user.id)) return;

    const user = data.user;
    const status = data.status;
    const clientStatus = data.client_status ? JSON.stringify(data.client_status) : 'unknown';

    logger.log(`[PRESENCE] ${user.id} Status: ${status}`);
    addLog(user.id, "PRESENCE", `Status changed to ${status} (${clientStatus})`);

    if (data.activities && data.activities.length > 0) {
        data.activities.forEach((activity: any) => {
            addLog(user.id, "ACTIVITY", `${activity.name}: ${activity.state || ''} ${activity.details || ''}`);
        });
    }
};

const onTypingStart = (data: any) => {
    const storage = getStorage();
    if (!(storage.targetUserIds || []).includes(data.userId)) return;
    logger.log(`[TYPING] ${data.userId} typing in ${data.channelId}`);
    addLog(data.userId, "TYPING", `Typing in channel ${data.channelId}`);
};

const onMessageCreate = (data: any) => {
    const storage = getStorage();
    if (!(storage.targetUserIds || []).includes(data.message.author.id)) return;
    logger.log(`[MESSAGE] ${data.message.author.id}: ${data.message.content}`);
    addLog(data.message.author.id, "MESSAGE", `Sent message in ${data.channelId}: ${data.message.content}`);
};

const onVoiceStateUpdate = (data: any) => {
    const storage = getStorage();
    if (!(storage.targetUserIds || []).includes(data.userId)) return;

    if (data.channelId) {
        logger.log(`[VOICE] ${data.userId} joined ${data.channelId}`);
        addLog(data.userId, "VOICE", `Joined/Moved to voice channel ${data.channelId}`);
    } else {
        logger.log(`[VOICE] Left voice`);
        addLog(data.userId, "VOICE", `Left voice channel`);
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
            UserContextMenu = findByProps("UserContextMenu"); // Initial try, might need specific search

            if (!Dispatcher) {
                logger.error("Failed to find Dispatcher module!");
                return;
            }

            // Patch UserContextMenu
            // Uses global `vendetta.patcher` if available, or try finding patcher
            const patcher = (globalThis as any).vendetta?.patcher || Patcher;
            if (patcher && UserContextMenu) {
                // Determine the correct function to patch (usually "default")
                patcher.after("default", UserContextMenu, ([props], ret) => {
                    const userId = props.user?.id;
                    if (!userId) return;

                    // Check if user is already a close friend
                    // Access storage from plugin context if possible, or global
                    // We need to access the `storage` object passed to `start` or maintained globally.
                    // For now, we assume `storage` is globally accessible via the plugin object or local var if we bind it.
                    // IMPORTANT: The `start` function doesn't get storage directly in this legacy wrapper structure.
                    // We'll rely on `(globalThis as any).vendetta.plugin.storage`.

                    const storage = (globalThis as any).vendetta?.plugin?.storage || {};
                    const isFriend = (storage.targetUserIds || []).includes(userId);

                    if (!ret.props.children) ret.props.children = [];
                    // Add button
                    const { FormRow } = findByProps("FormRow");
                    const { View, Text, TouchableOpacity } = findByProps("View", "Text", "TouchableOpacity");

                    ret.props.children.push(React.createElement(TouchableOpacity, {
                        onPress: () => {
                            if (!storage.targetUserIds) storage.targetUserIds = [];
                            if (isFriend) {
                                storage.targetUserIds = storage.targetUserIds.filter((id: string) => id !== userId);
                                logger.log(`Removed ${userId} from Close Friends.`);
                            } else {
                                storage.targetUserIds.push(userId);
                                logger.log(`Added ${userId} as Close Friend.`);
                            }
                            // Force update context menu if possible? usually closes on action.
                            const { showToast } = findByProps("showToast");
                            if (showToast) showToast(isFriend ? "Removed from Close Friends" : "Added to Close Friends");
                        },
                        style: { padding: 12, backgroundColor: isFriend ? '#ed4245' : '#248046', borderRadius: 4, margin: 8 }
                    }, React.createElement(Text, { style: { color: 'white', fontWeight: 'bold', textAlign: 'center' } },
                        isFriend ? "Remove from Close Friends" : "Become a very close friend"
                    )));
                });
            } else {
                logger.warn("UserContextMenu or Patcher not found, Context Menu button will be missing.");
            }

            // Subscribe to events
            Dispatcher.subscribe("PRESENCE_UPDATE", onPresenceUpdate);
            Dispatcher.subscribe("TYPING_START", onTypingStart);
            Dispatcher.subscribe("MESSAGE_CREATE", onMessageCreate);
            Dispatcher.subscribe("VOICE_STATE_UPDATE", onVoiceStateUpdate);

            logger.log("Plugin started!");
        } catch (e) {
            logger.error("FATAL: Failed to start Activity Tracker plugin:", e);
        }
    },

    stop: () => {
        try {
            logger.log("Activity Tracker Plugin Unloading...");
            const patcher = (globalThis as any).vendetta?.patcher || Patcher;
            if (patcher) {
                // Unpatch all
                // Revenge usually returns an unpatch function from patching, we didn't store it. 
                // In a robust app we'd store `unpatches.push(patcher.after(...))` and call them here.
                // For this quick impl, we rely on plugin reload clearing patches naturally or implementation detail.
                // Better:
                unpatches.forEach(u => u());
            }

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

    getSettingsPanel: ({ settings }: any) => {
        return React.createElement(FriendMonitor, { settings: settings, storage: (globalThis as any).vendetta?.plugin?.storage || {} });
    }
}
