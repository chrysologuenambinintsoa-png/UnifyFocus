import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "UnifyFocus API",
    version: "1.0.0",
    description: "Plateforme SaaS d'intelligence artificielle générative",
    endpoints: {
      auth: {
        login: "POST /api/auth/login",
        signup: "POST /api/auth/signup",
        logout: "POST /api/auth/logout",
        me: "GET /api/auth/me",
        oauth: "POST /api/auth/oauth",
        callback: "GET /api/auth/callback",
      },
      generate: {
        text: "POST /api/generate/text",
        image: "POST /api/generate/image",
        video: "POST /api/generate/video",
      },
      conversations: {
        list: "GET /api/conversations",
        create: "POST /api/conversations",
        get: "GET /api/conversations/[id]",
        update: "PUT /api/conversations/[id]",
        delete: "DELETE /api/conversations/[id]",
      },
      user: {
        settings: "GET/PUT /api/user/settings",
        avatar: "POST /api/user/avatar",
        credits: "POST /api/user/credits",
        subscriptionUpgrade: "POST /api/user/subscription/upgrade",
        createCheckoutSession: "POST /api/user/subscription/create-checkout-session",
        generations: "GET /api/user/generations",
        profile: "GET/PUT /api/user/profile",
      },
    },
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}