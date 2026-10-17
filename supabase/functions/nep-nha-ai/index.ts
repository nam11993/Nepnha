import { createAIHandler } from "./handler.ts";
declare const Deno: {
  env: { get: (name: string) => string | undefined };
  serve: (handler: (request: Request) => Promise<Response>) => void;
};
Deno.serve(createAIHandler(Deno.env));
