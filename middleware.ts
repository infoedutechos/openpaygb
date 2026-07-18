/**
 * Admin auth gate, student portal gate, x-pathname for admin layout,
 * standalone app host/env routing.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PUBLIC_SCHOOL_LOGIN_PATH, PLATFORM_MASTER_LOGIN_PATH } from "@/lib/admin-auth-entry";
import { verifyPayAdminJwt } from "@/lib/admin-jwt-verify";
import { verifyStudentJwt } from "@/lib/student-jwt-verify";
import { verifyStaffJwt } from "@/lib/staff-jwt-verify";
import { verifyAdminSessionTokenEdge } from "@/lib/admin-session-edge";
import { DEVELOPER_SESSION_COOKIE, verifyDeveloperSession } from "@/lib/developer-session";
import {
  isPathAllowedForStandalone,
  isPassthroughStandalonePath,
  resolveStandaloneApp,
} from "@/lib/standalone-apps";

const PAY_ADMIN_COOKIE = "odelhub_admin";
const URA_ADMIN_SESSION = "admin_session";
const STUDENT_COOKIE = "odelhub_student";
const STUDENT_SIGNUP_COOKIE = "odelhub_student_signup";
const STAFF_COOKIE = "odelhub_staff";

function redirectStudentLogin(req: NextRequest, nextPath?: string) {
  const login = new URL("/student/login", req.url);
  if (nextPath && nextPath !== "/student") {
    login.searchParams.set("next", nextPath);
  }
  const res = NextResponse.redirect(login);
  res.cookies.delete(STUDENT_COOKIE);
  return res;
}

function redirectStaffLogin(req: NextRequest, nextPath?: string) {
  const login = new URL("/staff/login", req.url);
  if (nextPath && nextPath !== "/staff") {
    login.searchParams.set("next", nextPath);
  }
  const res = NextResponse.redirect(login);
  res.cookies.delete(STAFF_COOKIE);
  return res;
}

async function hasValidStudentCookie(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(STUDENT_COOKIE)?.value;
  if (!token) return false;
  return (await verifyStudentJwt(token)) !== null;
}

async function hasValidStaffCookie(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(STAFF_COOKIE)?.value;
  if (!token) return false;
  return (await verifyStaffJwt(token)) !== null;
}

function hasStudentCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get(STUDENT_COOKIE)?.value);
}

function hasStaffCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get(STAFF_COOKIE)?.value);
}

async function hasValidUraAdminSession(req: NextRequest): Promise<boolean> {
  return verifyAdminSessionTokenEdge(req.cookies.get(URA_ADMIN_SESSION)?.value);
}

function redirectAdminLogin(req: NextRequest, nextPath: string) {
  const isMasterArea =
    nextPath === "/admin/master" ||
    nextPath.startsWith("/admin/master/") ||
    nextPath === "/school-admin/master" ||
    nextPath.startsWith("/school-admin/master/");
  const loginPath = isMasterArea ? PLATFORM_MASTER_LOGIN_PATH : PUBLIC_SCHOOL_LOGIN_PATH;
  const login = new URL(loginPath, req.url);
  login.searchParams.set("next", nextPath);
  const res = NextResponse.redirect(login);
  res.cookies.delete(PAY_ADMIN_COOKIE);
  return res;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const standaloneApp = resolveStandaloneApp({ host: req.headers.get("host") });
  if (standaloneApp) {
    requestHeaders.set("x-standalone-app", standaloneApp.id);

    if (pathname === "/" || pathname === "") {
      const url = req.nextUrl.clone();
      url.pathname = standaloneApp.lobbyPath;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    if (
      !isPassthroughStandalonePath(pathname) &&
      !isPathAllowedForStandalone(pathname, standaloneApp)
    ) {
      const redirect = new URL(standaloneApp.lobbyPath, req.url);
      return NextResponse.redirect(redirect);
    }
  }

  if (pathname === "/student" || pathname.startsWith("/student/")) {
    if (
      pathname === "/student/login" ||
      pathname.startsWith("/student/login") ||
      pathname === "/student/register" ||
      pathname.startsWith("/student/register") ||
      pathname === "/student/claim" ||
      pathname.startsWith("/student/claim") ||
      /^\/student\/card\/[a-zA-Z0-9]+$/.test(pathname)
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

  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    if (pathname === "/staff/login" || pathname.startsWith("/staff/login")) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    if (!hasStaffCookie(req)) {
      return redirectStaffLogin(req, pathname + req.nextUrl.search);
    }
    if (!(await hasValidStaffCookie(req))) {
      return redirectStaffLogin(req, pathname + req.nextUrl.search);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname === "/school-admin" || pathname.startsWith("/school-admin/")) {
    const payTok = req.cookies.get(PAY_ADMIN_COOKIE)?.value;
    const payOk = payTok ? await verifyPayAdminJwt(payTok) : null;
    const hasUra = await hasValidUraAdminSession(req);
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

  if (pathname === "/developers/dashboard" || pathname.startsWith("/developers/dashboard/")) {
    const devTok = req.cookies.get(DEVELOPER_SESSION_COOKIE)?.value;
    if (!devTok || !(await verifyDeveloperSession(devTok))) {
      const login = new URL("/developers/register", req.url);
      login.searchParams.set("next", pathname + req.nextUrl.search);
      const res = NextResponse.redirect(login);
      res.cookies.delete(DEVELOPER_SESSION_COOKIE);
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

  const payTok = req.cookies.get(PAY_ADMIN_COOKIE)?.value;
  const payOk = payTok ? await verifyPayAdminJwt(payTok) : null;
  const hasUra = await hasValidUraAdminSession(req);
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
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/admin",
    "/admin/:path*",
    "/school-admin",
    "/school-admin/:path*",
    "/student",
    "/student/:path*",
    "/my",
    "/my/:path*",
    "/developers/dashboard",
    "/developers/dashboard/:path*",
  ],
};
