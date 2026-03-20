import { xenditRequest } from "./client";

interface XenditDisbursementResponse {
  id: string;
  status: string;
  amount: number;
}

export async function createDisbursement(params: {
  payoutId: string;
  amountIdr: number;
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
  description: string;
}): Promise<{
  xenditDisbursementId: string;
}> {
  const disbursement =
    await xenditRequest<XenditDisbursementResponse>("/disbursements", {
      body: {
        external_id: params.payoutId,
        amount: params.amountIdr,
        bank_code: params.bankCode,
        account_holder_name: params.accountHolderName,
        account_number: params.accountNumber,
        description: params.description,
      },
    });

  return {
    xenditDisbursementId: disbursement.id,
  };
}
