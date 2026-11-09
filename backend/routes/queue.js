const express = require("express");

const router = express.Router();

const {
  createQueue,
  getQueues,
  getQueue,
  listPublicQueues,
  getPublicQueue,
  updateQueue,
  deleteQueue,

  joinQueue,
  getQueueEntry,
  rejoinQueue,
  leaveQueue,

  getWaitingCustomers,
  getQueuePledges,
  createQueuePledge,
  getCurrentQueueService,

  callNext,
  startServing,
  completeCustomer,
  skipCustomer,
  holdCustomer,
  transferCustomer,

  assignStaff,
  removeStaff,
} = require("../controllers/queueController");
const pledgeController = require("../controllers/pledgeController");

const { passport } = require("../config/passport");

const authenticate = passport.authenticate("jwt", {
  session: false,
});

/**
 * ==========================================
 * CHURCH QUEUES
 * ==========================================
 */

/**
 * Create queue
 *
 * POST /api/queues
 */
router.post("/", authenticate, createQueue);

/**
 * Get all queues for current church
 *
 * GET /api/queues
 */
router.get("/", authenticate, getQueues);

/**
 * ==========================================
 * CUSTOMER QUEUE (public, no auth)
 * ==========================================
 *
 * These MUST be registered before the generic
 * GET /:queueId below — otherwise Express matches
 * "/public" against /:queueId first (queueId="public")
 * and it gets blocked by `authenticate`.
 */

/**
 * List open queues (public browse/discovery page)
 *
 * GET /api/queues/public
 */
router.get("/public", listPublicQueues);

/**
 * Get queue by slug or id (public landing page)
 *
 * GET /api/queues/public/:slugOrId
 */
router.get("/public/:slugOrId", getPublicQueue);

/**
 * Join queue
 *
 * POST /api/queues/:queueId/join
 */
router.post("/:queueId/join", joinQueue);

/**
 * Get customer queue status
 *
 * GET /api/queues/entry/:customerToken
 */
router.get("/entry/:customerToken", getQueueEntry);

/**
 * Rejoin after being skipped
 *
 * POST /api/queues/entry/:customerToken/rejoin
 */
router.post("/entry/:customerToken/rejoin", rejoinQueue);

/**
 * Leave queue
 *
 * POST /api/queues/entry/:customerToken/leave
 */
router.post("/entry/:customerToken/leave", leaveQueue);

/**
 * ==========================================
 * CHURCH QUEUES
 * ==========================================
 */

/**
 * Get one queue
 *
 * GET /api/queues/:queueId
 */
router.get("/:queueId", authenticate, getQueue);

/**
 * Update queue
 *
 * PATCH /api/queues/:queueId
 */
router.patch("/:queueId", authenticate, updateQueue);

/**
 * Delete queue
 *
 * DELETE /api/queues/:queueId
 */
router.delete("/:queueId", authenticate, deleteQueue);

/**
 * ==========================================
 * STAFF QUEUE OPERATIONS
 * ==========================================
 */

/**
 * Waiting customers
 *
 * GET /api/queues/:queueId/customers
 */
router.get("/:queueId/customers", authenticate, getWaitingCustomers);

router.get("/:queueId/pledges/search", authenticate, getQueuePledges);
router.post("/:queueId/pledges", authenticate, createQueuePledge);
router.patch(
  "/:queueId/pledges/:pledgeId/fulfill",
  authenticate,
  (req, res) => {
    req.body.queueId = req.params.queueId;
    return pledgeController.fulfillQueuePledge(req, res);
  },
);
router.get("/:queueId/current-service", authenticate, getCurrentQueueService);

/**
 * Call next
 *
 * POST /api/queues/:queueId/call-next
 */
router.post("/:queueId/call-next", authenticate, callNext);

/**
 * Start serving
 *
 * PATCH /api/queues/:queueId/entries/:entryId/serve
 */
router.patch("/:queueId/entries/:entryId/serve", authenticate, startServing);

/**
 * Complete
 *
 * PATCH /api/queues/:queueId/entries/:entryId/complete
 */
router.patch(
  "/:queueId/entries/:entryId/complete",
  authenticate,
  completeCustomer,
);

/**
 * Skip
 *
 * PATCH /api/queues/:queueId/entries/:entryId/skip
 */
router.patch("/:queueId/entries/:entryId/skip", authenticate, skipCustomer);

router.patch("/:queueId/entries/:entryId/hold", authenticate, holdCustomer);

/**
 * Transfer a customer to another queue/booth
 *
 * PATCH /api/queues/:queueId/entries/:entryId/transfer
 */
router.patch(
  "/:queueId/entries/:entryId/transfer",
  authenticate,
  transferCustomer,
);

/**
 * ==========================================
 * STAFF ASSIGNMENTS
 * ==========================================
 */

/**
 * Assign staff
 *
 * POST /api/queues/:queueId/staff
 */
router.post("/:queueId/staff", authenticate, assignStaff);

/**
 * Remove staff
 *
 * DELETE /api/queues/:queueId/staff/:userId
 */
router.delete("/:queueId/staff/:userId", authenticate, removeStaff);

module.exports = router;
