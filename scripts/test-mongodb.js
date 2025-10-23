#!/usr/bin/env node

/**
 * MongoDB Atlas Connection Test
 *
 * Tests the MongoDB Atlas connection and basic operations
 */

const mongoose = require("mongoose");
require("dotenv").config();

async function testMongoConnection() {
  try {
    console.log("🔗 Testing MongoDB Atlas connection...");
    console.log(
      `📍 Connecting to: ${process.env.MONGODB_URI?.replace(
        /\/\/[^:]+:[^@]+@/,
        "//***:***@"
      )}`
    );

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Atlas connection successful!");

    // Test basic operations
    const db = mongoose.connection.db;

    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Collections found: ${collections.length}`);
    collections.forEach((col) => console.log(`   - ${col.name}`));

    // Test a simple write/read operation
    const testCollection = db.collection("connection_test");

    // Insert test document
    const testDoc = {
      timestamp: new Date(),
      test: "MongoDB Atlas connection test",
      environment: process.env.NODE_ENV || "development",
    };

    const insertResult = await testCollection.insertOne(testDoc);
    console.log(
      `✅ Test document inserted with ID: ${insertResult.insertedId}`
    );

    // Read it back
    const foundDoc = await testCollection.findOne({
      _id: insertResult.insertedId,
    });
    console.log("✅ Test document retrieved successfully");

    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log("🧹 Test document cleaned up");

    // Show database stats
    const stats = await db.stats();
    console.log(`📈 Database stats:`);
    console.log(`   - Database: ${stats.db}`);
    console.log(`   - Collections: ${stats.collections}`);
    console.log(
      `   - Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`
    );

    console.log("\n🎉 MongoDB Atlas is ready for production!");
  } catch (error) {
    console.error("❌ MongoDB Atlas connection failed:");
    console.error(error.message);

    if (error.message.includes("authentication failed")) {
      console.log("\n💡 Troubleshooting tips:");
      console.log("   - Check username/password in connection string");
      console.log("   - Verify user has proper database permissions");
      console.log("   - Ensure user is created in MongoDB Atlas");
    }

    if (error.message.includes("getaddrinfo ENOTFOUND")) {
      console.log("\n💡 Troubleshooting tips:");
      console.log("   - Check internet connection");
      console.log("   - Verify cluster name in connection string");
      console.log("   - Ensure cluster is running (not paused)");
    }

    if (error.message.includes("IP not in whitelist")) {
      console.log("\n💡 Troubleshooting tips:");
      console.log("   - Add your IP address to Atlas Network Access");
      console.log("   - Or temporarily allow access from anywhere (0.0.0.0/0)");
    }

    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log("🔒 Connection closed");
  }
}

// Run the test
testMongoConnection();
