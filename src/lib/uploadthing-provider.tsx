'use client'

import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./uploadthing";

export function UploadThingProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextSSRPlugin
      routerConfig={extractRouterConfig(ourFileRouter)}
      extractConfig={{
        uploadthingId: process.env.NEXT_PUBLIC_UPLOADTHING_TOKEN,
        uploadthingSecret: process.env.UPLOADTHING_SECRET,
      }}
    >
      {children}
    </NextSSRPlugin>
  );
}
