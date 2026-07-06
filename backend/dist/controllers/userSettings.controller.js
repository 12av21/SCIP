"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
const userSettings_service_1 = require("../services/userSettings.service");
async function getSettings(req, res) {
    try {
        const authedUser = req.user;
        const settings = await (0, userSettings_service_1.getUserSettings)(authedUser.id);
        res.json(settings);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to load settings." });
    }
}
async function updateSettings(req, res) {
    try {
        const authedUser = req.user;
        const updatedSettings = await (0, userSettings_service_1.updateUserSettings)(authedUser.id, req.body);
        res.json(updatedSettings);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to save settings." });
    }
}
