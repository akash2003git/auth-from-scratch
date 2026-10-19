import { reset, seed } from "drizzle-seed";
import { db } from "./index";
import * as schema from "./schema";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the seed script in production.");
  }

  try {
    // Start from a clean database so the seed script can be run repeatedly.
    await reset(db, schema);
    await seed(db, schema);
  } finally {
    await db.$client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
