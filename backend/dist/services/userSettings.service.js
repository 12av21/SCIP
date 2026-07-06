"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSettings = getUserSettings;
exports.updateUserSettings = updateUserSettings;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const FILE_PATH = path_1.default.join(process.cwd(), "data", "userSettings.json");
const DEFAULT_SETTINGS = {
    receiveEmailNotifications: true,
    receivePushNotifications: true,
    language: "en",
    timezone: "UTC",
};
async function getUserSettingsData() {
    try {
        const data = await promises_1.default.readFile(FILE_PATH, "utf-8");
        return JSON.parse(data);
    }
    catch {
        return {};
    }
}
async function saveUserSettingsData(data) {
    await promises_1.default.writeFile(FILE_PATH, JSON.stringify(data, null, 2));
}
async function getUserSettings(userId) {
    const allSettings = await getUserSettingsData();
    return allSettings[userId] || DEFAULT_SETTINGS;
}
async function updateUserSettings(userId, updates) {
    const allSettings = await getUserSettingsData();
    const currentSettings = allSettings[userId] || DEFAULT_SETTINGS;
    const updatedSettings = {
        ...currentSettings,
        ...updates,
    };
    allSettings[userId] = updatedSettings;
    await saveUserSettingsData(allSettings);
    return updatedSettings;
}
