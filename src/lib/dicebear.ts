/** DiceBear avatar URL — https://www.dicebear.com */
export function diceBearAvatarUrl(seed: string, backgroundColor = "151515") {
  const params = new URLSearchParams({
    seed,
    backgroundColor,
    radius: "50",
  });
  return `https://api.dicebear.com/9.x/personas/svg?${params.toString()}`;
}
