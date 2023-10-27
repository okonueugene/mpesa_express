const axios = require("axios");
const fs = require("fs");

// Extract phone number and amount from command-line arguments
let phoneNumber = process.argv[2];
let amount = process.argv[3];

// Read data from env.json
try {
  const env = JSON.parse(fs.readFileSync("env.json", "utf-8"));

  // Apply destructuring to env object
  const {
    consumerKey,
    consumerSecret,
    businessShortCode,
    passkey,
    callbackUrl,
    customerName,
    authorizationUrl,
    stkPushUrl
  } = env;

  async function generateAccessToken() {
    const credentials = Buffer.from(
      `${consumerKey}:${consumerSecret}`
    ).toString("base64");
    try {
      const response = await axios.get(authorizationUrl, {
        headers: {
          Authorization: `Basic ${credentials}`
        }
      });

      const accessToken = response.data.access_token;
      return accessToken;
    } catch (error) {
      console.error("Error generating access token:", error);
      throw error;
    }
  }

  async function validateRequestData(requestData) {
    // Check if all required fields are present
    const requiredFields = [
      "BusinessShortCode",
      "Password",
      "Timestamp",
      "TransactionType",
      "Amount",
      "PartyA",
      "PartyB",
      "PhoneNumber",
      "CallBackURL",
      "AccountReference",
      "TransactionDesc"
    ];

    for (const field of requiredFields) {
      if (!requestData.hasOwnProperty(field)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check if the amount is a number between 1 and 500000
    if (isNaN(requestData.Amount)) {
      throw new Error("Amount must be a number");
    } else if (requestData.Amount < 1 || requestData.Amount > 500000) {
      throw new Error("Amount must be between 1 and 500000");
    }

    // Check if the phone number is in the correct format (254XXXXXXXXX)
    if (!requestData.PhoneNumber.match(/^2547\d{8}$/)) {
      throw new Error(
        "Invalid phone number the correct format is 2547XXXXXXXX"
      );
    }
  }

  async function handleResponse(response) {
    if (response.data.ResponseCode) {
      // Check if the response code is a success
      if (response.data.ResponseCode === "0") {
        console.log("STK push was successful:", response.data);
      } else {
        console.error("STK push failed with code:", response.data);
        process.exit(1); // Exit with an error code
      }
    } else {
      console.error("ResponseCode not found in the response");
      process.exit(1); // Exit with an error code
    }
  }

  async function stkPush() {
    const accessToken = await generateAccessToken();
    const password = Buffer.from(
      `${businessShortCode}${passkey}${new Date()
        .toISOString()
        .replace(/[-:.T]/g, "")
        .slice(0, 14)}`
    ).toString("base64");

    const requestData = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: new Date()
        .toISOString()
        .replace(/[-:.T]/g, "")
        .slice(0, 14),
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: businessShortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: customerName,
      TransactionDesc: "Testing STK push on sandbox"
    };

    try {
      await validateRequestData(requestData);

      const response = await axios.post(stkPushUrl, requestData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });

      handleResponse(response);
    } catch (error) {
      console.error("An error occurred:", error);
      process.exit(1); // Exit with an error code
    }
  }

  stkPush();
} catch (error) {
  console.error("An error occurred:", error);
  console.error("Stack Trace:", error.stack);

  // Print the error message and stack trace to stderr
  console.error(error.message);

  process.exit(1); // Exit with an error code
}
