/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "remembering",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Nextjs("Remembering", {
      domain: {
        name: "remember.ketseba.com",
        dns: sst.aws.dns(),
      },
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: new sst.Secret("SupabaseUrl").value,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: new sst.Secret("SupabaseAnonKey").value,
        NEXT_PUBLIC_SITE_URL: "https://remember.ketseba.com",
        SUPABASE_SERVICE_ROLE_KEY: new sst.Secret("SupabaseServiceRoleKey").value,
        PREVIEW_COOKIE_SECRET: new sst.Secret("PreviewCookieSecret").value,
      },
    });
  },
});
