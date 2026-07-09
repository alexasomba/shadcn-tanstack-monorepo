import type { GetTypeByName } from "@content-collections/core";

import type configuration from "../../content-collections.ts";

export type Speaker = GetTypeByName<typeof configuration, "speakers">;
export declare const allSpeakers: Array<Speaker>;

export type Talk = GetTypeByName<typeof configuration, "talks">;
export declare const allTalks: Array<Talk>;
