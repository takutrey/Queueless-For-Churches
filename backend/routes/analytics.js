const express = require("express");
const { passport } = require("../config/passport");
const { getAnalytics } = require("../controllers/analyticsController");

const router = express.Router();

router.get(
  "/dashboard",
  passport.authenticate("jwt", { session: false }),
  getAnalytics,
);

module.exports = router;
