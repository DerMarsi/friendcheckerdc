import { findByProps } from "./utils";

// Mimic React lookup since we don't have it at compile time
const React = findByProps("createElement", "useState", "useEffect");

// Find Discord UI components
const Forms = findByProps("FormSection", "FormRow") || {};
const { FormSection, FormRow, FormInput } = Forms;

export const Settings = ({ settings, refresh }: { settings: any, refresh: () => void }) => {
    const [userId, setUserId] = React.useState(settings.targetUserId || "");

    const handleSave = (val: string) => {
        setUserId(val);
        settings.targetUserId = val;
        // In a real plugin, you would call a save function here
        // e.g. storage.save()
        refresh();
    };

    return (
        React.createElement(FormSection, { title: "Target Configuration" },
            React.createElement(FormRow, {
                label: "Target User ID",
                subLabel: "The Discord User ID to track presence for.",
                control: React.createElement(FormInput, {
                    placeholder: "123456789...",
                    value: userId,
                    onChange: (v: any) => handleSave(v), // FormInput usually passes value directly
                    style: { width: "100%", fontFamily: "monospace" }
                })
            }),
            React.createElement(FormRow, {
                label: "Status",
                subLabel: `Currently tracking: ${userId || "None"}`,
            })
        )
    );
};
