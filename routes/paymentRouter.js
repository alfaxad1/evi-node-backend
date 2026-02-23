const express = require("express");
const connection = require("../config/dbConnection");
const {
  amountProcessor,
  parseNarration,
  extractPhoneNumber,
} = require("../utility/loanUtils");
const { processPayment } = require("../services/paymentService");
const basicAuth = require("../middleware/auth");

const router = express.Router();
router.use(express.json());

router.post("/account-credit-notification", basicAuth, async (req, res) => {
  try {
    const { Narration, Amount, TransactionDate } = req.body;
    const { paymentName } = parseNarration(Narration);
    const processedAmount = amountProcessor(Amount);

    const isoDate = TransactionDate;
    const paidDate = isoDate.replace("T", " ");

    await connection.query(
      `INSERT INTO repayment_requests (time, data, customer_name, amount) VALUES (?, ?, ?, ?)`,
      [paidDate, JSON.stringify(req.body), paymentName, processedAmount]
    );

    if (!Narration) {
      return res.status(400).json({
        message: "Narration is missing from the payload",
      });
    }

    const phoneNumber = extractPhoneNumber(Narration);
    const mpesaCode = parseNarration(Narration).mpesaCode;

    req.body.phoneNumber = phoneNumber;
    req.body.mpesaCode = mpesaCode;
    req.body.paidDate = paidDate;

    await processPayment(req.body, connection);

    return res.status(200).json({
      MessageCode: "200",
      Message: "Successfully received data",
    });
  } catch (error) {
    console.error("Error handling callback:", error);
    return res.status(400).json({
      MessageCode: "400",
      Message: "Failed to process payment",
      Error: error.message,
    });
  }
});

module.exports = router;
