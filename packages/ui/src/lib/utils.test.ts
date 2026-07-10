import { expect, test } from "vite-plus/test";

import { cn } from "./utils";

test("cn merges tailwind classes correctly", () => {
  expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  expect(cn("px-2 py-1", "p-3")).toBe("p-3");
});
