import { xenditRequest } from "./client";

interface XenditRefundResponse {
  id: string;
  status: string;
  amount: number;
}

export async function createRefund(params: {
  bookingId: string;
  originalXenditPaymentId: string;
  amountIdr: number;
  reason: string;
}): Promise<{
  xenditRefundId: string;
}> {
  const refund = await xenditRequest<XenditRefundResponse>("/refunds", {
    body: {
      invoice_id: params.originalXenditPaymentId,
      amount: params.amountIdr,
      reason: params.reason,
      reference_id: `refund-${params.bookingId}`,
    },
  });

  return {
    xenditRefundId: refund.id,
  };
}
