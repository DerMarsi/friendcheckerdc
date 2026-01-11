import { findByProps } from "./utils";

const { React, stylesheet } = findByProps("React", "stylesheet", "ReactNative");
const { ScrollView, View, Text, TouchableOpacity, Image } = findByProps("ScrollView", "View", "Text", "TouchableOpacity", "Image");
const { FormSection, FormRow, FormSwitch } = findByProps("FormSection", "FormRow");

// Styles (Basic implementation using properties found in other plugins)
// We'll rely on global styles/Find props for specific style objects if needed, 
// or just use inline styles for now which work reasonably well in RN/Discord.
const styles = {
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        marginTop: 20,
    },
    emptyText: {
        color: '#bbb',
        textAlign: 'center',
        marginVertical: 10,
    },
    logEntry: {
        backgroundColor: '#2f3136',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    logTimestamp: {
        fontSize: 12,
        color: '#b9bbbe',
        marginBottom: 4,
    },
    logContent: {
        color: '#dcddde',
        fontSize: 14,
    },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#4f545c',
    },
    friendName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    removeBtn: {
        backgroundColor: '#ed4245',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    removeBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    clearBtn: {
        backgroundColor: '#5865f2',
        padding: 12,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    clearBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    }
};

export default function FriendMonitor({ settings, storage }) {
    const [refreshKey, setRefreshKey] = React.useState(0);

    // Initial load/Ensure defaults
    React.useEffect(() => {
        if (!storage.targetUserIds) storage.targetUserIds = [];
        if (!storage.logs) storage.logs = [];
        setRefreshKey(prev => prev + 1);
    }, []);

    const removeFriend = (userId) => {
        storage.targetUserIds = storage.targetUserIds.filter(id => id !== userId);
        setRefreshKey(prev => prev + 1);
    };

    const clearLogs = () => {
        storage.logs = [];
        setRefreshKey(prev => prev + 1);
    };

    const friendsList = storage.targetUserIds || [];
    const logsList = (storage.logs || []).slice().reverse(); // Show newest first

    return React.createElement(ScrollView, { style: styles.container },
        // --- Friends List Section ---
        React.createElement(Text, { style: styles.header }, "Close Friends List"),
        friendsList.length === 0 ?
            React.createElement(Text, { style: styles.emptyText }, "No close friends added yet. Go to a user profile and click 'Become a very close friend'.") :
            friendsList.map(userId => (
                React.createElement(View, { key: userId, style: styles.friendRow },
                    React.createElement(Text, { style: styles.friendName }, `User ID: ${userId}`), // TODO: Resolve username if possible
                    React.createElement(TouchableOpacity, { onPress: () => removeFriend(userId), style: styles.removeBtn },
                        React.createElement(Text, { style: styles.removeBtnText }, "Remove")
                    )
                )
            )),

        // --- Activity Logs Section ---
        React.createElement(Text, { style: styles.header }, "Recent Activity"),
        logsList.length === 0 ?
            React.createElement(Text, { style: styles.emptyText }, "No activity recorded yet.") :
            logsList.map((log, index) => (
                React.createElement(View, { key: index, style: styles.logEntry },
                    React.createElement(Text, { style: styles.logTimestamp }, new Date(log.timestamp).toLocaleString()),
                    React.createElement(Text, { style: styles.logContent },
                        React.createElement(Text, { style: { fontWeight: 'bold' } }, `[${log.type}] `),
                        log.content
                    )
                )
            )),

        // --- Clear Logs Button ---
        logsList.length > 0 && React.createElement(TouchableOpacity, { onPress: clearLogs, style: styles.clearBtn },
            React.createElement(Text, { style: styles.clearBtnText }, "Clear Activity Logs")
        )
    );
}
