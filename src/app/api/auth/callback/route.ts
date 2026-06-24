import { NextResponse } from "next/server";

/**
 * OAuth Callback Handler
 * Receives authorization code from OAuth provider
 * Exchanges code for access token
 * Redirects to oauth endpoint with token
 */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent("Code ou state manquant")}`, req.url)
      );
    }

    // Decode provider from state parameter (Base64 encoded JSON)
    let provider: string;
    try {
      const statePayload = JSON.parse(atob(state));
      provider = statePayload.provider;
      if (!provider) {
        throw new Error("No provider in state");
      }
    } catch (e) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent("État invalide")}`, req.url)
      );
    }

    let token: { accessToken?: string; idToken?: string } | null = null;
    const p = provider.toLowerCase();

    if (p === "google") {
      token = await exchangeGoogleCode(code);
    } else if (p === "facebook") {
      token = await exchangeFacebookCode(code);
    }

    if (!token) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent("Token exchange échoué")}`, req.url)
      );
    }

    // Redirect back to frontend with token
    // Frontend will POST this to /api/auth/oauth
    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("provider", provider);
    redirectUrl.searchParams.set("accessToken", token.accessToken || "");
    if (token.idToken) redirectUrl.searchParams.set("idToken", token.idToken);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent("Erreur lors du callback")}`, req.url)
    );
  }
}

function normalizeRedirectBase(raw: string) {
  return raw.replace(/(^["']|["']$)/g, "").replace(/\/$/, "");
}

async function exchangeGoogleCode(code: string) {
  try {
    const redirectBase = normalizeRedirectBase(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${redirectBase}/api/auth/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      console.error("Google token exchange failed:", await res.text());
      return null;
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      idToken: data.id_token,
    };
  } catch (error) {
    console.error("Google exchange error:", error);
    return null;
  }
}

async function exchangeFacebookCode(code: string) {
  try {
    const redirectBase = normalizeRedirectBase(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    const res = await fetch("https://graph.facebook.com/v20.0/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `${redirectBase}/api/auth/callback`,
      }),
    });

    if (!res.ok) {
      console.error("Facebook token exchange failed:", await res.text());
      return null;
    }

    const data = await res.json();
    return { accessToken: data.access_token };
  } catch (error) {
    console.error("Facebook exchange error:", error);
    return null;
  }
}
