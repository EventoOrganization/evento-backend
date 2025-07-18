export type StripeUpdatePayload = {
  accountId?: string;
  country?: string;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  lastSync?: Date;
};
