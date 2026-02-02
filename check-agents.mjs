import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://shocking-bird-216.convex.cloud");

const agents = await client.query("agents:list", {});
console.log(JSON.stringify(agents, null, 2));
