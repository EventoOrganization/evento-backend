import mongoose from "mongoose";
import { StripeAccount } from "../../models/stripeAccount";

export const softDeleteUserStripeAccount = async (
  userId: string,
  accountId: string,
): Promise<boolean> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  const updated = await StripeAccount.findOneAndUpdate(
    { userId, accountId, deletedAt: null },
    { deletedAt: new Date() },
    { new: true },
  );

  return !!updated;
};

export const hardDeleteUserStripeAccount = async (
  userId: string,
  accountId: string,
): Promise<boolean> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  const deleted = await StripeAccount.findOneAndDelete({
    userId,
    accountId,
  });

  return !!deleted;
};
