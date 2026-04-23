import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { githubSyncJob } from "@/inngest/functions/github-sync";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    githubSyncJob,
  ],
});
