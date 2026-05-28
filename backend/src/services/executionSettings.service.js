import { getSetting, upsertSetting } from "../models/AppSetting.js";

const EXECUTION_SETTINGS_ID = "mt4ExecutionSettings";

export async function getExecutionSettings() {
  const setting = await getSetting(EXECUTION_SETTINGS_ID);
  return {
    globalAutoEnabled: setting?.globalAutoEnabled === true,
    globalKillSwitch: setting?.globalKillSwitch === true,
    updatedAt: setting?.updatedAt
  };
}

export async function saveExecutionSettings(input = {}) {
  return upsertSetting(EXECUTION_SETTINGS_ID, {
    globalAutoEnabled: input.globalAutoEnabled === true,
    globalKillSwitch: input.globalKillSwitch === true
  });
}
