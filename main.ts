import { Hono } from 'hono'
import { z } from 'zod'
// Initialize Hono app
const app = new Hono();

// Extended Response class with standardized methods
class ApiResponse extends Response {
  constructor(body: unknown, init?: ResponseInit) {
    const jsonBody = JSON.stringify(body);
    const responseInit: ResponseInit = {
      ...init,
      headers: {
        ...init?.headers,
        "Content-Type": "application/json",
      },
    };
    super(jsonBody, responseInit);
  }

  static success(json: Record<string, unknown>, status = 200): Response {
    return new ApiResponse(json, { status });
  }

  static clientError(message: string, status = 400): Response {
    return new ApiResponse({ message: message }, { status });
  }

  static serverError(message: string, status = 500): Response {
    return new ApiResponse({ message: message }, { status });
  }
}


// Function to get environment variables, throws if missing
function getEnvironment(varName: string): string {
  const value = Deno.env.get(varName);
  if (!value) {
    throw ApiResponse.serverError(`Missing required environment variable: ${varName}`);
  }
  return value;
}

// GET / - Hello World
app.get("/", (c) => {
  return c.json({ Hello: "World" });
});

// GET /me - Return full name from env variables
app.get("/me", (c) => {
  const firstName = getEnvironment("FIRST_NAME");
  const lastName = getEnvironment("LAST_NAME");

  return c.json({ name: `${firstName} ${lastName}` });
});

app.get("/poem", async (_) => {
  const apiKey = getEnvironment("ANTHROPIC_API_KEY");
  const response: Response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: "Write a haiku poem about Nintendo games. Keep it under 8 lines."
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status} - ${errorText}`);
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  return ApiResponse.success({ poem: data });
});



// POST /me - Return full name + friend name
app.post("/me", async (c) => {
  const firstName = getEnvironment("FIRST_NAME");
  const lastName = getEnvironment("LAST_NAME");

  const FriendRequestSchema = z.object({
    friendName: z.string().min(1).default("Friend"),
  });

  // Parse and validate request body using Zod
  const body = await c.req.json();
  const zModel = FriendRequestSchema.safeParse(body);

  if (zModel.error) {
    return ApiResponse.clientError(zModel.error.message);
  }

  return c.text(`${firstName} ${lastName} 🫶 ${zModel.data.friendName}`);
});

// Start the server
Deno.serve(app.fetch);