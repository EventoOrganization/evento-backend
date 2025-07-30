export type SoldTicketsType = {
  buyerId: string;
  stripePaymentIntent: string;
  quantity: number;
  purchasedAt: Date;
  _id: string;
};