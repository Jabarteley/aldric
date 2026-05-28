import { DEFAULT_ALDRIC_PROMPT, getAldricPrompt, resetAldricPrompt, saveAldricPrompt } from "../services/promptSettings.service.js";

export async function getPrompt(req, res, next) {
  try {
    const prompt = await getAldricPrompt();
    res.json({ prompt, defaultPrompt: DEFAULT_ALDRIC_PROMPT });
  } catch (error) {
    next(error);
  }
}

export async function updatePrompt(req, res, next) {
  try {
    const setting = await saveAldricPrompt(req.body?.prompt);
    res.json(setting);
  } catch (error) {
    next(error);
  }
}

export async function restorePrompt(req, res, next) {
  try {
    const setting = await resetAldricPrompt();
    res.json(setting);
  } catch (error) {
    next(error);
  }
}
