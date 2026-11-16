import { join } from "node:path";
import { createApp } from "../lib/app.js";

createApp(join(__dirname, "..", "..", "web", "dist"));
