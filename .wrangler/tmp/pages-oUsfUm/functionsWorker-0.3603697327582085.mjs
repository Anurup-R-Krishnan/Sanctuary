var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-eRY6KR/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// ../node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs
var DEV_OR_STAGING_SUFFIXES = [
  ".lcl.dev",
  ".stg.dev",
  ".lclstage.dev",
  ".stgstage.dev",
  ".dev.lclclerk.com",
  ".stg.lclclerk.com",
  ".accounts.lclclerk.com",
  "accountsstage.dev",
  "accounts.dev"
];

// ../node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs
var isomorphicAtob = /* @__PURE__ */ __name((data) => {
  if (typeof atob !== "undefined" && typeof atob === "function") return atob(data);
  else if (typeof global !== "undefined" && global.Buffer) return new global.Buffer(data, "base64").toString();
  return data;
}, "isomorphicAtob");

// ../node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs
function createDevOrStagingUrlCache() {
  const devOrStagingUrlCache = /* @__PURE__ */ new Map();
  return { isDevOrStagingUrl: /* @__PURE__ */ __name((url) => {
    if (!url) return false;
    const hostname = typeof url === "string" ? url : url.hostname;
    let res = devOrStagingUrlCache.get(hostname);
    if (res === void 0) {
      res = DEV_OR_STAGING_SUFFIXES.some((s) => hostname.endsWith(s));
      devOrStagingUrlCache.set(hostname, res);
    }
    return res;
  }, "isDevOrStagingUrl") };
}
__name(createDevOrStagingUrlCache, "createDevOrStagingUrlCache");

// ../node_modules/@clerk/shared/dist/runtime/retry-DAlTROH9.mjs
var defaultOptions = {
  initialDelay: 125,
  maxDelayBetweenRetries: 0,
  factor: 2,
  shouldRetry: /* @__PURE__ */ __name((_, iteration) => iteration < 5, "shouldRetry"),
  retryImmediately: false,
  jitter: true
};
var RETRY_IMMEDIATELY_DELAY = 100;
var sleep = /* @__PURE__ */ __name(async (ms) => new Promise((s) => setTimeout(s, ms)), "sleep");
var applyJitter = /* @__PURE__ */ __name((delay, jitter) => {
  return jitter ? delay * (1 + Math.random()) : delay;
}, "applyJitter");
var createExponentialDelayAsyncFn = /* @__PURE__ */ __name((opts) => {
  let timesCalled = 0;
  const calculateDelayInMs = /* @__PURE__ */ __name(() => {
    const constant = opts.initialDelay;
    const base = opts.factor;
    let delay = constant * Math.pow(base, timesCalled);
    delay = applyJitter(delay, opts.jitter);
    return Math.min(opts.maxDelayBetweenRetries || delay, delay);
  }, "calculateDelayInMs");
  return async () => {
    await sleep(calculateDelayInMs());
    timesCalled++;
  };
}, "createExponentialDelayAsyncFn");
var retry = /* @__PURE__ */ __name(async (callback, options = {}) => {
  let iterations = 0;
  const { shouldRetry, initialDelay, maxDelayBetweenRetries, factor, retryImmediately, jitter, onBeforeRetry } = {
    ...defaultOptions,
    ...options
  };
  const delay = createExponentialDelayAsyncFn({
    initialDelay,
    maxDelayBetweenRetries,
    factor,
    jitter
  });
  while (true) try {
    return await callback();
  } catch (e) {
    iterations++;
    if (!shouldRetry(e, iterations)) throw e;
    if (onBeforeRetry) await onBeforeRetry(iterations);
    if (retryImmediately && iterations === 1) await sleep(applyJitter(RETRY_IMMEDIATELY_DELAY, jitter));
    else await delay();
  }
}, "retry");

// ../node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs
function createErrorTypeGuard(ErrorClass) {
  function typeGuard(error) {
    const target = error ?? this;
    if (!target) throw new TypeError(`${ErrorClass.kind || ErrorClass.name} type guard requires an error object`);
    if (ErrorClass.kind && typeof target === "object" && target !== null && "constructor" in target) {
      if (target.constructor?.kind === ErrorClass.kind) return true;
    }
    return target instanceof ErrorClass;
  }
  __name(typeGuard, "typeGuard");
  return typeGuard;
}
__name(createErrorTypeGuard, "createErrorTypeGuard");
var ClerkAPIError = class {
  static {
    __name(this, "ClerkAPIError");
  }
  static kind = "ClerkApiError";
  code;
  message;
  longMessage;
  meta;
  constructor(json) {
    const parsedError = {
      code: json.code,
      message: json.message,
      longMessage: json.long_message,
      meta: {
        paramName: json.meta?.param_name,
        sessionId: json.meta?.session_id,
        emailAddresses: json.meta?.email_addresses,
        identifiers: json.meta?.identifiers,
        zxcvbn: json.meta?.zxcvbn,
        plan: json.meta?.plan,
        isPlanUpgradePossible: json.meta?.is_plan_upgrade_possible
      }
    };
    this.code = parsedError.code;
    this.message = parsedError.message;
    this.longMessage = parsedError.longMessage;
    this.meta = parsedError.meta;
  }
};
var isClerkAPIError = createErrorTypeGuard(ClerkAPIError);
var ClerkError = class ClerkError2 extends Error {
  static {
    __name(this, "ClerkError");
  }
  static kind = "ClerkError";
  clerkError = true;
  code;
  longMessage;
  docsUrl;
  cause;
  get name() {
    return this.constructor.name;
  }
  constructor(opts) {
    super(new.target.formatMessage(new.target.kind, opts.message, opts.code, opts.docsUrl), { cause: opts.cause });
    Object.setPrototypeOf(this, ClerkError2.prototype);
    this.code = opts.code;
    this.docsUrl = opts.docsUrl;
    this.longMessage = opts.longMessage;
    this.cause = opts.cause;
  }
  toString() {
    return `[${this.name}]
Message:${this.message}`;
  }
  static formatMessage(name, msg, code, docsUrl) {
    const prefix = "Clerk:";
    const regex = new RegExp(prefix.replace(" ", "\\s*"), "i");
    msg = msg.replace(regex, "");
    msg = `${prefix} ${msg.trim()}

(code="${code}")

`;
    if (docsUrl) msg += `

Docs: ${docsUrl}`;
    return msg;
  }
};
var ClerkAPIResponseError = class ClerkAPIResponseError2 extends ClerkError {
  static {
    __name(this, "ClerkAPIResponseError");
  }
  static kind = "ClerkAPIResponseError";
  status;
  clerkTraceId;
  retryAfter;
  errors;
  constructor(message, options) {
    const { data: errorsJson, status, clerkTraceId, retryAfter } = options;
    super({
      ...options,
      message,
      code: "api_response_error"
    });
    Object.setPrototypeOf(this, ClerkAPIResponseError2.prototype);
    this.status = status;
    this.clerkTraceId = clerkTraceId;
    this.retryAfter = retryAfter;
    this.errors = (errorsJson || []).map((e) => new ClerkAPIError(e));
  }
  toString() {
    let message = `[${this.name}]
Message:${this.message}
Status:${this.status}
Serialized errors: ${this.errors.map((e) => JSON.stringify(e))}`;
    if (this.clerkTraceId) message += `
Clerk Trace ID: ${this.clerkTraceId}`;
    return message;
  }
  static formatMessage(name, msg, _, __) {
    return msg;
  }
};
var isClerkAPIResponseError = createErrorTypeGuard(ClerkAPIResponseError);
var DefaultMessages = Object.freeze({
  InvalidProxyUrlErrorMessage: `The proxyUrl passed to Clerk is invalid. The expected value for proxyUrl is an absolute URL or a relative path with a leading '/'. (key={{url}})`,
  InvalidPublishableKeyErrorMessage: `The publishableKey passed to Clerk is invalid. You can get your Publishable key at https://dashboard.clerk.com/last-active?path=api-keys. (key={{key}})`,
  MissingPublishableKeyErrorMessage: `Missing publishableKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
  MissingSecretKeyErrorMessage: `Missing secretKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
  MissingClerkProvider: `{{source}} can only be used within the <ClerkProvider /> component. Learn more: https://clerk.com/docs/components/clerk-provider`
});
function buildErrorThrower({ packageName, customMessages }) {
  let pkg = packageName;
  function buildMessage(rawMessage, replacements) {
    if (!replacements) return `${pkg}: ${rawMessage}`;
    let msg = rawMessage;
    const matches = rawMessage.matchAll(/{{([a-zA-Z0-9-_]+)}}/g);
    for (const match3 of matches) {
      const replacement = (replacements[match3[1]] || "").toString();
      msg = msg.replace(`{{${match3[1]}}}`, replacement);
    }
    return `${pkg}: ${msg}`;
  }
  __name(buildMessage, "buildMessage");
  const messages = {
    ...DefaultMessages,
    ...customMessages
  };
  return {
    setPackageName({ packageName: packageName$1 }) {
      if (typeof packageName$1 === "string") pkg = packageName$1;
      return this;
    },
    setMessages({ customMessages: customMessages$1 }) {
      Object.assign(messages, customMessages$1 || {});
      return this;
    },
    throwInvalidPublishableKeyError(params) {
      throw new Error(buildMessage(messages.InvalidPublishableKeyErrorMessage, params));
    },
    throwInvalidProxyUrl(params) {
      throw new Error(buildMessage(messages.InvalidProxyUrlErrorMessage, params));
    },
    throwMissingPublishableKeyError() {
      throw new Error(buildMessage(messages.MissingPublishableKeyErrorMessage));
    },
    throwMissingSecretKeyError() {
      throw new Error(buildMessage(messages.MissingSecretKeyErrorMessage));
    },
    throwMissingClerkProviderError(params) {
      throw new Error(buildMessage(messages.MissingClerkProvider, params));
    },
    throw(message) {
      throw new Error(buildMessage(message));
    }
  };
}
__name(buildErrorThrower, "buildErrorThrower");
var ClerkRuntimeError = class ClerkRuntimeError2 extends ClerkError {
  static {
    __name(this, "ClerkRuntimeError");
  }
  static kind = "ClerkRuntimeError";
  /**
  * @deprecated Use `clerkError` property instead. This property is maintained for backward compatibility.
  */
  clerkRuntimeError = true;
  constructor(message, options) {
    super({
      ...options,
      message
    });
    Object.setPrototypeOf(this, ClerkRuntimeError2.prototype);
  }
};
var isClerkRuntimeError = createErrorTypeGuard(ClerkRuntimeError);

// ../node_modules/@clerk/backend/dist/chunk-YBVFDYDR.mjs
var errorThrower = buildErrorThrower({ packageName: "@clerk/backend" });
var { isDevOrStagingUrl } = createDevOrStagingUrlCache();

// ../node_modules/@clerk/backend/dist/chunk-TCIXZLLW.mjs
var TokenVerificationErrorCode = {
  InvalidSecretKey: "clerk_key_invalid"
};
var TokenVerificationErrorReason = {
  TokenExpired: "token-expired",
  TokenInvalid: "token-invalid",
  TokenInvalidAlgorithm: "token-invalid-algorithm",
  TokenInvalidAuthorizedParties: "token-invalid-authorized-parties",
  TokenInvalidSignature: "token-invalid-signature",
  TokenNotActiveYet: "token-not-active-yet",
  TokenIatInTheFuture: "token-iat-in-the-future",
  TokenVerificationFailed: "token-verification-failed",
  InvalidSecretKey: "secret-key-invalid",
  LocalJWKMissing: "jwk-local-missing",
  RemoteJWKFailedToLoad: "jwk-remote-failed-to-load",
  RemoteJWKInvalid: "jwk-remote-invalid",
  RemoteJWKMissing: "jwk-remote-missing",
  JWKFailedToResolve: "jwk-failed-to-resolve",
  JWKKidMismatch: "jwk-kid-mismatch"
};
var TokenVerificationErrorAction = {
  ContactSupport: "Contact support@clerk.com",
  EnsureClerkJWT: "Make sure that this is a valid Clerk-generated JWT.",
  SetClerkJWTKey: "Set the CLERK_JWT_KEY environment variable.",
  SetClerkSecretKey: "Set the CLERK_SECRET_KEY environment variable.",
  EnsureClockSync: "Make sure your system clock is in sync (e.g. turn off and on automatic time synchronization)."
};
var TokenVerificationError = class _TokenVerificationError extends Error {
  static {
    __name(this, "_TokenVerificationError");
  }
  constructor({
    action,
    message,
    reason
  }) {
    super(message);
    Object.setPrototypeOf(this, _TokenVerificationError.prototype);
    this.reason = reason;
    this.message = message;
    this.action = action;
  }
  getFullMessage() {
    return `${[this.message, this.action].filter((m) => m).join(" ")} (reason=${this.reason}, token-carrier=${this.tokenCarrier})`;
  }
};

// ../node_modules/@clerk/backend/dist/runtime/browser/crypto.mjs
var webcrypto = crypto;

// ../node_modules/@clerk/backend/dist/chunk-7X3P2E3X.mjs
var globalFetch = fetch.bind(globalThis);
var runtime = {
  crypto: webcrypto,
  get fetch() {
    return false ? fetch : globalFetch;
  },
  AbortController: globalThis.AbortController,
  Blob: globalThis.Blob,
  FormData: globalThis.FormData,
  Headers: globalThis.Headers,
  Request: globalThis.Request,
  Response: globalThis.Response
};
var base64url = {
  parse(string, opts) {
    return parse(string, base64UrlEncoding, opts);
  },
  stringify(data, opts) {
    return stringify(data, base64UrlEncoding, opts);
  }
};
var base64UrlEncoding = {
  chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  bits: 6
};
function parse(string, encoding, opts = {}) {
  if (!encoding.codes) {
    encoding.codes = {};
    for (let i = 0; i < encoding.chars.length; ++i) {
      encoding.codes[encoding.chars[i]] = i;
    }
  }
  if (!opts.loose && string.length * encoding.bits & 7) {
    throw new SyntaxError("Invalid padding");
  }
  let end = string.length;
  while (string[end - 1] === "=") {
    --end;
    if (!opts.loose && !((string.length - end) * encoding.bits & 7)) {
      throw new SyntaxError("Invalid padding");
    }
  }
  const out = new (opts.out ?? Uint8Array)(end * encoding.bits / 8 | 0);
  let bits = 0;
  let buffer = 0;
  let written = 0;
  for (let i = 0; i < end; ++i) {
    const value = encoding.codes[string[i]];
    if (value === void 0) {
      throw new SyntaxError("Invalid character " + string[i]);
    }
    buffer = buffer << encoding.bits | value;
    bits += encoding.bits;
    if (bits >= 8) {
      bits -= 8;
      out[written++] = 255 & buffer >> bits;
    }
  }
  if (bits >= encoding.bits || 255 & buffer << 8 - bits) {
    throw new SyntaxError("Unexpected end of data");
  }
  return out;
}
__name(parse, "parse");
function stringify(data, encoding, opts = {}) {
  const { pad = true } = opts;
  const mask = (1 << encoding.bits) - 1;
  let out = "";
  let bits = 0;
  let buffer = 0;
  for (let i = 0; i < data.length; ++i) {
    buffer = buffer << 8 | 255 & data[i];
    bits += 8;
    while (bits > encoding.bits) {
      bits -= encoding.bits;
      out += encoding.chars[mask & buffer >> bits];
    }
  }
  if (bits) {
    out += encoding.chars[mask & buffer << encoding.bits - bits];
  }
  if (pad) {
    while (out.length * encoding.bits & 7) {
      out += "=";
    }
  }
  return out;
}
__name(stringify, "stringify");
var algToHash = {
  RS256: "SHA-256",
  RS384: "SHA-384",
  RS512: "SHA-512"
};
var RSA_ALGORITHM_NAME = "RSASSA-PKCS1-v1_5";
var jwksAlgToCryptoAlg = {
  RS256: RSA_ALGORITHM_NAME,
  RS384: RSA_ALGORITHM_NAME,
  RS512: RSA_ALGORITHM_NAME
};
var algs = Object.keys(algToHash);
function getCryptoAlgorithm(algorithmName) {
  const hash = algToHash[algorithmName];
  const name = jwksAlgToCryptoAlg[algorithmName];
  if (!hash || !name) {
    throw new Error(`Unsupported algorithm ${algorithmName}, expected one of ${algs.join(",")}.`);
  }
  return {
    hash: { name: algToHash[algorithmName] },
    name: jwksAlgToCryptoAlg[algorithmName]
  };
}
__name(getCryptoAlgorithm, "getCryptoAlgorithm");
var isArrayString = /* @__PURE__ */ __name((s) => {
  return Array.isArray(s) && s.length > 0 && s.every((a) => typeof a === "string");
}, "isArrayString");
var assertAudienceClaim = /* @__PURE__ */ __name((aud, audience) => {
  const audienceList = [audience].flat().filter((a) => !!a);
  const audList = [aud].flat().filter((a) => !!a);
  const shouldVerifyAudience = audienceList.length > 0 && audList.length > 0;
  if (!shouldVerifyAudience) {
    return;
  }
  if (typeof aud === "string") {
    if (!audienceList.includes(aud)) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.EnsureClerkJWT,
        reason: TokenVerificationErrorReason.TokenVerificationFailed,
        message: `Invalid JWT audience claim (aud) ${JSON.stringify(aud)}. Is not included in "${JSON.stringify(
          audienceList
        )}".`
      });
    }
  } else if (isArrayString(aud)) {
    if (!aud.some((a) => audienceList.includes(a))) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.EnsureClerkJWT,
        reason: TokenVerificationErrorReason.TokenVerificationFailed,
        message: `Invalid JWT audience claim array (aud) ${JSON.stringify(aud)}. Is not included in "${JSON.stringify(
          audienceList
        )}".`
      });
    }
  }
}, "assertAudienceClaim");
var assertHeaderType = /* @__PURE__ */ __name((typ, allowedTypes = "JWT") => {
  if (typeof typ === "undefined") {
    return;
  }
  const allowed = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
  if (!allowed.includes(typ)) {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenInvalid,
      message: `Invalid JWT type ${JSON.stringify(typ)}. Expected "${allowed.join(", ")}".`
    });
  }
}, "assertHeaderType");
var assertHeaderAlgorithm = /* @__PURE__ */ __name((alg) => {
  if (!algs.includes(alg)) {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenInvalidAlgorithm,
      message: `Invalid JWT algorithm ${JSON.stringify(alg)}. Supported: ${algs}.`
    });
  }
}, "assertHeaderAlgorithm");
var assertSubClaim = /* @__PURE__ */ __name((sub) => {
  if (typeof sub !== "string") {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenVerificationFailed,
      message: `Subject claim (sub) is required and must be a string. Received ${JSON.stringify(sub)}.`
    });
  }
}, "assertSubClaim");
var assertAuthorizedPartiesClaim = /* @__PURE__ */ __name((azp, authorizedParties) => {
  if (!azp || !authorizedParties || authorizedParties.length === 0) {
    return;
  }
  if (!authorizedParties.includes(azp)) {
    throw new TokenVerificationError({
      reason: TokenVerificationErrorReason.TokenInvalidAuthorizedParties,
      message: `Invalid JWT Authorized party claim (azp) ${JSON.stringify(azp)}. Expected "${authorizedParties}".`
    });
  }
}, "assertAuthorizedPartiesClaim");
var assertExpirationClaim = /* @__PURE__ */ __name((exp, clockSkewInMs) => {
  if (typeof exp !== "number") {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenVerificationFailed,
      message: `Invalid JWT expiry date claim (exp) ${JSON.stringify(exp)}. Expected number.`
    });
  }
  const currentDate = new Date(Date.now());
  const expiryDate = /* @__PURE__ */ new Date(0);
  expiryDate.setUTCSeconds(exp);
  const expired = expiryDate.getTime() <= currentDate.getTime() - clockSkewInMs;
  if (expired) {
    throw new TokenVerificationError({
      reason: TokenVerificationErrorReason.TokenExpired,
      message: `JWT is expired. Expiry date: ${expiryDate.toUTCString()}, Current date: ${currentDate.toUTCString()}.`
    });
  }
}, "assertExpirationClaim");
var assertActivationClaim = /* @__PURE__ */ __name((nbf, clockSkewInMs) => {
  if (typeof nbf === "undefined") {
    return;
  }
  if (typeof nbf !== "number") {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenVerificationFailed,
      message: `Invalid JWT not before date claim (nbf) ${JSON.stringify(nbf)}. Expected number.`
    });
  }
  const currentDate = new Date(Date.now());
  const notBeforeDate = /* @__PURE__ */ new Date(0);
  notBeforeDate.setUTCSeconds(nbf);
  const early = notBeforeDate.getTime() > currentDate.getTime() + clockSkewInMs;
  if (early) {
    throw new TokenVerificationError({
      reason: TokenVerificationErrorReason.TokenNotActiveYet,
      message: `JWT cannot be used prior to not before date claim (nbf). Not before date: ${notBeforeDate.toUTCString()}; Current date: ${currentDate.toUTCString()};`
    });
  }
}, "assertActivationClaim");
var assertIssuedAtClaim = /* @__PURE__ */ __name((iat, clockSkewInMs) => {
  if (typeof iat === "undefined") {
    return;
  }
  if (typeof iat !== "number") {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenVerificationFailed,
      message: `Invalid JWT issued at date claim (iat) ${JSON.stringify(iat)}. Expected number.`
    });
  }
  const currentDate = new Date(Date.now());
  const issuedAtDate = /* @__PURE__ */ new Date(0);
  issuedAtDate.setUTCSeconds(iat);
  const postIssued = issuedAtDate.getTime() > currentDate.getTime() + clockSkewInMs;
  if (postIssued) {
    throw new TokenVerificationError({
      reason: TokenVerificationErrorReason.TokenIatInTheFuture,
      message: `JWT issued at date claim (iat) is in the future. Issued at date: ${issuedAtDate.toUTCString()}; Current date: ${currentDate.toUTCString()};`
    });
  }
}, "assertIssuedAtClaim");
function pemToBuffer(secret) {
  const trimmed = secret.replace(/-----BEGIN.*?-----/g, "").replace(/-----END.*?-----/g, "").replace(/\s/g, "");
  const decoded = isomorphicAtob(trimmed);
  const buffer = new ArrayBuffer(decoded.length);
  const bufView = new Uint8Array(buffer);
  for (let i = 0, strLen = decoded.length; i < strLen; i++) {
    bufView[i] = decoded.charCodeAt(i);
  }
  return bufView;
}
__name(pemToBuffer, "pemToBuffer");
function importKey(key, algorithm, keyUsage) {
  if (typeof key === "object") {
    return runtime.crypto.subtle.importKey("jwk", key, algorithm, false, [keyUsage]);
  }
  const keyData = pemToBuffer(key);
  const format = keyUsage === "sign" ? "pkcs8" : "spki";
  return runtime.crypto.subtle.importKey(format, keyData, algorithm, false, [keyUsage]);
}
__name(importKey, "importKey");
var DEFAULT_CLOCK_SKEW_IN_MS = 5 * 1e3;
async function hasValidSignature(jwt, key) {
  const { header, signature, raw } = jwt;
  const encoder = new TextEncoder();
  const data = encoder.encode([raw.header, raw.payload].join("."));
  const algorithm = getCryptoAlgorithm(header.alg);
  try {
    const cryptoKey = await importKey(key, algorithm, "verify");
    const verified = await runtime.crypto.subtle.verify(algorithm.name, cryptoKey, signature, data);
    return { data: verified };
  } catch (error) {
    return {
      errors: [
        new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenInvalidSignature,
          message: error?.message
        })
      ]
    };
  }
}
__name(hasValidSignature, "hasValidSignature");
function decodeJwt(token) {
  const tokenParts = (token || "").toString().split(".");
  if (tokenParts.length !== 3) {
    return {
      errors: [
        new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenInvalid,
          message: `Invalid JWT form. A JWT consists of three parts separated by dots.`
        })
      ]
    };
  }
  const [rawHeader, rawPayload, rawSignature] = tokenParts;
  const decoder = new TextDecoder();
  const header = JSON.parse(decoder.decode(base64url.parse(rawHeader, { loose: true })));
  const payload = JSON.parse(decoder.decode(base64url.parse(rawPayload, { loose: true })));
  const signature = base64url.parse(rawSignature, { loose: true });
  const data = {
    header,
    payload,
    signature,
    raw: {
      header: rawHeader,
      payload: rawPayload,
      signature: rawSignature,
      text: token
    }
  };
  return { data };
}
__name(decodeJwt, "decodeJwt");
async function verifyJwt(token, options) {
  const { audience, authorizedParties, clockSkewInMs, key, headerType } = options;
  const clockSkew = clockSkewInMs || DEFAULT_CLOCK_SKEW_IN_MS;
  const { data: decoded, errors } = decodeJwt(token);
  if (errors) {
    return { errors };
  }
  const { header, payload } = decoded;
  try {
    const { typ, alg } = header;
    assertHeaderType(typ, headerType);
    assertHeaderAlgorithm(alg);
    const { azp, sub, aud, iat, exp, nbf } = payload;
    assertSubClaim(sub);
    assertAudienceClaim([aud], [audience]);
    assertAuthorizedPartiesClaim(azp, authorizedParties);
    assertExpirationClaim(exp, clockSkew);
    assertActivationClaim(nbf, clockSkew);
    assertIssuedAtClaim(iat, clockSkew);
  } catch (err) {
    return { errors: [err] };
  }
  const { data: signatureValid, errors: signatureErrors } = await hasValidSignature(decoded, key);
  if (signatureErrors) {
    return {
      errors: [
        new TokenVerificationError({
          action: TokenVerificationErrorAction.EnsureClerkJWT,
          reason: TokenVerificationErrorReason.TokenVerificationFailed,
          message: `Error verifying JWT signature. ${signatureErrors[0]}`
        })
      ]
    };
  }
  if (!signatureValid) {
    return {
      errors: [
        new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenInvalidSignature,
          message: "JWT signature is invalid."
        })
      ]
    };
  }
  return { data: payload };
}
__name(verifyJwt, "verifyJwt");

// ../node_modules/@clerk/backend/dist/chunk-3SCGTTJP.mjs
var __create = Object.create;
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = /* @__PURE__ */ __name((cb, mod) => /* @__PURE__ */ __name(function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, "__require"), "__commonJS");
var __copyProps = /* @__PURE__ */ __name((to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp2(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
}, "__copyProps");
var __toESM = /* @__PURE__ */ __name((mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
  mod
)), "__toESM");

// ../node_modules/@clerk/backend/dist/chunk-VTUMNUVX.mjs
var require_dist = __commonJS({
  "../../node_modules/.pnpm/cookie@1.0.2/node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parse = parse22;
    exports.serialize = serialize;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = /* @__PURE__ */ __name(function() {
      }, "C");
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parse22(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = str.indexOf("=", index);
        if (eqIdx === -1)
          break;
        const colonIdx = str.indexOf(";", index);
        const endIdx = colonIdx === -1 ? len : colonIdx;
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const keyStartIdx = startIndex(str, index, eqIdx);
        const keyEndIdx = endIndex(str, eqIdx, keyStartIdx);
        const key = str.slice(keyStartIdx, keyEndIdx);
        if (obj[key] === void 0) {
          let valStartIdx = startIndex(str, eqIdx + 1, endIdx);
          let valEndIdx = endIndex(str, endIdx, valStartIdx);
          const value = dec(str.slice(valStartIdx, valEndIdx));
          obj[key] = value;
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    __name(parse22, "parse2");
    function startIndex(str, index, max) {
      do {
        const code = str.charCodeAt(index);
        if (code !== 32 && code !== 9)
          return index;
      } while (++index < max);
      return max;
    }
    __name(startIndex, "startIndex");
    function endIndex(str, index, min) {
      while (index > min) {
        const code = str.charCodeAt(--index);
        if (code !== 32 && code !== 9)
          return index + 1;
      }
      return min;
    }
    __name(endIndex, "endIndex");
    function serialize(name, val, options) {
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(name)) {
        throw new TypeError(`argument name is invalid: ${name}`);
      }
      const value = enc(val);
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${val}`);
      }
      let str = name + "=" + value;
      if (!options)
        return str;
      if (options.maxAge !== void 0) {
        if (!Number.isInteger(options.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${options.maxAge}`);
        }
        str += "; Max-Age=" + options.maxAge;
      }
      if (options.domain) {
        if (!domainValueRegExp.test(options.domain)) {
          throw new TypeError(`option domain is invalid: ${options.domain}`);
        }
        str += "; Domain=" + options.domain;
      }
      if (options.path) {
        if (!pathValueRegExp.test(options.path)) {
          throw new TypeError(`option path is invalid: ${options.path}`);
        }
        str += "; Path=" + options.path;
      }
      if (options.expires) {
        if (!isDate(options.expires) || !Number.isFinite(options.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${options.expires}`);
        }
        str += "; Expires=" + options.expires.toUTCString();
      }
      if (options.httpOnly) {
        str += "; HttpOnly";
      }
      if (options.secure) {
        str += "; Secure";
      }
      if (options.partitioned) {
        str += "; Partitioned";
      }
      if (options.priority) {
        const priority = typeof options.priority === "string" ? options.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${options.priority}`);
        }
      }
      if (options.sameSite) {
        const sameSite = typeof options.sameSite === "string" ? options.sameSite.toLowerCase() : options.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${options.sameSite}`);
        }
      }
      return str;
    }
    __name(serialize, "serialize");
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    __name(decode, "decode");
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
    __name(isDate, "isDate");
  }
});
var API_URL = "https://api.clerk.com";
var API_VERSION = "v1";
var USER_AGENT = `${"@clerk/backend"}@${"2.31.1"}`;
var MAX_CACHE_LAST_UPDATED_AT_SECONDS = 5 * 60;
var SUPPORTED_BAPI_VERSION = "2025-11-10";
var Cookies = {
  Session: "__session",
  Refresh: "__refresh",
  ClientUat: "__client_uat",
  Handshake: "__clerk_handshake",
  DevBrowser: "__clerk_db_jwt",
  RedirectCount: "__clerk_redirect_count",
  HandshakeNonce: "__clerk_handshake_nonce"
};
var QueryParameters = {
  ClerkSynced: "__clerk_synced",
  SuffixedCookies: "suffixed_cookies",
  ClerkRedirectUrl: "__clerk_redirect_url",
  // use the reference to Cookies to indicate that it's the same value
  DevBrowser: Cookies.DevBrowser,
  Handshake: Cookies.Handshake,
  HandshakeHelp: "__clerk_help",
  LegacyDevBrowser: "__dev_session",
  HandshakeReason: "__clerk_hs_reason",
  HandshakeNonce: Cookies.HandshakeNonce,
  HandshakeFormat: "format",
  Session: "__session"
};
var SEPARATOR = "/";
var MULTIPLE_SEPARATOR_REGEX = new RegExp("(?<!:)" + SEPARATOR + "{1,}", "g");
function joinPaths(...args) {
  return args.filter((p) => p).join(SEPARATOR).replace(MULTIPLE_SEPARATOR_REGEX, SEPARATOR);
}
__name(joinPaths, "joinPaths");
var _M2MTokenApi_instances;
var createRequestOptions_fn;
_M2MTokenApi_instances = /* @__PURE__ */ new WeakSet();
createRequestOptions_fn = /* @__PURE__ */ __name(function(options, machineSecretKey) {
  if (machineSecretKey) {
    return {
      ...options,
      headerParams: {
        ...options.headerParams,
        Authorization: `Bearer ${machineSecretKey}`
      }
    };
  }
  return options;
}, "createRequestOptions_fn");
var mapObjectSkip = Symbol("mapObjectSkip");
var PlainObjectConstructor = {}.constructor;
var import_cookie = __toESM(require_dist());
var cache = {};
var lastUpdatedAt = 0;
function getFromCache(kid) {
  return cache[kid];
}
__name(getFromCache, "getFromCache");
function getCacheValues() {
  return Object.values(cache);
}
__name(getCacheValues, "getCacheValues");
function setInCache(cacheKey, jwk, shouldExpire = true) {
  cache[cacheKey] = jwk;
  lastUpdatedAt = shouldExpire ? Date.now() : -1;
}
__name(setInCache, "setInCache");
var PEM_HEADER = "-----BEGIN PUBLIC KEY-----";
var PEM_TRAILER = "-----END PUBLIC KEY-----";
var RSA_PREFIX = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA";
var RSA_SUFFIX = "IDAQAB";
function loadClerkJwkFromPem(params) {
  const { kid, pem } = params;
  const prefixedKid = `local-${kid}`;
  const cachedJwk = getFromCache(prefixedKid);
  if (cachedJwk) {
    return cachedJwk;
  }
  if (!pem) {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.SetClerkJWTKey,
      message: "Missing local JWK.",
      reason: TokenVerificationErrorReason.LocalJWKMissing
    });
  }
  const modulus = pem.replace(/\r\n|\n|\r/g, "").replace(PEM_HEADER, "").replace(PEM_TRAILER, "").replace(RSA_PREFIX, "").replace(RSA_SUFFIX, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwk = { kid: prefixedKid, kty: "RSA", alg: "RS256", n: modulus, e: "AQAB" };
  setInCache(prefixedKid, jwk, false);
  return jwk;
}
__name(loadClerkJwkFromPem, "loadClerkJwkFromPem");
async function loadClerkJWKFromRemote(params) {
  const { secretKey, apiUrl = API_URL, apiVersion = API_VERSION, kid, skipJwksCache } = params;
  if (skipJwksCache || cacheHasExpired() || !getFromCache(kid)) {
    if (!secretKey) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.ContactSupport,
        message: "Failed to load JWKS from Clerk Backend or Frontend API.",
        reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
      });
    }
    const fetcher = /* @__PURE__ */ __name(() => fetchJWKSFromBAPI(apiUrl, secretKey, apiVersion), "fetcher");
    const { keys } = await retry(fetcher);
    if (!keys || !keys.length) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.ContactSupport,
        message: "The JWKS endpoint did not contain any signing keys. Contact support@clerk.com.",
        reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
      });
    }
    keys.forEach((key) => setInCache(key.kid, key));
  }
  const jwk = getFromCache(kid);
  if (!jwk) {
    const cacheValues = getCacheValues();
    const jwkKeys = cacheValues.map((jwk2) => jwk2.kid).sort().join(", ");
    throw new TokenVerificationError({
      action: `Go to your Dashboard and validate your secret and public keys are correct. ${TokenVerificationErrorAction.ContactSupport} if the issue persists.`,
      message: `Unable to find a signing key in JWKS that matches the kid='${kid}' of the provided session token. Please make sure that the __session cookie or the HTTP authorization header contain a Clerk-generated session JWT. The following kid is available: ${jwkKeys}`,
      reason: TokenVerificationErrorReason.JWKKidMismatch
    });
  }
  return jwk;
}
__name(loadClerkJWKFromRemote, "loadClerkJWKFromRemote");
async function fetchJWKSFromBAPI(apiUrl, key, apiVersion) {
  if (!key) {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.SetClerkSecretKey,
      message: "Missing Clerk Secret Key or API Key. Go to https://dashboard.clerk.com and get your key for your instance.",
      reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
    });
  }
  const url = new URL(apiUrl);
  url.pathname = joinPaths(url.pathname, apiVersion, "/jwks");
  const response = await runtime.fetch(url.href, {
    headers: {
      Authorization: `Bearer ${key}`,
      "Clerk-API-Version": SUPPORTED_BAPI_VERSION,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT
    }
  });
  if (!response.ok) {
    const json = await response.json();
    const invalidSecretKeyError = getErrorObjectByCode(json?.errors, TokenVerificationErrorCode.InvalidSecretKey);
    if (invalidSecretKeyError) {
      const reason = TokenVerificationErrorReason.InvalidSecretKey;
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.ContactSupport,
        message: invalidSecretKeyError.message,
        reason
      });
    }
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.ContactSupport,
      message: `Error loading Clerk JWKS from ${url.href} with code=${response.status}`,
      reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
    });
  }
  return response.json();
}
__name(fetchJWKSFromBAPI, "fetchJWKSFromBAPI");
function cacheHasExpired() {
  if (lastUpdatedAt === -1) {
    return false;
  }
  const isExpired = Date.now() - lastUpdatedAt >= MAX_CACHE_LAST_UPDATED_AT_SECONDS * 1e3;
  if (isExpired) {
    cache = {};
  }
  return isExpired;
}
__name(cacheHasExpired, "cacheHasExpired");
var getErrorObjectByCode = /* @__PURE__ */ __name((errors, code) => {
  if (!errors) {
    return null;
  }
  return errors.find((err) => err.code === code);
}, "getErrorObjectByCode");
async function verifyToken(token, options) {
  const { data: decodedResult, errors } = decodeJwt(token);
  if (errors) {
    return { errors };
  }
  const { header } = decodedResult;
  const { kid } = header;
  try {
    let key;
    if (options.jwtKey) {
      key = loadClerkJwkFromPem({ kid, pem: options.jwtKey });
    } else if (options.secretKey) {
      key = await loadClerkJWKFromRemote({ ...options, kid });
    } else {
      return {
        errors: [
          new TokenVerificationError({
            action: TokenVerificationErrorAction.SetClerkJWTKey,
            message: "Failed to resolve JWK during verification.",
            reason: TokenVerificationErrorReason.JWKFailedToResolve
          })
        ]
      };
    }
    return await verifyJwt(token, { ...options, key });
  } catch (error) {
    return { errors: [error] };
  }
}
__name(verifyToken, "verifyToken");

// ../node_modules/@clerk/backend/dist/chunk-P263NW7Z.mjs
function withLegacyReturn(cb) {
  return async (...args) => {
    const { data, errors } = await cb(...args);
    if (errors) {
      throw errors[0];
    }
    return data;
  };
}
__name(withLegacyReturn, "withLegacyReturn");

// ../node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs
function snakeToCamel(str) {
  return str ? str.replace(/([-_][a-z])/g, (match3) => match3.toUpperCase().replace(/-|_/, "")) : "";
}
__name(snakeToCamel, "snakeToCamel");
function camelToSnake(str) {
  return str ? str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`) : "";
}
__name(camelToSnake, "camelToSnake");
var createDeepObjectTransformer = /* @__PURE__ */ __name((transform) => {
  const deepTransform = /* @__PURE__ */ __name((obj) => {
    if (!obj) return obj;
    if (Array.isArray(obj)) return obj.map((el) => {
      if (typeof el === "object" || Array.isArray(el)) return deepTransform(el);
      return el;
    });
    const copy = { ...obj };
    const keys = Object.keys(copy);
    for (const oldName of keys) {
      const newName = transform(oldName.toString());
      if (newName !== oldName) {
        copy[newName] = copy[oldName];
        delete copy[oldName];
      }
      if (typeof copy[newName] === "object") copy[newName] = deepTransform(copy[newName]);
    }
    return copy;
  }, "deepTransform");
  return deepTransform;
}, "createDeepObjectTransformer");
var deepCamelToSnake = createDeepObjectTransformer(camelToSnake);
var deepSnakeToCamel = createDeepObjectTransformer(snakeToCamel);

// ../node_modules/@clerk/backend/dist/index.mjs
var verifyToken2 = withLegacyReturn(verifyToken);

// utils/auth.ts
function getBearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}
__name(getBearerToken, "getBearerToken");
function normalizeGuestId(raw) {
  if (!raw) return "guest_anon";
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return "guest_anon";
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return "guest_anon";
  return trimmed;
}
__name(normalizeGuestId, "normalizeGuestId");
async function resolveActor(request, env) {
  const guestHeaderId = normalizeGuestId(request.headers.get("X-Guest-Id"));
  const token = getBearerToken(request);
  if (!token) {
    return { mode: "guest", userId: `guest:${guestHeaderId}` };
  }
  const secretKey = env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const payload = await verifyToken2(token, { secretKey });
    const subject = typeof payload.sub === "string" ? payload.sub.trim() : "";
    if (!subject || !subject.startsWith("user_")) return null;
    return { mode: "clerk", userId: `clerk:${subject}` };
  } catch {
    return null;
  }
}
__name(resolveActor, "resolveActor");
async function getUserId(request, env) {
  const actor = await resolveActor(request, env);
  return actor?.userId ?? null;
}
__name(getUserId, "getUserId");

// api/v2/me.ts
var onRequestGet = /* @__PURE__ */ __name(async ({ request, env }) => {
  const actor = await resolveActor(request, env);
  if (!actor) return new Response("Unauthorized", { status: 401 });
  return new Response(JSON.stringify(actor), {
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestGet");

// utils/dbSchema.ts
async function listColumns(db, table) {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  const rows = result.results || [];
  return rows.map((row) => typeof row.name === "string" ? row.name : "").filter((name) => name.length > 0);
}
__name(listColumns, "listColumns");
async function getTableInfo(db, table) {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  return (result.results || []).filter(
    (row) => !!row && typeof row.name === "string" && row.name.length > 0
  );
}
__name(getTableInfo, "getTableInfo");

// utils/schemaBootstrap.ts
var booksSchemaReady = null;
async function ensureTable(db, createSql) {
  await db.prepare(createSql).run();
}
__name(ensureTable, "ensureTable");
async function ensureColumns(db, table, columns) {
  const existing = new Set(await listColumns(db, table));
  for (const column of columns) {
    if (!existing.has(column.name)) {
      await db.prepare(column.sql).run();
    }
  }
}
__name(ensureColumns, "ensureColumns");
async function hasPrimaryKeyColumn(db, table, columnName) {
  const tableInfo = await getTableInfo(db, table);
  const column = tableInfo.find((c) => c.name === columnName);
  return !!column && Number(column.pk || 0) === 1;
}
__name(hasPrimaryKeyColumn, "hasPrimaryKeyColumn");
var SETTINGS_COLUMNS = [
  { name: "user_id", sql: "ALTER TABLE user_settings ADD COLUMN user_id TEXT NOT NULL DEFAULT ''" },
  { name: "daily_goal", sql: "ALTER TABLE user_settings ADD COLUMN daily_goal INTEGER NOT NULL DEFAULT 30" },
  { name: "weekly_goal", sql: "ALTER TABLE user_settings ADD COLUMN weekly_goal INTEGER NOT NULL DEFAULT 150" },
  { name: "theme_preset", sql: "ALTER TABLE user_settings ADD COLUMN theme_preset TEXT NOT NULL DEFAULT 'paper'" },
  { name: "font_scale", sql: "ALTER TABLE user_settings ADD COLUMN font_scale INTEGER NOT NULL DEFAULT 100" },
  { name: "line_height", sql: "ALTER TABLE user_settings ADD COLUMN line_height REAL NOT NULL DEFAULT 1.6" },
  { name: "text_width", sql: "ALTER TABLE user_settings ADD COLUMN text_width INTEGER NOT NULL DEFAULT 70" },
  { name: "motion", sql: "ALTER TABLE user_settings ADD COLUMN motion TEXT NOT NULL DEFAULT 'full'" },
  { name: "tap_zones", sql: "ALTER TABLE user_settings ADD COLUMN tap_zones INTEGER NOT NULL DEFAULT 1" },
  { name: "swipe_nav", sql: "ALTER TABLE user_settings ADD COLUMN swipe_nav INTEGER NOT NULL DEFAULT 1" },
  { name: "auto_hide_ms", sql: "ALTER TABLE user_settings ADD COLUMN auto_hide_ms INTEGER NOT NULL DEFAULT 4500" },
  { name: "show_progress", sql: "ALTER TABLE user_settings ADD COLUMN show_progress INTEGER NOT NULL DEFAULT 1" },
  { name: "show_page_meta", sql: "ALTER TABLE user_settings ADD COLUMN show_page_meta INTEGER NOT NULL DEFAULT 1" },
  { name: "accent", sql: "ALTER TABLE user_settings ADD COLUMN accent TEXT NOT NULL DEFAULT '#B37A4C'" }
];
var SESSION_COLUMNS = [
  { name: "id", sql: "ALTER TABLE reading_sessions ADD COLUMN id TEXT" },
  { name: "user_id", sql: "ALTER TABLE reading_sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT ''" },
  { name: "book_id", sql: "ALTER TABLE reading_sessions ADD COLUMN book_id TEXT NOT NULL DEFAULT ''" },
  { name: "started_at", sql: "ALTER TABLE reading_sessions ADD COLUMN started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" },
  { name: "ended_at", sql: "ALTER TABLE reading_sessions ADD COLUMN ended_at TEXT" },
  { name: "duration_sec", sql: "ALTER TABLE reading_sessions ADD COLUMN duration_sec INTEGER NOT NULL DEFAULT 0" },
  { name: "pages_advanced", sql: "ALTER TABLE reading_sessions ADD COLUMN pages_advanced INTEGER NOT NULL DEFAULT 0" },
  { name: "device", sql: "ALTER TABLE reading_sessions ADD COLUMN device TEXT NOT NULL DEFAULT 'web'" }
];
var BOOK_COLUMNS = [
  { name: "id", sql: "ALTER TABLE books ADD COLUMN id TEXT" },
  { name: "user_id", sql: "ALTER TABLE books ADD COLUMN user_id TEXT NOT NULL DEFAULT ''" },
  { name: "title", sql: "ALTER TABLE books ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled'" },
  { name: "author", sql: "ALTER TABLE books ADD COLUMN author TEXT NOT NULL DEFAULT 'Unknown'" },
  { name: "cover_url", sql: "ALTER TABLE books ADD COLUMN cover_url TEXT" },
  { name: "content_hash", sql: "ALTER TABLE books ADD COLUMN content_hash TEXT" },
  { name: "content_blob", sql: "ALTER TABLE books ADD COLUMN content_blob BLOB" },
  { name: "content_type", sql: "ALTER TABLE books ADD COLUMN content_type TEXT" },
  { name: "progress", sql: "ALTER TABLE books ADD COLUMN progress INTEGER NOT NULL DEFAULT 0" },
  { name: "total_pages", sql: "ALTER TABLE books ADD COLUMN total_pages INTEGER NOT NULL DEFAULT 100" },
  { name: "last_location", sql: "ALTER TABLE books ADD COLUMN last_location TEXT" },
  { name: "bookmarks_json", sql: "ALTER TABLE books ADD COLUMN bookmarks_json TEXT NOT NULL DEFAULT '[]'" },
  { name: "is_favorite", sql: "ALTER TABLE books ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0" },
  { name: "updated_at", sql: "ALTER TABLE books ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" }
];
async function ensureSettingsSchema(db) {
  await ensureTable(
    db,
    `CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      daily_goal INTEGER NOT NULL DEFAULT 30,
      weekly_goal INTEGER NOT NULL DEFAULT 150,
      theme_preset TEXT NOT NULL DEFAULT 'paper',
      font_scale INTEGER NOT NULL DEFAULT 100,
      line_height REAL NOT NULL DEFAULT 1.6,
      text_width INTEGER NOT NULL DEFAULT 70,
      motion TEXT NOT NULL DEFAULT 'full',
      tap_zones INTEGER NOT NULL DEFAULT 1,
      swipe_nav INTEGER NOT NULL DEFAULT 1,
      auto_hide_ms INTEGER NOT NULL DEFAULT 4500,
      show_progress INTEGER NOT NULL DEFAULT 1,
      show_page_meta INTEGER NOT NULL DEFAULT 1,
      accent TEXT NOT NULL DEFAULT '#B37A4C'
    )`
  );
  await ensureColumns(db, "user_settings", SETTINGS_COLUMNS);
  if (!await hasPrimaryKeyColumn(db, "user_settings", "user_id")) {
    await rebuildUserSettingsCanonical(db);
  }
}
__name(ensureSettingsSchema, "ensureSettingsSchema");
async function ensureSessionsSchema(db) {
  await ensureTable(
    db,
    `CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_sec INTEGER NOT NULL DEFAULT 0,
      pages_advanced INTEGER NOT NULL DEFAULT 0,
      device TEXT NOT NULL DEFAULT 'web'
    )`
  );
  await ensureColumns(db, "reading_sessions", SESSION_COLUMNS);
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON reading_sessions(user_id, started_at DESC)").run();
}
__name(ensureSessionsSchema, "ensureSessionsSchema");
async function ensureBooksSchema(db) {
  await ensureTable(
    db,
    `CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover_url TEXT,
      content_hash TEXT,
      content_blob BLOB,
      content_type TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      total_pages INTEGER NOT NULL DEFAULT 100,
      last_location TEXT,
      bookmarks_json TEXT NOT NULL DEFAULT '[]',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await ensureColumns(db, "books", BOOK_COLUMNS);
  if (!await hasPrimaryKeyColumn(db, "books", "id")) {
    await rebuildBooksTableCanonical(db);
  }
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_books_user_updated ON books(user_id, updated_at DESC)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_books_user_content_hash ON books(user_id, content_hash)").run();
}
__name(ensureBooksSchema, "ensureBooksSchema");
async function ensureBooksSchemaOnce(db) {
  if (booksSchemaReady) {
    await booksSchemaReady;
    return;
  }
  booksSchemaReady = ensureBooksSchema(db).catch((error) => {
    booksSchemaReady = null;
    throw error;
  });
  await booksSchemaReady;
}
__name(ensureBooksSchemaOnce, "ensureBooksSchemaOnce");
function createFallbackId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `book-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
__name(createFallbackId, "createFallbackId");
function toNonEmptyText(value, fallback) {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}
__name(toNonEmptyText, "toNonEmptyText");
function toOptionalText(value) {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}
__name(toOptionalText, "toOptionalText");
function toInteger(value, fallback) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}
__name(toInteger, "toInteger");
function normalizeBookmarksJson(value) {
  if (typeof value !== "string" || value.trim().length === 0) return "[]";
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(Array.isArray(parsed) ? parsed : []);
  } catch {
    return "[]";
  }
}
__name(normalizeBookmarksJson, "normalizeBookmarksJson");
async function rebuildBooksTableCanonical(db) {
  await db.prepare("DROP TABLE IF EXISTS books__canonical").run();
  await db.prepare(
    `CREATE TABLE books__canonical (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover_url TEXT,
      content_hash TEXT,
      content_blob BLOB,
      content_type TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      total_pages INTEGER NOT NULL DEFAULT 100,
      last_location TEXT,
      bookmarks_json TEXT NOT NULL DEFAULT '[]',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
  const rowsResult = await db.prepare("SELECT * FROM books").all();
  const rows = rowsResult.results || [];
  const seenIds = /* @__PURE__ */ new Set();
  for (const row of rows) {
    const rawId = toNonEmptyText(row.id, createFallbackId());
    let id = rawId;
    let suffix = 1;
    while (seenIds.has(id)) {
      suffix += 1;
      id = `${rawId}-${suffix}`;
    }
    seenIds.add(id);
    const totalPages = Math.max(1, toInteger(row.total_pages, 100));
    const progress = Math.max(0, Math.min(totalPages, toInteger(row.progress, 0)));
    const isFavorite = toInteger(row.is_favorite, 0) ? 1 : 0;
    await db.prepare(
      `INSERT INTO books__canonical (
        id, user_id, title, author, cover_url, content_hash, content_blob, content_type,
        progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      toNonEmptyText(row.user_id, ""),
      toNonEmptyText(row.title, "Untitled"),
      toNonEmptyText(row.author, "Unknown"),
      toOptionalText(row.cover_url),
      toOptionalText(row.content_hash),
      row.content_blob ?? null,
      toOptionalText(row.content_type),
      progress,
      totalPages,
      toOptionalText(row.last_location),
      normalizeBookmarksJson(row.bookmarks_json),
      isFavorite,
      toNonEmptyText(row.updated_at, (/* @__PURE__ */ new Date()).toISOString())
    ).run();
  }
  await db.prepare("DROP TABLE books").run();
  await db.prepare("ALTER TABLE books__canonical RENAME TO books").run();
}
__name(rebuildBooksTableCanonical, "rebuildBooksTableCanonical");
async function rebuildUserSettingsCanonical(db) {
  await db.prepare("DROP TABLE IF EXISTS user_settings__canonical").run();
  await db.prepare(
    `CREATE TABLE user_settings__canonical (
      user_id TEXT PRIMARY KEY,
      daily_goal INTEGER NOT NULL DEFAULT 30,
      weekly_goal INTEGER NOT NULL DEFAULT 150,
      theme_preset TEXT NOT NULL DEFAULT 'paper',
      font_scale INTEGER NOT NULL DEFAULT 100,
      line_height REAL NOT NULL DEFAULT 1.6,
      text_width INTEGER NOT NULL DEFAULT 70,
      motion TEXT NOT NULL DEFAULT 'full',
      tap_zones INTEGER NOT NULL DEFAULT 1,
      swipe_nav INTEGER NOT NULL DEFAULT 1,
      auto_hide_ms INTEGER NOT NULL DEFAULT 4500,
      show_progress INTEGER NOT NULL DEFAULT 1,
      show_page_meta INTEGER NOT NULL DEFAULT 1,
      accent TEXT NOT NULL DEFAULT '#B37A4C'
    )`
  ).run();
  const rowsResult = await db.prepare("SELECT * FROM user_settings").all();
  const rows = rowsResult.results || [];
  const seenUserIds = /* @__PURE__ */ new Set();
  for (const row of rows) {
    const rawUserId = toNonEmptyText(row.user_id, "guest-user");
    let userId = rawUserId;
    let suffix = 1;
    while (seenUserIds.has(userId)) {
      suffix += 1;
      userId = `${rawUserId}-${suffix}`;
    }
    seenUserIds.add(userId);
    await db.prepare(
      `INSERT INTO user_settings__canonical (
        user_id, daily_goal, weekly_goal, theme_preset, font_scale, line_height, text_width,
        motion, tap_zones, swipe_nav, auto_hide_ms, show_progress, show_page_meta, accent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      Math.max(1, toInteger(row.daily_goal, 30)),
      Math.max(1, toInteger(row.weekly_goal, 150)),
      toNonEmptyText(row.theme_preset, "paper"),
      Math.max(50, toInteger(row.font_scale, 100)),
      Number.isFinite(Number(row.line_height)) ? Number(row.line_height) : 1.6,
      Math.max(40, toInteger(row.text_width, 70)),
      toNonEmptyText(row.motion, "full"),
      toInteger(row.tap_zones, 1) ? 1 : 0,
      toInteger(row.swipe_nav, 1) ? 1 : 0,
      Math.max(0, toInteger(row.auto_hide_ms, 4500)),
      toInteger(row.show_progress, 1) ? 1 : 0,
      toInteger(row.show_page_meta, 1) ? 1 : 0,
      toNonEmptyText(row.accent, "#B37A4C")
    ).run();
  }
  await db.prepare("DROP TABLE user_settings").run();
  await db.prepare("ALTER TABLE user_settings__canonical RENAME TO user_settings").run();
}
__name(rebuildUserSettingsCanonical, "rebuildUserSettingsCanonical");

// api/v2/_shared/http.ts
function jsonResponse(payload, init) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers || {}
    }
  });
}
__name(jsonResponse, "jsonResponse");
function methodNotAllowed() {
  return new Response("Method not allowed", { status: 405 });
}
__name(methodNotAllowed, "methodNotAllowed");

// api/v2/_shared/settings.ts
var readerSettingsDefaults = {
  dailyGoal: 30,
  weeklyGoal: 150,
  themePreset: "paper",
  fontScale: 100,
  lineHeight: 1.6,
  textWidth: 70,
  motion: "full",
  tapZones: true,
  swipeNav: true,
  autoHideMs: 4500,
  showProgress: true,
  showPageMeta: true,
  accent: "#B37A4C"
};

// api/v2/goals.ts
function startOfUtcDay(input) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
}
__name(startOfUtcDay, "startOfUtcDay");
function startOfUtcWeek(input) {
  const day = input.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate() + mondayOffset, 0, 0, 0, 0));
}
__name(startOfUtcWeek, "startOfUtcWeek");
function isoDateOnly(value) {
  return value.toISOString().slice(0, 10);
}
__name(isoDateOnly, "isoDateOnly");
function clampPercent(total, target) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(total / target * 100)));
}
__name(clampPercent, "clampPercent");
async function sumDurationSec(db, userId, startIso, endIso) {
  const row = await db.prepare(
    `SELECT COALESCE(SUM(duration_sec), 0) AS total_sec
       FROM reading_sessions
       WHERE user_id = ? AND started_at >= ? AND started_at < ?`
  ).bind(userId, startIso, endIso).first();
  return Math.max(0, Number(row?.total_sec || 0));
}
__name(sumDurationSec, "sumDurationSec");
var onRequest = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (request.method !== "GET") return methodNotAllowed();
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  await ensureSessionsSchema(env.SANCTUARY_DB);
  await ensureSettingsSchema(env.SANCTUARY_DB);
  const now = /* @__PURE__ */ new Date();
  const dayStart = startOfUtcDay(now);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1e3);
  const weekStart = startOfUtcWeek(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1e3);
  const [dayTotalSec, weekTotalSec, settings] = await Promise.all([
    sumDurationSec(env.SANCTUARY_DB, userId, dayStart.toISOString(), dayEnd.toISOString()),
    sumDurationSec(env.SANCTUARY_DB, userId, weekStart.toISOString(), weekEnd.toISOString()),
    env.SANCTUARY_DB.prepare("SELECT daily_goal, weekly_goal FROM user_settings WHERE user_id = ?").bind(userId).first()
  ]);
  const dailyTarget = Math.max(1, Number(settings?.daily_goal || readerSettingsDefaults.dailyGoal));
  const weeklyTarget = Math.max(1, Number(settings?.weekly_goal || readerSettingsDefaults.weeklyGoal));
  const dayMinutes = Math.round(dayTotalSec / 60);
  const weekMinutes = Math.round(weekTotalSec / 60);
  return jsonResponse({
    day: {
      date: isoDateOnly(dayStart),
      totalMinutes: dayMinutes,
      targetMinutes: dailyTarget,
      progressPercent: clampPercent(dayMinutes, dailyTarget)
    },
    week: {
      startDate: isoDateOnly(weekStart),
      endDate: isoDateOnly(new Date(weekEnd.getTime() - 1)),
      totalMinutes: weekMinutes,
      targetMinutes: weeklyTarget,
      progressPercent: clampPercent(weekMinutes, weeklyTarget)
    }
  });
}, "onRequest");

// api/v2/_shared/validation.ts
function toFiniteNumber(value) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}
__name(toFiniteNumber, "toFiniteNumber");
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
__name(clamp, "clamp");
function toIntWithin(value, fallback, min, max) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}
__name(toIntWithin, "toIntWithin");

// api/v2/library.ts
function getBookContentKey(userId, bookId) {
  return `users/${userId}/books/${bookId}.epub`;
}
__name(getBookContentKey, "getBookContentKey");
function getBookCoverKey(userId, bookId) {
  return `users/${userId}/books/${bookId}.cover`;
}
__name(getBookCoverKey, "getBookCoverKey");
async function sha256Hex(input) {
  const digest = await crypto.subtle.digest("SHA-256", input);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function normalizeBookmarks(input) {
  if (!Array.isArray(input)) return null;
  const out = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const rawCfi = item.cfi;
    const rawTitle = item.title;
    if (typeof rawCfi !== "string" || rawCfi.trim().length === 0) continue;
    out.push({
      cfi: rawCfi.trim(),
      title: typeof rawTitle === "string" && rawTitle.trim().length > 0 ? rawTitle.trim() : "Bookmark"
    });
  }
  return out;
}
__name(normalizeBookmarks, "normalizeBookmarks");
function parseBookmarksJson(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return normalizeBookmarks(parsed) || [];
  } catch {
    return [];
  }
}
__name(parseBookmarksJson, "parseBookmarksJson");
var onRequest2 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  await ensureBooksSchemaOnce(env.SANCTUARY_DB);
  if (request.method === "GET") {
    const data = await env.SANCTUARY_DB.prepare(
      `SELECT id, title, author, cover_url, progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
         FROM books WHERE user_id = ? ORDER BY updated_at DESC`
    ).bind(userId).all();
    const items = (data.results || []).map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      coverUrl: b.cover_url,
      progressPercent: Math.min(100, Math.round(Number(b.progress || 0) / Math.max(1, Number(b.total_pages || 100)) * 100)),
      lastLocation: b.last_location,
      bookmarks: parseBookmarksJson(b.bookmarks_json),
      status: Number(b.progress || 0) <= 0 ? "to-read" : Number(b.progress || 0) >= Number(b.total_pages || 100) ? "finished" : "reading",
      favorite: !!b.is_favorite,
      updatedAt: b.updated_at
    }));
    return jsonResponse(items);
  }
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response("Expected multipart/form-data", { status: 400 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    const metadataRaw = formData.get("metadata");
    if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") {
      return new Response("Missing file", { status: 400 });
    }
    if (typeof metadataRaw !== "string") {
      return new Response("Missing metadata", { status: 400 });
    }
    let body;
    try {
      body = JSON.parse(metadataRaw);
    } catch {
      return new Response("Invalid metadata JSON", { status: 400 });
    }
    const id = typeof body.id === "string" && body.id.trim().length > 0 ? body.id.trim() : null;
    if (!id) return new Response("Missing id", { status: 400 });
    const progressRaw = toFiniteNumber(body.progress);
    const totalPagesRaw = toFiniteNumber(body.totalPages);
    const totalPages = totalPagesRaw === null ? 100 : Math.max(1, Math.round(totalPagesRaw));
    const progress = progressRaw === null ? 0 : clamp(Math.round(progressRaw), 0, totalPages);
    const favorite = body.favorite ? 1 : 0;
    const lastLocation = typeof body.lastLocation === "string" && body.lastLocation.length > 0 ? body.lastLocation : null;
    const title = typeof body.title === "string" && body.title.trim().length > 0 ? body.title.trim() : "Untitled";
    const author = typeof body.author === "string" && body.author.trim().length > 0 ? body.author.trim() : "Unknown";
    const bookmarks = normalizeBookmarks(body.bookmarks) || [];
    const bookmarksJson = JSON.stringify(bookmarks);
    const typedFile = file;
    const bytes = await typedFile.arrayBuffer();
    if (bytes.byteLength === 0) return new Response("Empty file", { status: 400 });
    const contentHash = await sha256Hex(bytes);
    const blobContentType = typedFile.type || "application/epub+zip";
    const contentKey = getBookContentKey(userId, id);
    const coverPart = formData.get("cover");
    let coverUrl = null;
    if (coverPart && typeof coverPart === "object" && typeof coverPart.arrayBuffer === "function") {
      const typedCover = coverPart;
      const coverBytes = await typedCover.arrayBuffer();
      if (coverBytes.byteLength > 0) {
        const coverType = typedCover.type || "image/jpeg";
        await env.SANCTUARY_BUCKET.put(getBookCoverKey(userId, id), coverBytes, {
          httpMetadata: { contentType: coverType }
        });
        coverUrl = `/api/content/${encodeURIComponent(id)}?asset=cover`;
      }
    }
    await env.SANCTUARY_BUCKET.put(contentKey, bytes, {
      httpMetadata: { contentType: blobContentType }
    });
    const duplicate = await env.SANCTUARY_DB.prepare("SELECT id FROM books WHERE user_id = ? AND content_hash = ? AND id != ? LIMIT 1").bind(userId, contentHash, id).first();
    if (duplicate?.id) {
      return jsonResponse({ error: "Duplicate book upload is not allowed", existingId: duplicate.id }, { status: 409 });
    }
    const updateResult = await env.SANCTUARY_DB.prepare(
      `UPDATE books SET
          title = ?,
          author = ?,
          progress = ?,
          total_pages = ?,
          last_location = ?,
          bookmarks_json = ?,
          is_favorite = ?,
          cover_url = COALESCE(?, cover_url),
          content_hash = ?,
          content_blob = NULL,
          content_type = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`
    ).bind(
      title,
      author,
      progress,
      totalPages,
      lastLocation,
      bookmarksJson,
      favorite,
      coverUrl,
      contentHash,
      blobContentType,
      id,
      userId
    ).run();
    const changes = Number(updateResult.meta?.changes || 0);
    if (changes === 0) {
      try {
        await env.SANCTUARY_DB.prepare(
          `INSERT INTO books (
              id, user_id, title, author, cover_url, content_hash, content_type,
              progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        ).bind(
          id,
          userId,
          title,
          author,
          coverUrl,
          contentHash,
          blobContentType,
          progress,
          totalPages,
          lastLocation,
          bookmarksJson,
          favorite
        ).run();
      } catch {
        return new Response("Book id conflict", { status: 409 });
      }
    }
    return jsonResponse({ success: true, upserted: changes === 0, coverUrl });
  }
  if (request.method === "PATCH") {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });
    const body = await request.json().catch(() => ({}));
    const progress = toFiniteNumber(body.progress);
    const totalPagesRaw = toFiniteNumber(body.totalPages);
    const totalPages = totalPagesRaw === null ? null : Math.max(1, Math.round(totalPagesRaw));
    const favorite = body.favorite === void 0 ? null : body.favorite ? 1 : 0;
    const sanitizedProgress = progress === null ? null : clamp(Math.round(progress), 0, totalPages ?? 100);
    const lastLocation = typeof body.lastLocation === "string" && body.lastLocation.length > 0 ? body.lastLocation : null;
    const title = typeof body.title === "string" && body.title.trim().length > 0 ? body.title.trim() : null;
    const author = typeof body.author === "string" && body.author.trim().length > 0 ? body.author.trim() : null;
    const coverUrl = typeof body.coverUrl === "string" && body.coverUrl.trim().length > 0 ? body.coverUrl.trim() : null;
    const bookmarks = normalizeBookmarks(body.bookmarks);
    const bookmarksJson = bookmarks === null ? null : JSON.stringify(bookmarks);
    const updateResult = await env.SANCTUARY_DB.prepare(
      `UPDATE books SET
          title = COALESCE(?, title),
          author = COALESCE(?, author),
          progress = COALESCE(?, progress),
          total_pages = COALESCE(?, total_pages),
          last_location = COALESCE(?, last_location),
          bookmarks_json = COALESCE(?, bookmarks_json),
          is_favorite = COALESCE(?, is_favorite),
          cover_url = COALESCE(?, cover_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`
    ).bind(
      title,
      author,
      sanitizedProgress,
      totalPages,
      lastLocation,
      bookmarksJson,
      favorite,
      coverUrl,
      id,
      userId
    ).run();
    const changes = Number(updateResult.meta?.changes || 0);
    if (changes === 0) {
      await env.SANCTUARY_DB.prepare(
        `INSERT INTO books (
            id, user_id, title, author, cover_url, progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).bind(
        id,
        userId,
        title || "Untitled",
        author || "Unknown",
        coverUrl,
        sanitizedProgress ?? 0,
        totalPages ?? 100,
        lastLocation,
        bookmarksJson ?? "[]",
        favorite ?? 0
      ).run();
    }
    return jsonResponse({ success: true, upserted: changes === 0 });
  }
  if (request.method === "DELETE") {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });
    const contentKey = getBookContentKey(userId, id);
    const coverKey = getBookCoverKey(userId, id);
    const result = await env.SANCTUARY_DB.prepare("DELETE FROM books WHERE id = ? AND user_id = ?").bind(id, userId).run();
    await env.SANCTUARY_BUCKET.delete(contentKey);
    await env.SANCTUARY_BUCKET.delete(coverKey);
    return jsonResponse({
      success: true,
      deleted: Number(result.meta?.changes || 0) > 0
    });
  }
  return methodNotAllowed();
}, "onRequest");

// api/v2/sessions.ts
function toIsoDateOrNull(value) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
__name(toIsoDateOrNull, "toIsoDateOrNull");
function toFinite(value, fallback) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
__name(toFinite, "toFinite");
var onRequest3 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  await ensureSessionsSchema(env.SANCTUARY_DB);
  if (request.method === "GET") {
    const data = await env.SANCTUARY_DB.prepare("SELECT * FROM reading_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 200").bind(userId).all();
    const items = (data.results || []).map((row) => ({
      id: row.id,
      bookId: row.book_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationSec: row.duration_sec,
      pagesAdvanced: row.pages_advanced,
      device: row.device
    }));
    return jsonResponse(items);
  }
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (typeof body.bookId !== "string" || body.bookId.trim().length === 0) {
      return new Response("Invalid bookId", { status: 400 });
    }
    const id = typeof body.id === "string" && body.id.trim().length > 0 ? body.id.trim() : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const startedAt = toIsoDateOrNull(body.startedAt) || (/* @__PURE__ */ new Date()).toISOString();
    const endedAt = body.endedAt === null ? null : toIsoDateOrNull(body.endedAt);
    const durationSec = Math.max(0, Math.round(toFinite(body.durationSec, 0)));
    const pagesAdvanced = Math.max(0, Math.round(toFinite(body.pagesAdvanced, 0)));
    const device = body.device === "android" || body.device === "desktop" || body.device === "web" ? body.device : "web";
    await env.SANCTUARY_DB.prepare(
      `INSERT OR REPLACE INTO reading_sessions (
          id, user_id, book_id, started_at, ended_at, duration_sec, pages_advanced, device
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      userId,
      body.bookId.trim(),
      startedAt,
      endedAt,
      durationSec,
      pagesAdvanced,
      device
    ).run();
    return jsonResponse({ success: true });
  }
  return methodNotAllowed();
}, "onRequest");

// api/v2/settings.ts
var onRequest4 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  await ensureSettingsSchema(env.SANCTUARY_DB);
  if (request.method === "GET") {
    const row = await env.SANCTUARY_DB.prepare("SELECT * FROM user_settings WHERE user_id = ?").bind(userId).first();
    if (!row) {
      return jsonResponse(readerSettingsDefaults);
    }
    return jsonResponse({
      dailyGoal: row.daily_goal ?? readerSettingsDefaults.dailyGoal,
      weeklyGoal: row.weekly_goal ?? readerSettingsDefaults.weeklyGoal,
      themePreset: row.theme_preset,
      fontScale: row.font_scale,
      lineHeight: row.line_height,
      textWidth: row.text_width,
      motion: row.motion,
      tapZones: !!row.tap_zones,
      swipeNav: !!row.swipe_nav,
      autoHideMs: row.auto_hide_ms,
      showProgress: !!row.show_progress,
      showPageMeta: !!row.show_page_meta,
      accent: row.accent
    });
  }
  if (request.method === "PUT") {
    const body = await request.json().catch(() => ({}));
    const payload = {
      ...readerSettingsDefaults,
      ...body,
      dailyGoal: toIntWithin(body.dailyGoal, readerSettingsDefaults.dailyGoal, 1, 1200),
      weeklyGoal: toIntWithin(body.weeklyGoal, readerSettingsDefaults.weeklyGoal, 1, 5e3),
      tapZones: body.tapZones === void 0 ? readerSettingsDefaults.tapZones : !!body.tapZones,
      swipeNav: body.swipeNav === void 0 ? readerSettingsDefaults.swipeNav : !!body.swipeNav,
      showProgress: body.showProgress === void 0 ? readerSettingsDefaults.showProgress : !!body.showProgress,
      showPageMeta: body.showPageMeta === void 0 ? readerSettingsDefaults.showPageMeta : !!body.showPageMeta
    };
    await env.SANCTUARY_DB.prepare(
      `INSERT OR REPLACE INTO user_settings (
          user_id, daily_goal, weekly_goal, theme_preset, font_scale, line_height,
          text_width, motion, tap_zones, swipe_nav, auto_hide_ms, show_progress,
          show_page_meta, accent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      payload.dailyGoal,
      payload.weeklyGoal,
      payload.themePreset,
      payload.fontScale,
      payload.lineHeight,
      payload.textWidth,
      payload.motion,
      payload.tapZones ? 1 : 0,
      payload.swipeNav ? 1 : 0,
      payload.autoHideMs,
      payload.showProgress ? 1 : 0,
      payload.showPageMeta ? 1 : 0,
      payload.accent
    ).run();
    return jsonResponse({ success: true });
  }
  return methodNotAllowed();
}, "onRequest");

// api/content/[id].ts
function badRequest(message) {
  return new Response(message, { status: 400 });
}
__name(badRequest, "badRequest");
function notFound() {
  return new Response("Not found", { status: 404 });
}
__name(notFound, "notFound");
function missingCoverPlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="540" viewBox="0 0 360 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f3ece0"/><stop offset="100%" stop-color="#e3d5c2"/></linearGradient></defs><rect width="360" height="540" fill="url(#bg)"/><rect x="44" y="72" width="272" height="396" rx="18" fill="#fff" opacity="0.75"/><text x="180" y="250" text-anchor="middle" font-size="60" fill="#8b7355">\u{1F4D6}</text><text x="180" y="300" text-anchor="middle" font-size="22" fill="#6b5a45" font-family="system-ui, sans-serif">No Cover</text></svg>`;
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=300"
    }
  });
}
__name(missingCoverPlaceholder, "missingCoverPlaceholder");
function getBookContentKey2(userId, bookId) {
  return `users/${userId}/books/${bookId}.epub`;
}
__name(getBookContentKey2, "getBookContentKey");
function getBookCoverKey2(userId, bookId) {
  return `users/${userId}/books/${bookId}.cover`;
}
__name(getBookCoverKey2, "getBookCoverKey");
var onRequest5 = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  await ensureBooksSchema(env.SANCTUARY_DB);
  const rawId = params.id;
  const id = typeof rawId === "string" ? rawId.trim() : "";
  if (!id) return badRequest("Missing id");
  const asset = new URL(request.url).searchParams.get("asset");
  const isCoverAsset = asset === "cover";
  const contentKey = getBookContentKey2(userId, id);
  const coverKey = getBookCoverKey2(userId, id);
  if (request.method === "GET") {
    const row = await env.SANCTUARY_DB.prepare("SELECT id, content_type, content_blob, cover_url FROM books WHERE id = ? AND user_id = ?").bind(id, userId).first();
    if (!row?.id) return notFound();
    if (isCoverAsset) {
      const coverObject = await env.SANCTUARY_BUCKET.get(coverKey);
      if (!coverObject) {
        await env.SANCTUARY_DB.prepare("UPDATE books SET cover_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").bind(id, userId).run().catch(() => void 0);
        return missingCoverPlaceholder();
      }
      const coverType = coverObject.httpMetadata?.contentType || "image/jpeg";
      return new Response(coverObject.body, {
        status: 200,
        headers: {
          "Content-Type": coverType,
          "Cache-Control": "private, max-age=300"
        }
      });
    }
    const object = await env.SANCTUARY_BUCKET.get(contentKey);
    if (!object) {
      if (!row.content_blob) return notFound();
      const contentType2 = row.content_type || "application/epub+zip";
      if (row.content_blob instanceof ArrayBuffer || ArrayBuffer.isView(row.content_blob)) {
        await env.SANCTUARY_BUCKET.put(contentKey, row.content_blob, {
          httpMetadata: { contentType: contentType2 }
        });
      }
      return new Response(row.content_blob, {
        status: 200,
        headers: {
          "Content-Type": contentType2,
          "Cache-Control": "private, max-age=60"
        }
      });
    }
    const contentType = object.httpMetadata?.contentType || row.content_type || "application/epub+zip";
    return new Response(object.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60"
      }
    });
  }
  if (request.method === "PUT") {
    const contentType = request.headers.get("content-type") || (isCoverAsset ? "image/jpeg" : "application/epub+zip");
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength === 0) return badRequest("Empty content body");
    await env.SANCTUARY_BUCKET.put(isCoverAsset ? coverKey : contentKey, bytes, {
      httpMetadata: { contentType }
    });
    const coverUrl = `/api/content/${encodeURIComponent(id)}?asset=cover`;
    const result = isCoverAsset ? await env.SANCTUARY_DB.prepare(
      `UPDATE books SET cover_url = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`
    ).bind(coverUrl, id, userId).run() : await env.SANCTUARY_DB.prepare(
      `UPDATE books SET content_blob = NULL, content_type = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`
    ).bind(contentType, id, userId).run();
    if (Number(result.meta?.changes || 0) === 0) {
      if (isCoverAsset) {
        await env.SANCTUARY_DB.prepare(
          `INSERT INTO books (
              id, user_id, title, author, cover_url, progress, total_pages, bookmarks_json, is_favorite, updated_at
            ) VALUES (?, ?, 'Untitled', 'Unknown', ?, 0, 100, '[]', 0, CURRENT_TIMESTAMP)`
        ).bind(id, userId, coverUrl).run();
      } else {
        await env.SANCTUARY_DB.prepare(
          `INSERT INTO books (
              id, user_id, title, author, content_type, progress, total_pages, bookmarks_json, is_favorite, updated_at
            ) VALUES (?, ?, 'Untitled', 'Unknown', ?, 0, 100, '[]', 0, CURRENT_TIMESTAMP)`
        ).bind(id, userId, contentType).run();
      }
    }
    return new Response(JSON.stringify({ success: true, coverUrl: isCoverAsset ? coverUrl : void 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "DELETE") {
    await env.SANCTUARY_BUCKET.delete(isCoverAsset ? coverKey : contentKey);
    if (isCoverAsset) {
      await env.SANCTUARY_DB.prepare("UPDATE books SET cover_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").bind(id, userId).run();
    } else {
      await env.SANCTUARY_DB.prepare("UPDATE books SET content_blob = NULL, content_type = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").bind(id, userId).run();
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  return methodNotAllowed();
}, "onRequest");

// ../.wrangler/tmp/pages-oUsfUm/functionsRoutes-0.8519951749663376.mjs
var routes = [
  {
    routePath: "/api/v2/me",
    mountPath: "/api/v2",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/v2/goals",
    mountPath: "/api/v2",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/v2/library",
    mountPath: "/api/v2",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/v2/sessions",
    mountPath: "/api/v2",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/v2/settings",
    mountPath: "/api/v2",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/content/:id",
    mountPath: "/api/content",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse2, "parse");
function match2(str, options) {
  var keys = [];
  var re = pathToRegexp2(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match2, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp2(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse2(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp2(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp2, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match2(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match2(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match2(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match2(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-eRY6KR/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-eRY6KR/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.3603697327582085.mjs.map
