import fs from "fs/promises";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "data", "userSettings.json");

const DEFAULT_SETTINGS = {
  receiveEmailNotifications: true,
  receivePushNotifications: true,
  language: "en",
  timezone: "UTC",
};

async function getUserSettingsData(): Promise<Record<string, any>> {
  try {
    const data = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveUserSettingsData(data: Record<string, any>) {
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2));
}

export async function getUserSettings(userId: string) {
  const allSettings = await getUserSettingsData();
  return allSettings[userId] || DEFAULT_SETTINGS;
}

export async function updateUserSettings(userId: string, updates: any) {
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
