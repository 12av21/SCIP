import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Bell, Mail, Globe, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

// Define an interface for user settings
interface UserSettings {
  receiveEmailNotifications: boolean;
  receivePushNotifications: boolean;
  language: string;
  timezone: string;
}

export default function Settings() {
  const { user, token, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (user && token) {
      fetchSettings();
    }
  }, [user, token]);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const response = await api.get('/user/settings');
      setSettings(response.data);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to load settings.";
      toast.error(message);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, type, checked, value } = target;
    setSettings(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !token) return;

    setIsSubmitting(true);
    try {
      await api.patch('/user/settings', settings);
      toast.success("Settings updated successfully!");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to save settings.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loadingSettings || !settings) {
    return <div className="loading-state">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-600/10 rounded-2xl">
          <SettingsIcon className="text-blue-600" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-display">Settings</h1>
          <p className="opacity-60 text-sm">Manage your application preferences.</p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="stamp-card p-8 space-y-6 mb-8">
        <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
        <div className="flex items-center justify-between">
          <label htmlFor="email-notifications" className="flex items-center gap-3 cursor-pointer">
            <Bell size={20} className="text-slate-500" />
            <span>Receive Email Notifications</span>
          </label>
          <input
            type="checkbox"
            id="email-notifications"
            name="receiveEmailNotifications"
            checked={settings.receiveEmailNotifications}
            onChange={handleSettingChange}
            className="toggle-switch"
          />
        </div>
        {/* Add more notification settings here */}

        <div className="pt-4 border-t border-ink/5 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-ink text-paper px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save Changes"} <Save size={18} />
          </button>
        </div>
      </form>

      {/* Add other settings sections like Language, Timezone, etc. */}
      <div className="stamp-card p-8 space-y-6">
        <h2 className="text-xl font-bold text-slate-900">General</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="language" className="flex items-center gap-3">
              <Globe size={20} className="text-slate-500" />
              <span>Language</span>
            </label>
            <select
              id="language"
              name="language"
              value={settings.language}
              onChange={handleSettingChange}
              className="field w-40"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              {/* Add more languages */}
            </select>
          </div>
          {/* Add timezone or other general settings */}
        </div>
      </div>

      <div className="mt-8 text-center text-[10px] uppercase tracking-widest opacity-30 font-mono">
        Secured by SCIP Neural Protocol
      </div>
    </div>
  );
}