#!/usr/bin/env node

/**
 * 🔍 Webhook Events Checker
 * 
 * This script checks which events are configured for your Stripe webhook
 * and helps identify why some events are not being received.
 */

require("dotenv").config();
const Stripe = require("stripe");

console.log("🔍 Checking Stripe Webhook Events Configuration...\n");

async function checkWebhookEvents() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET, {
      apiVersion: "2025-07-30.basil",
    });

    // Get all webhooks
    const webhooks = await stripe.webhookEndpoints.list();
    
    console.log(`📊 Found ${webhooks.data.length} webhook(s):\n`);

    webhooks.data.forEach((webhook, index) => {
      console.log(`🔗 Webhook ${index + 1}:`);
      console.log(`   URL: ${webhook.url}`);
      console.log(`   Status: ${webhook.status}`);
      console.log(`   Events (${webhook.enabled_events.length}):`);
      
      webhook.enabled_events.forEach(event => {
        console.log(`     ✅ ${event}`);
      });
      
      console.log("");
    });

    // Check for specific events we need
    const requiredEvents = [
      'account.updated',
      'account.external_account.created',
      'account.external_account.updated',
      'capability.updated',
      'checkout.session.completed'
    ];

    console.log("🎯 Required Events for Evento:");
    requiredEvents.forEach(event => {
      const isConfigured = webhooks.data.some(webhook => 
        webhook.enabled_events.includes(event)
      );
      console.log(`   ${isConfigured ? '✅' : '❌'} ${event}`);
    });

    // Check if our staging URL is configured
    const stagingWebhook = webhooks.data.find(webhook => 
      webhook.url.includes('backend-staging.evento-app.io')
    );

    if (stagingWebhook) {
      console.log("\n✅ Found staging webhook configuration!");
      console.log(`   URL: ${stagingWebhook.url}`);
      console.log(`   Events: ${stagingWebhook.enabled_events.join(', ')}`);
    } else {
      console.log("\n❌ No webhook found for staging URL!");
      console.log("   Expected: https://backend-staging.evento-app.io/stripe-webhook");
    }

    // Check webhook delivery attempts
    console.log("\n📡 Recent Webhook Delivery Attempts:");
    try {
      const events = await stripe.events.list({
        limit: 10,
        types: ['account.updated', 'account.external_account.created', 'checkout.session.completed']
      });

      if (events.data.length === 0) {
        console.log("   No recent events found");
      } else {
        events.data.forEach(event => {
          console.log(`   ${event.type} - ${event.created} - ${event.id}`);
        });
      }
    } catch (error) {
      console.log(`   Error fetching events: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ Error checking webhook events:", error.message);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("📋 Next Steps:");
  console.log("1. Go to https://dashboard.stripe.com/webhooks");
  console.log("2. Edit your webhook for staging");
  console.log("3. Add missing events: account.updated, account.external_account.created, etc.");
  console.log("4. Test webhook delivery");
}

checkWebhookEvents().catch(console.error);
