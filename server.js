const express = require("express");

const app = express();

const fs = require("fs");

const bodyParser = require("body-parser");

const mysql = require("mysql");

const winston = require("winston");

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

// Create a logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf((info) => {
      return `${info.timestamp} ${info.level}: ${info.message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" })
  ]
});

//Read data from env.json
const env = JSON.parse(fs.readFileSync("env.json", "utf-8"));

// Apply destructuring to env object
const { db_Host, db_User, db_Password, db_Database } = env;

//Database connection

const connection = mysql.createConnection({
  host: db_Host,
  user: db_User,
  password: db_Password,
  database: db_Database
});

connection.connect((err) => {
  if (err) throw err;
  logger.info("Connected! to the database successfully");
  console.log("Connected! to the database successfully");
});

// Save the data to the database
function saveToDatabase(token, content) {
  const resultCode = content.Body.stkCallback.ResultCode;
  let sql;
  let values;

  if (resultCode === 0) {
    sql = `INSERT INTO mpesa_transactions (MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, Amount, MpesaReceiptNumber, TransactionDate, PhoneNumber, Token, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    values = [
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
    ];
  } else {
    sql = `INSERT INTO mpesa_transactions (MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, Token, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
    values = [
      content.Body.stkCallback.MerchantRequestID,
      content.Body.stkCallback.CheckoutRequestID,
      content.Body.stkCallback.ResultCode,
      content.Body.stkCallback.ResultDesc,
      token,
      new Date(),
      new Date()
    ];
  }

  connection.query(sql, values, (err, result) => {
    if (err) console.error(err);
    logger.info("Record inserted into the database");
    console.log("Record inserted into the database");
  });
}

// route to stkpush.js
app.post("/api/stkpush", (req, res) => {
  let phoneNumber = req.body.phoneNumber;
  let amount = req.body.amount;

  // Extract phone number and amount from query parameters if not found in the request body
  if (!phoneNumber || !amount) {
    const { phoneNumber: queryPhoneNumber, amount: queryAmount } = req.query;
    if (queryPhoneNumber && queryAmount) {
      phoneNumber = queryPhoneNumber;
      amount = queryAmount;
    } else {
      return res.status(400).json({
        status: "error",
        message: "Both phone number and amount are required."
      });
    }
  }

  const { spawn } = require("child_process");
  const child = spawn("node", ["stkpush.js", phoneNumber, amount]);

  let output = "";
  let errorOutput = "";

  child.stdout.on("data", (data) => {
    output += data.toString();
    logger.info;
    console.log(`stdout:\n${data}`);
  });

  child.stderr.on("data", (data) => {
    errorOutput += data.toString();
    logger.error;
    console.error(`stderr:\n${data}`);
  });

  child.on("close", (code) => {
    logger.info;
    console.log(`stkpush.js exited with code ${code}`);

    if (code === 0) {
      const jsonResponse = {
        status: "success",
        message: "stkpush.js executed successfully",
        output: output.split(":")[0]
      };
      res.status(200).json(jsonResponse);
    } else {
      const jsonResponse = {
        status: "error",
        message: `stkpush.js exited with code ${code}`,
        errorOutput: errorOutput.split(":")[2].split("\n")[0],
        time: new Date().toLocaleString()
      };
      res.status(500).json(jsonResponse);
    }
  });
});

// route to callback.js
app.post("/api/callback", (req, res) => {
  //Retrieve the content from the request body
  const content = req.body;

  // Retrieve the token from the query parameter
  const token = req.query.token;

  //check if callback.json exists
  if (!fs.existsSync("callback.json")) {
    fs.writeFileSync("callback.json", "[]");
  }

  // Read the existing JSON data from the file, or initialize an empty array
  let existingData = [];

  try {
    const rawData = fs.readFileSync("callback.json");
    existingData = JSON.parse(rawData);
  } catch (error) {
    logger.error(error);
    console.error(error);
  }

  // Append the new data to the existing data
  existingData.push({
    token,
    content
  });

  // Write the updated data to the file
  try {
    fs.writeFileSync("callback.json", JSON.stringify(existingData));
  } catch (error) {
    logger.error(error);
    console.error(error);
  }

  try {
    // Save the data to the database
    saveToDatabase(token, content);
    // Send a success response to the caller
    const jsonResponse = {
      status: "success",
      message: "Callback data received successfully",
      time: new Date().toLocaleString(),
      records: existingData.length,
      data: {
        token,
        content
      }
    };
    res.status(200).json(jsonResponse);
  } catch (error) {
    logger.error("Error saving to the database:", error);
    console.error("Error saving to the database:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// route to read from stk_push_result
app.get("/api/stkpush/result", (req, res) => {
  //read from stk_push_result.json
  const content = fs.readFileSync("callback.json", "utf8");
  const jsonResponse = {
    status: "success",
    message: "callback.json read successfully",
    data: JSON.parse(content)
  };
  res.status(200).json(jsonResponse);
});
// route to clear callback.json
app.delete("/api/freejson", (req, res) => {
  //clear callback.json
  fs.writeFileSync("callback.json", "[]");
  const jsonResponse = {
    status: "success",
    message: "callback.json cleared successfully"
  };
  res.status(200).json(jsonResponse);
});

//server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
