import { xenditRequest } from "./client";

interface XenditInvoiceResponse {
  id: string;
  invoice_url: string;
  external_id: string;
  status: string;
}

export async function createCharge(params: {
  bookingId: string;
  amountIdr: number;
  description: string;
  renterEmail: string;
  renterName: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
}): Promise<{
  checkoutUrl: string;
  xenditPaymentId: string;
}> {
  const invoice = await xenditRequest<XenditInvoiceResponse>("/v2/invoices", {
    body: {
      external_id: params.bookingId,
      amount: params.amountIdr,
      currency: "IDR",
      description: params.description,
      payer_email: params.renterEmail,
      customer: {
        given_names: params.renterName,
        email: params.renterEmail,
      },
      payment_methods: ["CREDIT_CARD"],
      success_redirect_url: params.successRedirectUrl,
      failure_redirect_url: params.failureRedirectUrl,
    },
  });

  return {
    checkoutUrl: invoice.invoice_url,
    xenditPaymentId: invoice.id,
  };
}
