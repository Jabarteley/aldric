import { deleteSignalById, getSignalById, getSignals } from "../models/Signal.js";

export async function listSignals(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const signals = await getSignals(limit);
    res.json(signals);
  } catch (error) {
    next(error);
  }
}

export async function showSignal(req, res, next) {
  try {
    const signal = await getSignalById(req.params.id);
    if (!signal) return res.status(404).json({ message: "Signal not found." });
    return res.json(signal);
  } catch (error) {
    return next(error);
  }
}

export async function removeSignal(req, res, next) {
  try {
    await deleteSignalById(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
