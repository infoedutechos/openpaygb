import fs from "fs";

const path = ".env.example";
let content = fs.readFileSync(path, "utf8");
content = content.replace(
  /# Canonical public site URL \(OAuth redirects, emails, webhooks\)\. Must match the URL users`n# actually open in the browser for those flows; TON Connect manifest uses the request host`n# \(window\.location\.origin on the client\), not this env value\.`nNEXT_PUBLIC_APP_URL=http:\/\/localhost:3000/,
  `# Canonical public site URL (OAuth redirects, emails, webhooks). Must match the URL users
# actually open in the browser for those flows; TON Connect manifest uses the request host
# (window.location.origin on the client), not this env value.
NEXT_PUBLIC_APP_URL=http://localhost:3000`,
);
fs.writeFileSync(path, content);
