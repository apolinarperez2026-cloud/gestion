'use client'

import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./uploadthing";

export function UploadThingProvider() {
  return (
    <NextSSRPlugin
      routerConfig={extractRouterConfig(ourFileRouter)}
    />
  );
}
