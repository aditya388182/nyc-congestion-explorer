import { pino } from "pino";

/** JSON logs. Never log request bodies or variables. */
export const logger = pino({ level: process.env["LOG_LEVEL"] ?? "info", base: { service: "congestion-api" } });
