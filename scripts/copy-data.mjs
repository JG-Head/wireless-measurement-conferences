import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("docs/data", { recursive: true });
copyFileSync("data/conferences.json", "docs/data/conferences.json");
copyFileSync("data/affinity.json", "docs/data/affinity.json");
copyFileSync("data/journals.json", "docs/data/journals.json");
