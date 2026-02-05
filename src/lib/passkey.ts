
/**
 * @fileOverview Utilitaires pour la gestion des Passkeys (WebAuthn).
 */

export async function createPasskey(username: string): Promise<string> {
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const options: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "Exu Play",
      id: window.location.hostname === "localhost" ? undefined : window.location.hostname,
    },
    user: {
      id: userId,
      name: username,
      displayName: username,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "required",
      requireResidentKey: true,
    },
    timeout: 60000,
    attestation: "none",
  };

  const credential = (await navigator.credentials.create({
    publicKey: options,
  })) as PublicKeyCredential;

  if (!credential) throw new Error("Échec de la création du Sceau");

  return btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
}

export async function verifyPasskey(credentialId: string): Promise<boolean> {
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const rawId = Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0));

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [
      {
        id: rawId,
        type: "public-key",
      },
    ],
    userVerification: "required",
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: options,
  });

  return !!assertion;
}
