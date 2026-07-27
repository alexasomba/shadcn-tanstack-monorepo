/**
 * Thin wrappers around Better Auth twoFactor + passkey client APIs.
 */
import { authClient } from "#/lib/auth-client";

function errMsg(
  error: { message?: string | null; statusText?: string } | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;
  return error.message || error.statusText || fallback;
}

async function unwrap<T>(
  promise: Promise<{ data: T; error: { message?: string | null; statusText?: string } | null }>,
  fallback: string,
): Promise<T> {
  const res = await promise;
  if (res.error) throw new Error(errMsg(res.error, fallback));
  return res.data;
}

// —— Two-factor ——

export async function enableTotp(password: string) {
  return unwrap(
    authClient.twoFactor.enable({
      password,
      method: "totp",
    }),
    "Could not enable 2FA",
  );
}

export async function enableOtpMethod(password: string) {
  return unwrap(
    authClient.twoFactor.enable({
      password,
      method: "otp",
    }),
    "Could not enable email OTP 2FA",
  );
}

export async function disableTwoFactor(password: string) {
  return unwrap(authClient.twoFactor.disable({ password }), "Could not disable 2FA");
}

export async function verifyTotpSetup(code: string) {
  return unwrap(authClient.twoFactor.verifyTotp({ code }), "Invalid authenticator code");
}

export async function verifyTotpChallenge(code: string, trustDevice?: boolean) {
  return unwrap(
    authClient.twoFactor.verifyTotp({
      code,
      ...(trustDevice !== undefined ? { trustDevice } : {}),
    }),
    "Invalid authenticator code",
  );
}

export async function sendTwoFactorOtp() {
  // Body schema is fully optional on the server; call with no payload.
  return unwrap(authClient.twoFactor.sendOtp(), "Could not send OTP");
}

export async function verifyTwoFactorOtp(code: string, trustDevice?: boolean) {
  return unwrap(
    authClient.twoFactor.verifyOtp({
      code,
      ...(trustDevice !== undefined ? { trustDevice } : {}),
    }),
    "Invalid OTP",
  );
}

export async function generateBackupCodes(password: string) {
  return unwrap(
    authClient.twoFactor.generateBackupCodes({ password }),
    "Could not generate backup codes",
  );
}

export async function verifyBackupCode(code: string, trustDevice?: boolean) {
  return unwrap(
    authClient.twoFactor.verifyBackupCode({
      code,
      ...(trustDevice !== undefined ? { trustDevice } : {}),
    }),
    "Invalid backup code",
  );
}

export async function getTotpUri(password: string) {
  return unwrap(authClient.twoFactor.getTotpUri({ password }), "Could not load TOTP URI");
}

// —— Passkeys ——

export type PasskeyRecord = {
  id: string;
  name?: string | null;
  deviceType?: string | null;
  createdAt?: Date | string;
  backedUp?: boolean;
  credentialID?: string;
};

export async function listPasskeys(): Promise<PasskeyRecord[]> {
  const data = await unwrap(authClient.passkey.listUserPasskeys(), "Could not list passkeys");
  return data as PasskeyRecord[];
}

export async function addPasskey(name?: string) {
  return unwrap(authClient.passkey.addPasskey(name ? { name } : {}), "Could not register passkey");
}

export async function deletePasskey(id: string) {
  return unwrap(authClient.passkey.deletePasskey({ id }), "Could not delete passkey");
}

export const AUTH_REDIRECT_KEY = "auth-post-login-redirect";

export function stashAuthRedirect(path: string | undefined) {
  if (typeof window === "undefined") return;
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
  } else {
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  }
}

export function takeAuthRedirect(fallback = "/dashboard"): string {
  if (typeof window === "undefined") return fallback;
  const v = sessionStorage.getItem(AUTH_REDIRECT_KEY);
  sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  if (v && v.startsWith("/") && !v.startsWith("//")) return v;
  return fallback;
}
