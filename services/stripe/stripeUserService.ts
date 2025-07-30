import mongoose from "mongoose";
import { StripeAccount } from "../../models/stripeAccount";
import { StripeUpdatePayload } from "../../types/user/stripe";

export const updateUserStripeAccount = async (
  userId: string,
  country: string,
  update: StripeUpdatePayload,
): Promise<boolean> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  let stripeAccount = await StripeAccount.findOne({ userId, country });

  if (!stripeAccount) {
    stripeAccount = new StripeAccount({
      userId,
      country,
      ...update,
    });

    await stripeAccount.save();

    console.log("✅ Created new StripeAccount:", stripeAccount.accountId);
    return true;
  }

  Object.assign(stripeAccount, update, { lastSync: new Date() });
  await stripeAccount.save();

  console.log("✅ Updated StripeAccount:", stripeAccount.accountId);

  return true;
};
