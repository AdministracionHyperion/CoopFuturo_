import * as mock from "./mock";
import * as live from "./live";

const mode = process.env.NEXT_PUBLIC_API_MODE ?? "live";

export const api = mode === "live" ? live : mock;
export { createLiveEvent } from "./mock";
