export function requireMt4Secret(req, res, next) {
  const expected = process.env.MT4_BRIDGE_SECRET;
  if (!expected) return next();

  const provided = req.header("x-aldric-mt4-secret") || req.query.secret;
  if (provided !== expected) {
    return res.status(401).json({ message: "Invalid MT4 bridge secret." });
  }

  return next();
}
