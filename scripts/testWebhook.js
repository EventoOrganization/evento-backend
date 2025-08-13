#!/usr/bin/env node

/**
 * 🧪 Webhook Endpoint Tester
 *
 * This script tests the webhook endpoint to ensure it's accessible
 * and properly configured.
 */

const https = require("https");
const http = require("http");

const args = process.argv.slice(2);
const baseUrl = args[0] || "http://localhost:8080";

console.log("🧪 Testing Webhook Endpoint...\n");

// Test 1: Health check endpoint
async function testHealthCheck() {
  console.log("1️⃣ Testing health check endpoint...");

  try {
    const response = await makeRequest(`${baseUrl}/healthz`);
    console.log(`✅ Health check: ${response.status} - ${response.data}`);
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }
}

// Test 2: Webhook check endpoint
async function testWebhookCheck() {
  console.log("\n2️⃣ Testing webhook check endpoint...");

  try {
    const response = await makeRequest(`${baseUrl}/stripe-webhook/check`);
    console.log(`✅ Webhook check: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`❌ Webhook check failed: ${error.message}`);
  }
}

// Test 3: Webhook endpoint (POST)
async function testWebhookEndpoint() {
  console.log("\n3️⃣ Testing webhook endpoint (POST)...");

  const testPayload = {
    id: "evt_test_webhook",
    object: "event",
    type: "account.updated",
    data: {
      object: {
        id: "acct_test",
        object: "account",
        email: "test@example.com",
        country: "US",
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: false,
      },
    },
  };

  try {
    const response = await makeRequest(`${baseUrl}/stripe-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "test_signature",
      },
      data: JSON.stringify(testPayload),
    });
    console.log(`✅ Webhook POST: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`❌ Webhook POST failed: ${error.message}`);
    if (error.message.includes("Webhook signature failed")) {
      console.log(
        "ℹ️  This is expected - the signature is invalid for testing",
      );
    }
  }
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = client.request(requestOptions, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (options.data) {
      req.write(options.data);
    }

    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log(`🌐 Testing endpoints at: ${baseUrl}\n`);

  await testHealthCheck();
  await testWebhookCheck();
  await testWebhookEndpoint();

  console.log("\n" + "=".repeat(50));
  console.log("✅ Webhook endpoint testing completed!");
  console.log("\n📋 Next steps:");
  console.log("1. Ensure all endpoints return 200 status");
  console.log("2. Check that webhook secret is configured");
  console.log("3. Test with real Stripe webhook events");
  console.log("\n🔗 Stripe Dashboard: https://dashboard.stripe.com/webhooks");
}

// Run the tests
runTests().catch(console.error);
