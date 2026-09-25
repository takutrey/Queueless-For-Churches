const attempts = new Map();

const pledgeRateLimit = (req, res, next) => {
  const key = `${req.ip}:${req.params.slug || req.params.campaignId || "campaign"}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 10;
  const recent = (attempts.get(key) || []).filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (recent.length >= maxAttempts) {
    return res
      .status(429)
      .json({ message: "Too many pledge attempts. Please try again shortly." });
  }

  recent.push(now);
  attempts.set(key, recent);
  return next();
};

module.exports = pledgeRateLimit;
