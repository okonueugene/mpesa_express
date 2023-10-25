const axios = require("axios");
const fs = require("fs");
const mysql = require("mysql");

async function getStkPushResult(request) {
  const content = JSON.parse(request.body);

  //Retrieve the token from the request URL
  const url = request.url;
  const parsedUrl = new URL(url);

  const token = parsedUrl.searchParams.get("token");

  // append the token to the content object and write to file and create if it doesn't exis
  content.token = token;
  fs.writeFileSync("stk_push_result.json", JSON.stringify(content));

  // Check if "ResultCode" is present in the response
  if (content.Body.stkCallback.ResultCode) {
    const resultCode = content.Body.stkCallback.ResultCode;

    // Create a MySQL database connection
    const connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "mpesa"
    });

    // Check if "ResultCode" is 0
    if (resultCode === 0) {
      // The request was successful

      const sql = `INSERT INTO stk_push (MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, Amount, MpesaReceiptNumber, TransactionDate, PhoneNumber, Token, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const [rows] = await connection.execute(sql, [
        content.Body.stkCallback.MerchantRequestID,
        content.Body.stkCallback.CheckoutRequestID,
        content.Body.stkCallback.ResultCode,
        content.Body.stkCallback.ResultDesc,
        content.Body.stkCallback.CallbackMetadata.Item[0].Value,
        content.Body.stkCallback.CallbackMetadata.Item[1].Value,
        content.Body.stkCallback.CallbackMetadata.Item[2].Value,
        content.Body.stkCallback.CallbackMetadata.Item[3].Value,
        token,
        new Date(),
        new Date()
      ]);
    } else {
      // The request failed
      const sql = `INSERT INTO stk_push (MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, Amount, MpesaReceiptNumber, TransactionDate, PhoneNumber, Token, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const [rows] = await connection.execute(sql, [
        content.Body.stkCallback.MerchantRequestID,
        content.Body.stkCallback.CheckoutRequestID,
        content.Body.stkCallback.ResultCode,
        content.Body.stkCallback.ResultDesc,
        null,
        null,
        null,
        null,
        token,
        new Date(),
        new Date()
      ]);
    }
  }
}
