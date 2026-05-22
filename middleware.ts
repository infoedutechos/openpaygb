/**
 * Admin auth gate, student portal gate, x-pathname for admin layout.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyPayAdminJwt } from "@/lib/admin-jwt-verify";
import { verifyStudentJwt } from "@/lib/student-jwt-verify";

const PAY_ADMIN_COOKIE = "odelhub_admin";
const URA_ADMIN_SESSION = "admin_session";
const STUDENT_COOKIE = "odelhub_student";
const STUDENT_SIGNUP_COOKIE = "odelhub_student_signup";

function redirectStudentLogin(req: NextRequest, nextPath?: string) {
  const login = new URL("/student/login", req.url);
  if (nextPath && nextPath !== "/student") {
    login.searchParams.set("next", nextPath);
  }
  const res = NextResponse.redirect(login);
  res.cookies.delete(STUDENT_COOKIE);
  return res;
}

async function hasValidStudentCookie(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(STUDENT_COOKIE)?.value;
  if (!token) return false;
  return (await verifyStudentJwt(token)) !== null;
}

function hasStudentCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get(STUDENT_COOKIE)?.value);
}

function redirectAdminLogin(req: NextRequest, nextPath: string) {
  const login = new URL("/admin/login", req.url);
  login.searchParams.set("next", nextPath);
  const res = NextResponse.redirect(login);
  res.cookies.delete(PAY_ADMIN_COOKIE);
  return res;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  if (pathname === "/student" || pathname.startsWith("/student/")) {
    if (
      pathname === "/student/login" ||
      pathname.startsWith("/student/login") ||
      pathname === "/student/register" ||
      pathname.startsWith("/student/register") ||
      pathname === "/student/claim" ||
      pathname.startsWith("/student/claim")
    ) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    if (pathname === "/student/guest" || pathname.startsWith("/student/guest")) {
      const studentTok = req.cookies.get(STUDENT_COOKIE)?.value;
      if (studentTok) {
        if (await verifyStudentJwt(studentTok)) {
          return NextResponse.redirect(new URL("/student", req.url));
        }
        const cleared = NextResponse.next({ request: { headers: requestHeaders } });
        cleared.cookies.delete(STUDENT_COOKIE);
        return cleared;
      }
      if (req.cookies.has(STUDENT_SIGNUP_COOKIE)) {
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
      const login = new URL("/student/register", req.url);
      login.searchParams.set("notice", "confirm_email");
      return NextResponse.redirect(login);
    }
    if (!hasStudentCookie(req)) {
      return redirectStudentLogin(req, pathname + req.nextUrl.search);
    }
    if (!(await hasValidStudentCookie(req))) {
      return redirectStudentLogin(req, pathname + req.nextUrl.search);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname === "/my" || pathname.startsWith("/my/")) {
    if (!hasStudentCookie(req)) {
      return redirectStudentLogin(req, pathname + req.nextUrl.search);
    }
    if (!(await hasValidStudentCookie(req))) {
      return redirectStudentLogin(req, pathname + req.nextUrl.search);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname === "/school-admin" || pathname.startsWith("/school-admin/")) {
    const payTok = req.cookies.get(PAY_ADMIN_COOKIE)?.value;
    const payOk = payTok ? await verifyPayAdminJwt(payTok) : null;
    const hasUra = req.cookies.has(URA_ADMIN_SESSION);
    const nextPath = pathname + req.nextUrl.search;
    if (!payOk && !hasUra) {
      return redirectAdminLogin(req, nextPath);
    }
    if (payTok && !payOk && hasUra) {
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      res.cookies.delete(PAY_ADMIN_COOKIE);
      return res;
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (
    pathname === "/admin/login" ||
    pathname === "/admin/register" ||
    pathname === "/admin/reset-password" ||
    pathname.startsWith("/admin/reset-password/")
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname === "/admin/notifications" || pathname.startsWith("/admin/notifications/")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const payTok = req.cookies.get(PAY_ADMIN_COOKIE)?.value;
  const payOk = payTok ? await verifyPayAdminJwt(payTok) : null;
  const hasUra = req.cookies.has(URA_ADMIN_SESSION);
  if (!payOk && !hasUra) {
    return redirectAdminLogin(req, pathname + req.nextUrl.search);
  }
  if (payTok && !payOk && hasUra) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.cookies.delete(PAY_ADMIN_COOKIE);
    return res;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/school-admin",
    "/school-admin/:path*",
    "/student",
    "/student/:path*",
    "/my",
    "/my/:path*",
  ],
};
