import { addManualFundamentalEvent, listFundamentalEvents, syncFundamentalEvents } from "../services/fundamentals.service.js";

export async function getFundamentalEvents(req, res, next) {
  try {
    const events = await listFundamentalEvents({
      from: req.query.from,
      to: req.query.to,
      limit: Number(req.query.limit || 100)
    });
    res.json({ events });
  } catch (error) {
    next(error);
  }
}

export async function createFundamentalEvent(req, res, next) {
  try {
    const event = await addManualFundamentalEvent(req.body);
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
}

export async function syncFundamentals(req, res, next) {
  try {
    const events = await syncFundamentalEvents({
      from: req.body?.from,
      to: req.body?.to
    });
    res.json({ ok: true, count: events.length, events });
  } catch (error) {
    next(error);
  }
}
