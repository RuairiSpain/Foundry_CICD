import { createPrivateKey, sign } from "node:crypto";

export function createAppJwt(clientId: string, privateKeyPem: string, now = Math.floor(Date.now() / 1000)): string {
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(clientId) || !Number.isSafeInteger(now) || now < 60 || !Number.isSafeInteger(now + 540)) {
    throw new Error("Invalid GitHub App identity or clock.");
  }
  const key = createPrivateKey(privateKeyPem);
  if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
    throw new Error("A GitHub App RSA private key of at least 2048 bits is required.");
  }
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const message = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: clientId, iat: now - 60, exp: now + 540 })}`;
  const signature = sign("RSA-SHA256", Buffer.from(message), key).toString("base64url");
  return `${message}.${signature}`;
}
