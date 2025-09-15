'use client'

import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { generateReactHelpers } from "@uploadthing/react";
import { ourFileRouter } from "./uploadthing";

export function UploadThingProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NextSSRPlugin
        routerConfig={extractRouterConfig(ourFileRouter)}
      />
      {children}
    </>
  );
}

export const { useUploadThing } = generateReactHelpers<typeof ourFileRouter>();
