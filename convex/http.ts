import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const API_KEY = "8c03d7f84ad885c3038b8ec7865bc2eedd4f62e54d20a5ce0a3033006d5abbd5";

function validateApiKey(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return false;
  const key = authHeader.replace("Bearer ", "");
  return key === API_KEY;
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

http.route({
  path: "/log",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateApiKey(request)) return unauthorizedResponse();
    const body = await request.json();
    await ctx.runMutation(api.activities.log, body);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/asset",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateApiKey(request)) return unauthorizedResponse();
    const body = await request.json();
    await ctx.runMutation(api.assets.update, body);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/agent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateApiKey(request)) return unauthorizedResponse();
    const body = await request.json();
    await ctx.runMutation(api.agents.updateAgent, body);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Create a mission
http.route({
  path: "/mission",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateApiKey(request)) return unauthorizedResponse();
    const body = await request.json();
    const missionId = await ctx.runMutation(api.missions.create, body);
    return new Response(JSON.stringify({ success: true, missionId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Update mission status
http.route({
  path: "/mission/status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateApiKey(request)) return unauthorizedResponse();
    const body = await request.json();
    await ctx.runMutation(api.missions.updateStatus, body);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// GET missions - query by agent or status
http.route({
  path: "/missions",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!validateApiKey(request)) return unauthorizedResponse();
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId");
    const status = url.searchParams.get("status");
    
    let missions;
    if (agentId) {
      missions = await ctx.runQuery(api.missions.byAssignee, { agentId });
    } else if (status) {
      missions = await ctx.runQuery(api.missions.byStatus, { status });
    } else {
      missions = await ctx.runQuery(api.missions.list, {});
    }
    
    return new Response(JSON.stringify(missions), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
