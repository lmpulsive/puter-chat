declare global { interface Window { puter?: any } }

export async function getPuter() {
  if (typeof window === "undefined") throw new Error("Puter is client-only");
  if (window.puter) return window.puter;
  await new Promise<void>((resolve) => {
    const check = () => (window.puter ? resolve() : setTimeout(check, 20));
    check();
  });
  return window.puter!;
}
