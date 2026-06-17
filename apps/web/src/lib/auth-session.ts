import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";

export const getServerSession = cache(async () => {
  try {
    const { data, error } = await authClient.getSession({
      fetchOptions: {
        cache: "no-store",
        headers: await headers(),
      },
    });

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
});
