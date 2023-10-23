const express = require("express");

const app = express();

const path = require("path");

const fs = require("fs");

const axios = require("axios");

const bodyParser = require("body-parser");

// route to kcbstk.js
app.get("/api/kcbstk", (req, res) => {
  const { spawn } = require("child_process");
  const child = spawn("node", ["kcbstk.js"]);

  let output = "";

  child.stdout.on("data", (data) => {
    output += data.toString();
    console.log(`stdout:\n${data}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`stderr:\n${data}`);
  });

  child.on("close", (code) => {
    console.log(`kcbstk.js exited with code ${code}`);

    if (code === 0) {
      const jsonResponse = {
        status: "success",
        message: "kcbstk.js executed successfully",
        output: output
      };
      res.status(200).json(jsonResponse);
    } else {
      const jsonResponse = {
        status: "error",
        message: `kcbstk.js exited with code ${code}`,
        output: output,
        time: new Date().toLocaleString()
      };
      res.status(500).json(jsonResponse);
    }
  });
});

//server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
