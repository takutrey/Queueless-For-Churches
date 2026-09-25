const express = require("express");
const { passport, requireChurch } = require("../config/passport");
const pledgeRateLimit = require("../middleware/pledgeRateLimit");
const controller = require("../controllers/pledgeController");

const router = express.Router();
const authenticate = passport.authenticate("jwt", { session: false });

router.get("/public/:slugOrCode", controller.getPublicCampaign);
router.get("/public", controller.listPublicCampaigns);
router.post(
  "/public/:slugOrCode/pledges",
  pledgeRateLimit,
  controller.createPublicPledge,
);

router.use(authenticate, requireChurch);
router.get("/", controller.listCampaigns);
router.post("/", controller.createCampaign);
router.get("/pledges", controller.listChurchPledges);
router.get("/:campaignId", controller.getCampaign);
router.patch("/:campaignId", controller.updateCampaign);
router.get("/:campaignId/pledges", controller.listPledges);
router.get("/:campaignId/items", controller.listCampaignItems);
router.post("/:campaignId/items", controller.createCampaignItem);
router.patch("/:campaignId/items/:itemId", controller.updateCampaignItem);
router.delete("/:campaignId/items/:itemId", controller.deleteCampaignItem);

module.exports = router;
