const { amountProcessor, dueDateUpdater, calculateArrears } = require("../utility/loanUtils");

const checkLoanDefaults = async (connection) => {
  try {
    const [defaultedLoans] = await connection.query(`
      SELECT 
        l.id, 
        l.total_amount, 
        l.remaining_balance, 
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name
      FROM loans l
      JOIN customers c ON l.customer_id = c.id 
      WHERE status IN ('active', 'partially_paid') 
      AND expected_completion_date < CURDATE()
    `);

    for (const loan of defaultedLoans) {
      await connection.query(
        `UPDATE loans 
         SET status = 'defaulted', 
             default_date = NOW() 
         WHERE id = ?`,
        [loan.id]
      );
    }

    return defaultedLoans;
  } catch (error) {
    console.error("Error checking loan defaults:", error);
    throw error;
  }
};

const updateLoanStatus = async (loanId, connection) => {
  try {
    const [loan] = await connection.query("SELECT * FROM loans WHERE id = ?", [loanId]);

    if (loan.length === 0) {
      throw new Error("Loan not found");
    }

    const { total_amount, arrears } = loan[0];

    const [installments] = await connection.query(
      "SELECT IFNULL(SUM(amount), 0) as installments_sum FROM repayments WHERE loan_id = ? AND status = 'paid'",
      [loanId]
    );

    const installmentsSum = installments[0].installments_sum;

    const [balance] = await connection.query(
      `SELECT l.total_amount - (
        SELECT COALESCE(SUM(r.amount), 0) 
        FROM repayments r 
        WHERE r.loan_id = ? AND status = 'paid'
      ) AS remaining_balance
      FROM loans l 
      WHERE l.id = ?`,
      [loanId, loanId]
    );

    const remainingBalance = balance[0].remaining_balance;

    let newStatus = loan[0].status;
    let newArrears = arrears;

    if (remainingBalance <= 0) {
      newStatus = "paid";
      newArrears = 0;
    } else if (remainingBalance < total_amount && remainingBalance > 0) {
      newStatus = "partially_paid";
    } else {
      newStatus = "active";
    }

    await connection.query(
      `UPDATE loans 
       SET installments_sum = ?, 
           remaining_balance = ?, 
           arrears = ?, 
           status = ? 
       WHERE id = ?`,
      [installmentsSum, remainingBalance, newArrears, newStatus, loanId]
    );
  } catch (error) {
    console.error("Error updating loan status:", error);
    throw error;
  }
};

const checkMissedPayments = async (connection) => {
  try {
    const [missedLoans] = await connection.query(`
      SELECT 
        id, 
        installment_amount, 
        installment_type, 
        due_date, 
        IFNULL(arrears, 0) AS arrears
      FROM loans 
      WHERE status IN ('active', 'partially_paid') 
      AND due_date < CURDATE()
    `);

    for (const loan of missedLoans) {
      const { id, installment_amount, installment_type, due_date, arrears } = loan;
      
      const numericArrears = parseFloat(arrears) || 0;
      const numericInstallmentAmount = parseFloat(installment_amount) || 0;
      const newArrears = numericArrears + numericInstallmentAmount;

      const prevDueDate = new Date(due_date);
      const nextDueDate = dueDateUpdater(prevDueDate, installment_type);

      await connection.query(
        `UPDATE loans 
         SET arrears = ?, 
             due_date = ? 
         WHERE id = ?`,
        [newArrears, nextDueDate, id]
      );
    }
  } catch (error) {
    console.error("Error checking missed payments:", error);
    throw error;
  }
};

module.exports = {
  checkLoanDefaults,
  updateLoanStatus,
  checkMissedPayments
};