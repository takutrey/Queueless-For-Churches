const rateLimit = require("express-rate-limit");

const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password change attempts per hour
  message: {
    message: "Too many password change attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = passwordChangeLimiter;
