export async function reset() {}
export function seed() {
  return {
    refine: () => Promise.resolve(),
  };
}
