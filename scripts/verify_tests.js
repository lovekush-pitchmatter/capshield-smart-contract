const { exec } = require("child_process");
const fs = require("fs");

console.log("Starting test execution...");
exec("npx hardhat test", { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
  console.log("Test execution finished.");
  const output = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nERROR:\n${error ? error.message : "None"}`;
  fs.writeFileSync("verification_output.txt", output);
  console.log("Output written to verification_output.txt");
});
