import type { SQLiteDatabase } from 'expo-sqlite';

export type MortgageApplicant = {
  propertyPrice: number;
  equityAmount: number;
  monthlyIncome: number;
  collateralValue: number;
  incomeSource: 'recent_salary_transactions' | 'user_entered';
  incomeMonthsWithSalary: number;
};

export type MortgageHistoricalCase = {
  caseId: string;
  outcome: 'approved' | 'rejected';
  rejectionReason: string | null;
  propertyPrice: number;
  requestedLoan: number;
  equityAmount: number;
  collateralValue: number;
  requiredMonthlyIncome: number;
  loanToValue: number;
  existingLoanExpenseEntries: number;
  existingLoanExpenseRecordedTotal: number;
  additionalCollateralRequested: boolean;
};

export type MortgagePredictionContext = {
  applicant: MortgageApplicant & { requestedLoan: number; loanToValue: number; equityRatio: number };
  historicalSample: { totalCases: number; approvedCases: number; rejectedCases: number };
  rejectionReasons: { reason: string; cases: number }[];
  historicalCases: MortgageHistoricalCase[];
};

type OutcomeTotals = { total_cases: number; approved_cases: number; rejected_cases: number };
type RejectionRow = { rejection_reason: string | null; cases: number };
type HistoricalCaseRow = {
  mortgage_customer_id: string;
  final_decision: 'approved' | 'rejected';
  rejection_reason: string | null;
  final_property_price_eur: number;
  final_requested_loan_eur: number;
  final_equity_amount_eur: number;
  final_collateral_value_eur: number;
  required_monthly_income_eur: number;
  lfinal_loan_to_value: number;
};
type NegotiationSignalRow = {
  mortgage_customer_id: string;
  existing_loan_expense_entries: number;
  existing_loan_expense_recorded_total: number;
  additional_collateral_requested: number;
};

export async function getMortgagePredictionContext(
  decisionsDb: SQLiteDatabase,
  historyDb: SQLiteDatabase,
  applicant: MortgageApplicant,
): Promise<MortgagePredictionContext> {
  const requestedLoan = applicant.propertyPrice - applicant.equityAmount;
  const loanToValue = requestedLoan / applicant.propertyPrice;
  const equityRatio = applicant.equityAmount / applicant.propertyPrice;

  const totals = await decisionsDb.getFirstAsync<OutcomeTotals>(`
    SELECT
      COUNT(*) AS total_cases,
      SUM(CASE WHEN final_decision = 'approved' THEN 1 ELSE 0 END) AS approved_cases,
      SUM(CASE WHEN final_decision = 'rejected' THEN 1 ELSE 0 END) AS rejected_cases
    FROM mtg_tx_customer_link_and_final_mtg_infio
    WHERE final_decision IN ('approved', 'rejected')
  `);
  const rejectionReasons = await decisionsDb.getAllAsync<RejectionRow>(`
    SELECT rejection_reason, COUNT(*) AS cases
    FROM mtg_tx_customer_link_and_final_mtg_infio
    WHERE final_decision = 'rejected'
    GROUP BY rejection_reason
    ORDER BY cases DESC
  `);
  const caseRows = await decisionsDb.getAllAsync<HistoricalCaseRow>(`
    SELECT mortgage_customer_id, final_decision, rejection_reason,
      final_property_price_eur, final_requested_loan_eur,
      final_equity_amount_eur, final_collateral_value_eur,
      required_monthly_income_eur, lfinal_loan_to_value
    FROM mtg_tx_customer_link_and_final_mtg_infio
    WHERE final_decision IN ('approved', 'rejected')
      AND final_property_price_eur > 0 AND final_requested_loan_eur > 0
    ORDER BY mortgage_customer_id
  `);

  const mortgageIds = caseRows.map((row) => row.mortgage_customer_id);
  const historyRows = mortgageIds.length > 0
    ? await historyDb.getAllAsync<NegotiationSignalRow>(`
        SELECT mortgage_customer_id,
          SUM(CASE WHEN expense_type = 'existing_loan' THEN 1 ELSE 0 END) AS existing_loan_expense_entries,
          SUM(CASE WHEN expense_type = 'existing_loan' THEN COALESCE(expense_amount, 0) ELSE 0 END) AS existing_loan_expense_recorded_total,
          MAX(CASE WHEN event_type = 'additional_collateral_requested' THEN 1 ELSE 0 END) AS additional_collateral_requested
        FROM mtg_negotiation_history
        WHERE mortgage_customer_id IN (${mortgageIds.map(() => '?').join(', ')})
        GROUP BY mortgage_customer_id
      `, ...mortgageIds)
    : [];
  const historyById = new Map(historyRows.map((row) => [row.mortgage_customer_id, row]));

  return {
    applicant: { ...applicant, requestedLoan, loanToValue, equityRatio },
    historicalSample: {
      totalCases: totals?.total_cases ?? 0,
      approvedCases: totals?.approved_cases ?? 0,
      rejectedCases: totals?.rejected_cases ?? 0,
    },
    rejectionReasons: rejectionReasons.map((row) => ({
      reason: row.rejection_reason || 'unspecified',
      cases: row.cases,
    })),
    historicalCases: caseRows.map((row, index) => {
      const history = historyById.get(row.mortgage_customer_id);
      return {
        caseId: `case-${index + 1}`,
        outcome: row.final_decision,
        rejectionReason: row.rejection_reason,
        propertyPrice: row.final_property_price_eur,
        requestedLoan: row.final_requested_loan_eur,
        equityAmount: row.final_equity_amount_eur,
        collateralValue: row.final_collateral_value_eur,
        requiredMonthlyIncome: row.required_monthly_income_eur,
        loanToValue: row.lfinal_loan_to_value,
        existingLoanExpenseEntries: history?.existing_loan_expense_entries ?? 0,
        existingLoanExpenseRecordedTotal: history?.existing_loan_expense_recorded_total ?? 0,
        additionalCollateralRequested: Boolean(history?.additional_collateral_requested),
      };
    }),
  };
}
