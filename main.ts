import { Hono } from 'hono'
import { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from 'zod'
import Anthropic from "@anthropic-ai/sdk";


// Initialize Hono app
const app = new Hono();
app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ message: err.message }, err.status)
  }

  // Default error handling
  console.error(err)
  return c.json({ message: 'An unexpected error occurred' }, 500)
})
const anthropic = new Anthropic();

const AnthropicResponse = z.object({
  id: z.string(),
  type: z.string(),
  role: z.string(),
  model: z.string(),
  content: z.array(z.object({
    type: z.string(),
    text: z.string()
  })),
  stop_reason: z.string(),
  stop_sequence: z.string().nullable(),
  usage: z.object({
    input_tokens: z.number(),
    cache_creation_input_tokens: z.number(),
    cache_read_input_tokens: z.number(),
    output_tokens: z.number(),
  })
})
type AnthropicResponse = z.infer<typeof AnthropicResponse>


class ApiError extends Error {
  status: ContentfulStatusCode;

  constructor(message: string, status: ContentfulStatusCode) {
    super(message);
    this.status = status;
  }

  static client(message: string, status: ContentfulStatusCode = 400): ApiError {
    return new ApiError(message, status);
  }

  static server(message: string, status: ContentfulStatusCode = 500): ApiError {
    return new ApiError(message, status);
  }
}


// Function to get environment variables, throws if missing
function getEnvironment(varName: string): string {
  const value = Deno.env.get(varName);
  if (!value) {
    throw ApiError.server(`Missing required environment variable: ${varName}`);
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

app.get("/poem", async (c) => {
  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 1000,
    temperature: 0.7,
    system: "Respond only with short poems.",
    messages: [
      {
        role: "user",
        content: "Write a haiku poem about Nintendo games. Keep it under 8 lines."
      }
    ]
  });
  const responseJson = AnthropicResponse.safeParse(response)
  if (responseJson.error) {
    throw ApiError.server(responseJson.error.message);
  }
  const contentMessages = responseJson.data.content.map(content => content.text);
  console.log(contentMessages.join(', '));
  const poem = contentMessages.at(0) ?? ''

  return c.json({ poem });
});

// Start the server
Deno.serve(app.fetch);