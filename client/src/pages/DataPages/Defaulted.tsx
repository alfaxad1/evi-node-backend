import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../src/components/ui/table";
import withAuth from "../../utils/withAuth";
import { ClipLoader } from "react-spinners";
import Button from "../../components/ui/button/Button";
import { Repeat } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";

interface DefaultedLoan {
  id: number;
  customer_name: string;
  national_id: string;
  phone: string;
  loan_product: string;
  principal: number;
  total_interest: number;
  total_amount: number;
  remaining_balance: number;
  due_date: string;
  expected_completion_date: string;
  default_date: string;
  days_overdue: number;
}

const Defaulted = () => {
  const apiUrl = import.meta.env.VITE_API_URL;

  const [defaultedLoans, setDefaultedLoans] = useState<DefaultedLoan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [pendingLoanId, setPendingLoanId] = useState<number | null>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const role = JSON.parse(localStorage.getItem("role") || "''");
  const officerId = localStorage.getItem("userId") || "";

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchDefaultedLoans = useCallback(
    async (role: string, officerId: string, page: number): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `${apiUrl}/api/loans/loan-details/defaulted?role=${role}&officerId=${officerId}&page=${page}`
        );
        setDefaultedLoans(response.data.data);
        setTotalPages(response.data.meta.totalPages);
      } catch (error) {
        console.error("Error fetching defaulted loans:", error);
        setError("Failed to fetch defaulted loans");
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  useEffect(() => {
    fetchDefaultedLoans(role, officerId, page);
  }, [role, officerId, page, fetchDefaultedLoans]);

  const handleRolloverClick = (loanId: number) => {
    setPendingLoanId(loanId);
    setTotalAmount(""); // reset
    openModal();
  };

  const handleRolloverSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pendingLoanId === null) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("You are not authorized");
        return;
      }

      await axios.post(
        `${apiUrl}/api/loans/roll-over/${pendingLoanId}`,
        { total_amount: Number(totalAmount) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      fetchDefaultedLoans(role, officerId, page);
      toast.success("Loan rolled over successfully");
      closeModal();
      setPendingLoanId(null);
      setTotalAmount("");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Failed to roll over loan.");
      } else {
        toast.error("An unexpected error occurred.");
      }
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
        <ClipLoader color="#36D7B7" size={50} speedMultiplier={0.8} />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <ToastContainer position="bottom-right" />
      <div className="max-w-screen-lg mx-auto">
        <div className="w-full overflow-x-auto">
          {defaultedLoans && defaultedLoans.length === 0 ? (
            <div className="text-center py-4 text-blue-500">
              No defaulted loans.
            </div>
          ) : (
            <Table>
              {/* Table Header */}
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-blue-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Customer Name
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-blue-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Phone
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-blue-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Principal
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-blue-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Total Amount
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-blue-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Balance
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-blue-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Due Date
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-blue-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Default Date
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-blue-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Days Overdue
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-blue-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              {/* Table Body */}
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {defaultedLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      {loan.customer_name}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {loan.phone}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {loan.principal.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {loan.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {(
                        loan.remaining_balance || loan.total_amount
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {loan.expected_completion_date != null
                        ? loan.expected_completion_date.slice(0, 10)
                        : loan.expected_completion_date}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {loan.default_date != null
                        ? loan.default_date.slice(0, 10)
                        : loan.default_date}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-center text-theme-sm dark:text-gray-400">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          loan.days_overdue > 30
                            ? "bg-red-100 text-red-800"
                            : loan.days_overdue > 7
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {loan.days_overdue} days
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRolloverClick(loan.id)}
                          className="bg-blue-500 text-white p-2 rounded-md w-10 flex items-center justify-center hover:bg-blue-600 transition-colors"
                          title="Roll Over"
                        >
                          <Repeat size={18} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-4">
          <Button
            size="sm"
            className="hover:bg-gray-200 m-4"
            variant="outline"
            onClick={handlePrevPage}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            className="hover:bg-gray-200 m-4"
            variant="outline"
            onClick={handleNextPage}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[400px] m-4">
        <div className="no-scrollbar relative w-auto max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Roll Over Defaulted Loan
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter the new total amount for this loan rollover
            </p>
          </div>
          <form className="flex flex-col" onSubmit={handleRolloverSave}>
            <div className="custom-scrollbar overflow-y-auto px-2 pb-3">
              <div className="mt-7">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-1">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Total Amount</Label>
                    <Input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="Enter new loan amount"
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-center">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={closeModal}
              >
                Cancel
              </Button>
              <Button size="sm" type="submit">
                Roll Over Loan
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

const AuthenticatedDefaulted = withAuth(Defaulted);
export { AuthenticatedDefaulted as Defaulted };
