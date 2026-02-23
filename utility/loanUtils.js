const amountProcessor = (amount) => {
  const actualAmount = parseFloat(amount);
  if (actualAmount <= 200) {
    return actualAmount;
  }
  return Math.round(actualAmount + (actualAmount * 0.55) / 100);
};

const dueDateUpdater = (prevDate, installmentType) => {
  const nextDueDate = new Date(prevDate);
  
  if (installmentType === "daily") {
    nextDueDate.setDate(nextDueDate.getDate() + 1);
  } else if (installmentType === "weekly") {
    nextDueDate.setDate(nextDueDate.getDate() + 7);
  }
  
  return nextDueDate;
};

const calculateArrears = (currentArrears, installmentAmount, actualAmount) => {
  const numericArrears = parseFloat(currentArrears) || 0;
  const numericInstallmentAmount = parseFloat(installmentAmount) || 0;
  const numericActualAmount = parseFloat(actualAmount) || 0;
  
  if (numericActualAmount < numericInstallmentAmount) {
    return numericArrears + (numericInstallmentAmount - numericActualAmount);
  }
  
  if (numericActualAmount > numericInstallmentAmount) {
    return Math.max(0, numericArrears - (numericActualAmount - numericInstallmentAmount));
  }
  
  return numericArrears;
};

const parseNarration = (narration) => {
  const parts = narration.split("~");
  return {
    mpesaCode: parts[0] || "",
    phoneNumber: parts[2] || "",
    paymentName: parts[3] || "",
  };
};

const extractPhoneNumber = (narration) => {
  const phoneMatch = narration.match(/2547\d{8}/);
  return phoneMatch ? phoneMatch[0] : "Not found";
};

module.exports = {
  amountProcessor,
  dueDateUpdater,
  calculateArrears,
  parseNarration,
  extractPhoneNumber
};