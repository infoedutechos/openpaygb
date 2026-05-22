const fs = require("fs");
const p = "components/admin/AdminProgrammesManager.tsx";
let s = fs.readFileSync(p, "utf8");
const bad = "\r\n</td>\r\n    </tr>\r\n  );\r\n}\r\n";
if (s.endsWith(bad)) {
  fs.writeFileSync(p, s.slice(0, -bad.length));
  console.log("trimmed crlf");
} else {
  const badLf = "\n</td>\n    </tr>\n  );\n}\n";
  if (s.endsWith(badLf)) {
    fs.writeFileSync(p, s.slice(0, -badLf.length));
    console.log("trimmed lf");
  } else {
    console.log("no match tail:", JSON.stringify(s.slice(-80)));
    process.exit(1);
  }
}
