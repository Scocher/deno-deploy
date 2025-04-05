import { Hono } from 'hono'
import { z } from 'zod'
// Initialize Hono app
const app = new Hono();

// Define schemas with Zod
const FriendRequestSchema = z.object({
  friendName: z.string().min(1).default("Friend"),
});

// Function to get environment variables, throws if missing
function getEnvironmentName(varName: string): string {
  const value = Deno.env.get(varName);
  if (!value) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
  return value;
}

// GET / - Hello World
app.get("/", (c) => {
  return c.text("Hello World");
});

// GET /me - Return full name from env variables
app.get("/me", (c) => {
  const firstName = getEnvironmentName("FIRST_NAME");
  const lastName = getEnvironmentName("LAST_NAME");

  return c.text(`${firstName} ${lastName}`);
});

// POST /me - Return full name + friend name
app.post("/me", async (c) => {
  const firstName = getEnvironmentName("FIRST_NAME");
  const lastName = getEnvironmentName("LAST_NAME");

  try {
    // Parse and validate request body using Zod
    const body = await c.req.json();
    const validatedData = FriendRequestSchema.parse(body);

    return c.text(`${firstName} ${lastName} 🫶 ${validatedData.friendName}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }

    return c.json({ error: "Invalid request" }, 400);
  }
});

// Start the server
console.log("Server starting on http://localhost:8000");
Deno.serve(app.fetch);