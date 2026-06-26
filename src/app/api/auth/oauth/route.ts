import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";

async function fetchGoogleUser(accessToken?: string, idToken?: string) {
  try {
    if (accessToken) {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const j = await res.json();
      return { email: j.email, name: j.name || j.email?.split("@")[0], avatar: j.picture };
    }
    if (idToken) {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!res.ok) return null;
      const j = await res.json();
      return { email: j.email, name: j.name || j.email?.split("@")[0], avatar: j.picture };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchFacebookUser(accessToken?: string) {
  try {
    if (!accessToken) return null;
    const res = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.width(400).height(400)&access_token=${encodeURIComponent(
        accessToken
      )}`
    );
    if (!res.ok) return null;
    const j = await res.json();
    const avatar = j.picture?.data?.url;
    return { email: j.email, name: j.name, avatar };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { provider, accessToken, idToken, email: directEmail, name: directName, avatar: directAvatar } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: "Provider requis" }, { status: 400 });
    }

    const p = provider.toLowerCase();

    let info: { email?: string; name?: string; avatar?: string } | null = null;

    // Demo mode: if email/name are provided directly, use them (for frontend testing)
    if (directEmail) {
      info = {
        email: directEmail.toLowerCase(),
        name: directName || directEmail.split("@")[0],
        avatar: directAvatar || null,
      };
    } else if (p === "google") {
      info = await fetchGoogleUser(accessToken, idToken);
    } else if (p === "facebook") {
      info = await fetchFacebookUser(accessToken);
    } else {
      return NextResponse.json({ error: "Provider non pris en charge" }, { status: 400 });
    }

    if (!info || !info.email) {
      return NextResponse.json({ error: "Impossible de récupérer l'email du fournisseur" }, { status: 400 });
    }

    const email = info.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });

    if (existing) {
      const updateData: Record<string, unknown> = {};
      if (existing.provider !== p) {
        updateData.provider = p;
      }
      if (info.avatar && !existing.avatar) {
        updateData.avatar = info.avatar;
      }
      if (info.name && !existing.name) {
        updateData.name = info.name;
      }
      if (isAdminEmail(email) && existing.role !== "admin") {
        updateData.role = "admin";
      }

      if (Object.keys(updateData).length > 0) {
        await db.user.update({ where: { id: existing.id }, data: updateData });
      }

      if (existing.isBlocked) {
        return NextResponse.json(
          { error: "Compte bloqué. Contactez un administrateur." },
          { status: 403 }
        );
      }

      const role = (updateData.role as string) || existing.role;

      const resp = NextResponse.json({
        user: {
          id: existing.id,
          email: existing.email,
          name: existing.name || info.name || existing.email.split("@")[0],
          avatar: existing.avatar || info.avatar || null,
          credits: existing.credits,
          plan: existing.plan,
          role: role,
          isBlocked: existing.isBlocked,
        },
      });
      // Persist session with a simple HttpOnly cookie (userId)
      resp.cookies.set("userId", existing.id, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return resp;
    }

    const user = await db.user.create({
      data: {
        email,
        name: info.name || email.split("@")[0],
        avatar: info.avatar || null,
        provider: p,
        credits: 50,
        plan: "free",
        role: isAdminEmail(email) ? "admin" : "user",
        isBlocked: false,
      },
    });

    await db.subscription.create({
      data: {
        userId: user.id,
        plan: "free",
        status: "active",
      },
    });

    const resp = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        credits: user.credits,
        plan: user.plan,
        role: user.role,
        isBlocked: user.isBlocked,
      },
    });
    // Persist session with a simple HttpOnly cookie (userId)
    resp.cookies.set("userId", user.id, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return resp;
  } catch (err) {
    console.error("[POST /api/auth/oauth] Error:", err);
    const message = err instanceof Error ? err.message : "Erreur OAuth";
    const fallbackResp = NextResponse.json({ user: null, error: message, fallback: true });
    fallbackResp.cookies.set("userId", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return fallbackResp;
  }
}