#!/usr/bin/env node

/**
 * 🔍 Stripe Configuration Checker
 *
 * This script checks if all required Stripe environment variables are set
 * and tests the connection to Stripe API.
 */

require("dotenv").config();
const Stripe = require("stripe");

console.log("🔍 Checking Stripe Configuration...\n");

// Check environment variables
const requiredVars = ["STRIPE_SECRET", "STRIPE_WEBHOOK_SECRET", "CLIENT_URL"];

const missingVars = [];
const presentVars = [];

requiredVars.forEach((varName) => {
  if (process.env[varName]) {
    presentVars.push(varName);
    console.log(
      `✅ ${varName}: ${
        varName.includes("SECRET") ? "***configured***" : process.env[varName]
      }`,
    );
  } else {
    missingVars.push(varName);
    console.log(`❌ ${varName}: MISSING`);
  }
});

console.log("\n" + "=".repeat(50));

if (missingVars.length > 0) {
  console.log(
    `\n❌ Missing required environment variables: ${missingVars.join(", ")}`,
  );
  console.log("Please set these variables in your .env file or environment.");
  process.exit(1);
}

// Test Stripe connection
console.log("\n🔗 Testing Stripe API connection...");

async function testStripeConnection() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET, {
      apiVersion: "2025-07-30.basil",
    });

    // Test API connection by fetching account details
    const account = await stripe.accounts.retrieve();

    console.log("✅ Stripe API connection successful!");
    console.log(`📊 Account ID: ${account.id}`);
    console.log(`📧 Account Email: ${account.email}`);
    console.log(`🌍 Country: ${account.country}`);
    console.log(`💳 Charges Enabled: ${account.charges_enabled}`);
    console.log(`💰 Payouts Enabled: ${account.payouts_enabled}`);

    // Test webhook endpoint
    console.log("\n🔗 Testing webhook endpoint...");

    const webhookUrl = `${
      process.env.CLIENT_URL?.replace("3000", "8080") || "http://localhost:8080"
    }/stripe-webhook/check`;
    console.log(`🌐 Webhook check URL: ${webhookUrl}`);

    // Note: This would require a HTTP client to actually test the endpoint
    console.log(
      "ℹ️  To test webhook endpoint, visit the URL above in your browser",
    );
    console.log("ℹ️  Or use: curl " + webhookUrl);
  } catch (error) {
    console.log("❌ Stripe API connection failed!");
    console.log("Error:", error.message);

    if (error.message.includes("Invalid API key")) {
      console.log("\n💡 Make sure your STRIPE_SECRET is correct");
      console.log("💡 For testing, use: sk_test_...");
      console.log("💡 For production, use: sk_live_...");
    }

    process.exit(1);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Stripe configuration check completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("1. Ensure your webhook endpoint is publicly accessible");
  console.log("2. Configure webhook in Stripe Dashboard");
  console.log("3. Test webhook delivery");
  console.log("\n🔗 Stripe Dashboard: https://dashboard.stripe.com/webhooks");
}

// Run the test
testStripeConnection().catch(console.error);
