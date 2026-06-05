import { NextResponse } from "next/server";

import { z } from "zod";

import bcrypt from "bcryptjs";

import { AdminRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { requireMaster } from "@/lib/master-session";

import { sendOrgAdminInviteEmail } from "@/lib/org-admin-invite-email";

import { hashAdminResetToken, newAdminResetTokenPlain } from "@/lib/admin-password-reset";

import { absoluteUrl } from "@/lib/public-url";

import { apiErrorResponse } from "@/lib/api-error";



const CreateAdminBody = z.object({

  email: z.string().email(),

  password: z.string().min(10).max(128),

  name: z.string().max(120).optional().default(""),

  organizationId: z.string().min(1),

  /** When true (default), email a one-time password-set link via Resend. */

  sendInviteEmail: z.boolean().optional().default(true),

});



export async function POST(req: Request) {

  try {

    const gate = await requireMaster();

    if (!gate.ok) return gate.response;



    const json = await req.json().catch(() => null);

    const parsed = CreateAdminBody.safeParse(json);

    if (!parsed.success) {

      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });

    }



    const org = await prisma.organization.findUnique({

      where: { id: parsed.data.organizationId },

      select: { id: true, tenantStatus: true, name: true, slug: true },

    });

    if (!org) {

      return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    }

    if (org.tenantStatus !== "active") {

      return NextResponse.json(

        { error: "Organization must be active before assigning an org admin" },

        { status: 400 },

      );

    }



    const email = parsed.data.email.toLowerCase().trim();

    const existing = await prisma.adminUser.findUnique({ where: { email } });

    if (existing) {

      return NextResponse.json({ error: "An admin with that email already exists" }, { status: 409 });

    }



    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const admin = await prisma.adminUser.create({

      data: {

        email,

        passwordHash,

        name: parsed.data.name.trim(),

        role: AdminRole.org_admin,

        organizationId: parsed.data.organizationId,

      },

      select: { id: true, email: true, name: true, role: true, organizationId: true },

    });



    let emailSent = false;

    if (parsed.data.sendInviteEmail) {

      await prisma.adminPasswordResetToken.deleteMany({ where: { adminUserId: admin.id } });

      const plainToken = newAdminResetTokenPlain();

      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await prisma.adminPasswordResetToken.create({

        data: {

          adminUserId: admin.id,

          tokenHash: hashAdminResetToken(plainToken),

          expiresAt,

        },

      });

      const resetUrl = absoluteUrl(`/admin/reset-password?token=${encodeURIComponent(plainToken)}`);

      emailSent = await sendOrgAdminInviteEmail({

        adminEmail: email,

        schoolName: org.name,

        schoolSlug: org.slug,

        resetUrl,

      });

    }



    return NextResponse.json(

      {

        admin,

        emailSent,

        message: emailSent

          ? "School admin created. An invite email was sent with a password-set link."

          : "School admin created. Share /school/login credentials manually (email was not sent — check RESEND_*).",

      },

      { status: 201 },

    );

  } catch (e) {

    return apiErrorResponse(e, { route: "master/admins", fallback: "Could not create school admin" });

  }

}

