import { z } from "zod";

/** Programme `code` as stored (uppercased on write). Allows slashes, e.g. `BEP-ENG/RE`. */
export const programmeCodeSchema = z
  .string()
  .min(2)
  .max(24)
  .regex(/^[A-Za-z0-9/_-]+$/, "Use letters, numbers, hyphen, underscore, or slash");
