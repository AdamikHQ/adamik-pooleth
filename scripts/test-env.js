// Test environment variables
require("dotenv").config({ path: ".env" });

console.log("🔍 Environment Variable Check");
console.log("============================");
console.log("PRIVY_APP_ID exists:", !!process.env.PRIVY_APP_ID);
console.log("PRIVY_APP_SECRET exists:", !!process.env.PRIVY_APP_SECRET);
console.log("TEST_USER_ID exists:", !!process.env.TEST_USER_ID);

if (process.env.PRIVY_APP_ID) {
  console.log("PRIVY_APP_ID length:", process.env.PRIVY_APP_ID.length);
}
if (process.env.PRIVY_APP_SECRET) {
  console.log("PRIVY_APP_SECRET length:", process.env.PRIVY_APP_SECRET.length);
}
if (process.env.TEST_USER_ID) {
  console.log("TEST_USER_ID:", process.env.TEST_USER_ID);
}
