import fs from "node:fs";
const p = "middleware.ts";
let c = fs.readFileSync(p, "utf8");
const old = `    if (pathname === "/student/guest" || pathname.startsWith("/student/guest")) {
      if (await hasValidStudentCookie(req)) {
        return NextResponse.redirect(new URL("/student", req.url));
      }
      if (req.cookies.has(STUDENT_SIGNUP_COOKIE)) {`;
const neu = `    if (pathname === "/student/guest" || pathname.startsWith("/student/guest")) {
      const studentTok = req.cookies.get(STUDENT_COOKIE)?.value;
      if (studentTok) {
        if (await verifyStudentJwt(studentTok)) {
          return NextResponse.redirect(new URL("/student", req.url));
        }
        const cleared = NextResponse.next({ request: { headers: requestHeaders } });
        cleared.cookies.delete(STUDENT_COOKIE);
        return cleared;
      }
      if (req.cookies.has(STUDENT_SIGNUP_COOKIE)) {`;
if (!c.includes(old)) {
  console.error("patch target not found");
  process.exit(1);
}
fs.writeFileSync(p, c.replace(old, neu));
console.log("patched");
