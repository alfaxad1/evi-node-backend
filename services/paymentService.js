const {
  amountProcessor,
  parseNarration,
  extractPhoneNumber,
  calculateArrears,
  dueDateUpdater,
} = require("../utility/loanUtils");
const { updateLoanStatus } = require("./loanService");

const processPayment = async (paymentData, connection) => {
  const { phoneNumber, mpesaCode, paidDate } = paymentData;
  const { paymentName } = parseNarration(paymentData.Narration);

  const [loans] = await connection.query(
    `SELECT l.* 
     FROM loans l
     JOIN customers c ON c.id = l.customer_id
     WHERE l.status IN ('active', 'partially_paid', 'defaulted')
     AND c.phone = ?
     ORDER BY l.id DESC 
     LIMIT 1`,
    [phoneNumber]
  );

  if (loans.length > 0) {
    await handleLoanRepayment(loans[0], paymentData, connection, {
      mpesaCode,
      phoneNumber,
      paymentName,
      paidDate,
    });
  } else {
    await handlePendingRepayment(paymentData, connection, {
      mpesaCode,
      phoneNumber,
      paymentName,
      paidDate,
    });
  }
};

const handleLoanRepayment = async (loan, paymentData, connection, metadata) => {
  const { mpesaCode, phoneNumber, paymentName, paidDate } = metadata;

  const actualAmount = amountProcessor(paymentData.Amount);
  const prevDueDate = new Date(loan.due_date);
  const nextDueDate = dueDateUpdater(prevDueDate, loan.installment_type);
  const newArrears = calculateArrears(
    loan.arrears,
    loan.installment_amount,
    actualAmount
  );

  await connection.query(
    `UPDATE loans 
     SET arrears = ?, due_date = ? 
     WHERE id = ?`,
    [newArrears, nextDueDate, loan.id]
  );

  await connection.query(
    `INSERT INTO repayments 
       (loan_id, branch_id, amount, due_date, paid_date, status, mpesa_code, phone_number, payment_name, created_by, created_at) 
     VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, NOW())`,
    [
      loan.id,
      loan.branch_id,
      actualAmount,
      nextDueDate,
      paidDate,
      mpesaCode,
      phoneNumber,
      paymentName,
      loan.officer_id,
    ]
  );

  if (mpesaCode) {
    await connection.query(
      `INSERT INTO mpesa_transactions 
         (customer_id, loan_id, branch_id, amount, type, mpesa_code, status, initiated_by, created_at) 
       VALUES (?, ?, ?, ?, 'repayment', ?, 'completed', ?, ?)`,
      [
        loan.customer_id,
        loan.id,
        loan.branch_id,
        actualAmount,
        mpesaCode,
        loan.officer_id,
        paidDate,
      ]
    );
  }

  await updateLoanStatus(loan.id, connection);
};

const handlePendingRepayment = async (paymentData, connection, metadata) => {
  const { mpesaCode, phoneNumber, paymentName, paidDate } = metadata;
  const amount = amountProcessor(paymentData.Amount);

  const [repaymentResult] = await connection.query(
    `INSERT INTO repayments 
       (loan_id, amount, due_date, paid_date, status, mpesa_code, phone_number, payment_name, created_by, created_at) 
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW())`,
    [null, amount, null, paidDate, mpesaCode, phoneNumber, paymentName, null]
  );

  const repaymentId = repaymentResult.insertId;

  await connection.query(
    `INSERT INTO mpesa_transactions 
       (repayment_id, amount, type, mpesa_code, status, created_at)
      VALUES (?, ?,'repayment', ?, 'completed', ?)`,
    [repaymentId, amount, mpesaCode, new Date()]
  );
};

module.exports = {
  processPayment,
  handleLoanRepayment,
  handlePendingRepayment,
};
