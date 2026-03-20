import { waitForApi } from "./helpers";

async function globalSetup() {
  console.log("Waiting for API gateway to be healthy...");
  await waitForApi();
  console.log("API gateway is ready.");
}

export default globalSetup;
