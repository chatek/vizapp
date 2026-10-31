/**
 * pi-extension bundled runtime entry (esbuild; originally bun build
 * --format=esm --target=node — see test/unit/extension-variants.test.ts
 * for the J3c/J1c runtime decision + the tweetnacl PRNG patch below).
 * Source: src/pi-extension/index.ts — edit there, re-bundle:
 *   node scripts/build-pi-extension.mjs   (or: pnpm build:extensions)
 */
import { createRequire as __b4CreateRequire } from 'node:module';
const require = __b4CreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@nats-io/nkeys/lib/crc16.js
var require_crc16 = __commonJS({
  "node_modules/@nats-io/nkeys/lib/crc16.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.crc16 = void 0;
    var crc16tab = new Uint16Array([
      0,
      4129,
      8258,
      12387,
      16516,
      20645,
      24774,
      28903,
      33032,
      37161,
      41290,
      45419,
      49548,
      53677,
      57806,
      61935,
      4657,
      528,
      12915,
      8786,
      21173,
      17044,
      29431,
      25302,
      37689,
      33560,
      45947,
      41818,
      54205,
      50076,
      62463,
      58334,
      9314,
      13379,
      1056,
      5121,
      25830,
      29895,
      17572,
      21637,
      42346,
      46411,
      34088,
      38153,
      58862,
      62927,
      50604,
      54669,
      13907,
      9842,
      5649,
      1584,
      30423,
      26358,
      22165,
      18100,
      46939,
      42874,
      38681,
      34616,
      63455,
      59390,
      55197,
      51132,
      18628,
      22757,
      26758,
      30887,
      2112,
      6241,
      10242,
      14371,
      51660,
      55789,
      59790,
      63919,
      35144,
      39273,
      43274,
      47403,
      23285,
      19156,
      31415,
      27286,
      6769,
      2640,
      14899,
      10770,
      56317,
      52188,
      64447,
      60318,
      39801,
      35672,
      47931,
      43802,
      27814,
      31879,
      19684,
      23749,
      11298,
      15363,
      3168,
      7233,
      60846,
      64911,
      52716,
      56781,
      44330,
      48395,
      36200,
      40265,
      32407,
      28342,
      24277,
      20212,
      15891,
      11826,
      7761,
      3696,
      65439,
      61374,
      57309,
      53244,
      48923,
      44858,
      40793,
      36728,
      37256,
      33193,
      45514,
      41451,
      53516,
      49453,
      61774,
      57711,
      4224,
      161,
      12482,
      8419,
      20484,
      16421,
      28742,
      24679,
      33721,
      37784,
      41979,
      46042,
      49981,
      54044,
      58239,
      62302,
      689,
      4752,
      8947,
      13010,
      16949,
      21012,
      25207,
      29270,
      46570,
      42443,
      38312,
      34185,
      62830,
      58703,
      54572,
      50445,
      13538,
      9411,
      5280,
      1153,
      29798,
      25671,
      21540,
      17413,
      42971,
      47098,
      34713,
      38840,
      59231,
      63358,
      50973,
      55100,
      9939,
      14066,
      1681,
      5808,
      26199,
      30326,
      17941,
      22068,
      55628,
      51565,
      63758,
      59695,
      39368,
      35305,
      47498,
      43435,
      22596,
      18533,
      30726,
      26663,
      6336,
      2273,
      14466,
      10403,
      52093,
      56156,
      60223,
      64286,
      35833,
      39896,
      43963,
      48026,
      19061,
      23124,
      27191,
      31254,
      2801,
      6864,
      10931,
      14994,
      64814,
      60687,
      56684,
      52557,
      48554,
      44427,
      40424,
      36297,
      31782,
      27655,
      23652,
      19525,
      15522,
      11395,
      7392,
      3265,
      61215,
      65342,
      53085,
      57212,
      44955,
      49082,
      36825,
      40952,
      28183,
      32310,
      20053,
      24180,
      11923,
      16050,
      3793,
      7920
    ]);
    var crc16 = class _crc16 {
      // crc16 returns the crc for the data provided.
      static checksum(data) {
        let crc = 0;
        for (let i = 0; i < data.byteLength; i++) {
          const b = data[i];
          crc = crc << 8 & 65535 ^ crc16tab[(crc >> 8 ^ b) & 255];
        }
        return crc;
      }
      // validate will check the calculated crc16 checksum for data against the expected.
      static validate(data, expected) {
        const ba = _crc16.checksum(data);
        return ba == expected;
      }
    };
    exports.crc16 = crc16;
  }
});

// node_modules/@nats-io/nkeys/lib/base32.js
var require_base32 = __commonJS({
  "node_modules/@nats-io/nkeys/lib/base32.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.base32 = void 0;
    var b32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    var base32 = class {
      static encode(src) {
        let bits = 0;
        let value = 0;
        const a = new Uint8Array(src);
        const buf = new Uint8Array(src.byteLength * 2);
        let j = 0;
        for (let i = 0; i < a.byteLength; i++) {
          value = value << 8 | a[i];
          bits += 8;
          while (bits >= 5) {
            const index = value >>> bits - 5 & 31;
            buf[j++] = b32Alphabet.charAt(index).charCodeAt(0);
            bits -= 5;
          }
        }
        if (bits > 0) {
          const index = value << 5 - bits & 31;
          buf[j++] = b32Alphabet.charAt(index).charCodeAt(0);
        }
        return buf.slice(0, j);
      }
      static decode(src) {
        let bits = 0;
        let byte = 0;
        let j = 0;
        const a = new Uint8Array(src);
        const out = new Uint8Array(a.byteLength * 5 / 8 | 0);
        for (let i = 0; i < a.byteLength; i++) {
          const v = String.fromCharCode(a[i]);
          const vv = b32Alphabet.indexOf(v);
          if (vv === -1) {
            throw new Error("Illegal Base32 character: " + a[i]);
          }
          byte = byte << 5 | vv;
          bits += 5;
          if (bits >= 8) {
            out[j++] = byte >>> bits - 8 & 255;
            bits -= 8;
          }
        }
        return out.slice(0, j);
      }
    };
    exports.base32 = base32;
  }
});

// node_modules/@nats-io/nkeys/lib/codec.js
var require_codec = __commonJS({
  "node_modules/@nats-io/nkeys/lib/codec.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Codec = void 0;
    var crc16_1 = require_crc16();
    var nkeys_1 = require_nkeys();
    var base32_1 = require_base32();
    var Codec = class _Codec {
      static encode(prefix, src) {
        if (!src || !(src instanceof Uint8Array)) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.SerializationError);
        }
        if (!nkeys_1.Prefixes.isValidPrefix(prefix)) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidPrefixByte);
        }
        return _Codec._encode(false, prefix, src);
      }
      static encodeSeed(role, src) {
        if (!src) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ApiError);
        }
        if (!nkeys_1.Prefixes.isValidPublicPrefix(role)) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidPrefixByte);
        }
        if (src.byteLength !== 32) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidSeedLen);
        }
        return _Codec._encode(true, role, src);
      }
      static decode(expected, src) {
        if (!nkeys_1.Prefixes.isValidPrefix(expected)) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidPrefixByte);
        }
        const raw = _Codec._decode(src);
        if (raw[0] !== expected) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidPrefixByte);
        }
        return raw.slice(1);
      }
      static decodeSeed(src) {
        const raw = _Codec._decode(src);
        const prefix = _Codec._decodePrefix(raw);
        if (prefix[0] != nkeys_1.Prefix.Seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidSeed);
        }
        if (!nkeys_1.Prefixes.isValidPublicPrefix(prefix[1])) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidPrefixByte);
        }
        return { buf: raw.slice(2), prefix: prefix[1] };
      }
      // unsafe encode no prefix/role validation
      static _encode(seed, role, payload) {
        const payloadOffset = seed ? 2 : 1;
        const payloadLen = payload.byteLength;
        const checkLen = 2;
        const cap = payloadOffset + payloadLen + checkLen;
        const checkOffset = payloadOffset + payloadLen;
        const raw = new Uint8Array(cap);
        if (seed) {
          const encodedPrefix = _Codec._encodePrefix(nkeys_1.Prefix.Seed, role);
          raw.set(encodedPrefix);
        } else {
          raw[0] = role;
        }
        raw.set(payload, payloadOffset);
        const checksum = crc16_1.crc16.checksum(raw.slice(0, checkOffset));
        const dv = new DataView(raw.buffer);
        dv.setUint16(checkOffset, checksum, true);
        return base32_1.base32.encode(raw);
      }
      // unsafe decode - no prefix/role validation
      static _decode(src) {
        if (src.byteLength < 4) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidEncoding);
        }
        let raw;
        try {
          raw = base32_1.base32.decode(src);
        } catch (ex) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidEncoding, { cause: ex });
        }
        const checkOffset = raw.byteLength - 2;
        const dv = new DataView(raw.buffer);
        const checksum = dv.getUint16(checkOffset, true);
        const payload = raw.slice(0, checkOffset);
        if (!crc16_1.crc16.validate(payload, checksum)) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidChecksum);
        }
        return payload;
      }
      static _encodePrefix(kind, role) {
        const b1 = kind | role >> 5;
        const b2 = (role & 31) << 3;
        return new Uint8Array([b1, b2]);
      }
      static _decodePrefix(raw) {
        const b1 = raw[0] & 248;
        const b2 = (raw[0] & 7) << 5 | (raw[1] & 248) >> 3;
        return new Uint8Array([b1, b2]);
      }
    };
    exports.Codec = Codec;
  }
});

// node_modules/tweetnacl/nacl-fast.js
var require_nacl_fast = __commonJS({
  "node_modules/tweetnacl/nacl-fast.js"(exports, module) {
    (function(nacl) {
      "use strict";
      var gf = function(init) {
        var i, r = new Float64Array(16);
        if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
        return r;
      };
      var randombytes = function() {
        throw new Error("no PRNG");
      };
      var _0 = new Uint8Array(16);
      var _9 = new Uint8Array(32);
      _9[0] = 9;
      var gf0 = gf(), gf1 = gf([1]), _121665 = gf([56129, 1]), D = gf([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]), D2 = gf([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]), X = gf([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]), Y = gf([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]), I2 = gf([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
      function ts64(x, i, h2, l) {
        x[i] = h2 >> 24 & 255;
        x[i + 1] = h2 >> 16 & 255;
        x[i + 2] = h2 >> 8 & 255;
        x[i + 3] = h2 & 255;
        x[i + 4] = l >> 24 & 255;
        x[i + 5] = l >> 16 & 255;
        x[i + 6] = l >> 8 & 255;
        x[i + 7] = l & 255;
      }
      function vn(x, xi, y, yi, n) {
        var i, d = 0;
        for (i = 0; i < n; i++) d |= x[xi + i] ^ y[yi + i];
        return (1 & d - 1 >>> 8) - 1;
      }
      function crypto_verify_16(x, xi, y, yi) {
        return vn(x, xi, y, yi, 16);
      }
      function crypto_verify_32(x, xi, y, yi) {
        return vn(x, xi, y, yi, 32);
      }
      function core_salsa20(o, p, k, c) {
        var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
        var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
        for (var i = 0; i < 20; i += 2) {
          u = x0 + x12 | 0;
          x4 ^= u << 7 | u >>> 32 - 7;
          u = x4 + x0 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x4 | 0;
          x12 ^= u << 13 | u >>> 32 - 13;
          u = x12 + x8 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x1 | 0;
          x9 ^= u << 7 | u >>> 32 - 7;
          u = x9 + x5 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x9 | 0;
          x1 ^= u << 13 | u >>> 32 - 13;
          u = x1 + x13 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x6 | 0;
          x14 ^= u << 7 | u >>> 32 - 7;
          u = x14 + x10 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x14 | 0;
          x6 ^= u << 13 | u >>> 32 - 13;
          u = x6 + x2 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x11 | 0;
          x3 ^= u << 7 | u >>> 32 - 7;
          u = x3 + x15 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x3 | 0;
          x11 ^= u << 13 | u >>> 32 - 13;
          u = x11 + x7 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
          u = x0 + x3 | 0;
          x1 ^= u << 7 | u >>> 32 - 7;
          u = x1 + x0 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x1 | 0;
          x3 ^= u << 13 | u >>> 32 - 13;
          u = x3 + x2 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x4 | 0;
          x6 ^= u << 7 | u >>> 32 - 7;
          u = x6 + x5 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x6 | 0;
          x4 ^= u << 13 | u >>> 32 - 13;
          u = x4 + x7 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x9 | 0;
          x11 ^= u << 7 | u >>> 32 - 7;
          u = x11 + x10 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x11 | 0;
          x9 ^= u << 13 | u >>> 32 - 13;
          u = x9 + x8 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x14 | 0;
          x12 ^= u << 7 | u >>> 32 - 7;
          u = x12 + x15 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x12 | 0;
          x14 ^= u << 13 | u >>> 32 - 13;
          u = x14 + x13 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
        }
        x0 = x0 + j0 | 0;
        x1 = x1 + j1 | 0;
        x2 = x2 + j2 | 0;
        x3 = x3 + j3 | 0;
        x4 = x4 + j4 | 0;
        x5 = x5 + j5 | 0;
        x6 = x6 + j6 | 0;
        x7 = x7 + j7 | 0;
        x8 = x8 + j8 | 0;
        x9 = x9 + j9 | 0;
        x10 = x10 + j10 | 0;
        x11 = x11 + j11 | 0;
        x12 = x12 + j12 | 0;
        x13 = x13 + j13 | 0;
        x14 = x14 + j14 | 0;
        x15 = x15 + j15 | 0;
        o[0] = x0 >>> 0 & 255;
        o[1] = x0 >>> 8 & 255;
        o[2] = x0 >>> 16 & 255;
        o[3] = x0 >>> 24 & 255;
        o[4] = x1 >>> 0 & 255;
        o[5] = x1 >>> 8 & 255;
        o[6] = x1 >>> 16 & 255;
        o[7] = x1 >>> 24 & 255;
        o[8] = x2 >>> 0 & 255;
        o[9] = x2 >>> 8 & 255;
        o[10] = x2 >>> 16 & 255;
        o[11] = x2 >>> 24 & 255;
        o[12] = x3 >>> 0 & 255;
        o[13] = x3 >>> 8 & 255;
        o[14] = x3 >>> 16 & 255;
        o[15] = x3 >>> 24 & 255;
        o[16] = x4 >>> 0 & 255;
        o[17] = x4 >>> 8 & 255;
        o[18] = x4 >>> 16 & 255;
        o[19] = x4 >>> 24 & 255;
        o[20] = x5 >>> 0 & 255;
        o[21] = x5 >>> 8 & 255;
        o[22] = x5 >>> 16 & 255;
        o[23] = x5 >>> 24 & 255;
        o[24] = x6 >>> 0 & 255;
        o[25] = x6 >>> 8 & 255;
        o[26] = x6 >>> 16 & 255;
        o[27] = x6 >>> 24 & 255;
        o[28] = x7 >>> 0 & 255;
        o[29] = x7 >>> 8 & 255;
        o[30] = x7 >>> 16 & 255;
        o[31] = x7 >>> 24 & 255;
        o[32] = x8 >>> 0 & 255;
        o[33] = x8 >>> 8 & 255;
        o[34] = x8 >>> 16 & 255;
        o[35] = x8 >>> 24 & 255;
        o[36] = x9 >>> 0 & 255;
        o[37] = x9 >>> 8 & 255;
        o[38] = x9 >>> 16 & 255;
        o[39] = x9 >>> 24 & 255;
        o[40] = x10 >>> 0 & 255;
        o[41] = x10 >>> 8 & 255;
        o[42] = x10 >>> 16 & 255;
        o[43] = x10 >>> 24 & 255;
        o[44] = x11 >>> 0 & 255;
        o[45] = x11 >>> 8 & 255;
        o[46] = x11 >>> 16 & 255;
        o[47] = x11 >>> 24 & 255;
        o[48] = x12 >>> 0 & 255;
        o[49] = x12 >>> 8 & 255;
        o[50] = x12 >>> 16 & 255;
        o[51] = x12 >>> 24 & 255;
        o[52] = x13 >>> 0 & 255;
        o[53] = x13 >>> 8 & 255;
        o[54] = x13 >>> 16 & 255;
        o[55] = x13 >>> 24 & 255;
        o[56] = x14 >>> 0 & 255;
        o[57] = x14 >>> 8 & 255;
        o[58] = x14 >>> 16 & 255;
        o[59] = x14 >>> 24 & 255;
        o[60] = x15 >>> 0 & 255;
        o[61] = x15 >>> 8 & 255;
        o[62] = x15 >>> 16 & 255;
        o[63] = x15 >>> 24 & 255;
      }
      function core_hsalsa20(o, p, k, c) {
        var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
        var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
        for (var i = 0; i < 20; i += 2) {
          u = x0 + x12 | 0;
          x4 ^= u << 7 | u >>> 32 - 7;
          u = x4 + x0 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x4 | 0;
          x12 ^= u << 13 | u >>> 32 - 13;
          u = x12 + x8 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x1 | 0;
          x9 ^= u << 7 | u >>> 32 - 7;
          u = x9 + x5 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x9 | 0;
          x1 ^= u << 13 | u >>> 32 - 13;
          u = x1 + x13 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x6 | 0;
          x14 ^= u << 7 | u >>> 32 - 7;
          u = x14 + x10 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x14 | 0;
          x6 ^= u << 13 | u >>> 32 - 13;
          u = x6 + x2 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x11 | 0;
          x3 ^= u << 7 | u >>> 32 - 7;
          u = x3 + x15 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x3 | 0;
          x11 ^= u << 13 | u >>> 32 - 13;
          u = x11 + x7 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
          u = x0 + x3 | 0;
          x1 ^= u << 7 | u >>> 32 - 7;
          u = x1 + x0 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x1 | 0;
          x3 ^= u << 13 | u >>> 32 - 13;
          u = x3 + x2 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x4 | 0;
          x6 ^= u << 7 | u >>> 32 - 7;
          u = x6 + x5 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x6 | 0;
          x4 ^= u << 13 | u >>> 32 - 13;
          u = x4 + x7 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x9 | 0;
          x11 ^= u << 7 | u >>> 32 - 7;
          u = x11 + x10 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x11 | 0;
          x9 ^= u << 13 | u >>> 32 - 13;
          u = x9 + x8 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x14 | 0;
          x12 ^= u << 7 | u >>> 32 - 7;
          u = x12 + x15 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x12 | 0;
          x14 ^= u << 13 | u >>> 32 - 13;
          u = x14 + x13 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
        }
        o[0] = x0 >>> 0 & 255;
        o[1] = x0 >>> 8 & 255;
        o[2] = x0 >>> 16 & 255;
        o[3] = x0 >>> 24 & 255;
        o[4] = x5 >>> 0 & 255;
        o[5] = x5 >>> 8 & 255;
        o[6] = x5 >>> 16 & 255;
        o[7] = x5 >>> 24 & 255;
        o[8] = x10 >>> 0 & 255;
        o[9] = x10 >>> 8 & 255;
        o[10] = x10 >>> 16 & 255;
        o[11] = x10 >>> 24 & 255;
        o[12] = x15 >>> 0 & 255;
        o[13] = x15 >>> 8 & 255;
        o[14] = x15 >>> 16 & 255;
        o[15] = x15 >>> 24 & 255;
        o[16] = x6 >>> 0 & 255;
        o[17] = x6 >>> 8 & 255;
        o[18] = x6 >>> 16 & 255;
        o[19] = x6 >>> 24 & 255;
        o[20] = x7 >>> 0 & 255;
        o[21] = x7 >>> 8 & 255;
        o[22] = x7 >>> 16 & 255;
        o[23] = x7 >>> 24 & 255;
        o[24] = x8 >>> 0 & 255;
        o[25] = x8 >>> 8 & 255;
        o[26] = x8 >>> 16 & 255;
        o[27] = x8 >>> 24 & 255;
        o[28] = x9 >>> 0 & 255;
        o[29] = x9 >>> 8 & 255;
        o[30] = x9 >>> 16 & 255;
        o[31] = x9 >>> 24 & 255;
      }
      function crypto_core_salsa20(out, inp, k, c) {
        core_salsa20(out, inp, k, c);
      }
      function crypto_core_hsalsa20(out, inp, k, c) {
        core_hsalsa20(out, inp, k, c);
      }
      var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
      function crypto_stream_salsa20_xor(c, cpos, m, mpos, b, n, k) {
        var z = new Uint8Array(16), x = new Uint8Array(64);
        var u, i;
        for (i = 0; i < 16; i++) z[i] = 0;
        for (i = 0; i < 8; i++) z[i] = n[i];
        while (b >= 64) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < 64; i++) c[cpos + i] = m[mpos + i] ^ x[i];
          u = 1;
          for (i = 8; i < 16; i++) {
            u = u + (z[i] & 255) | 0;
            z[i] = u & 255;
            u >>>= 8;
          }
          b -= 64;
          cpos += 64;
          mpos += 64;
        }
        if (b > 0) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < b; i++) c[cpos + i] = m[mpos + i] ^ x[i];
        }
        return 0;
      }
      function crypto_stream_salsa20(c, cpos, b, n, k) {
        var z = new Uint8Array(16), x = new Uint8Array(64);
        var u, i;
        for (i = 0; i < 16; i++) z[i] = 0;
        for (i = 0; i < 8; i++) z[i] = n[i];
        while (b >= 64) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < 64; i++) c[cpos + i] = x[i];
          u = 1;
          for (i = 8; i < 16; i++) {
            u = u + (z[i] & 255) | 0;
            z[i] = u & 255;
            u >>>= 8;
          }
          b -= 64;
          cpos += 64;
        }
        if (b > 0) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < b; i++) c[cpos + i] = x[i];
        }
        return 0;
      }
      function crypto_stream(c, cpos, d, n, k) {
        var s = new Uint8Array(32);
        crypto_core_hsalsa20(s, n, k, sigma);
        var sn = new Uint8Array(8);
        for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
        return crypto_stream_salsa20(c, cpos, d, sn, s);
      }
      function crypto_stream_xor(c, cpos, m, mpos, d, n, k) {
        var s = new Uint8Array(32);
        crypto_core_hsalsa20(s, n, k, sigma);
        var sn = new Uint8Array(8);
        for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
        return crypto_stream_salsa20_xor(c, cpos, m, mpos, d, sn, s);
      }
      var poly1305 = function(key) {
        this.buffer = new Uint8Array(16);
        this.r = new Uint16Array(10);
        this.h = new Uint16Array(10);
        this.pad = new Uint16Array(8);
        this.leftover = 0;
        this.fin = 0;
        var t0, t1, t2, t3, t4, t5, t6, t7;
        t0 = key[0] & 255 | (key[1] & 255) << 8;
        this.r[0] = t0 & 8191;
        t1 = key[2] & 255 | (key[3] & 255) << 8;
        this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
        t2 = key[4] & 255 | (key[5] & 255) << 8;
        this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
        t3 = key[6] & 255 | (key[7] & 255) << 8;
        this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
        t4 = key[8] & 255 | (key[9] & 255) << 8;
        this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
        this.r[5] = t4 >>> 1 & 8190;
        t5 = key[10] & 255 | (key[11] & 255) << 8;
        this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
        t6 = key[12] & 255 | (key[13] & 255) << 8;
        this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
        t7 = key[14] & 255 | (key[15] & 255) << 8;
        this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
        this.r[9] = t7 >>> 5 & 127;
        this.pad[0] = key[16] & 255 | (key[17] & 255) << 8;
        this.pad[1] = key[18] & 255 | (key[19] & 255) << 8;
        this.pad[2] = key[20] & 255 | (key[21] & 255) << 8;
        this.pad[3] = key[22] & 255 | (key[23] & 255) << 8;
        this.pad[4] = key[24] & 255 | (key[25] & 255) << 8;
        this.pad[5] = key[26] & 255 | (key[27] & 255) << 8;
        this.pad[6] = key[28] & 255 | (key[29] & 255) << 8;
        this.pad[7] = key[30] & 255 | (key[31] & 255) << 8;
      };
      poly1305.prototype.blocks = function(m, mpos, bytes) {
        var hibit = this.fin ? 0 : 1 << 11;
        var t0, t1, t2, t3, t4, t5, t6, t7, c;
        var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;
        var h0 = this.h[0], h1 = this.h[1], h2 = this.h[2], h3 = this.h[3], h4 = this.h[4], h5 = this.h[5], h6 = this.h[6], h7 = this.h[7], h8 = this.h[8], h9 = this.h[9];
        var r0 = this.r[0], r1 = this.r[1], r2 = this.r[2], r3 = this.r[3], r4 = this.r[4], r5 = this.r[5], r6 = this.r[6], r7 = this.r[7], r8 = this.r[8], r9 = this.r[9];
        while (bytes >= 16) {
          t0 = m[mpos + 0] & 255 | (m[mpos + 1] & 255) << 8;
          h0 += t0 & 8191;
          t1 = m[mpos + 2] & 255 | (m[mpos + 3] & 255) << 8;
          h1 += (t0 >>> 13 | t1 << 3) & 8191;
          t2 = m[mpos + 4] & 255 | (m[mpos + 5] & 255) << 8;
          h2 += (t1 >>> 10 | t2 << 6) & 8191;
          t3 = m[mpos + 6] & 255 | (m[mpos + 7] & 255) << 8;
          h3 += (t2 >>> 7 | t3 << 9) & 8191;
          t4 = m[mpos + 8] & 255 | (m[mpos + 9] & 255) << 8;
          h4 += (t3 >>> 4 | t4 << 12) & 8191;
          h5 += t4 >>> 1 & 8191;
          t5 = m[mpos + 10] & 255 | (m[mpos + 11] & 255) << 8;
          h6 += (t4 >>> 14 | t5 << 2) & 8191;
          t6 = m[mpos + 12] & 255 | (m[mpos + 13] & 255) << 8;
          h7 += (t5 >>> 11 | t6 << 5) & 8191;
          t7 = m[mpos + 14] & 255 | (m[mpos + 15] & 255) << 8;
          h8 += (t6 >>> 8 | t7 << 8) & 8191;
          h9 += t7 >>> 5 | hibit;
          c = 0;
          d0 = c;
          d0 += h0 * r0;
          d0 += h1 * (5 * r9);
          d0 += h2 * (5 * r8);
          d0 += h3 * (5 * r7);
          d0 += h4 * (5 * r6);
          c = d0 >>> 13;
          d0 &= 8191;
          d0 += h5 * (5 * r5);
          d0 += h6 * (5 * r4);
          d0 += h7 * (5 * r3);
          d0 += h8 * (5 * r2);
          d0 += h9 * (5 * r1);
          c += d0 >>> 13;
          d0 &= 8191;
          d1 = c;
          d1 += h0 * r1;
          d1 += h1 * r0;
          d1 += h2 * (5 * r9);
          d1 += h3 * (5 * r8);
          d1 += h4 * (5 * r7);
          c = d1 >>> 13;
          d1 &= 8191;
          d1 += h5 * (5 * r6);
          d1 += h6 * (5 * r5);
          d1 += h7 * (5 * r4);
          d1 += h8 * (5 * r3);
          d1 += h9 * (5 * r2);
          c += d1 >>> 13;
          d1 &= 8191;
          d2 = c;
          d2 += h0 * r2;
          d2 += h1 * r1;
          d2 += h2 * r0;
          d2 += h3 * (5 * r9);
          d2 += h4 * (5 * r8);
          c = d2 >>> 13;
          d2 &= 8191;
          d2 += h5 * (5 * r7);
          d2 += h6 * (5 * r6);
          d2 += h7 * (5 * r5);
          d2 += h8 * (5 * r4);
          d2 += h9 * (5 * r3);
          c += d2 >>> 13;
          d2 &= 8191;
          d3 = c;
          d3 += h0 * r3;
          d3 += h1 * r2;
          d3 += h2 * r1;
          d3 += h3 * r0;
          d3 += h4 * (5 * r9);
          c = d3 >>> 13;
          d3 &= 8191;
          d3 += h5 * (5 * r8);
          d3 += h6 * (5 * r7);
          d3 += h7 * (5 * r6);
          d3 += h8 * (5 * r5);
          d3 += h9 * (5 * r4);
          c += d3 >>> 13;
          d3 &= 8191;
          d4 = c;
          d4 += h0 * r4;
          d4 += h1 * r3;
          d4 += h2 * r2;
          d4 += h3 * r1;
          d4 += h4 * r0;
          c = d4 >>> 13;
          d4 &= 8191;
          d4 += h5 * (5 * r9);
          d4 += h6 * (5 * r8);
          d4 += h7 * (5 * r7);
          d4 += h8 * (5 * r6);
          d4 += h9 * (5 * r5);
          c += d4 >>> 13;
          d4 &= 8191;
          d5 = c;
          d5 += h0 * r5;
          d5 += h1 * r4;
          d5 += h2 * r3;
          d5 += h3 * r2;
          d5 += h4 * r1;
          c = d5 >>> 13;
          d5 &= 8191;
          d5 += h5 * r0;
          d5 += h6 * (5 * r9);
          d5 += h7 * (5 * r8);
          d5 += h8 * (5 * r7);
          d5 += h9 * (5 * r6);
          c += d5 >>> 13;
          d5 &= 8191;
          d6 = c;
          d6 += h0 * r6;
          d6 += h1 * r5;
          d6 += h2 * r4;
          d6 += h3 * r3;
          d6 += h4 * r2;
          c = d6 >>> 13;
          d6 &= 8191;
          d6 += h5 * r1;
          d6 += h6 * r0;
          d6 += h7 * (5 * r9);
          d6 += h8 * (5 * r8);
          d6 += h9 * (5 * r7);
          c += d6 >>> 13;
          d6 &= 8191;
          d7 = c;
          d7 += h0 * r7;
          d7 += h1 * r6;
          d7 += h2 * r5;
          d7 += h3 * r4;
          d7 += h4 * r3;
          c = d7 >>> 13;
          d7 &= 8191;
          d7 += h5 * r2;
          d7 += h6 * r1;
          d7 += h7 * r0;
          d7 += h8 * (5 * r9);
          d7 += h9 * (5 * r8);
          c += d7 >>> 13;
          d7 &= 8191;
          d8 = c;
          d8 += h0 * r8;
          d8 += h1 * r7;
          d8 += h2 * r6;
          d8 += h3 * r5;
          d8 += h4 * r4;
          c = d8 >>> 13;
          d8 &= 8191;
          d8 += h5 * r3;
          d8 += h6 * r2;
          d8 += h7 * r1;
          d8 += h8 * r0;
          d8 += h9 * (5 * r9);
          c += d8 >>> 13;
          d8 &= 8191;
          d9 = c;
          d9 += h0 * r9;
          d9 += h1 * r8;
          d9 += h2 * r7;
          d9 += h3 * r6;
          d9 += h4 * r5;
          c = d9 >>> 13;
          d9 &= 8191;
          d9 += h5 * r4;
          d9 += h6 * r3;
          d9 += h7 * r2;
          d9 += h8 * r1;
          d9 += h9 * r0;
          c += d9 >>> 13;
          d9 &= 8191;
          c = (c << 2) + c | 0;
          c = c + d0 | 0;
          d0 = c & 8191;
          c = c >>> 13;
          d1 += c;
          h0 = d0;
          h1 = d1;
          h2 = d2;
          h3 = d3;
          h4 = d4;
          h5 = d5;
          h6 = d6;
          h7 = d7;
          h8 = d8;
          h9 = d9;
          mpos += 16;
          bytes -= 16;
        }
        this.h[0] = h0;
        this.h[1] = h1;
        this.h[2] = h2;
        this.h[3] = h3;
        this.h[4] = h4;
        this.h[5] = h5;
        this.h[6] = h6;
        this.h[7] = h7;
        this.h[8] = h8;
        this.h[9] = h9;
      };
      poly1305.prototype.finish = function(mac, macpos) {
        var g = new Uint16Array(10);
        var c, mask, f, i;
        if (this.leftover) {
          i = this.leftover;
          this.buffer[i++] = 1;
          for (; i < 16; i++) this.buffer[i] = 0;
          this.fin = 1;
          this.blocks(this.buffer, 0, 16);
        }
        c = this.h[1] >>> 13;
        this.h[1] &= 8191;
        for (i = 2; i < 10; i++) {
          this.h[i] += c;
          c = this.h[i] >>> 13;
          this.h[i] &= 8191;
        }
        this.h[0] += c * 5;
        c = this.h[0] >>> 13;
        this.h[0] &= 8191;
        this.h[1] += c;
        c = this.h[1] >>> 13;
        this.h[1] &= 8191;
        this.h[2] += c;
        g[0] = this.h[0] + 5;
        c = g[0] >>> 13;
        g[0] &= 8191;
        for (i = 1; i < 10; i++) {
          g[i] = this.h[i] + c;
          c = g[i] >>> 13;
          g[i] &= 8191;
        }
        g[9] -= 1 << 13;
        mask = (c ^ 1) - 1;
        for (i = 0; i < 10; i++) g[i] &= mask;
        mask = ~mask;
        for (i = 0; i < 10; i++) this.h[i] = this.h[i] & mask | g[i];
        this.h[0] = (this.h[0] | this.h[1] << 13) & 65535;
        this.h[1] = (this.h[1] >>> 3 | this.h[2] << 10) & 65535;
        this.h[2] = (this.h[2] >>> 6 | this.h[3] << 7) & 65535;
        this.h[3] = (this.h[3] >>> 9 | this.h[4] << 4) & 65535;
        this.h[4] = (this.h[4] >>> 12 | this.h[5] << 1 | this.h[6] << 14) & 65535;
        this.h[5] = (this.h[6] >>> 2 | this.h[7] << 11) & 65535;
        this.h[6] = (this.h[7] >>> 5 | this.h[8] << 8) & 65535;
        this.h[7] = (this.h[8] >>> 8 | this.h[9] << 5) & 65535;
        f = this.h[0] + this.pad[0];
        this.h[0] = f & 65535;
        for (i = 1; i < 8; i++) {
          f = (this.h[i] + this.pad[i] | 0) + (f >>> 16) | 0;
          this.h[i] = f & 65535;
        }
        mac[macpos + 0] = this.h[0] >>> 0 & 255;
        mac[macpos + 1] = this.h[0] >>> 8 & 255;
        mac[macpos + 2] = this.h[1] >>> 0 & 255;
        mac[macpos + 3] = this.h[1] >>> 8 & 255;
        mac[macpos + 4] = this.h[2] >>> 0 & 255;
        mac[macpos + 5] = this.h[2] >>> 8 & 255;
        mac[macpos + 6] = this.h[3] >>> 0 & 255;
        mac[macpos + 7] = this.h[3] >>> 8 & 255;
        mac[macpos + 8] = this.h[4] >>> 0 & 255;
        mac[macpos + 9] = this.h[4] >>> 8 & 255;
        mac[macpos + 10] = this.h[5] >>> 0 & 255;
        mac[macpos + 11] = this.h[5] >>> 8 & 255;
        mac[macpos + 12] = this.h[6] >>> 0 & 255;
        mac[macpos + 13] = this.h[6] >>> 8 & 255;
        mac[macpos + 14] = this.h[7] >>> 0 & 255;
        mac[macpos + 15] = this.h[7] >>> 8 & 255;
      };
      poly1305.prototype.update = function(m, mpos, bytes) {
        var i, want;
        if (this.leftover) {
          want = 16 - this.leftover;
          if (want > bytes)
            want = bytes;
          for (i = 0; i < want; i++)
            this.buffer[this.leftover + i] = m[mpos + i];
          bytes -= want;
          mpos += want;
          this.leftover += want;
          if (this.leftover < 16)
            return;
          this.blocks(this.buffer, 0, 16);
          this.leftover = 0;
        }
        if (bytes >= 16) {
          want = bytes - bytes % 16;
          this.blocks(m, mpos, want);
          mpos += want;
          bytes -= want;
        }
        if (bytes) {
          for (i = 0; i < bytes; i++)
            this.buffer[this.leftover + i] = m[mpos + i];
          this.leftover += bytes;
        }
      };
      function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
        var s = new poly1305(k);
        s.update(m, mpos, n);
        s.finish(out, outpos);
        return 0;
      }
      function crypto_onetimeauth_verify(h2, hpos, m, mpos, n, k) {
        var x = new Uint8Array(16);
        crypto_onetimeauth(x, 0, m, mpos, n, k);
        return crypto_verify_16(h2, hpos, x, 0);
      }
      function crypto_secretbox(c, m, d, n, k) {
        var i;
        if (d < 32) return -1;
        crypto_stream_xor(c, 0, m, 0, d, n, k);
        crypto_onetimeauth(c, 16, c, 32, d - 32, c);
        for (i = 0; i < 16; i++) c[i] = 0;
        return 0;
      }
      function crypto_secretbox_open(m, c, d, n, k) {
        var i;
        var x = new Uint8Array(32);
        if (d < 32) return -1;
        crypto_stream(x, 0, 32, n, k);
        if (crypto_onetimeauth_verify(c, 16, c, 32, d - 32, x) !== 0) return -1;
        crypto_stream_xor(m, 0, c, 0, d, n, k);
        for (i = 0; i < 32; i++) m[i] = 0;
        return 0;
      }
      function set25519(r, a) {
        var i;
        for (i = 0; i < 16; i++) r[i] = a[i] | 0;
      }
      function car25519(o) {
        var i, v, c = 1;
        for (i = 0; i < 16; i++) {
          v = o[i] + c + 65535;
          c = Math.floor(v / 65536);
          o[i] = v - c * 65536;
        }
        o[0] += c - 1 + 37 * (c - 1);
      }
      function sel25519(p, q, b) {
        var t, c = ~(b - 1);
        for (var i = 0; i < 16; i++) {
          t = c & (p[i] ^ q[i]);
          p[i] ^= t;
          q[i] ^= t;
        }
      }
      function pack25519(o, n) {
        var i, j, b;
        var m = gf(), t = gf();
        for (i = 0; i < 16; i++) t[i] = n[i];
        car25519(t);
        car25519(t);
        car25519(t);
        for (j = 0; j < 2; j++) {
          m[0] = t[0] - 65517;
          for (i = 1; i < 15; i++) {
            m[i] = t[i] - 65535 - (m[i - 1] >> 16 & 1);
            m[i - 1] &= 65535;
          }
          m[15] = t[15] - 32767 - (m[14] >> 16 & 1);
          b = m[15] >> 16 & 1;
          m[14] &= 65535;
          sel25519(t, m, 1 - b);
        }
        for (i = 0; i < 16; i++) {
          o[2 * i] = t[i] & 255;
          o[2 * i + 1] = t[i] >> 8;
        }
      }
      function neq25519(a, b) {
        var c = new Uint8Array(32), d = new Uint8Array(32);
        pack25519(c, a);
        pack25519(d, b);
        return crypto_verify_32(c, 0, d, 0);
      }
      function par25519(a) {
        var d = new Uint8Array(32);
        pack25519(d, a);
        return d[0] & 1;
      }
      function unpack25519(o, n) {
        var i;
        for (i = 0; i < 16; i++) o[i] = n[2 * i] + (n[2 * i + 1] << 8);
        o[15] &= 32767;
      }
      function A(o, a, b) {
        for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
      }
      function Z(o, a, b) {
        for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
      }
      function M2(o, a, b) {
        var v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
        v = a[0];
        t0 += v * b0;
        t1 += v * b1;
        t2 += v * b2;
        t3 += v * b3;
        t4 += v * b4;
        t5 += v * b5;
        t6 += v * b6;
        t7 += v * b7;
        t8 += v * b8;
        t9 += v * b9;
        t10 += v * b10;
        t11 += v * b11;
        t12 += v * b12;
        t13 += v * b13;
        t14 += v * b14;
        t15 += v * b15;
        v = a[1];
        t1 += v * b0;
        t2 += v * b1;
        t3 += v * b2;
        t4 += v * b3;
        t5 += v * b4;
        t6 += v * b5;
        t7 += v * b6;
        t8 += v * b7;
        t9 += v * b8;
        t10 += v * b9;
        t11 += v * b10;
        t12 += v * b11;
        t13 += v * b12;
        t14 += v * b13;
        t15 += v * b14;
        t16 += v * b15;
        v = a[2];
        t2 += v * b0;
        t3 += v * b1;
        t4 += v * b2;
        t5 += v * b3;
        t6 += v * b4;
        t7 += v * b5;
        t8 += v * b6;
        t9 += v * b7;
        t10 += v * b8;
        t11 += v * b9;
        t12 += v * b10;
        t13 += v * b11;
        t14 += v * b12;
        t15 += v * b13;
        t16 += v * b14;
        t17 += v * b15;
        v = a[3];
        t3 += v * b0;
        t4 += v * b1;
        t5 += v * b2;
        t6 += v * b3;
        t7 += v * b4;
        t8 += v * b5;
        t9 += v * b6;
        t10 += v * b7;
        t11 += v * b8;
        t12 += v * b9;
        t13 += v * b10;
        t14 += v * b11;
        t15 += v * b12;
        t16 += v * b13;
        t17 += v * b14;
        t18 += v * b15;
        v = a[4];
        t4 += v * b0;
        t5 += v * b1;
        t6 += v * b2;
        t7 += v * b3;
        t8 += v * b4;
        t9 += v * b5;
        t10 += v * b6;
        t11 += v * b7;
        t12 += v * b8;
        t13 += v * b9;
        t14 += v * b10;
        t15 += v * b11;
        t16 += v * b12;
        t17 += v * b13;
        t18 += v * b14;
        t19 += v * b15;
        v = a[5];
        t5 += v * b0;
        t6 += v * b1;
        t7 += v * b2;
        t8 += v * b3;
        t9 += v * b4;
        t10 += v * b5;
        t11 += v * b6;
        t12 += v * b7;
        t13 += v * b8;
        t14 += v * b9;
        t15 += v * b10;
        t16 += v * b11;
        t17 += v * b12;
        t18 += v * b13;
        t19 += v * b14;
        t20 += v * b15;
        v = a[6];
        t6 += v * b0;
        t7 += v * b1;
        t8 += v * b2;
        t9 += v * b3;
        t10 += v * b4;
        t11 += v * b5;
        t12 += v * b6;
        t13 += v * b7;
        t14 += v * b8;
        t15 += v * b9;
        t16 += v * b10;
        t17 += v * b11;
        t18 += v * b12;
        t19 += v * b13;
        t20 += v * b14;
        t21 += v * b15;
        v = a[7];
        t7 += v * b0;
        t8 += v * b1;
        t9 += v * b2;
        t10 += v * b3;
        t11 += v * b4;
        t12 += v * b5;
        t13 += v * b6;
        t14 += v * b7;
        t15 += v * b8;
        t16 += v * b9;
        t17 += v * b10;
        t18 += v * b11;
        t19 += v * b12;
        t20 += v * b13;
        t21 += v * b14;
        t22 += v * b15;
        v = a[8];
        t8 += v * b0;
        t9 += v * b1;
        t10 += v * b2;
        t11 += v * b3;
        t12 += v * b4;
        t13 += v * b5;
        t14 += v * b6;
        t15 += v * b7;
        t16 += v * b8;
        t17 += v * b9;
        t18 += v * b10;
        t19 += v * b11;
        t20 += v * b12;
        t21 += v * b13;
        t22 += v * b14;
        t23 += v * b15;
        v = a[9];
        t9 += v * b0;
        t10 += v * b1;
        t11 += v * b2;
        t12 += v * b3;
        t13 += v * b4;
        t14 += v * b5;
        t15 += v * b6;
        t16 += v * b7;
        t17 += v * b8;
        t18 += v * b9;
        t19 += v * b10;
        t20 += v * b11;
        t21 += v * b12;
        t22 += v * b13;
        t23 += v * b14;
        t24 += v * b15;
        v = a[10];
        t10 += v * b0;
        t11 += v * b1;
        t12 += v * b2;
        t13 += v * b3;
        t14 += v * b4;
        t15 += v * b5;
        t16 += v * b6;
        t17 += v * b7;
        t18 += v * b8;
        t19 += v * b9;
        t20 += v * b10;
        t21 += v * b11;
        t22 += v * b12;
        t23 += v * b13;
        t24 += v * b14;
        t25 += v * b15;
        v = a[11];
        t11 += v * b0;
        t12 += v * b1;
        t13 += v * b2;
        t14 += v * b3;
        t15 += v * b4;
        t16 += v * b5;
        t17 += v * b6;
        t18 += v * b7;
        t19 += v * b8;
        t20 += v * b9;
        t21 += v * b10;
        t22 += v * b11;
        t23 += v * b12;
        t24 += v * b13;
        t25 += v * b14;
        t26 += v * b15;
        v = a[12];
        t12 += v * b0;
        t13 += v * b1;
        t14 += v * b2;
        t15 += v * b3;
        t16 += v * b4;
        t17 += v * b5;
        t18 += v * b6;
        t19 += v * b7;
        t20 += v * b8;
        t21 += v * b9;
        t22 += v * b10;
        t23 += v * b11;
        t24 += v * b12;
        t25 += v * b13;
        t26 += v * b14;
        t27 += v * b15;
        v = a[13];
        t13 += v * b0;
        t14 += v * b1;
        t15 += v * b2;
        t16 += v * b3;
        t17 += v * b4;
        t18 += v * b5;
        t19 += v * b6;
        t20 += v * b7;
        t21 += v * b8;
        t22 += v * b9;
        t23 += v * b10;
        t24 += v * b11;
        t25 += v * b12;
        t26 += v * b13;
        t27 += v * b14;
        t28 += v * b15;
        v = a[14];
        t14 += v * b0;
        t15 += v * b1;
        t16 += v * b2;
        t17 += v * b3;
        t18 += v * b4;
        t19 += v * b5;
        t20 += v * b6;
        t21 += v * b7;
        t22 += v * b8;
        t23 += v * b9;
        t24 += v * b10;
        t25 += v * b11;
        t26 += v * b12;
        t27 += v * b13;
        t28 += v * b14;
        t29 += v * b15;
        v = a[15];
        t15 += v * b0;
        t16 += v * b1;
        t17 += v * b2;
        t18 += v * b3;
        t19 += v * b4;
        t20 += v * b5;
        t21 += v * b6;
        t22 += v * b7;
        t23 += v * b8;
        t24 += v * b9;
        t25 += v * b10;
        t26 += v * b11;
        t27 += v * b12;
        t28 += v * b13;
        t29 += v * b14;
        t30 += v * b15;
        t0 += 38 * t16;
        t1 += 38 * t17;
        t2 += 38 * t18;
        t3 += 38 * t19;
        t4 += 38 * t20;
        t5 += 38 * t21;
        t6 += 38 * t22;
        t7 += 38 * t23;
        t8 += 38 * t24;
        t9 += 38 * t25;
        t10 += 38 * t26;
        t11 += 38 * t27;
        t12 += 38 * t28;
        t13 += 38 * t29;
        t14 += 38 * t30;
        c = 1;
        v = t0 + c + 65535;
        c = Math.floor(v / 65536);
        t0 = v - c * 65536;
        v = t1 + c + 65535;
        c = Math.floor(v / 65536);
        t1 = v - c * 65536;
        v = t2 + c + 65535;
        c = Math.floor(v / 65536);
        t2 = v - c * 65536;
        v = t3 + c + 65535;
        c = Math.floor(v / 65536);
        t3 = v - c * 65536;
        v = t4 + c + 65535;
        c = Math.floor(v / 65536);
        t4 = v - c * 65536;
        v = t5 + c + 65535;
        c = Math.floor(v / 65536);
        t5 = v - c * 65536;
        v = t6 + c + 65535;
        c = Math.floor(v / 65536);
        t6 = v - c * 65536;
        v = t7 + c + 65535;
        c = Math.floor(v / 65536);
        t7 = v - c * 65536;
        v = t8 + c + 65535;
        c = Math.floor(v / 65536);
        t8 = v - c * 65536;
        v = t9 + c + 65535;
        c = Math.floor(v / 65536);
        t9 = v - c * 65536;
        v = t10 + c + 65535;
        c = Math.floor(v / 65536);
        t10 = v - c * 65536;
        v = t11 + c + 65535;
        c = Math.floor(v / 65536);
        t11 = v - c * 65536;
        v = t12 + c + 65535;
        c = Math.floor(v / 65536);
        t12 = v - c * 65536;
        v = t13 + c + 65535;
        c = Math.floor(v / 65536);
        t13 = v - c * 65536;
        v = t14 + c + 65535;
        c = Math.floor(v / 65536);
        t14 = v - c * 65536;
        v = t15 + c + 65535;
        c = Math.floor(v / 65536);
        t15 = v - c * 65536;
        t0 += c - 1 + 37 * (c - 1);
        c = 1;
        v = t0 + c + 65535;
        c = Math.floor(v / 65536);
        t0 = v - c * 65536;
        v = t1 + c + 65535;
        c = Math.floor(v / 65536);
        t1 = v - c * 65536;
        v = t2 + c + 65535;
        c = Math.floor(v / 65536);
        t2 = v - c * 65536;
        v = t3 + c + 65535;
        c = Math.floor(v / 65536);
        t3 = v - c * 65536;
        v = t4 + c + 65535;
        c = Math.floor(v / 65536);
        t4 = v - c * 65536;
        v = t5 + c + 65535;
        c = Math.floor(v / 65536);
        t5 = v - c * 65536;
        v = t6 + c + 65535;
        c = Math.floor(v / 65536);
        t6 = v - c * 65536;
        v = t7 + c + 65535;
        c = Math.floor(v / 65536);
        t7 = v - c * 65536;
        v = t8 + c + 65535;
        c = Math.floor(v / 65536);
        t8 = v - c * 65536;
        v = t9 + c + 65535;
        c = Math.floor(v / 65536);
        t9 = v - c * 65536;
        v = t10 + c + 65535;
        c = Math.floor(v / 65536);
        t10 = v - c * 65536;
        v = t11 + c + 65535;
        c = Math.floor(v / 65536);
        t11 = v - c * 65536;
        v = t12 + c + 65535;
        c = Math.floor(v / 65536);
        t12 = v - c * 65536;
        v = t13 + c + 65535;
        c = Math.floor(v / 65536);
        t13 = v - c * 65536;
        v = t14 + c + 65535;
        c = Math.floor(v / 65536);
        t14 = v - c * 65536;
        v = t15 + c + 65535;
        c = Math.floor(v / 65536);
        t15 = v - c * 65536;
        t0 += c - 1 + 37 * (c - 1);
        o[0] = t0;
        o[1] = t1;
        o[2] = t2;
        o[3] = t3;
        o[4] = t4;
        o[5] = t5;
        o[6] = t6;
        o[7] = t7;
        o[8] = t8;
        o[9] = t9;
        o[10] = t10;
        o[11] = t11;
        o[12] = t12;
        o[13] = t13;
        o[14] = t14;
        o[15] = t15;
      }
      function S(o, a) {
        M2(o, a, a);
      }
      function inv25519(o, i) {
        var c = gf();
        var a;
        for (a = 0; a < 16; a++) c[a] = i[a];
        for (a = 253; a >= 0; a--) {
          S(c, c);
          if (a !== 2 && a !== 4) M2(c, c, i);
        }
        for (a = 0; a < 16; a++) o[a] = c[a];
      }
      function pow2523(o, i) {
        var c = gf();
        var a;
        for (a = 0; a < 16; a++) c[a] = i[a];
        for (a = 250; a >= 0; a--) {
          S(c, c);
          if (a !== 1) M2(c, c, i);
        }
        for (a = 0; a < 16; a++) o[a] = c[a];
      }
      function crypto_scalarmult(q, n, p) {
        var z = new Uint8Array(32);
        var x = new Float64Array(80), r, i;
        var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
        for (i = 0; i < 31; i++) z[i] = n[i];
        z[31] = n[31] & 127 | 64;
        z[0] &= 248;
        unpack25519(x, p);
        for (i = 0; i < 16; i++) {
          b[i] = x[i];
          d[i] = a[i] = c[i] = 0;
        }
        a[0] = d[0] = 1;
        for (i = 254; i >= 0; --i) {
          r = z[i >>> 3] >>> (i & 7) & 1;
          sel25519(a, b, r);
          sel25519(c, d, r);
          A(e, a, c);
          Z(a, a, c);
          A(c, b, d);
          Z(b, b, d);
          S(d, e);
          S(f, a);
          M2(a, c, a);
          M2(c, b, e);
          A(e, a, c);
          Z(a, a, c);
          S(b, a);
          Z(c, d, f);
          M2(a, c, _121665);
          A(a, a, d);
          M2(c, c, a);
          M2(a, d, f);
          M2(d, b, x);
          S(b, e);
          sel25519(a, b, r);
          sel25519(c, d, r);
        }
        for (i = 0; i < 16; i++) {
          x[i + 16] = a[i];
          x[i + 32] = c[i];
          x[i + 48] = b[i];
          x[i + 64] = d[i];
        }
        var x32 = x.subarray(32);
        var x16 = x.subarray(16);
        inv25519(x32, x32);
        M2(x16, x16, x32);
        pack25519(q, x16);
        return 0;
      }
      function crypto_scalarmult_base(q, n) {
        return crypto_scalarmult(q, n, _9);
      }
      function crypto_box_keypair(y, x) {
        randombytes(x, 32);
        return crypto_scalarmult_base(y, x);
      }
      function crypto_box_beforenm(k, y, x) {
        var s = new Uint8Array(32);
        crypto_scalarmult(s, x, y);
        return crypto_core_hsalsa20(k, _0, s, sigma);
      }
      var crypto_box_afternm = crypto_secretbox;
      var crypto_box_open_afternm = crypto_secretbox_open;
      function crypto_box(c, m, d, n, y, x) {
        var k = new Uint8Array(32);
        crypto_box_beforenm(k, y, x);
        return crypto_box_afternm(c, m, d, n, k);
      }
      function crypto_box_open(m, c, d, n, y, x) {
        var k = new Uint8Array(32);
        crypto_box_beforenm(k, y, x);
        return crypto_box_open_afternm(m, c, d, n, k);
      }
      var K = [
        1116352408,
        3609767458,
        1899447441,
        602891725,
        3049323471,
        3964484399,
        3921009573,
        2173295548,
        961987163,
        4081628472,
        1508970993,
        3053834265,
        2453635748,
        2937671579,
        2870763221,
        3664609560,
        3624381080,
        2734883394,
        310598401,
        1164996542,
        607225278,
        1323610764,
        1426881987,
        3590304994,
        1925078388,
        4068182383,
        2162078206,
        991336113,
        2614888103,
        633803317,
        3248222580,
        3479774868,
        3835390401,
        2666613458,
        4022224774,
        944711139,
        264347078,
        2341262773,
        604807628,
        2007800933,
        770255983,
        1495990901,
        1249150122,
        1856431235,
        1555081692,
        3175218132,
        1996064986,
        2198950837,
        2554220882,
        3999719339,
        2821834349,
        766784016,
        2952996808,
        2566594879,
        3210313671,
        3203337956,
        3336571891,
        1034457026,
        3584528711,
        2466948901,
        113926993,
        3758326383,
        338241895,
        168717936,
        666307205,
        1188179964,
        773529912,
        1546045734,
        1294757372,
        1522805485,
        1396182291,
        2643833823,
        1695183700,
        2343527390,
        1986661051,
        1014477480,
        2177026350,
        1206759142,
        2456956037,
        344077627,
        2730485921,
        1290863460,
        2820302411,
        3158454273,
        3259730800,
        3505952657,
        3345764771,
        106217008,
        3516065817,
        3606008344,
        3600352804,
        1432725776,
        4094571909,
        1467031594,
        275423344,
        851169720,
        430227734,
        3100823752,
        506948616,
        1363258195,
        659060556,
        3750685593,
        883997877,
        3785050280,
        958139571,
        3318307427,
        1322822218,
        3812723403,
        1537002063,
        2003034995,
        1747873779,
        3602036899,
        1955562222,
        1575990012,
        2024104815,
        1125592928,
        2227730452,
        2716904306,
        2361852424,
        442776044,
        2428436474,
        593698344,
        2756734187,
        3733110249,
        3204031479,
        2999351573,
        3329325298,
        3815920427,
        3391569614,
        3928383900,
        3515267271,
        566280711,
        3940187606,
        3454069534,
        4118630271,
        4000239992,
        116418474,
        1914138554,
        174292421,
        2731055270,
        289380356,
        3203993006,
        460393269,
        320620315,
        685471733,
        587496836,
        852142971,
        1086792851,
        1017036298,
        365543100,
        1126000580,
        2618297676,
        1288033470,
        3409855158,
        1501505948,
        4234509866,
        1607167915,
        987167468,
        1816402316,
        1246189591
      ];
      function crypto_hashblocks_hl(hh, hl, m, n) {
        var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h2, l, a, b, c, d;
        var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
        var pos = 0;
        while (n >= 128) {
          for (i = 0; i < 16; i++) {
            j = 8 * i + pos;
            wh[i] = m[j + 0] << 24 | m[j + 1] << 16 | m[j + 2] << 8 | m[j + 3];
            wl[i] = m[j + 4] << 24 | m[j + 5] << 16 | m[j + 6] << 8 | m[j + 7];
          }
          for (i = 0; i < 80; i++) {
            bh0 = ah0;
            bh1 = ah1;
            bh2 = ah2;
            bh3 = ah3;
            bh4 = ah4;
            bh5 = ah5;
            bh6 = ah6;
            bh7 = ah7;
            bl0 = al0;
            bl1 = al1;
            bl2 = al2;
            bl3 = al3;
            bl4 = al4;
            bl5 = al5;
            bl6 = al6;
            bl7 = al7;
            h2 = ah7;
            l = al7;
            a = l & 65535;
            b = l >>> 16;
            c = h2 & 65535;
            d = h2 >>> 16;
            h2 = (ah4 >>> 14 | al4 << 32 - 14) ^ (ah4 >>> 18 | al4 << 32 - 18) ^ (al4 >>> 41 - 32 | ah4 << 32 - (41 - 32));
            l = (al4 >>> 14 | ah4 << 32 - 14) ^ (al4 >>> 18 | ah4 << 32 - 18) ^ (ah4 >>> 41 - 32 | al4 << 32 - (41 - 32));
            a += l & 65535;
            b += l >>> 16;
            c += h2 & 65535;
            d += h2 >>> 16;
            h2 = ah4 & ah5 ^ ~ah4 & ah6;
            l = al4 & al5 ^ ~al4 & al6;
            a += l & 65535;
            b += l >>> 16;
            c += h2 & 65535;
            d += h2 >>> 16;
            h2 = K[i * 2];
            l = K[i * 2 + 1];
            a += l & 65535;
            b += l >>> 16;
            c += h2 & 65535;
            d += h2 >>> 16;
            h2 = wh[i % 16];
            l = wl[i % 16];
            a += l & 65535;
            b += l >>> 16;
            c += h2 & 65535;
            d += h2 >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            th = c & 65535 | d << 16;
            tl = a & 65535 | b << 16;
            h2 = th;
            l = tl;
            a = l & 65535;
            b = l >>> 16;
            c = h2 & 65535;
            d = h2 >>> 16;
            h2 = (ah0 >>> 28 | al0 << 32 - 28) ^ (al0 >>> 34 - 32 | ah0 << 32 - (34 - 32)) ^ (al0 >>> 39 - 32 | ah0 << 32 - (39 - 32));
            l = (al0 >>> 28 | ah0 << 32 - 28) ^ (ah0 >>> 34 - 32 | al0 << 32 - (34 - 32)) ^ (ah0 >>> 39 - 32 | al0 << 32 - (39 - 32));
            a += l & 65535;
            b += l >>> 16;
            c += h2 & 65535;
            d += h2 >>> 16;
            h2 = ah0 & ah1 ^ ah0 & ah2 ^ ah1 & ah2;
            l = al0 & al1 ^ al0 & al2 ^ al1 & al2;
            a += l & 65535;
            b += l >>> 16;
            c += h2 & 65535;
            d += h2 >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh7 = c & 65535 | d << 16;
            bl7 = a & 65535 | b << 16;
            h2 = bh3;
            l = bl3;
            a = l & 65535;
            b = l >>> 16;
            c = h2 & 65535;
            d = h2 >>> 16;
            h2 = th;
            l = tl;
            a += l & 65535;
            b += l >>> 16;
            c += h2 & 65535;
            d += h2 >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh3 = c & 65535 | d << 16;
            bl3 = a & 65535 | b << 16;
            ah1 = bh0;
            ah2 = bh1;
            ah3 = bh2;
            ah4 = bh3;
            ah5 = bh4;
            ah6 = bh5;
            ah7 = bh6;
            ah0 = bh7;
            al1 = bl0;
            al2 = bl1;
            al3 = bl2;
            al4 = bl3;
            al5 = bl4;
            al6 = bl5;
            al7 = bl6;
            al0 = bl7;
            if (i % 16 === 15) {
              for (j = 0; j < 16; j++) {
                h2 = wh[j];
                l = wl[j];
                a = l & 65535;
                b = l >>> 16;
                c = h2 & 65535;
                d = h2 >>> 16;
                h2 = wh[(j + 9) % 16];
                l = wl[(j + 9) % 16];
                a += l & 65535;
                b += l >>> 16;
                c += h2 & 65535;
                d += h2 >>> 16;
                th = wh[(j + 1) % 16];
                tl = wl[(j + 1) % 16];
                h2 = (th >>> 1 | tl << 32 - 1) ^ (th >>> 8 | tl << 32 - 8) ^ th >>> 7;
                l = (tl >>> 1 | th << 32 - 1) ^ (tl >>> 8 | th << 32 - 8) ^ (tl >>> 7 | th << 32 - 7);
                a += l & 65535;
                b += l >>> 16;
                c += h2 & 65535;
                d += h2 >>> 16;
                th = wh[(j + 14) % 16];
                tl = wl[(j + 14) % 16];
                h2 = (th >>> 19 | tl << 32 - 19) ^ (tl >>> 61 - 32 | th << 32 - (61 - 32)) ^ th >>> 6;
                l = (tl >>> 19 | th << 32 - 19) ^ (th >>> 61 - 32 | tl << 32 - (61 - 32)) ^ (tl >>> 6 | th << 32 - 6);
                a += l & 65535;
                b += l >>> 16;
                c += h2 & 65535;
                d += h2 >>> 16;
                b += a >>> 16;
                c += b >>> 16;
                d += c >>> 16;
                wh[j] = c & 65535 | d << 16;
                wl[j] = a & 65535 | b << 16;
              }
            }
          }
          h2 = ah0;
          l = al0;
          a = l & 65535;
          b = l >>> 16;
          c = h2 & 65535;
          d = h2 >>> 16;
          h2 = hh[0];
          l = hl[0];
          a += l & 65535;
          b += l >>> 16;
          c += h2 & 65535;
          d += h2 >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[0] = ah0 = c & 65535 | d << 16;
          hl[0] = al0 = a & 65535 | b << 16;
          h2 = ah1;
          l = al1;
          a = l & 65535;
          b = l >>> 16;
          c = h2 & 65535;
          d = h2 >>> 16;
          h2 = hh[1];
          l = hl[1];
          a += l & 65535;
          b += l >>> 16;
          c += h2 & 65535;
          d += h2 >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[1] = ah1 = c & 65535 | d << 16;
          hl[1] = al1 = a & 65535 | b << 16;
          h2 = ah2;
          l = al2;
          a = l & 65535;
          b = l >>> 16;
          c = h2 & 65535;
          d = h2 >>> 16;
          h2 = hh[2];
          l = hl[2];
          a += l & 65535;
          b += l >>> 16;
          c += h2 & 65535;
          d += h2 >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[2] = ah2 = c & 65535 | d << 16;
          hl[2] = al2 = a & 65535 | b << 16;
          h2 = ah3;
          l = al3;
          a = l & 65535;
          b = l >>> 16;
          c = h2 & 65535;
          d = h2 >>> 16;
          h2 = hh[3];
          l = hl[3];
          a += l & 65535;
          b += l >>> 16;
          c += h2 & 65535;
          d += h2 >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[3] = ah3 = c & 65535 | d << 16;
          hl[3] = al3 = a & 65535 | b << 16;
          h2 = ah4;
          l = al4;
          a = l & 65535;
          b = l >>> 16;
          c = h2 & 65535;
          d = h2 >>> 16;
          h2 = hh[4];
          l = hl[4];
          a += l & 65535;
          b += l >>> 16;
          c += h2 & 65535;
          d += h2 >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[4] = ah4 = c & 65535 | d << 16;
          hl[4] = al4 = a & 65535 | b << 16;
          h2 = ah5;
          l = al5;
          a = l & 65535;
          b = l >>> 16;
          c = h2 & 65535;
          d = h2 >>> 16;
          h2 = hh[5];
          l = hl[5];
          a += l & 65535;
          b += l >>> 16;
          c += h2 & 65535;
          d += h2 >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[5] = ah5 = c & 65535 | d << 16;
          hl[5] = al5 = a & 65535 | b << 16;
          h2 = ah6;
          l = al6;
          a = l & 65535;
          b = l >>> 16;
          c = h2 & 65535;
          d = h2 >>> 16;
          h2 = hh[6];
          l = hl[6];
          a += l & 65535;
          b += l >>> 16;
          c += h2 & 65535;
          d += h2 >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[6] = ah6 = c & 65535 | d << 16;
          hl[6] = al6 = a & 65535 | b << 16;
          h2 = ah7;
          l = al7;
          a = l & 65535;
          b = l >>> 16;
          c = h2 & 65535;
          d = h2 >>> 16;
          h2 = hh[7];
          l = hl[7];
          a += l & 65535;
          b += l >>> 16;
          c += h2 & 65535;
          d += h2 >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[7] = ah7 = c & 65535 | d << 16;
          hl[7] = al7 = a & 65535 | b << 16;
          pos += 128;
          n -= 128;
        }
        return n;
      }
      function crypto_hash(out, m, n) {
        var hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
        hh[0] = 1779033703;
        hh[1] = 3144134277;
        hh[2] = 1013904242;
        hh[3] = 2773480762;
        hh[4] = 1359893119;
        hh[5] = 2600822924;
        hh[6] = 528734635;
        hh[7] = 1541459225;
        hl[0] = 4089235720;
        hl[1] = 2227873595;
        hl[2] = 4271175723;
        hl[3] = 1595750129;
        hl[4] = 2917565137;
        hl[5] = 725511199;
        hl[6] = 4215389547;
        hl[7] = 327033209;
        crypto_hashblocks_hl(hh, hl, m, n);
        n %= 128;
        for (i = 0; i < n; i++) x[i] = m[b - n + i];
        x[n] = 128;
        n = 256 - 128 * (n < 112 ? 1 : 0);
        x[n - 9] = 0;
        ts64(x, n - 8, b / 536870912 | 0, b << 3);
        crypto_hashblocks_hl(hh, hl, x, n);
        for (i = 0; i < 8; i++) ts64(out, 8 * i, hh[i], hl[i]);
        return 0;
      }
      function add(p, q) {
        var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h2 = gf(), t = gf();
        Z(a, p[1], p[0]);
        Z(t, q[1], q[0]);
        M2(a, a, t);
        A(b, p[0], p[1]);
        A(t, q[0], q[1]);
        M2(b, b, t);
        M2(c, p[3], q[3]);
        M2(c, c, D2);
        M2(d, p[2], q[2]);
        A(d, d, d);
        Z(e, b, a);
        Z(f, d, c);
        A(g, d, c);
        A(h2, b, a);
        M2(p[0], e, f);
        M2(p[1], h2, g);
        M2(p[2], g, f);
        M2(p[3], e, h2);
      }
      function cswap(p, q, b) {
        var i;
        for (i = 0; i < 4; i++) {
          sel25519(p[i], q[i], b);
        }
      }
      function pack(r, p) {
        var tx = gf(), ty = gf(), zi = gf();
        inv25519(zi, p[2]);
        M2(tx, p[0], zi);
        M2(ty, p[1], zi);
        pack25519(r, ty);
        r[31] ^= par25519(tx) << 7;
      }
      function scalarmult(p, q, s) {
        var b, i;
        set25519(p[0], gf0);
        set25519(p[1], gf1);
        set25519(p[2], gf1);
        set25519(p[3], gf0);
        for (i = 255; i >= 0; --i) {
          b = s[i / 8 | 0] >> (i & 7) & 1;
          cswap(p, q, b);
          add(q, p);
          add(p, p);
          cswap(p, q, b);
        }
      }
      function scalarbase(p, s) {
        var q = [gf(), gf(), gf(), gf()];
        set25519(q[0], X);
        set25519(q[1], Y);
        set25519(q[2], gf1);
        M2(q[3], X, Y);
        scalarmult(p, q, s);
      }
      function crypto_sign_keypair(pk, sk, seeded) {
        var d = new Uint8Array(64);
        var p = [gf(), gf(), gf(), gf()];
        var i;
        if (!seeded) randombytes(sk, 32);
        crypto_hash(d, sk, 32);
        d[0] &= 248;
        d[31] &= 127;
        d[31] |= 64;
        scalarbase(p, d);
        pack(pk, p);
        for (i = 0; i < 32; i++) sk[i + 32] = pk[i];
        return 0;
      }
      var L2 = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
      function modL(r, x) {
        var carry, i, j, k;
        for (i = 63; i >= 32; --i) {
          carry = 0;
          for (j = i - 32, k = i - 12; j < k; ++j) {
            x[j] += carry - 16 * x[i] * L2[j - (i - 32)];
            carry = Math.floor((x[j] + 128) / 256);
            x[j] -= carry * 256;
          }
          x[j] += carry;
          x[i] = 0;
        }
        carry = 0;
        for (j = 0; j < 32; j++) {
          x[j] += carry - (x[31] >> 4) * L2[j];
          carry = x[j] >> 8;
          x[j] &= 255;
        }
        for (j = 0; j < 32; j++) x[j] -= carry * L2[j];
        for (i = 0; i < 32; i++) {
          x[i + 1] += x[i] >> 8;
          r[i] = x[i] & 255;
        }
      }
      function reduce(r) {
        var x = new Float64Array(64), i;
        for (i = 0; i < 64; i++) x[i] = r[i];
        for (i = 0; i < 64; i++) r[i] = 0;
        modL(r, x);
      }
      function crypto_sign(sm, m, n, sk) {
        var d = new Uint8Array(64), h2 = new Uint8Array(64), r = new Uint8Array(64);
        var i, j, x = new Float64Array(64);
        var p = [gf(), gf(), gf(), gf()];
        crypto_hash(d, sk, 32);
        d[0] &= 248;
        d[31] &= 127;
        d[31] |= 64;
        var smlen = n + 64;
        for (i = 0; i < n; i++) sm[64 + i] = m[i];
        for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];
        crypto_hash(r, sm.subarray(32), n + 32);
        reduce(r);
        scalarbase(p, r);
        pack(sm, p);
        for (i = 32; i < 64; i++) sm[i] = sk[i];
        crypto_hash(h2, sm, n + 64);
        reduce(h2);
        for (i = 0; i < 64; i++) x[i] = 0;
        for (i = 0; i < 32; i++) x[i] = r[i];
        for (i = 0; i < 32; i++) {
          for (j = 0; j < 32; j++) {
            x[i + j] += h2[i] * d[j];
          }
        }
        modL(sm.subarray(32), x);
        return smlen;
      }
      function unpackneg(r, p) {
        var t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
        set25519(r[2], gf1);
        unpack25519(r[1], p);
        S(num, r[1]);
        M2(den, num, D);
        Z(num, num, r[2]);
        A(den, r[2], den);
        S(den2, den);
        S(den4, den2);
        M2(den6, den4, den2);
        M2(t, den6, num);
        M2(t, t, den);
        pow2523(t, t);
        M2(t, t, num);
        M2(t, t, den);
        M2(t, t, den);
        M2(r[0], t, den);
        S(chk, r[0]);
        M2(chk, chk, den);
        if (neq25519(chk, num)) M2(r[0], r[0], I2);
        S(chk, r[0]);
        M2(chk, chk, den);
        if (neq25519(chk, num)) return -1;
        if (par25519(r[0]) === p[31] >> 7) Z(r[0], gf0, r[0]);
        M2(r[3], r[0], r[1]);
        return 0;
      }
      function crypto_sign_open(m, sm, n, pk) {
        var i;
        var t = new Uint8Array(32), h2 = new Uint8Array(64);
        var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
        if (n < 64) return -1;
        if (unpackneg(q, pk)) return -1;
        for (i = 0; i < n; i++) m[i] = sm[i];
        for (i = 0; i < 32; i++) m[i + 32] = pk[i];
        crypto_hash(h2, m, n);
        reduce(h2);
        scalarmult(p, q, h2);
        scalarbase(q, sm.subarray(32));
        add(p, q);
        pack(t, p);
        n -= 64;
        if (crypto_verify_32(sm, 0, t, 0)) {
          for (i = 0; i < n; i++) m[i] = 0;
          return -1;
        }
        for (i = 0; i < n; i++) m[i] = sm[i + 64];
        return n;
      }
      var crypto_secretbox_KEYBYTES = 32, crypto_secretbox_NONCEBYTES = 24, crypto_secretbox_ZEROBYTES = 32, crypto_secretbox_BOXZEROBYTES = 16, crypto_scalarmult_BYTES = 32, crypto_scalarmult_SCALARBYTES = 32, crypto_box_PUBLICKEYBYTES = 32, crypto_box_SECRETKEYBYTES = 32, crypto_box_BEFORENMBYTES = 32, crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES, crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES, crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES, crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32, crypto_hash_BYTES = 64;
      nacl.lowlevel = {
        crypto_core_hsalsa20,
        crypto_stream_xor,
        crypto_stream,
        crypto_stream_salsa20_xor,
        crypto_stream_salsa20,
        crypto_onetimeauth,
        crypto_onetimeauth_verify,
        crypto_verify_16,
        crypto_verify_32,
        crypto_secretbox,
        crypto_secretbox_open,
        crypto_scalarmult,
        crypto_scalarmult_base,
        crypto_box_beforenm,
        crypto_box_afternm,
        crypto_box,
        crypto_box_open,
        crypto_box_keypair,
        crypto_hash,
        crypto_sign,
        crypto_sign_keypair,
        crypto_sign_open,
        crypto_secretbox_KEYBYTES,
        crypto_secretbox_NONCEBYTES,
        crypto_secretbox_ZEROBYTES,
        crypto_secretbox_BOXZEROBYTES,
        crypto_scalarmult_BYTES,
        crypto_scalarmult_SCALARBYTES,
        crypto_box_PUBLICKEYBYTES,
        crypto_box_SECRETKEYBYTES,
        crypto_box_BEFORENMBYTES,
        crypto_box_NONCEBYTES,
        crypto_box_ZEROBYTES,
        crypto_box_BOXZEROBYTES,
        crypto_sign_BYTES,
        crypto_sign_PUBLICKEYBYTES,
        crypto_sign_SECRETKEYBYTES,
        crypto_sign_SEEDBYTES,
        crypto_hash_BYTES,
        gf,
        D,
        L: L2,
        pack25519,
        unpack25519,
        M: M2,
        A,
        S,
        Z,
        pow2523,
        add,
        set25519,
        modL,
        scalarmult,
        scalarbase
      };
      function checkLengths(k, n) {
        if (k.length !== crypto_secretbox_KEYBYTES) throw new Error("bad key size");
        if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error("bad nonce size");
      }
      function checkBoxLengths(pk, sk) {
        if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error("bad public key size");
        if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error("bad secret key size");
      }
      function checkArrayTypes() {
        for (var i = 0; i < arguments.length; i++) {
          if (!(arguments[i] instanceof Uint8Array))
            throw new TypeError("unexpected type, use Uint8Array");
        }
      }
      function cleanup(arr) {
        for (var i = 0; i < arr.length; i++) arr[i] = 0;
      }
      nacl.randomBytes = function(n) {
        var b = new Uint8Array(n);
        randombytes(b, n);
        return b;
      };
      nacl.secretbox = function(msg, nonce, key) {
        checkArrayTypes(msg, nonce, key);
        checkLengths(key, nonce);
        var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
        var c = new Uint8Array(m.length);
        for (var i = 0; i < msg.length; i++) m[i + crypto_secretbox_ZEROBYTES] = msg[i];
        crypto_secretbox(c, m, m.length, nonce, key);
        return c.subarray(crypto_secretbox_BOXZEROBYTES);
      };
      nacl.secretbox.open = function(box, nonce, key) {
        checkArrayTypes(box, nonce, key);
        checkLengths(key, nonce);
        var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
        var m = new Uint8Array(c.length);
        for (var i = 0; i < box.length; i++) c[i + crypto_secretbox_BOXZEROBYTES] = box[i];
        if (c.length < 32) return null;
        if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
        return m.subarray(crypto_secretbox_ZEROBYTES);
      };
      nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
      nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
      nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;
      nacl.scalarMult = function(n, p) {
        checkArrayTypes(n, p);
        if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
        if (p.length !== crypto_scalarmult_BYTES) throw new Error("bad p size");
        var q = new Uint8Array(crypto_scalarmult_BYTES);
        crypto_scalarmult(q, n, p);
        return q;
      };
      nacl.scalarMult.base = function(n) {
        checkArrayTypes(n);
        if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
        var q = new Uint8Array(crypto_scalarmult_BYTES);
        crypto_scalarmult_base(q, n);
        return q;
      };
      nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
      nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;
      nacl.box = function(msg, nonce, publicKey, secretKey) {
        var k = nacl.box.before(publicKey, secretKey);
        return nacl.secretbox(msg, nonce, k);
      };
      nacl.box.before = function(publicKey, secretKey) {
        checkArrayTypes(publicKey, secretKey);
        checkBoxLengths(publicKey, secretKey);
        var k = new Uint8Array(crypto_box_BEFORENMBYTES);
        crypto_box_beforenm(k, publicKey, secretKey);
        return k;
      };
      nacl.box.after = nacl.secretbox;
      nacl.box.open = function(msg, nonce, publicKey, secretKey) {
        var k = nacl.box.before(publicKey, secretKey);
        return nacl.secretbox.open(msg, nonce, k);
      };
      nacl.box.open.after = nacl.secretbox.open;
      nacl.box.keyPair = function() {
        var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
        crypto_box_keypair(pk, sk);
        return { publicKey: pk, secretKey: sk };
      };
      nacl.box.keyPair.fromSecretKey = function(secretKey) {
        checkArrayTypes(secretKey);
        if (secretKey.length !== crypto_box_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
        crypto_scalarmult_base(pk, secretKey);
        return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
      };
      nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
      nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
      nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
      nacl.box.nonceLength = crypto_box_NONCEBYTES;
      nacl.box.overheadLength = nacl.secretbox.overheadLength;
      nacl.sign = function(msg, secretKey) {
        checkArrayTypes(msg, secretKey);
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
        crypto_sign(signedMsg, msg, msg.length, secretKey);
        return signedMsg;
      };
      nacl.sign.open = function(signedMsg, publicKey) {
        checkArrayTypes(signedMsg, publicKey);
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
          throw new Error("bad public key size");
        var tmp = new Uint8Array(signedMsg.length);
        var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
        if (mlen < 0) return null;
        var m = new Uint8Array(mlen);
        for (var i = 0; i < m.length; i++) m[i] = tmp[i];
        return m;
      };
      nacl.sign.detached = function(msg, secretKey) {
        var signedMsg = nacl.sign(msg, secretKey);
        var sig = new Uint8Array(crypto_sign_BYTES);
        for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
        return sig;
      };
      nacl.sign.detached.verify = function(msg, sig, publicKey) {
        checkArrayTypes(msg, sig, publicKey);
        if (sig.length !== crypto_sign_BYTES)
          throw new Error("bad signature size");
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
          throw new Error("bad public key size");
        var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
        var m = new Uint8Array(crypto_sign_BYTES + msg.length);
        var i;
        for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
        for (i = 0; i < msg.length; i++) sm[i + crypto_sign_BYTES] = msg[i];
        return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
      };
      nacl.sign.keyPair = function() {
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        crypto_sign_keypair(pk, sk);
        return { publicKey: pk, secretKey: sk };
      };
      nacl.sign.keyPair.fromSecretKey = function(secretKey) {
        checkArrayTypes(secretKey);
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32 + i];
        return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
      };
      nacl.sign.keyPair.fromSeed = function(seed) {
        checkArrayTypes(seed);
        if (seed.length !== crypto_sign_SEEDBYTES)
          throw new Error("bad seed size");
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        for (var i = 0; i < 32; i++) sk[i] = seed[i];
        crypto_sign_keypair(pk, sk, true);
        return { publicKey: pk, secretKey: sk };
      };
      nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
      nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
      nacl.sign.seedLength = crypto_sign_SEEDBYTES;
      nacl.sign.signatureLength = crypto_sign_BYTES;
      nacl.hash = function(msg) {
        checkArrayTypes(msg);
        var h2 = new Uint8Array(crypto_hash_BYTES);
        crypto_hash(h2, msg, msg.length);
        return h2;
      };
      nacl.hash.hashLength = crypto_hash_BYTES;
      nacl.verify = function(x, y) {
        checkArrayTypes(x, y);
        if (x.length === 0 || y.length === 0) return false;
        if (x.length !== y.length) return false;
        return vn(x, 0, y, 0, x.length) === 0 ? true : false;
      };
      nacl.setPRNG = function(fn) {
        randombytes = fn;
      };
      (function() {
        var crypto2 = (typeof self !== "undefined" ? self.crypto || self.msCrypto : null) || globalThis.crypto;
        if (crypto2 && crypto2.getRandomValues) {
          var QUOTA = 65536;
          nacl.setPRNG(function(x, n) {
            var i, v = new Uint8Array(n);
            for (i = 0; i < n; i += QUOTA) {
              crypto2.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
            }
            for (i = 0; i < n; i++) x[i] = v[i];
            cleanup(v);
          });
        } else if (typeof __require !== "undefined") {
          crypto2 = __require("crypto");
          if (crypto2 && crypto2.randomBytes) {
            nacl.setPRNG(function(x, n) {
              var i, v = crypto2.randomBytes(n);
              for (i = 0; i < n; i++) x[i] = v[i];
              cleanup(v);
            });
          }
        }
      })();
    })(typeof module !== "undefined" && module.exports ? module.exports : self.nacl = self.nacl || {});
  }
});

// node_modules/@nats-io/nkeys/lib/nacl.js
var require_nacl = __commonJS({
  "node_modules/@nats-io/nkeys/lib/nacl.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var tweetnacl_1 = __importDefault(require_nacl_fast());
    exports.default = tweetnacl_1.default;
  }
});

// node_modules/@nats-io/nkeys/lib/kp.js
var require_kp = __commonJS({
  "node_modules/@nats-io/nkeys/lib/kp.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KP = void 0;
    var codec_1 = require_codec();
    var nkeys_1 = require_nkeys();
    var nacl_1 = __importDefault(require_nacl());
    var KP = class {
      seed;
      constructor(seed) {
        this.seed = seed;
      }
      getRawSeed() {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        const sd = codec_1.Codec.decodeSeed(this.seed);
        return sd.buf;
      }
      getSeed() {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        return this.seed;
      }
      getPublicKey() {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        const sd = codec_1.Codec.decodeSeed(this.seed);
        const kp = nacl_1.default.sign.keyPair.fromSeed(this.getRawSeed());
        const buf = codec_1.Codec.encode(sd.prefix, kp.publicKey);
        return new TextDecoder().decode(buf);
      }
      getPrivateKey() {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        const kp = nacl_1.default.sign.keyPair.fromSeed(this.getRawSeed());
        return codec_1.Codec.encode(nkeys_1.Prefix.Private, kp.secretKey);
      }
      sign(input) {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        const kp = nacl_1.default.sign.keyPair.fromSeed(this.getRawSeed());
        return nacl_1.default.sign.detached(input, kp.secretKey);
      }
      verify(input, sig) {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        const kp = nacl_1.default.sign.keyPair.fromSeed(this.getRawSeed());
        return nacl_1.default.sign.detached.verify(input, sig, kp.publicKey);
      }
      clear() {
        if (!this.seed) {
          return;
        }
        this.seed.fill(0);
        this.seed = void 0;
      }
      seal(_, _recipient, _nonce) {
        throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidNKeyOperation);
      }
      open(_, _sender) {
        throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidNKeyOperation);
      }
    };
    exports.KP = KP;
  }
});

// node_modules/@nats-io/nkeys/lib/public.js
var require_public = __commonJS({
  "node_modules/@nats-io/nkeys/lib/public.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PublicKey = void 0;
    var codec_1 = require_codec();
    var nkeys_1 = require_nkeys();
    var nacl_1 = __importDefault(require_nacl());
    var PublicKey = class {
      publicKey;
      constructor(publicKey) {
        this.publicKey = publicKey;
      }
      getPublicKey() {
        if (!this.publicKey) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        return new TextDecoder().decode(this.publicKey);
      }
      getPrivateKey() {
        if (!this.publicKey) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.PublicKeyOnly);
      }
      getSeed() {
        if (!this.publicKey) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.PublicKeyOnly);
      }
      sign(_) {
        if (!this.publicKey) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.CannotSign);
      }
      verify(input, sig) {
        if (!this.publicKey) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        const buf = codec_1.Codec._decode(this.publicKey);
        return nacl_1.default.sign.detached.verify(input, sig, buf.slice(1));
      }
      clear() {
        if (!this.publicKey) {
          return;
        }
        this.publicKey.fill(0);
        this.publicKey = void 0;
      }
      seal(_, _recipient, _nonce) {
        throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidNKeyOperation);
      }
      open(_, _sender) {
        throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidNKeyOperation);
      }
    };
    exports.PublicKey = PublicKey;
  }
});

// node_modules/@nats-io/nkeys/lib/curve.js
var require_curve = __commonJS({
  "node_modules/@nats-io/nkeys/lib/curve.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CurveKP = exports.curveNonceLen = exports.curveKeyLen = void 0;
    var nkeys_1 = require_nkeys();
    var nacl_1 = __importDefault(require_nacl());
    var codec_1 = require_codec();
    var nkeys_2 = require_nkeys();
    var base32_1 = require_base32();
    var crc16_1 = require_crc16();
    exports.curveKeyLen = 32;
    var curveDecodeLen = 35;
    exports.curveNonceLen = 24;
    var XKeyVersionV1 = [120, 107, 118, 49];
    var CurveKP = class {
      seed;
      constructor(seed) {
        this.seed = seed;
      }
      clear() {
        if (!this.seed) {
          return;
        }
        this.seed.fill(0);
        this.seed = void 0;
      }
      getPrivateKey() {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        return codec_1.Codec.encode(nkeys_2.Prefix.Private, this.seed);
      }
      getPublicKey() {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        const pub = nacl_1.default.scalarMult.base(this.seed);
        const buf = codec_1.Codec.encode(nkeys_2.Prefix.Curve, pub);
        return new TextDecoder().decode(buf);
      }
      getSeed() {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        return codec_1.Codec.encodeSeed(nkeys_2.Prefix.Curve, this.seed);
      }
      sign() {
        throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidCurveOperation);
      }
      verify() {
        throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidCurveOperation);
      }
      decodePubCurveKey(src) {
        try {
          const raw = base32_1.base32.decode(new TextEncoder().encode(src));
          if (raw.byteLength !== curveDecodeLen) {
            throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidCurveKey);
          }
          if (raw[0] !== nkeys_2.Prefix.Curve) {
            throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidPublicKey);
          }
          const checkOffset = raw.byteLength - 2;
          const dv = new DataView(raw.buffer);
          const checksum = dv.getUint16(checkOffset, true);
          const payload = raw.slice(0, checkOffset);
          if (!crc16_1.crc16.validate(payload, checksum)) {
            throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidChecksum);
          }
          return payload.slice(1);
        } catch (ex) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidRecipient, { cause: ex });
        }
      }
      seal(message, recipient, nonce) {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        if (!nonce) {
          nonce = nacl_1.default.randomBytes(exports.curveNonceLen);
        }
        const pub = this.decodePubCurveKey(recipient);
        const out = new Uint8Array(XKeyVersionV1.length + exports.curveNonceLen);
        out.set(XKeyVersionV1, 0);
        out.set(nonce, XKeyVersionV1.length);
        const encrypted = nacl_1.default.box(message, nonce, pub, this.seed);
        const fullMessage = new Uint8Array(out.length + encrypted.length);
        fullMessage.set(out);
        fullMessage.set(encrypted, out.length);
        return fullMessage;
      }
      open(message, sender) {
        if (!this.seed) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.ClearedPair);
        }
        if (message.length <= exports.curveNonceLen + XKeyVersionV1.length) {
          throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidEncrypted);
        }
        for (let i = 0; i < XKeyVersionV1.length; i++) {
          if (message[i] !== XKeyVersionV1[i]) {
            throw new nkeys_1.NKeysError(nkeys_1.NKeysErrorCode.InvalidEncrypted);
          }
        }
        const pub = this.decodePubCurveKey(sender);
        message = message.slice(XKeyVersionV1.length);
        const nonce = message.slice(0, exports.curveNonceLen);
        message = message.slice(exports.curveNonceLen);
        return nacl_1.default.box.open(message, nonce, pub, this.seed);
      }
    };
    exports.CurveKP = CurveKP;
  }
});

// node_modules/@nats-io/nkeys/lib/nkeys.js
var require_nkeys = __commonJS({
  "node_modules/@nats-io/nkeys/lib/nkeys.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NKeysError = exports.NKeysErrorCode = exports.Prefixes = exports.Prefix = void 0;
    exports.createPair = createPair;
    exports.createOperator = createOperator;
    exports.createAccount = createAccount;
    exports.createUser = createUser2;
    exports.createCluster = createCluster;
    exports.createServer = createServer;
    exports.createCurve = createCurve;
    exports.fromPublic = fromPublic4;
    exports.fromCurveSeed = fromCurveSeed;
    exports.fromSeed = fromSeed4;
    var kp_1 = require_kp();
    var public_1 = require_public();
    var codec_1 = require_codec();
    var curve_1 = require_curve();
    var nacl_1 = __importDefault(require_nacl());
    function createPair(prefix) {
      const len = prefix === Prefix.Curve ? curve_1.curveKeyLen : 32;
      const rawSeed = nacl_1.default.randomBytes(len);
      const str = codec_1.Codec.encodeSeed(prefix, new Uint8Array(rawSeed));
      return prefix === Prefix.Curve ? new curve_1.CurveKP(new Uint8Array(rawSeed)) : new kp_1.KP(str);
    }
    function createOperator() {
      return createPair(Prefix.Operator);
    }
    function createAccount() {
      return createPair(Prefix.Account);
    }
    function createUser2() {
      return createPair(Prefix.User);
    }
    function createCluster() {
      return createPair(Prefix.Cluster);
    }
    function createServer() {
      return createPair(Prefix.Server);
    }
    function createCurve() {
      return createPair(Prefix.Curve);
    }
    function fromPublic4(src) {
      const ba = new TextEncoder().encode(src);
      const raw = codec_1.Codec._decode(ba);
      const prefix = Prefixes.parsePrefix(raw[0]);
      if (Prefixes.isValidPublicPrefix(prefix)) {
        return new public_1.PublicKey(ba);
      }
      throw new NKeysError(NKeysErrorCode.InvalidPublicKey);
    }
    function fromCurveSeed(src) {
      const sd = codec_1.Codec.decodeSeed(src);
      if (sd.prefix !== Prefix.Curve) {
        throw new NKeysError(NKeysErrorCode.InvalidCurveSeed);
      }
      if (sd.buf.byteLength !== curve_1.curveKeyLen) {
        throw new NKeysError(NKeysErrorCode.InvalidSeedLen);
      }
      return new curve_1.CurveKP(sd.buf);
    }
    function fromSeed4(src) {
      const sd = codec_1.Codec.decodeSeed(src);
      if (sd.prefix === Prefix.Curve) {
        return fromCurveSeed(src);
      }
      return new kp_1.KP(src);
    }
    var Prefix;
    (function(Prefix2) {
      Prefix2[Prefix2["Unknown"] = -1] = "Unknown";
      Prefix2[Prefix2["Seed"] = 144] = "Seed";
      Prefix2[Prefix2["Private"] = 120] = "Private";
      Prefix2[Prefix2["Operator"] = 112] = "Operator";
      Prefix2[Prefix2["Server"] = 104] = "Server";
      Prefix2[Prefix2["Cluster"] = 16] = "Cluster";
      Prefix2[Prefix2["Account"] = 0] = "Account";
      Prefix2[Prefix2["User"] = 160] = "User";
      Prefix2[Prefix2["Curve"] = 184] = "Curve";
    })(Prefix || (exports.Prefix = Prefix = {}));
    var Prefixes = class {
      static isValidPublicPrefix(prefix) {
        return prefix == Prefix.Server || prefix == Prefix.Operator || prefix == Prefix.Cluster || prefix == Prefix.Account || prefix == Prefix.User || prefix == Prefix.Curve;
      }
      static startsWithValidPrefix(s) {
        const c = s[0];
        return c == "S" || c == "P" || c == "O" || c == "N" || c == "C" || c == "A" || c == "U" || c == "X";
      }
      static isValidPrefix(prefix) {
        const v = this.parsePrefix(prefix);
        return v !== Prefix.Unknown;
      }
      static parsePrefix(v) {
        switch (v) {
          case Prefix.Seed:
            return Prefix.Seed;
          case Prefix.Private:
            return Prefix.Private;
          case Prefix.Operator:
            return Prefix.Operator;
          case Prefix.Server:
            return Prefix.Server;
          case Prefix.Cluster:
            return Prefix.Cluster;
          case Prefix.Account:
            return Prefix.Account;
          case Prefix.User:
            return Prefix.User;
          case Prefix.Curve:
            return Prefix.Curve;
          default:
            return Prefix.Unknown;
        }
      }
    };
    exports.Prefixes = Prefixes;
    var NKeysErrorCode;
    (function(NKeysErrorCode2) {
      NKeysErrorCode2["InvalidPrefixByte"] = "nkeys: invalid prefix byte";
      NKeysErrorCode2["InvalidKey"] = "nkeys: invalid key";
      NKeysErrorCode2["InvalidPublicKey"] = "nkeys: invalid public key";
      NKeysErrorCode2["InvalidSeedLen"] = "nkeys: invalid seed length";
      NKeysErrorCode2["InvalidSeed"] = "nkeys: invalid seed";
      NKeysErrorCode2["InvalidCurveSeed"] = "nkeys: invalid curve seed";
      NKeysErrorCode2["InvalidCurveKey"] = "nkeys: not a valid curve key";
      NKeysErrorCode2["InvalidCurveOperation"] = "nkeys: curve key is not valid for sign/verify";
      NKeysErrorCode2["InvalidNKeyOperation"] = "keys: only curve key can seal/open";
      NKeysErrorCode2["InvalidEncoding"] = "nkeys: invalid encoded key";
      NKeysErrorCode2["InvalidRecipient"] = "nkeys: not a valid recipient public curve key";
      NKeysErrorCode2["InvalidEncrypted"] = "nkeys: encrypted input is not valid";
      NKeysErrorCode2["CannotSign"] = "nkeys: cannot sign, no private key available";
      NKeysErrorCode2["PublicKeyOnly"] = "nkeys: no seed or private key available";
      NKeysErrorCode2["InvalidChecksum"] = "nkeys: invalid checksum";
      NKeysErrorCode2["SerializationError"] = "nkeys: serialization error";
      NKeysErrorCode2["ApiError"] = "nkeys: api error";
      NKeysErrorCode2["ClearedPair"] = "nkeys: pair is cleared";
    })(NKeysErrorCode || (exports.NKeysErrorCode = NKeysErrorCode = {}));
    var NKeysError = class extends Error {
      code;
      constructor(code, options) {
        super(code, options);
        this.code = code;
      }
    };
    exports.NKeysError = NKeysError;
  }
});

// node_modules/@nats-io/nkeys/lib/util.js
var require_util = __commonJS({
  "node_modules/@nats-io/nkeys/lib/util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.encode = encode;
    exports.decode = decode;
    exports.dump = dump;
    function encode(bytes) {
      return btoa(String.fromCharCode(...bytes));
    }
    function decode(b64str) {
      const bin = atob(b64str);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return bytes;
    }
    function dump(buf, msg) {
      if (msg) {
        console.log(msg);
      }
      const a = [];
      for (let i = 0; i < buf.byteLength; i++) {
        if (i % 8 === 0) {
          a.push("\n");
        }
        let v = buf[i].toString(16);
        if (v.length === 1) {
          v = "0" + v;
        }
        a.push(v);
      }
      console.log(a.join("  "));
    }
  }
});

// node_modules/@nats-io/nkeys/lib/version.js
var require_version = __commonJS({
  "node_modules/@nats-io/nkeys/lib/version.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.version = void 0;
    exports.version = "2.0.3";
  }
});

// node_modules/@nats-io/nkeys/lib/mod.js
var require_mod = __commonJS({
  "node_modules/@nats-io/nkeys/lib/mod.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.version = exports.encode = exports.decode = exports.Prefixes = exports.Prefix = exports.NKeysErrorCode = exports.NKeysError = exports.fromSeed = exports.fromPublic = exports.fromCurveSeed = exports.createUser = exports.createServer = exports.createPair = exports.createOperator = exports.createCurve = exports.createCluster = exports.createAccount = void 0;
    var nkeys_1 = require_nkeys();
    Object.defineProperty(exports, "createAccount", { enumerable: true, get: function() {
      return nkeys_1.createAccount;
    } });
    Object.defineProperty(exports, "createCluster", { enumerable: true, get: function() {
      return nkeys_1.createCluster;
    } });
    Object.defineProperty(exports, "createCurve", { enumerable: true, get: function() {
      return nkeys_1.createCurve;
    } });
    Object.defineProperty(exports, "createOperator", { enumerable: true, get: function() {
      return nkeys_1.createOperator;
    } });
    Object.defineProperty(exports, "createPair", { enumerable: true, get: function() {
      return nkeys_1.createPair;
    } });
    Object.defineProperty(exports, "createServer", { enumerable: true, get: function() {
      return nkeys_1.createServer;
    } });
    Object.defineProperty(exports, "createUser", { enumerable: true, get: function() {
      return nkeys_1.createUser;
    } });
    Object.defineProperty(exports, "fromCurveSeed", { enumerable: true, get: function() {
      return nkeys_1.fromCurveSeed;
    } });
    Object.defineProperty(exports, "fromPublic", { enumerable: true, get: function() {
      return nkeys_1.fromPublic;
    } });
    Object.defineProperty(exports, "fromSeed", { enumerable: true, get: function() {
      return nkeys_1.fromSeed;
    } });
    Object.defineProperty(exports, "NKeysError", { enumerable: true, get: function() {
      return nkeys_1.NKeysError;
    } });
    Object.defineProperty(exports, "NKeysErrorCode", { enumerable: true, get: function() {
      return nkeys_1.NKeysErrorCode;
    } });
    Object.defineProperty(exports, "Prefix", { enumerable: true, get: function() {
      return nkeys_1.Prefix;
    } });
    Object.defineProperty(exports, "Prefixes", { enumerable: true, get: function() {
      return nkeys_1.Prefixes;
    } });
    var util_1 = require_util();
    Object.defineProperty(exports, "decode", { enumerable: true, get: function() {
      return util_1.decode;
    } });
    Object.defineProperty(exports, "encode", { enumerable: true, get: function() {
      return util_1.encode;
    } });
    var version_1 = require_version();
    Object.defineProperty(exports, "version", { enumerable: true, get: function() {
      return version_1.version;
    } });
  }
});

// node_modules/@nats-io/nats-core/lib/encoders.js
var require_encoders = __commonJS({
  "node_modules/@nats-io/nats-core/lib/encoders.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TD = exports.TE = exports.Empty = void 0;
    exports.encode = encode;
    exports.decode = decode;
    exports.Empty = new Uint8Array(0);
    exports.TE = new TextEncoder();
    exports.TD = new TextDecoder();
    function concat(...bufs) {
      let max = 0;
      for (let i = 0; i < bufs.length; i++) {
        max += bufs[i].length;
      }
      const out = new Uint8Array(max);
      let index = 0;
      for (let i = 0; i < bufs.length; i++) {
        out.set(bufs[i], index);
        index += bufs[i].length;
      }
      return out;
    }
    function encode(...a) {
      const bufs = [];
      for (let i = 0; i < a.length; i++) {
        bufs.push(exports.TE.encode(a[i]));
      }
      if (bufs.length === 0) {
        return exports.Empty;
      }
      if (bufs.length === 1) {
        return bufs[0];
      }
      return concat(...bufs);
    }
    function decode(a) {
      if (!a || a.length === 0) {
        return "";
      }
      return exports.TD.decode(a);
    }
  }
});

// node_modules/@nats-io/nats-core/lib/errors.js
var require_errors = __commonJS({
  "node_modules/@nats-io/nats-core/lib/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.errors = exports.PermissionViolationError = exports.NoRespondersError = exports.TimeoutError = exports.RequestError = exports.ProtocolError = exports.ConnectionError = exports.DrainingConnectionError = exports.ClosedConnectionError = exports.AuthorizationError = exports.UserAuthenticationExpiredError = exports.InvalidOperationError = exports.InvalidArgumentError = exports.InvalidSubjectError = void 0;
    var InvalidSubjectError = class extends Error {
      constructor(subject, options) {
        super(`illegal subject: '${subject}'`, options);
        this.name = "InvalidSubjectError";
      }
    };
    exports.InvalidSubjectError = InvalidSubjectError;
    var InvalidArgumentError = class _InvalidArgumentError extends Error {
      constructor(message, options) {
        super(message, options);
        this.name = "InvalidArgumentError";
      }
      static format(property, message, options) {
        if (Array.isArray(message) && message.length > 1) {
          message = message[0];
        }
        if (Array.isArray(property)) {
          property = property.map((n) => `'${n}'`);
          property = property.join(",");
        } else {
          property = `'${property}'`;
        }
        return new _InvalidArgumentError(`${property} ${message}`, options);
      }
    };
    exports.InvalidArgumentError = InvalidArgumentError;
    var InvalidOperationError = class extends Error {
      constructor(message, options) {
        super(message, options);
        this.name = "InvalidOperationError";
      }
    };
    exports.InvalidOperationError = InvalidOperationError;
    var UserAuthenticationExpiredError = class _UserAuthenticationExpiredError extends Error {
      constructor(message, options) {
        super(message, options);
        this.name = "UserAuthenticationExpiredError";
      }
      static parse(s) {
        const ss = s.toLowerCase();
        if (ss.indexOf("user authentication expired") !== -1) {
          return new _UserAuthenticationExpiredError(s);
        }
        return null;
      }
    };
    exports.UserAuthenticationExpiredError = UserAuthenticationExpiredError;
    var AuthorizationError = class _AuthorizationError extends Error {
      constructor(message, options) {
        super(message, options);
        this.name = "AuthorizationError";
      }
      static parse(s) {
        const messages = [
          "authorization violation",
          "account authentication expired",
          "authentication timeout"
        ];
        const ss = s.toLowerCase();
        for (let i = 0; i < messages.length; i++) {
          if (ss.indexOf(messages[i]) !== -1) {
            return new _AuthorizationError(s);
          }
        }
        return null;
      }
    };
    exports.AuthorizationError = AuthorizationError;
    var ClosedConnectionError = class extends Error {
      constructor() {
        super("closed connection");
        this.name = "ClosedConnectionError";
      }
    };
    exports.ClosedConnectionError = ClosedConnectionError;
    var DrainingConnectionError = class extends Error {
      constructor() {
        super("connection draining");
        this.name = "DrainingConnectionError";
      }
    };
    exports.DrainingConnectionError = DrainingConnectionError;
    var ConnectionError = class extends Error {
      constructor(message, options) {
        super(message, options);
        this.name = "ConnectionError";
      }
    };
    exports.ConnectionError = ConnectionError;
    var ProtocolError = class extends Error {
      constructor(message, options) {
        super(message, options);
        this.name = "ProtocolError";
      }
    };
    exports.ProtocolError = ProtocolError;
    var RequestError = class extends Error {
      constructor(message = "", options) {
        super(message, options);
        this.name = "RequestError";
      }
      isNoResponders() {
        return this.cause instanceof NoRespondersError;
      }
    };
    exports.RequestError = RequestError;
    var TimeoutError = class extends Error {
      constructor(options) {
        super("timeout", options);
        this.name = "TimeoutError";
      }
    };
    exports.TimeoutError = TimeoutError;
    var NoRespondersError = class extends Error {
      subject;
      constructor(subject, options) {
        super(`no responders: '${subject}'`, options);
        this.subject = subject;
        this.name = "NoResponders";
      }
    };
    exports.NoRespondersError = NoRespondersError;
    var PermissionViolationError = class _PermissionViolationError extends Error {
      operation;
      subject;
      queue;
      constructor(message, operation, subject, queue, options) {
        super(message, options);
        this.name = "PermissionViolationError";
        this.operation = operation;
        this.subject = subject;
        this.queue = queue;
      }
      static parse(s) {
        const t = s ? s.toLowerCase() : "";
        if (t.indexOf("permissions violation") === -1) {
          return null;
        }
        let operation = "publish";
        let subject = "";
        let queue = void 0;
        const m = s.match(/(Publish|Subscription) to "(\S+)"/);
        if (m) {
          operation = m[1].toLowerCase();
          subject = m[2];
          if (operation === "subscription") {
            const qm = s.match(/using queue "(\S+)"/);
            if (qm) {
              queue = qm[1];
            }
          }
        }
        return new _PermissionViolationError(s, operation, subject, queue);
      }
    };
    exports.PermissionViolationError = PermissionViolationError;
    exports.errors = {
      AuthorizationError,
      ClosedConnectionError,
      ConnectionError,
      DrainingConnectionError,
      InvalidArgumentError,
      InvalidOperationError,
      InvalidSubjectError,
      NoRespondersError,
      PermissionViolationError,
      ProtocolError,
      RequestError,
      TimeoutError,
      UserAuthenticationExpiredError
    };
  }
});

// node_modules/@nats-io/nats-core/lib/util.js
var require_util2 = __commonJS({
  "node_modules/@nats-io/nats-core/lib/util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleMutex = exports.Perf = void 0;
    exports.extend = extend;
    exports.render = render;
    exports.timeout = timeout;
    exports.delay = delay;
    exports.deadline = deadline;
    exports.deferred = deferred;
    exports.debugDeferred = debugDeferred;
    exports.shuffle = shuffle;
    exports.collect = collect;
    exports.jitter = jitter;
    exports.backoff = backoff;
    exports.nanos = nanos;
    exports.millis = millis;
    exports.randomToken = randomToken;
    var encoders_1 = require_encoders();
    var errors_1 = require_errors();
    function extend(a, ...b) {
      for (let i = 0; i < b.length; i++) {
        const o = b[i];
        Object.keys(o).forEach(function(k) {
          a[k] = o[k];
        });
      }
      return a;
    }
    function render(frame) {
      const cr2 = "\u240D";
      const lf = "\u240A";
      return encoders_1.TD.decode(frame).replace(/\n/g, lf).replace(/\r/g, cr2);
    }
    function timeout(ms, asyncTraces = true) {
      const err2 = asyncTraces ? new errors_1.TimeoutError() : null;
      let methods;
      let timer;
      const p = new Promise((_resolve, reject) => {
        const cancel = () => {
          if (timer) {
            clearTimeout(timer);
          }
        };
        methods = { cancel };
        timer = setTimeout(() => {
          if (err2 === null) {
            reject(new errors_1.TimeoutError());
          } else {
            reject(err2);
          }
        }, ms);
      });
      return Object.assign(p, methods);
    }
    function delay(ms = 0) {
      let methods;
      const p = new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve();
        }, ms);
        const cancel = () => {
          if (timer) {
            clearTimeout(timer);
            resolve();
          }
        };
        methods = { cancel };
      });
      return Object.assign(p, methods);
    }
    async function deadline(p, millis2 = 1e3) {
      const d = deferred();
      const timer = setTimeout(() => {
        d.reject(new errors_1.TimeoutError());
      }, millis2);
      try {
        return await Promise.race([p, d]);
      } finally {
        clearTimeout(timer);
      }
    }
    function deferred() {
      let methods = {};
      const p = new Promise((resolve, reject) => {
        methods = { resolve, reject };
      });
      return Object.assign(p, methods);
    }
    function debugDeferred() {
      let methods = {};
      const p = new Promise((resolve, reject) => {
        methods = {
          resolve: (v) => {
            console.trace("resolve", v);
            resolve(v);
          },
          reject: (err2) => {
            console.trace("reject");
            reject(err2);
          }
        };
      });
      return Object.assign(p, methods);
    }
    function shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    async function collect(iter) {
      const buf = [];
      for await (const v of iter) {
        buf.push(v);
      }
      return buf;
    }
    var Perf = class {
      timers;
      measures;
      constructor() {
        this.timers = /* @__PURE__ */ new Map();
        this.measures = /* @__PURE__ */ new Map();
      }
      mark(key) {
        this.timers.set(key, performance.now());
      }
      measure(key, startKey, endKey) {
        const s = this.timers.get(startKey);
        if (s === void 0) {
          throw new Error(`${startKey} is not defined`);
        }
        const e = this.timers.get(endKey);
        if (e === void 0) {
          throw new Error(`${endKey} is not defined`);
        }
        this.measures.set(key, e - s);
      }
      getEntries() {
        const values = [];
        this.measures.forEach((v, k) => {
          values.push({ name: k, duration: v });
        });
        return values;
      }
    };
    exports.Perf = Perf;
    var SimpleMutex = class {
      max;
      current;
      waiting;
      /**
       * @param max number of concurrent operations
       */
      constructor(max = 1) {
        this.max = max;
        this.current = 0;
        this.waiting = [];
      }
      /**
       * Returns a promise that resolves when the mutex is acquired
       */
      lock() {
        this.current++;
        if (this.current <= this.max) {
          return Promise.resolve();
        }
        const d = deferred();
        this.waiting.push(d);
        return d;
      }
      /**
       * Release an acquired mutex - must be called
       */
      unlock() {
        this.current--;
        const d = this.waiting.pop();
        d?.resolve();
      }
    };
    exports.SimpleMutex = SimpleMutex;
    function jitter(n) {
      if (n === 0) {
        return 0;
      }
      return Math.floor(n / 2 + Math.random() * n);
    }
    function backoff(policy = [0, 250, 250, 500, 500, 3e3, 5e3]) {
      if (!Array.isArray(policy)) {
        policy = [0, 250, 250, 500, 500, 3e3, 5e3];
      }
      const max = policy.length - 1;
      return {
        backoff(attempt) {
          return jitter(attempt > max ? policy[max] : policy[attempt]);
        }
      };
    }
    function nanos(millis2) {
      return millis2 * 1e6;
    }
    function millis(ns) {
      return Math.floor(ns / 1e6);
    }
    var tokenDigits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var tokenDigitCodes = new Uint8Array(62);
    for (let i = 0; i < 62; i++)
      tokenDigitCodes[i] = tokenDigits.charCodeAt(i);
    var tokenSpace = 218340105584896;
    function randomToken() {
      let n = Math.floor(Math.random() * tokenSpace);
      let d = n % 62;
      const c0 = tokenDigitCodes[d];
      n = (n - d) / 62;
      d = n % 62;
      const c1 = tokenDigitCodes[d];
      n = (n - d) / 62;
      d = n % 62;
      const c2 = tokenDigitCodes[d];
      n = (n - d) / 62;
      d = n % 62;
      const c3 = tokenDigitCodes[d];
      n = (n - d) / 62;
      d = n % 62;
      const c4 = tokenDigitCodes[d];
      n = (n - d) / 62;
      d = n % 62;
      const c5 = tokenDigitCodes[d];
      n = (n - d) / 62;
      d = n % 62;
      const c6 = tokenDigitCodes[d];
      n = (n - d) / 62;
      const c7 = tokenDigitCodes[n];
      return String.fromCharCode(c0, c1, c2, c3, c4, c5, c6, c7);
    }
  }
});

// node_modules/@nats-io/nuid/lib/nuid.js
var require_nuid = __commonJS({
  "node_modules/@nats-io/nuid/lib/nuid.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.nuid = exports.NuidImpl = void 0;
    var digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var base = 62;
    var preLen = 12;
    var seqLen = 10;
    var minInc = 33;
    var maxInc = 333;
    var totalLen = preLen + seqLen;
    var DIGIT_CODES = new Uint8Array(base);
    for (let i = 0; i < base; i++)
      DIGIT_CODES[i] = digits.charCodeAt(i);
    var TWO32 = 4294967296;
    var MAX_SEQ = BigInt(base) ** BigInt(seqLen);
    var MAX_HI = Number(MAX_SEQ / (1n << 32n));
    var MAX_LO = Number(MAX_SEQ % (1n << 32n));
    function _getRandomValues(a) {
      for (let i = 0; i < a.length; i++) {
        a[i] = Math.floor(Math.random() * 256);
      }
    }
    function fillRandom(a) {
      if (globalThis?.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(a);
      } else {
        _getRandomValues(a);
      }
    }
    var NuidImpl = class {
      buf;
      cbuf;
      seqHi;
      seqLo;
      inc;
      inited;
      constructor() {
        this.buf = new Uint8Array(totalLen);
        this.cbuf = new Uint8Array(preLen);
        this.inited = false;
      }
      /**
       * Initializes a nuid with a crypto random prefix,
       * and pseudo-random sequence and increment. This function
       * is only called if any api on a nuid is called.
       *
       * @ignore
       */
      init() {
        this.inited = true;
        this.setPre();
        this.initSeqAndInc();
        this.fillSeq();
      }
      /**
       * Initializes the pseudo random sequence number and the increment range.
       * @ignore
       */
      initSeqAndInc() {
        let tries = 0;
        do {
          this.seqHi = Math.floor(Math.random() * (MAX_HI + 1));
          this.seqLo = Math.floor(Math.random() * TWO32);
        } while (tries++ < 8 && this.seqHi === MAX_HI && this.seqLo >= MAX_LO);
        if (this.seqHi === MAX_HI && this.seqLo >= MAX_LO) {
          this.seqLo = 0;
        }
        this.inc = Math.random() * (maxInc - minInc) + minInc | 0;
      }
      /**
       * Sets the prefix from crypto random bytes. Converts them to base62.
       *
       * @ignore
       */
      setPre() {
        fillRandom(this.cbuf);
        for (let i = 0; i < preLen; i++) {
          this.buf[i] = DIGIT_CODES[this.cbuf[i] % base];
        }
      }
      /**
       * Fills the sequence portion of the buffer as base62 from
       * the split-int seq (seqHi, seqLo). Performs long division
       * by 62 over the 64-bit value using doubles only — no bigint.
       *
       * @ignore
       */
      fillSeq() {
        let hi = this.seqHi;
        let lo = this.seqLo;
        for (let i = totalLen - 1; i >= preLen; i--) {
          const hiQ = Math.floor(hi / base);
          const hiR = hi - hiQ * base;
          const combined = hiR * TWO32 + lo;
          const loQ = Math.floor(combined / base);
          const rem = combined - loQ * base;
          this.buf[i] = DIGIT_CODES[rem];
          hi = hiQ;
          lo = loQ;
        }
      }
      /**
       * Returns the next nuid.
       */
      next() {
        if (!this.inited) {
          this.init();
        }
        this.seqLo += this.inc;
        if (this.seqLo >= TWO32) {
          this.seqLo -= TWO32;
          this.seqHi += 1;
        }
        if (this.seqHi > MAX_HI || this.seqHi === MAX_HI && this.seqLo >= MAX_LO) {
          this.setPre();
          this.initSeqAndInc();
        }
        this.fillSeq();
        const b = this.buf;
        return String.fromCharCode(b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15], b[16], b[17], b[18], b[19], b[20], b[21]);
      }
      /**
       * Resets the prefix and counter for the nuid. This is typically
       * called automatically from within next() if the current sequence
       * exceeds the resolution of the nuid.
       */
      reset() {
        this.init();
      }
    };
    exports.NuidImpl = NuidImpl;
    exports.nuid = new NuidImpl();
  }
});

// node_modules/@nats-io/nuid/lib/mod.js
var require_mod2 = __commonJS({
  "node_modules/@nats-io/nuid/lib/mod.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.nuid = exports.Nuid = void 0;
    var nuid_ts_1 = require_nuid();
    exports.Nuid = nuid_ts_1.NuidImpl;
    exports.nuid = nuid_ts_1.nuid;
  }
});

// node_modules/@nats-io/nats-core/lib/nuid.js
var require_nuid2 = __commonJS({
  "node_modules/@nats-io/nats-core/lib/nuid.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.nuid = exports.Nuid = void 0;
    var nuid_1 = require_mod2();
    Object.defineProperty(exports, "Nuid", { enumerable: true, get: function() {
      return nuid_1.Nuid;
    } });
    Object.defineProperty(exports, "nuid", { enumerable: true, get: function() {
      return nuid_1.nuid;
    } });
  }
});

// node_modules/@nats-io/nats-core/lib/core.js
var require_core = __commonJS({
  "node_modules/@nats-io/nats-core/lib/core.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_HOST = exports.DEFAULT_PORT = exports.Match = void 0;
    exports.syncIterator = syncIterator;
    exports.createInbox = createInbox;
    var nuid_1 = require_nuid2();
    var errors_1 = require_errors();
    exports.Match = {
      // Exact option is case-sensitive
      Exact: "exact",
      // Case-sensitive, but key is transformed to Canonical MIME representation
      CanonicalMIME: "canonical",
      // Case-insensitive matches
      IgnoreCase: "insensitive"
    };
    function syncIterator(src) {
      const iter = src[Symbol.asyncIterator]();
      return {
        async next() {
          const m = await iter.next();
          if (m.done) {
            return Promise.resolve(null);
          }
          return Promise.resolve(m.value);
        }
      };
    }
    function createInbox(prefix = "") {
      prefix = prefix || "_INBOX";
      if (typeof prefix !== "string") {
        throw new TypeError("prefix must be a string");
      }
      prefix.split(".").forEach((v) => {
        if (v === "*" || v === ">") {
          throw errors_1.InvalidArgumentError.format("prefix", `cannot have wildcards ('${prefix}')`);
        }
      });
      return `${prefix}.${nuid_1.nuid.next()}`;
    }
    exports.DEFAULT_PORT = 4222;
    exports.DEFAULT_HOST = "127.0.0.1";
  }
});

// node_modules/@nats-io/nats-core/lib/databuffer.js
var require_databuffer = __commonJS({
  "node_modules/@nats-io/nats-core/lib/databuffer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DataBuffer = void 0;
    var encoders_1 = require_encoders();
    var DataBuffer = class {
      buffers;
      byteLength;
      constructor() {
        this.buffers = [];
        this.byteLength = 0;
      }
      static concat(...bufs) {
        let max = 0;
        for (let i = 0; i < bufs.length; i++) {
          max += bufs[i].length;
        }
        const out = new Uint8Array(max);
        let index = 0;
        for (let i = 0; i < bufs.length; i++) {
          out.set(bufs[i], index);
          index += bufs[i].length;
        }
        return out;
      }
      static fromAscii(m) {
        if (!m) {
          m = "";
        }
        return encoders_1.TE.encode(m);
      }
      static toAscii(a) {
        return encoders_1.TD.decode(a);
      }
      reset() {
        this.buffers.length = 0;
        this.byteLength = 0;
      }
      pack() {
        if (this.buffers.length > 1) {
          const v = new Uint8Array(this.byteLength);
          let index = 0;
          for (let i = 0; i < this.buffers.length; i++) {
            v.set(this.buffers[i], index);
            index += this.buffers[i].length;
          }
          this.buffers.length = 0;
          this.buffers.push(v);
        }
      }
      shift() {
        if (this.buffers.length) {
          const a = this.buffers.shift();
          if (a) {
            this.byteLength -= a.length;
            return a;
          }
        }
        return new Uint8Array(0);
      }
      drain(n) {
        if (this.buffers.length) {
          this.pack();
          const v = this.buffers.pop();
          if (v) {
            const max = this.byteLength;
            if (n === void 0 || n > max) {
              n = max;
            }
            const d = v.subarray(0, n);
            if (max > n) {
              this.buffers.push(v.subarray(n));
            }
            this.byteLength = max - n;
            return d;
          }
        }
        return new Uint8Array(0);
      }
      fill(a, ...bufs) {
        if (a) {
          this.buffers.push(a);
          this.byteLength += a.length;
        }
        for (let i = 0; i < bufs.length; i++) {
          if (bufs[i] && bufs[i].length) {
            this.buffers.push(bufs[i]);
            this.byteLength += bufs[i].length;
          }
        }
      }
      peek() {
        if (this.buffers.length) {
          this.pack();
          return this.buffers[0];
        }
        return new Uint8Array(0);
      }
      size() {
        return this.byteLength;
      }
      length() {
        return this.buffers.length;
      }
    };
    exports.DataBuffer = DataBuffer;
  }
});

// node_modules/@nats-io/nats-core/lib/transport.js
var require_transport = __commonJS({
  "node_modules/@nats-io/nats-core/lib/transport.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LF = exports.CR = exports.CRLF = exports.CR_LF_LEN = exports.CR_LF = void 0;
    exports.setTransportFactory = setTransportFactory;
    exports.defaultPort = defaultPort;
    exports.getUrlParseFn = getUrlParseFn;
    exports.newTransport = newTransport;
    exports.getResolveFn = getResolveFn;
    exports.protoLen = protoLen;
    exports.extractProtocolMessage = extractProtocolMessage;
    var encoders_1 = require_encoders();
    var core_1 = require_core();
    var databuffer_1 = require_databuffer();
    var transportConfig;
    function setTransportFactory(config) {
      transportConfig = config;
    }
    function defaultPort() {
      return transportConfig !== void 0 && transportConfig.defaultPort !== void 0 ? transportConfig.defaultPort : core_1.DEFAULT_PORT;
    }
    function getUrlParseFn() {
      return transportConfig !== void 0 && transportConfig.urlParseFn ? transportConfig.urlParseFn : void 0;
    }
    function newTransport() {
      if (!transportConfig || typeof transportConfig.factory !== "function") {
        throw new Error("transport fn is not set");
      }
      return transportConfig.factory();
    }
    function getResolveFn() {
      return transportConfig !== void 0 && transportConfig.dnsResolveFn ? transportConfig.dnsResolveFn : void 0;
    }
    exports.CR_LF = "\r\n";
    exports.CR_LF_LEN = exports.CR_LF.length;
    exports.CRLF = databuffer_1.DataBuffer.fromAscii(exports.CR_LF);
    exports.CR = new Uint8Array(exports.CRLF)[0];
    exports.LF = new Uint8Array(exports.CRLF)[1];
    function protoLen(ba) {
      for (let i = 0; i < ba.length; i++) {
        const n = i + 1;
        if (ba.byteLength > n && ba[i] === exports.CR && ba[n] === exports.LF) {
          return n + 1;
        }
      }
      return 0;
    }
    function extractProtocolMessage(a) {
      const len = protoLen(a);
      if (len > 0) {
        const ba = new Uint8Array(a);
        const out = ba.slice(0, len);
        return encoders_1.TD.decode(out);
      }
      return "";
    }
  }
});

// node_modules/@nats-io/nats-core/lib/ipparser.js
var require_ipparser = __commonJS({
  "node_modules/@nats-io/nats-core/lib/ipparser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ipV4 = ipV4;
    exports.isIP = isIP;
    exports.parseIP = parseIP;
    var IPv4LEN = 4;
    var IPv6LEN = 16;
    var ASCII0 = 48;
    var ASCII9 = 57;
    var ASCIIA = 65;
    var ASCIIF = 70;
    var ASCIIa = 97;
    var ASCIIf = 102;
    var big2 = 16777215;
    function ipV4(a, b, c, d) {
      const ip = new Uint8Array(IPv6LEN);
      const prefix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255];
      prefix.forEach((v, idx) => {
        ip[idx] = v;
      });
      ip[12] = a;
      ip[13] = b;
      ip[14] = c;
      ip[15] = d;
      return ip;
    }
    function isIP(h2) {
      return parseIP(h2) !== void 0;
    }
    function parseIP(h2) {
      for (let i = 0; i < h2.length; i++) {
        switch (h2[i]) {
          case ".":
            return parseIPv4(h2);
          case ":":
            return parseIPv6(h2);
        }
      }
      return;
    }
    function parseIPv4(s) {
      const ip = new Uint8Array(IPv4LEN);
      for (let i = 0; i < IPv4LEN; i++) {
        if (s.length === 0) {
          return void 0;
        }
        if (i > 0) {
          if (s[0] !== ".") {
            return void 0;
          }
          s = s.substring(1);
        }
        const { n, c, ok } = dtoi(s);
        if (!ok || n > 255) {
          return void 0;
        }
        s = s.substring(c);
        ip[i] = n;
      }
      return ipV4(ip[0], ip[1], ip[2], ip[3]);
    }
    function parseIPv6(s) {
      const ip = new Uint8Array(IPv6LEN);
      let ellipsis = -1;
      if (s.length >= 2 && s[0] === ":" && s[1] === ":") {
        ellipsis = 0;
        s = s.substring(2);
        if (s.length === 0) {
          return ip;
        }
      }
      let i = 0;
      while (i < IPv6LEN) {
        const { n, c, ok } = xtoi(s);
        if (!ok || n > 65535) {
          return void 0;
        }
        if (c < s.length && s[c] === ".") {
          if (ellipsis < 0 && i != IPv6LEN - IPv4LEN) {
            return void 0;
          }
          if (i + IPv4LEN > IPv6LEN) {
            return void 0;
          }
          const ip4 = parseIPv4(s);
          if (ip4 === void 0) {
            return void 0;
          }
          ip[i] = ip4[12];
          ip[i + 1] = ip4[13];
          ip[i + 2] = ip4[14];
          ip[i + 3] = ip4[15];
          s = "";
          i += IPv4LEN;
          break;
        }
        ip[i] = n >> 8;
        ip[i + 1] = n;
        i += 2;
        s = s.substring(c);
        if (s.length === 0) {
          break;
        }
        if (s[0] !== ":" || s.length == 1) {
          return void 0;
        }
        s = s.substring(1);
        if (s[0] === ":") {
          if (ellipsis >= 0) {
            return void 0;
          }
          ellipsis = i;
          s = s.substring(1);
          if (s.length === 0) {
            break;
          }
        }
      }
      if (s.length !== 0) {
        return void 0;
      }
      if (i < IPv6LEN) {
        if (ellipsis < 0) {
          return void 0;
        }
        const n = IPv6LEN - i;
        for (let j = i - 1; j >= ellipsis; j--) {
          ip[j + n] = ip[j];
        }
        for (let j = ellipsis + n - 1; j >= ellipsis; j--) {
          ip[j] = 0;
        }
      } else if (ellipsis >= 0) {
        return void 0;
      }
      return ip;
    }
    function dtoi(s) {
      let i = 0;
      let n = 0;
      for (i = 0; i < s.length && ASCII0 <= s.charCodeAt(i) && s.charCodeAt(i) <= ASCII9; i++) {
        n = n * 10 + (s.charCodeAt(i) - ASCII0);
        if (n >= big2) {
          return { n: big2, c: i, ok: false };
        }
      }
      if (i === 0) {
        return { n: 0, c: 0, ok: false };
      }
      return { n, c: i, ok: true };
    }
    function xtoi(s) {
      let n = 0;
      let i = 0;
      for (i = 0; i < s.length; i++) {
        if (ASCII0 <= s.charCodeAt(i) && s.charCodeAt(i) <= ASCII9) {
          n *= 16;
          n += s.charCodeAt(i) - ASCII0;
        } else if (ASCIIa <= s.charCodeAt(i) && s.charCodeAt(i) <= ASCIIf) {
          n *= 16;
          n += s.charCodeAt(i) - ASCIIa + 10;
        } else if (ASCIIA <= s.charCodeAt(i) && s.charCodeAt(i) <= ASCIIF) {
          n *= 16;
          n += s.charCodeAt(i) - ASCIIA + 10;
        } else {
          break;
        }
        if (n >= big2) {
          return { n: 0, c: i, ok: false };
        }
      }
      if (i === 0) {
        return { n: 0, c: i, ok: false };
      }
      return { n, c: i, ok: true };
    }
  }
});

// node_modules/@nats-io/nats-core/lib/servers.js
var require_servers = __commonJS({
  "node_modules/@nats-io/nats-core/lib/servers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Servers = exports.ServerImpl = void 0;
    exports.isIPV4OrHostname = isIPV4OrHostname;
    exports.hostPort = hostPort;
    var transport_1 = require_transport();
    var util_1 = require_util2();
    var ipparser_1 = require_ipparser();
    var core_1 = require_core();
    var errors_1 = require_errors();
    function isIPV4OrHostname(hp) {
      if (hp.indexOf("[") !== -1 || hp.indexOf("::") !== -1) {
        return false;
      }
      if (hp.indexOf(".") !== -1) {
        return true;
      }
      if (hp.split(":").length <= 2) {
        return true;
      }
      return false;
    }
    function isIPV6(hp) {
      return !isIPV4OrHostname(hp);
    }
    function filterIpv6MappedToIpv4(hp) {
      const prefix = "::FFFF:";
      const idx = hp.toUpperCase().indexOf(prefix);
      if (idx !== -1 && hp.indexOf(".") !== -1) {
        let ip = hp.substring(idx + prefix.length);
        ip = ip.replace("[", "");
        return ip.replace("]", "");
      }
      return hp;
    }
    function hostPort(u) {
      u = u.trim();
      if (u.match(/^(.*:\/\/)(.*)/m)) {
        u = u.replace(/^(.*:\/\/)(.*)/gm, "$2");
      }
      u = filterIpv6MappedToIpv4(u);
      if (isIPV6(u) && u.indexOf("[") === -1) {
        u = `[${u}]`;
      }
      const op = isIPV6(u) ? u.match(/(]:)(\d+)/) : u.match(/(:)(\d+)/);
      const port = op && op.length === 3 && op[1] && op[2] ? parseInt(op[2]) : core_1.DEFAULT_PORT;
      const protocol = port === 80 ? "https" : "http";
      const url = new URL(`${protocol}://${u}`);
      url.port = `${port}`;
      let hostname = url.hostname;
      if (hostname.charAt(0) === "[") {
        hostname = hostname.substring(1, hostname.length - 1);
      }
      const listen = url.host;
      return { listen, hostname, port };
    }
    var ServerImpl = class _ServerImpl {
      src;
      listen;
      hostname;
      port;
      didConnect;
      reconnects;
      lastConnect;
      gossiped;
      tlsName;
      resolves;
      constructor(u, gossiped = false) {
        this.src = u;
        this.tlsName = "";
        const v = hostPort(u);
        this.listen = v.listen;
        this.hostname = v.hostname;
        this.port = v.port;
        this.didConnect = false;
        this.reconnects = 0;
        this.lastConnect = 0;
        this.gossiped = gossiped;
      }
      toString() {
        return this.listen;
      }
      async resolve(opts) {
        if (!opts.fn || opts.resolve === false) {
          return [this];
        }
        const buf = [];
        if ((0, ipparser_1.isIP)(this.hostname)) {
          return [this];
        } else {
          const ips = await opts.fn(this.hostname);
          if (opts.debug) {
            console.log(`resolve ${this.hostname} = ${ips.join(",")}`);
          }
          for (const ip of ips) {
            const proto = this.port === 80 ? "https" : "http";
            const url = new URL(`${proto}://${isIPV6(ip) ? "[" + ip + "]" : ip}`);
            url.port = `${this.port}`;
            const ss = new _ServerImpl(url.host, false);
            ss.tlsName = this.hostname;
            buf.push(ss);
          }
        }
        if (opts.randomize) {
          (0, util_1.shuffle)(buf);
        }
        this.resolves = buf;
        return buf;
      }
    };
    exports.ServerImpl = ServerImpl;
    var Servers = class _Servers {
      firstSelect;
      servers;
      currentServer;
      tlsName;
      randomize;
      constructor(opts = {}) {
        this.firstSelect = true;
        this.servers = [];
        this.tlsName = "";
        this.randomize = opts.randomize || false;
      }
      /**
       * Replace the server pool with the provided list of `host:port` entries.
       *
       * Throws `InvalidArgumentError` if `listens` is empty or not an array.
       *
       * Note: reconnect attempts continue to follow the configured reconnect
       * policy, but if every entry in the new pool is unreachable the
       * connection may be left unable to recover.
       */
      setServers(listens) {
        if (!Array.isArray(listens) || listens.length === 0) {
          throw errors_1.InvalidArgumentError.format("servers", "cannot be empty");
        }
        const urlParseFn = (0, transport_1.getUrlParseFn)();
        const existing = /* @__PURE__ */ new Map();
        for (const s of this.servers)
          existing.set(s.listen, s);
        const merged = [];
        for (let hp of listens) {
          hp = urlParseFn ? urlParseFn(hp) : hp;
          const { listen } = hostPort(hp);
          const surviving = existing.get(listen);
          if (surviving) {
            surviving.gossiped = false;
            merged.push(surviving);
          } else {
            merged.push(new ServerImpl(hp));
          }
        }
        if (this.randomize)
          (0, util_1.shuffle)(merged);
        this.servers = merged;
        if (this.currentServer === void 0 || !merged.includes(this.currentServer)) {
          this.currentServer = merged[0];
          this.firstSelect = true;
        }
      }
      clear() {
        this.servers.length = 0;
      }
      updateTLSName() {
        const cs = this.getCurrentServer();
        if (!(0, ipparser_1.isIP)(cs.hostname)) {
          this.tlsName = cs.hostname;
          this.servers.forEach((s) => {
            if (s.gossiped) {
              s.tlsName = this.tlsName;
            }
          });
        }
      }
      getCurrentServer() {
        return this.currentServer;
      }
      addServer(u, implicit = false) {
        const urlParseFn = (0, transport_1.getUrlParseFn)();
        u = urlParseFn ? urlParseFn(u) : u;
        const s = new ServerImpl(u, implicit);
        if ((0, ipparser_1.isIP)(s.hostname)) {
          s.tlsName = this.tlsName;
        }
        this.servers.push(s);
      }
      selectServer() {
        if (this.firstSelect) {
          this.firstSelect = false;
          return this.currentServer;
        }
        const t = this.servers.shift();
        if (t) {
          this.servers.push(t);
          this.currentServer = t;
        }
        return t;
      }
      removeCurrentServer() {
        this.removeServer(this.currentServer);
      }
      removeServer(server) {
        if (server) {
          const index = this.servers.indexOf(server);
          this.servers.splice(index, 1);
        }
      }
      /**
       * Returns a frozen snapshot of the server pool in natural order.
       * Each entry is a defensive copy — callers cannot mutate pool state.
       */
      snapshot() {
        return _Servers.freezeAll(this.servers);
      }
      /**
       * Returns a frozen snapshot of the server pool with the current server
       * (= next dial candidate) at index 0. Used to present the handler with
       * the server the library would have selected.
       */
      snapshotForHandler() {
        const cur = this.currentServer;
        if (!cur)
          return this.snapshot();
        const idx = this.servers.indexOf(cur);
        if (idx <= 0)
          return this.snapshot();
        return _Servers.freezeAll([cur, ...this.servers.slice(0, idx), ...this.servers.slice(idx + 1)]);
      }
      static freezeAll(arr) {
        return arr.map((s) => Object.freeze({
          hostname: s.hostname,
          port: s.port,
          listen: s.listen,
          src: s.src,
          tlsName: s.tlsName,
          reconnects: s.reconnects,
          lastConnect: s.lastConnect,
          gossiped: s.gossiped,
          didConnect: s.didConnect
        }));
      }
      find(server) {
        return this.servers.find((s) => s.listen === server.listen);
      }
      setCurrent(server) {
        this.currentServer = server;
      }
      length() {
        return this.servers.length;
      }
      next() {
        return this.servers.length ? this.servers[0] : void 0;
      }
      getServers() {
        return this.servers;
      }
      update(info, encrypted) {
        const added = [];
        let deleted = [];
        const urlParseFn = (0, transport_1.getUrlParseFn)();
        const discovered = /* @__PURE__ */ new Map();
        if (info.connect_urls && info.connect_urls.length > 0) {
          info.connect_urls.forEach((hp) => {
            hp = urlParseFn ? urlParseFn(hp, encrypted) : hp;
            const s = new ServerImpl(hp, true);
            discovered.set(hp, s);
          });
        }
        const toDelete = [];
        this.servers.forEach((s, index) => {
          const u = s.listen;
          if (s.gossiped && this.currentServer.listen !== u && discovered.get(u) === void 0) {
            toDelete.push(index);
          }
          discovered.delete(u);
        });
        toDelete.reverse();
        toDelete.forEach((index) => {
          const removed = this.servers.splice(index, 1);
          deleted = deleted.concat(removed[0].listen);
        });
        discovered.forEach((v, k) => {
          this.servers.push(v);
          added.push(k);
        });
        if (this.randomize && added.length > 0) {
          const cur = this.currentServer;
          const others = this.servers.filter((s) => s !== cur);
          (0, util_1.shuffle)(others);
          this.servers = cur ? [cur, ...others] : others;
        }
        return { added, deleted };
      }
    };
    exports.Servers = Servers;
  }
});

// node_modules/@nats-io/nats-core/lib/queued_iterator.js
var require_queued_iterator = __commonJS({
  "node_modules/@nats-io/nats-core/lib/queued_iterator.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.QueuedIteratorImpl = void 0;
    var util_1 = require_util2();
    var errors_1 = require_errors();
    var QueuedIteratorImpl = class {
      inflight;
      processed;
      // this is updated by the protocol
      received;
      noIterator;
      iterClosed;
      done;
      signal;
      yields;
      filtered;
      pendingFiltered;
      ctx;
      _data;
      //data is for use by extenders in any way they like
      err;
      time;
      profile;
      yielding;
      didBreak;
      constructor() {
        this.inflight = 0;
        this.filtered = 0;
        this.pendingFiltered = 0;
        this.processed = 0;
        this.received = 0;
        this.noIterator = false;
        this.done = false;
        this.signal = (0, util_1.deferred)();
        this.yields = [];
        this.iterClosed = (0, util_1.deferred)();
        this.time = 0;
        this.yielding = false;
        this.didBreak = false;
        this.profile = false;
      }
      [Symbol.asyncIterator]() {
        return this.iterate();
      }
      push(v) {
        if (this.done) {
          return;
        }
        if (this.didBreak) {
          if (typeof v === "function") {
            const cb = v;
            try {
              cb();
            } catch (_) {
            }
          }
          return;
        }
        if (typeof v === "function") {
          this.pendingFiltered++;
        }
        this.yields.push(v);
        this.signal.resolve();
      }
      async *iterate() {
        if (this.noIterator) {
          throw new errors_1.InvalidOperationError("iterator cannot be used when a callback is registered");
        }
        if (this.yielding) {
          throw new errors_1.InvalidOperationError("iterator is already yielding");
        }
        this.yielding = true;
        try {
          while (true) {
            if (this.yields.length === 0) {
              await this.signal;
            }
            if (this.err) {
              throw this.err;
            }
            const yields = this.yields;
            this.inflight = yields.length;
            this.yields = [];
            for (let i = 0; i < yields.length; i++) {
              if (typeof yields[i] === "function") {
                this.pendingFiltered--;
                const fn = yields[i];
                try {
                  fn();
                } catch (err2) {
                  throw err2;
                }
                if (this.err) {
                  throw this.err;
                }
                continue;
              }
              this.processed++;
              this.inflight--;
              const start = this.profile ? Date.now() : 0;
              yield yields[i];
              this.time = this.profile ? Date.now() - start : 0;
            }
            if (this.done) {
              break;
            } else if (this.yields.length === 0) {
              yields.length = 0;
              this.yields = yields;
              this.signal = (0, util_1.deferred)();
            }
          }
        } finally {
          this.didBreak = true;
          this.stop();
        }
      }
      stop(err2) {
        if (this.done) {
          return;
        }
        this.err = err2;
        this.done = true;
        this.signal.resolve();
        this.iterClosed.resolve(err2);
      }
      getProcessed() {
        return this.noIterator ? this.received : this.processed;
      }
      getPending() {
        return this.yields.length + this.inflight - this.pendingFiltered;
      }
      getReceived() {
        return this.received - this.filtered;
      }
    };
    exports.QueuedIteratorImpl = QueuedIteratorImpl;
  }
});

// node_modules/@nats-io/nats-core/lib/muxsubscription.js
var require_muxsubscription = __commonJS({
  "node_modules/@nats-io/nats-core/lib/muxsubscription.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MuxSubscription = void 0;
    var core_1 = require_core();
    var errors_1 = require_errors();
    var MuxSubscription = class {
      baseInbox;
      reqs;
      constructor() {
        this.reqs = /* @__PURE__ */ new Map();
      }
      size() {
        return this.reqs.size;
      }
      init(prefix) {
        this.baseInbox = `${(0, core_1.createInbox)(prefix)}.`;
        return this.baseInbox;
      }
      add(r) {
        if (!isNaN(r.received)) {
          r.received = 0;
        }
        this.reqs.set(r.token, r);
      }
      get(token) {
        return this.reqs.get(token);
      }
      cancel(r) {
        this.reqs.delete(r.token);
      }
      getToken(m) {
        const s = m.subject || "";
        if (s.indexOf(this.baseInbox) === 0) {
          return s.substring(this.baseInbox.length);
        }
        return null;
      }
      all() {
        return Array.from(this.reqs.values());
      }
      handleError(isMuxPermissionError, err2) {
        if (isMuxPermissionError) {
          this.all().forEach((r) => {
            r.resolver(err2, {});
          });
          return true;
        }
        if (err2.operation === "publish") {
          const req = this.all().find((s) => {
            return s.requestSubject === err2.subject;
          });
          if (req) {
            req.resolver(err2, {});
            return true;
          }
        }
        return false;
      }
      dispatcher() {
        return (err2, m) => {
          const token = this.getToken(m);
          if (token) {
            const r = this.get(token);
            if (r) {
              if (err2 === null) {
                err2 = m?.data?.length === 0 && m.headers?.code === 503 ? new errors_1.NoRespondersError(r.requestSubject) : null;
              }
              r.resolver(err2, m);
            }
          }
        };
      }
      close() {
        const err2 = new errors_1.RequestError("connection closed");
        this.reqs.forEach((req) => {
          req.resolver(err2, {});
        });
      }
    };
    exports.MuxSubscription = MuxSubscription;
  }
});

// node_modules/@nats-io/nats-core/lib/heartbeats.js
var require_heartbeats = __commonJS({
  "node_modules/@nats-io/nats-core/lib/heartbeats.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Heartbeat = void 0;
    var util_1 = require_util2();
    var Heartbeat = class {
      ph;
      interval;
      maxOut;
      timer;
      pendings;
      constructor(ph, interval, maxOut) {
        this.ph = ph;
        this.interval = interval;
        this.maxOut = maxOut;
        this.pendings = [];
      }
      // api to start the heartbeats, since this can be
      // spuriously called from dial, ensure we don't
      // leak timers
      start() {
        this.cancel();
        this._schedule();
      }
      // api for canceling the heartbeats, if stale is
      // true it will initiate a client disconnect
      cancel(stale) {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = void 0;
        }
        this._reset();
        if (stale) {
          this.ph.disconnect();
        }
      }
      _schedule() {
        this.timer = setTimeout(() => {
          this.ph.dispatchStatus({ type: "ping", pendingPings: this.pendings.length + 1 });
          if (this.pendings.length === this.maxOut) {
            this.cancel(true);
            return;
          }
          const ping = (0, util_1.deferred)();
          this.ph.flush(ping).then(() => {
            this._reset();
          }).catch(() => {
            this.cancel();
          });
          this.pendings.push(ping);
          this._schedule();
        }, this.interval);
      }
      _reset() {
        this.pendings = this.pendings.filter((p) => {
          const d = p;
          d.resolve();
          return false;
        });
      }
    };
    exports.Heartbeat = Heartbeat;
  }
});

// node_modules/@nats-io/nats-core/lib/denobuffer.js
var require_denobuffer = __commonJS({
  "node_modules/@nats-io/nats-core/lib/denobuffer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DenoBuffer = exports.MAX_SIZE = exports.AssertionError = void 0;
    exports.assert = assert;
    exports.concat = concat;
    exports.append = append;
    exports.readAll = readAll;
    exports.writeAll = writeAll;
    var encoders_1 = require_encoders();
    var AssertionError = class extends Error {
      constructor(msg) {
        super(msg);
        this.name = "AssertionError";
      }
    };
    exports.AssertionError = AssertionError;
    function assert(cond, msg = "Assertion failed.") {
      if (!cond) {
        throw new AssertionError(msg);
      }
    }
    var MIN_READ = 32 * 1024;
    exports.MAX_SIZE = 2 ** 32 - 2;
    function copy(src, dst, off = 0) {
      const r = dst.byteLength - off;
      if (src.byteLength > r) {
        src = src.subarray(0, r);
      }
      dst.set(src, off);
      return src.byteLength;
    }
    function concat(origin, b) {
      if (origin === void 0 && b === void 0) {
        return new Uint8Array(0);
      }
      if (origin === void 0) {
        return b;
      }
      if (b === void 0) {
        return origin;
      }
      const output = new Uint8Array(origin.length + b.length);
      output.set(origin, 0);
      output.set(b, origin.length);
      return output;
    }
    function append(origin, b) {
      return concat(origin, Uint8Array.of(b));
    }
    var DenoBuffer = class {
      _buf;
      // contents are the bytes _buf[off : len(_buf)]
      _off;
      // read at _buf[off], write at _buf[_buf.byteLength]
      constructor(ab) {
        this._off = 0;
        if (ab == null) {
          this._buf = new Uint8Array(0);
          return;
        }
        this._buf = new Uint8Array(ab);
      }
      bytes(options = { copy: true }) {
        if (options.copy === false)
          return this._buf.subarray(this._off);
        return this._buf.slice(this._off);
      }
      empty() {
        return this._buf.byteLength <= this._off;
      }
      get length() {
        return this._buf.byteLength - this._off;
      }
      get capacity() {
        return this._buf.buffer.byteLength;
      }
      truncate(n) {
        if (n === 0) {
          this.reset();
          return;
        }
        if (n < 0 || n > this.length) {
          throw Error("bytes.Buffer: truncation out of range");
        }
        this._reslice(this._off + n);
      }
      reset() {
        this._reslice(0);
        this._off = 0;
      }
      _tryGrowByReslice(n) {
        const l = this._buf.byteLength;
        if (n <= this.capacity - l) {
          this._reslice(l + n);
          return l;
        }
        return -1;
      }
      _reslice(len) {
        assert(len <= this._buf.buffer.byteLength);
        this._buf = new Uint8Array(this._buf.buffer, 0, len);
      }
      readByte() {
        const a = new Uint8Array(1);
        if (this.read(a)) {
          return a[0];
        }
        return null;
      }
      read(p) {
        if (this.empty()) {
          this.reset();
          if (p.byteLength === 0) {
            return 0;
          }
          return null;
        }
        const nread = copy(this._buf.subarray(this._off), p);
        this._off += nread;
        return nread;
      }
      writeByte(n) {
        return this.write(Uint8Array.of(n));
      }
      writeString(s) {
        return this.write(encoders_1.TE.encode(s));
      }
      write(p) {
        const m = this._grow(p.byteLength);
        return copy(p, this._buf, m);
      }
      _grow(n) {
        const m = this.length;
        if (m === 0 && this._off !== 0) {
          this.reset();
        }
        const i = this._tryGrowByReslice(n);
        if (i >= 0) {
          return i;
        }
        const c = this.capacity;
        if (n <= Math.floor(c / 2) - m) {
          copy(this._buf.subarray(this._off), this._buf);
        } else if (c + n > exports.MAX_SIZE) {
          throw new Error("The buffer cannot be grown beyond the maximum size.");
        } else {
          const buf = new Uint8Array(Math.min(2 * c + n, exports.MAX_SIZE));
          copy(this._buf.subarray(this._off), buf);
          this._buf = buf;
        }
        this._off = 0;
        this._reslice(Math.min(m + n, exports.MAX_SIZE));
        return m;
      }
      grow(n) {
        if (n < 0) {
          throw Error("Buffer._grow: negative count");
        }
        const m = this._grow(n);
        this._reslice(m);
      }
      readFrom(r) {
        let n = 0;
        const tmp = new Uint8Array(MIN_READ);
        while (true) {
          const shouldGrow = this.capacity - this.length < MIN_READ;
          const buf = shouldGrow ? tmp : new Uint8Array(this._buf.buffer, this.length);
          const nread = r.read(buf);
          if (nread === null) {
            return n;
          }
          if (shouldGrow)
            this.write(buf.subarray(0, nread));
          else
            this._reslice(this.length + nread);
          n += nread;
        }
      }
    };
    exports.DenoBuffer = DenoBuffer;
    function readAll(r) {
      const buf = new DenoBuffer();
      buf.readFrom(r);
      return buf.bytes();
    }
    function writeAll(w, arr) {
      let nwritten = 0;
      while (nwritten < arr.length) {
        nwritten += w.write(arr.subarray(nwritten));
      }
    }
  }
});

// node_modules/@nats-io/nats-core/lib/parser.js
var require_parser = __commonJS({
  "node_modules/@nats-io/nats-core/lib/parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.cc = exports.State = exports.Parser = exports.Kind = void 0;
    exports.describe = describe;
    var denobuffer_1 = require_denobuffer();
    var encoders_1 = require_encoders();
    exports.Kind = {
      OK: 0,
      ERR: 1,
      MSG: 2,
      INFO: 3,
      PING: 4,
      PONG: 5
    };
    function describe(e) {
      let ks;
      let data = "";
      switch (e.kind) {
        case exports.Kind.MSG:
          ks = "MSG";
          break;
        case exports.Kind.OK:
          ks = "OK";
          break;
        case exports.Kind.ERR:
          ks = "ERR";
          data = encoders_1.TD.decode(e.data);
          break;
        case exports.Kind.PING:
          ks = "PING";
          break;
        case exports.Kind.PONG:
          ks = "PONG";
          break;
        case exports.Kind.INFO:
          ks = "INFO";
          data = encoders_1.TD.decode(e.data);
      }
      return `${ks}: ${data}`;
    }
    function newMsgArg() {
      const ma = {};
      ma.sid = -1;
      ma.hdr = -1;
      ma.size = -1;
      return ma;
    }
    var ASCII_0 = 48;
    var ASCII_9 = 57;
    var MAX_64MB = 64 * 1024 * 1024;
    var Parser = class {
      dispatcher;
      state;
      as;
      drop;
      hdr;
      ma;
      argBuf;
      msgBuf;
      constructor(dispatcher) {
        this.dispatcher = dispatcher;
        this.state = exports.State.OP_START;
        this.as = 0;
        this.drop = 0;
        this.hdr = 0;
      }
      parse(buf) {
        let i;
        for (i = 0; i < buf.length; i++) {
          const b = buf[i];
          switch (this.state) {
            case exports.State.OP_START:
              switch (b) {
                case exports.cc.M:
                case exports.cc.m:
                  this.state = exports.State.OP_M;
                  this.hdr = -1;
                  this.ma = newMsgArg();
                  break;
                case exports.cc.H:
                case exports.cc.h:
                  this.state = exports.State.OP_H;
                  this.hdr = 0;
                  this.ma = newMsgArg();
                  break;
                case exports.cc.P:
                case exports.cc.p:
                  this.state = exports.State.OP_P;
                  break;
                case exports.cc.PLUS:
                  this.state = exports.State.OP_PLUS;
                  break;
                case exports.cc.MINUS:
                  this.state = exports.State.OP_MINUS;
                  break;
                case exports.cc.I:
                case exports.cc.i:
                  this.state = exports.State.OP_I;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_H:
              switch (b) {
                case exports.cc.M:
                case exports.cc.m:
                  this.state = exports.State.OP_M;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_M:
              switch (b) {
                case exports.cc.S:
                case exports.cc.s:
                  this.state = exports.State.OP_MS;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_MS:
              switch (b) {
                case exports.cc.G:
                case exports.cc.g:
                  this.state = exports.State.OP_MSG;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_MSG:
              switch (b) {
                case exports.cc.SPACE:
                case exports.cc.TAB:
                  this.state = exports.State.OP_MSG_SPC;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_MSG_SPC:
              switch (b) {
                case exports.cc.SPACE:
                case exports.cc.TAB:
                  continue;
                default:
                  this.state = exports.State.MSG_ARG;
                  this.as = i;
              }
              break;
            case exports.State.MSG_ARG:
              switch (b) {
                case exports.cc.CR:
                  this.drop = 1;
                  break;
                case exports.cc.NL: {
                  const arg = this.argBuf ? this.argBuf.bytes() : buf.subarray(this.as, i - this.drop);
                  this.processMsgArgs(arg);
                  this.drop = 0;
                  this.as = i + 1;
                  this.state = exports.State.MSG_PAYLOAD;
                  i = this.as + this.ma.size - 1;
                  break;
                }
                default:
                  if (this.argBuf) {
                    this.argBuf.writeByte(b);
                  }
              }
              break;
            case exports.State.MSG_PAYLOAD:
              if (this.msgBuf) {
                if (this.msgBuf.length >= this.ma.size) {
                  const data = this.msgBuf.bytes({ copy: false });
                  this.dispatcher.push({ kind: exports.Kind.MSG, msg: this.ma, data });
                  this.argBuf = void 0;
                  this.msgBuf = void 0;
                  this.state = exports.State.MSG_END;
                } else {
                  let toCopy = this.ma.size - this.msgBuf.length;
                  const avail = buf.length - i;
                  if (avail < toCopy) {
                    toCopy = avail;
                  }
                  if (toCopy > 0) {
                    this.msgBuf.write(buf.subarray(i, i + toCopy));
                    i = i + toCopy - 1;
                  } else {
                    this.msgBuf.writeByte(b);
                  }
                }
              } else if (i - this.as >= this.ma.size) {
                this.dispatcher.push({ kind: exports.Kind.MSG, msg: this.ma, data: buf.subarray(this.as, i) });
                this.argBuf = void 0;
                this.msgBuf = void 0;
                this.state = exports.State.MSG_END;
              }
              break;
            case exports.State.MSG_END:
              switch (b) {
                case exports.cc.NL:
                  this.drop = 0;
                  this.as = i + 1;
                  this.state = exports.State.OP_START;
                  break;
                default:
                  continue;
              }
              break;
            case exports.State.OP_PLUS:
              switch (b) {
                case exports.cc.O:
                case exports.cc.o:
                  this.state = exports.State.OP_PLUS_O;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_PLUS_O:
              switch (b) {
                case exports.cc.K:
                case exports.cc.k:
                  this.state = exports.State.OP_PLUS_OK;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_PLUS_OK:
              switch (b) {
                case exports.cc.NL:
                  this.dispatcher.push({ kind: exports.Kind.OK });
                  this.drop = 0;
                  this.state = exports.State.OP_START;
                  break;
              }
              break;
            case exports.State.OP_MINUS:
              switch (b) {
                case exports.cc.E:
                case exports.cc.e:
                  this.state = exports.State.OP_MINUS_E;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_MINUS_E:
              switch (b) {
                case exports.cc.R:
                case exports.cc.r:
                  this.state = exports.State.OP_MINUS_ER;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_MINUS_ER:
              switch (b) {
                case exports.cc.R:
                case exports.cc.r:
                  this.state = exports.State.OP_MINUS_ERR;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_MINUS_ERR:
              switch (b) {
                case exports.cc.SPACE:
                case exports.cc.TAB:
                  this.state = exports.State.OP_MINUS_ERR_SPC;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_MINUS_ERR_SPC:
              switch (b) {
                case exports.cc.SPACE:
                case exports.cc.TAB:
                  continue;
                default:
                  this.state = exports.State.MINUS_ERR_ARG;
                  this.as = i;
              }
              break;
            case exports.State.MINUS_ERR_ARG:
              switch (b) {
                case exports.cc.CR:
                  this.drop = 1;
                  break;
                case exports.cc.NL: {
                  let arg;
                  if (this.argBuf) {
                    arg = this.argBuf.bytes();
                    this.argBuf = void 0;
                  } else {
                    arg = buf.subarray(this.as, i - this.drop);
                  }
                  this.dispatcher.push({ kind: exports.Kind.ERR, data: arg });
                  this.drop = 0;
                  this.as = i + 1;
                  this.state = exports.State.OP_START;
                  break;
                }
                default:
                  if (this.argBuf) {
                    this.argBuf.write(Uint8Array.of(b));
                  }
              }
              break;
            case exports.State.OP_P:
              switch (b) {
                case exports.cc.I:
                case exports.cc.i:
                  this.state = exports.State.OP_PI;
                  break;
                case exports.cc.O:
                case exports.cc.o:
                  this.state = exports.State.OP_PO;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_PO:
              switch (b) {
                case exports.cc.N:
                case exports.cc.n:
                  this.state = exports.State.OP_PON;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_PON:
              switch (b) {
                case exports.cc.G:
                case exports.cc.g:
                  this.state = exports.State.OP_PONG;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_PONG:
              switch (b) {
                case exports.cc.NL:
                  this.dispatcher.push({ kind: exports.Kind.PONG });
                  this.drop = 0;
                  this.state = exports.State.OP_START;
                  break;
              }
              break;
            case exports.State.OP_PI:
              switch (b) {
                case exports.cc.N:
                case exports.cc.n:
                  this.state = exports.State.OP_PIN;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_PIN:
              switch (b) {
                case exports.cc.G:
                case exports.cc.g:
                  this.state = exports.State.OP_PING;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_PING:
              switch (b) {
                case exports.cc.NL:
                  this.dispatcher.push({ kind: exports.Kind.PING });
                  this.drop = 0;
                  this.state = exports.State.OP_START;
                  break;
              }
              break;
            case exports.State.OP_I:
              switch (b) {
                case exports.cc.N:
                case exports.cc.n:
                  this.state = exports.State.OP_IN;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_IN:
              switch (b) {
                case exports.cc.F:
                case exports.cc.f:
                  this.state = exports.State.OP_INF;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_INF:
              switch (b) {
                case exports.cc.O:
                case exports.cc.o:
                  this.state = exports.State.OP_INFO;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_INFO:
              switch (b) {
                case exports.cc.SPACE:
                case exports.cc.TAB:
                  this.state = exports.State.OP_INFO_SPC;
                  break;
                default:
                  throw this.fail(buf.subarray(i));
              }
              break;
            case exports.State.OP_INFO_SPC:
              switch (b) {
                case exports.cc.SPACE:
                case exports.cc.TAB:
                  continue;
                default:
                  this.state = exports.State.INFO_ARG;
                  this.as = i;
              }
              break;
            case exports.State.INFO_ARG:
              switch (b) {
                case exports.cc.CR:
                  this.drop = 1;
                  break;
                case exports.cc.NL: {
                  let arg;
                  if (this.argBuf) {
                    arg = this.argBuf.bytes();
                    this.argBuf = void 0;
                  } else {
                    arg = buf.subarray(this.as, i - this.drop);
                  }
                  this.dispatcher.push({ kind: exports.Kind.INFO, data: arg });
                  this.drop = 0;
                  this.as = i + 1;
                  this.state = exports.State.OP_START;
                  break;
                }
                default:
                  if (this.argBuf) {
                    this.argBuf.writeByte(b);
                  }
              }
              break;
            default:
              throw this.fail(buf.subarray(i));
          }
        }
        if ((this.state === exports.State.MSG_ARG || this.state === exports.State.MINUS_ERR_ARG || this.state === exports.State.INFO_ARG) && !this.argBuf) {
          this.argBuf = new denobuffer_1.DenoBuffer(buf.subarray(this.as, i - this.drop));
        }
        if (this.state === exports.State.MSG_PAYLOAD && !this.msgBuf) {
          if (!this.argBuf) {
            this.cloneMsgArg();
          }
          this.msgBuf = new denobuffer_1.DenoBuffer(buf.subarray(this.as));
        }
      }
      cloneMsgArg() {
        const s = this.ma.subject.length;
        const r = this.ma.reply ? this.ma.reply.length : 0;
        const buf = new Uint8Array(s + r);
        buf.set(this.ma.subject);
        if (this.ma.reply) {
          buf.set(this.ma.reply, s);
        }
        this.argBuf = new denobuffer_1.DenoBuffer(buf);
        this.ma.subject = buf.subarray(0, s);
        if (this.ma.reply) {
          this.ma.reply = buf.subarray(s);
        }
      }
      processMsgArgs(arg) {
        if (this.hdr >= 0) {
          return this.processHeaderMsgArgs(arg);
        }
        const args = [];
        let start = -1;
        for (let i = 0; i < arg.length; i++) {
          const b = arg[i];
          switch (b) {
            case exports.cc.SPACE:
            case exports.cc.TAB:
            case exports.cc.CR:
            case exports.cc.NL:
              if (start >= 0) {
                args.push(arg.subarray(start, i));
                start = -1;
              }
              break;
            default:
              if (start < 0) {
                start = i;
              }
          }
        }
        if (start >= 0) {
          args.push(arg.subarray(start));
        }
        switch (args.length) {
          case 3:
            this.ma.subject = args[0];
            this.ma.sid = this.protoParseInt(args[1]);
            this.ma.reply = void 0;
            this.ma.size = this.protoParseInt(args[2], MAX_64MB);
            break;
          case 4:
            this.ma.subject = args[0];
            this.ma.sid = this.protoParseInt(args[1]);
            this.ma.reply = args[2];
            this.ma.size = this.protoParseInt(args[3], MAX_64MB);
            break;
          default:
            throw this.fail(arg, "processMsgArgs Parse Error");
        }
        if (this.ma.sid < 0) {
          throw this.fail(arg, "processMsgArgs Bad or Missing Sid Error");
        }
        if (this.ma.size < 0) {
          throw this.fail(arg, "processMsgArgs Bad or Missing Size Error");
        }
      }
      fail(data, label = "") {
        if (!label) {
          label = `parse error [${this.state}]`;
        } else {
          label = `${label} [${this.state}]`;
        }
        return new Error(`${label}: ${encoders_1.TD.decode(data)}`);
      }
      processHeaderMsgArgs(arg) {
        const args = [];
        let start = -1;
        for (let i = 0; i < arg.length; i++) {
          const b = arg[i];
          switch (b) {
            case exports.cc.SPACE:
            case exports.cc.TAB:
            case exports.cc.CR:
            case exports.cc.NL:
              if (start >= 0) {
                args.push(arg.subarray(start, i));
                start = -1;
              }
              break;
            default:
              if (start < 0) {
                start = i;
              }
          }
        }
        if (start >= 0) {
          args.push(arg.subarray(start));
        }
        switch (args.length) {
          case 4:
            this.ma.subject = args[0];
            this.ma.sid = this.protoParseInt(args[1]);
            this.ma.reply = void 0;
            this.ma.hdr = this.protoParseInt(args[2], MAX_64MB);
            this.ma.size = this.protoParseInt(args[3], MAX_64MB);
            break;
          case 5:
            this.ma.subject = args[0];
            this.ma.sid = this.protoParseInt(args[1]);
            this.ma.reply = args[2];
            this.ma.hdr = this.protoParseInt(args[3], MAX_64MB);
            this.ma.size = this.protoParseInt(args[4], MAX_64MB);
            break;
          default:
            throw this.fail(arg, "processHeaderMsgArgs Parse Error");
        }
        if (this.ma.sid < 0) {
          throw this.fail(arg, "processHeaderMsgArgs Bad or Missing Sid Error");
        }
        if (this.ma.hdr < 0 || this.ma.hdr > this.ma.size) {
          throw this.fail(arg, "processHeaderMsgArgs Bad or Missing Header Size Error");
        }
        if (this.ma.size < 0) {
          throw this.fail(arg, "processHeaderMsgArgs Bad or Missing Size Error");
        }
      }
      protoParseInt(a, max) {
        if (a.length === 0 || a.length > 15) {
          return -1;
        }
        let n = 0;
        for (let i = 0; i < a.length; i++) {
          if (a[i] < ASCII_0 || a[i] > ASCII_9) {
            return -1;
          }
          n = n * 10 + (a[i] - ASCII_0);
        }
        return max !== void 0 && n > max ? -1 : n;
      }
    };
    exports.Parser = Parser;
    exports.State = {
      OP_START: 0,
      OP_PLUS: 1,
      OP_PLUS_O: 2,
      OP_PLUS_OK: 3,
      OP_MINUS: 4,
      OP_MINUS_E: 5,
      OP_MINUS_ER: 6,
      OP_MINUS_ERR: 7,
      OP_MINUS_ERR_SPC: 8,
      MINUS_ERR_ARG: 9,
      OP_M: 10,
      OP_MS: 11,
      OP_MSG: 12,
      OP_MSG_SPC: 13,
      MSG_ARG: 14,
      MSG_PAYLOAD: 15,
      MSG_END: 16,
      OP_H: 17,
      OP_P: 18,
      OP_PI: 19,
      OP_PIN: 20,
      OP_PING: 21,
      OP_PO: 22,
      OP_PON: 23,
      OP_PONG: 24,
      OP_I: 25,
      OP_IN: 26,
      OP_INF: 27,
      OP_INFO: 28,
      OP_INFO_SPC: 29,
      INFO_ARG: 30
    };
    exports.cc = {
      CR: "\r".charCodeAt(0),
      E: "E".charCodeAt(0),
      e: "e".charCodeAt(0),
      F: "F".charCodeAt(0),
      f: "f".charCodeAt(0),
      G: "G".charCodeAt(0),
      g: "g".charCodeAt(0),
      H: "H".charCodeAt(0),
      h: "h".charCodeAt(0),
      I: "I".charCodeAt(0),
      i: "i".charCodeAt(0),
      K: "K".charCodeAt(0),
      k: "k".charCodeAt(0),
      M: "M".charCodeAt(0),
      m: "m".charCodeAt(0),
      MINUS: "-".charCodeAt(0),
      N: "N".charCodeAt(0),
      n: "n".charCodeAt(0),
      NL: "\n".charCodeAt(0),
      O: "O".charCodeAt(0),
      o: "o".charCodeAt(0),
      P: "P".charCodeAt(0),
      p: "p".charCodeAt(0),
      PLUS: "+".charCodeAt(0),
      R: "R".charCodeAt(0),
      r: "r".charCodeAt(0),
      S: "S".charCodeAt(0),
      s: "s".charCodeAt(0),
      SPACE: " ".charCodeAt(0),
      TAB: "	".charCodeAt(0)
    };
  }
});

// node_modules/@nats-io/nats-core/lib/headers.js
var require_headers = __commonJS({
  "node_modules/@nats-io/nats-core/lib/headers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MsgHdrsImpl = void 0;
    exports.canonicalMIMEHeaderKey = canonicalMIMEHeaderKey;
    exports.headers = headers;
    var encoders_1 = require_encoders();
    var core_1 = require_core();
    var errors_1 = require_errors();
    function canonicalMIMEHeaderKey(k) {
      const a = 97;
      const A = 65;
      const Z = 90;
      const z = 122;
      const dash = 45;
      const colon = 58;
      const start = 33;
      const end = 126;
      const toLower = a - A;
      let upper = true;
      const buf = new Array(k.length);
      for (let i = 0; i < k.length; i++) {
        let c = k.charCodeAt(i);
        if (c === colon || c < start || c > end) {
          throw errors_1.InvalidArgumentError.format("header", `'${k[i]}' is not a valid character in a header name`);
        }
        if (upper && a <= c && c <= z) {
          c -= toLower;
        } else if (!upper && A <= c && c <= Z) {
          c += toLower;
        }
        buf[i] = c;
        upper = c == dash;
      }
      return String.fromCharCode(...buf);
    }
    function headers(code = 0, description = "") {
      if (code === 0 && description !== "") {
        throw errors_1.InvalidArgumentError.format("code", "is required");
      } else if (code > 0 && description === "") {
        throw errors_1.InvalidArgumentError.format("description", "is required");
      }
      return new MsgHdrsImpl(code, description);
    }
    var HEADER = "NATS/1.0";
    var MsgHdrsImpl = class _MsgHdrsImpl {
      _code;
      headers;
      _description;
      constructor(code = 0, description = "") {
        this._code = code;
        this._description = description;
        this.headers = /* @__PURE__ */ new Map();
      }
      [Symbol.iterator]() {
        return this.headers.entries();
      }
      size() {
        return this.headers.size;
      }
      equals(mh) {
        if (mh && this.headers.size === mh.headers.size && this._code === mh._code) {
          for (const [k, v] of this.headers) {
            const a = mh.values(k);
            if (v.length !== a.length) {
              return false;
            }
            const vv = [...v].sort();
            const aa = [...a].sort();
            for (let i = 0; i < vv.length; i++) {
              if (vv[i] !== aa[i]) {
                return false;
              }
            }
          }
          return true;
        }
        return false;
      }
      static decode(a) {
        const mh = new _MsgHdrsImpl();
        const s = encoders_1.TD.decode(a);
        const lines = s.split("\r\n");
        const h2 = lines[0];
        if (h2 !== HEADER) {
          let str = h2.replace(HEADER, "").trim();
          if (str.length > 0) {
            mh._code = parseInt(str, 10);
            if (isNaN(mh._code)) {
              mh._code = 0;
            }
            const scode = mh._code.toString();
            str = str.replace(scode, "");
            mh._description = str.trim();
          }
        }
        if (lines.length >= 1) {
          lines.slice(1).map((s2) => {
            if (s2) {
              const idx = s2.indexOf(":");
              if (idx > -1) {
                const k = s2.slice(0, idx);
                const v = s2.slice(idx + 1).trim();
                mh.append(k, v);
              }
            }
          });
        }
        return mh;
      }
      toString() {
        if (this.headers.size === 0 && this._code === 0) {
          return "";
        }
        let s = HEADER;
        if (this._code > 0 && this._description !== "") {
          s += ` ${this._code} ${this._description}`;
        }
        for (const [k, v] of this.headers) {
          for (let i = 0; i < v.length; i++) {
            s = `${s}\r
${k}: ${v[i]}`;
          }
        }
        return `${s}\r
\r
`;
      }
      encode() {
        return encoders_1.TE.encode(this.toString());
      }
      static validHeaderValue(k) {
        const inv = /[\r\n]/;
        if (inv.test(k)) {
          throw errors_1.InvalidArgumentError.format("header", "values cannot contain \\r or \\n");
        }
        return k.trim();
      }
      keys() {
        const keys = [];
        for (const sk of this.headers.keys()) {
          keys.push(sk);
        }
        return keys;
      }
      findKeys(k, match = core_1.Match.Exact) {
        const keys = this.keys();
        switch (match) {
          case core_1.Match.Exact:
            return keys.filter((v) => {
              return v === k;
            });
          case core_1.Match.CanonicalMIME:
            k = canonicalMIMEHeaderKey(k);
            return keys.filter((v) => {
              return v === k;
            });
          default: {
            const lci = k.toLowerCase();
            return keys.filter((v) => {
              return lci === v.toLowerCase();
            });
          }
        }
      }
      get(k, match = core_1.Match.Exact) {
        const keys = this.findKeys(k, match);
        if (keys.length) {
          const v = this.headers.get(keys[0]);
          if (v) {
            return Array.isArray(v) ? v[0] : v;
          }
        }
        return "";
      }
      last(k, match = core_1.Match.Exact) {
        const keys = this.findKeys(k, match);
        if (keys.length) {
          const v = this.headers.get(keys[0]);
          if (v) {
            return Array.isArray(v) ? v[v.length - 1] : v;
          }
        }
        return "";
      }
      has(k, match = core_1.Match.Exact) {
        return this.findKeys(k, match).length > 0;
      }
      set(k, v, match = core_1.Match.Exact) {
        this.delete(k, match);
        this.append(k, v, match);
      }
      append(k, v, match = core_1.Match.Exact) {
        const ck = canonicalMIMEHeaderKey(k);
        if (match === core_1.Match.CanonicalMIME) {
          k = ck;
        }
        const keys = this.findKeys(k, match);
        k = keys.length > 0 ? keys[0] : k;
        const value = _MsgHdrsImpl.validHeaderValue(v);
        let a = this.headers.get(k);
        if (!a) {
          a = [];
          this.headers.set(k, a);
        }
        a.push(value);
      }
      values(k, match = core_1.Match.Exact) {
        const buf = [];
        const keys = this.findKeys(k, match);
        keys.forEach((v) => {
          const values = this.headers.get(v);
          if (values) {
            buf.push(...values);
          }
        });
        return buf;
      }
      delete(k, match = core_1.Match.Exact) {
        const keys = this.findKeys(k, match);
        keys.forEach((v) => {
          this.headers.delete(v);
        });
      }
      get hasError() {
        return this._code >= 300;
      }
      get status() {
        return `${this._code} ${this._description}`.trim();
      }
      toRecord() {
        const data = {};
        this.keys().forEach((v) => {
          data[v] = this.values(v);
        });
        return data;
      }
      get code() {
        return this._code;
      }
      get description() {
        return this._description;
      }
      static fromRecord(r) {
        const h2 = new _MsgHdrsImpl();
        for (const k in r) {
          const v = r[k];
          h2.headers.set(k, Array.isArray(v) ? v : [`${v}`]);
        }
        return h2;
      }
    };
    exports.MsgHdrsImpl = MsgHdrsImpl;
  }
});

// node_modules/@nats-io/nats-core/lib/msg.js
var require_msg = __commonJS({
  "node_modules/@nats-io/nats-core/lib/msg.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MsgImpl = void 0;
    var headers_1 = require_headers();
    var encoders_1 = require_encoders();
    var MsgImpl = class {
      _headers;
      _msg;
      _rdata;
      _reply;
      _subject;
      publisher;
      constructor(msg, data, publisher) {
        this._msg = msg;
        this._rdata = data;
        this.publisher = publisher;
      }
      get subject() {
        if (this._subject) {
          return this._subject;
        }
        this._subject = encoders_1.TD.decode(this._msg.subject);
        return this._subject;
      }
      get reply() {
        if (this._reply) {
          return this._reply;
        }
        this._reply = encoders_1.TD.decode(this._msg.reply);
        return this._reply;
      }
      get sid() {
        return this._msg.sid;
      }
      get headers() {
        if (this._msg.hdr > -1 && !this._headers) {
          const buf = this._rdata.subarray(0, this._msg.hdr);
          this._headers = headers_1.MsgHdrsImpl.decode(buf);
        }
        return this._headers;
      }
      get data() {
        if (!this._rdata) {
          return new Uint8Array(0);
        }
        return this._msg.hdr > -1 ? this._rdata.subarray(this._msg.hdr) : this._rdata;
      }
      // eslint-ignore-next-line @typescript-eslint/no-explicit-any
      respond(data = encoders_1.Empty, opts) {
        if (this.reply) {
          this.publisher.publish(this.reply, data, opts);
          return true;
        }
        return false;
      }
      size() {
        const subj = this._msg.subject.length;
        const reply = this._msg.reply?.length || 0;
        const payloadAndHeaders = this._msg.size === -1 ? 0 : this._msg.size;
        return subj + reply + payloadAndHeaders;
      }
      json(reviver) {
        return JSON.parse(this.string(), reviver);
      }
      string() {
        return encoders_1.TD.decode(this.data);
      }
      requestInfo() {
        const v = this.headers?.get("Nats-Request-Info");
        if (v) {
          return JSON.parse(v, function(key, value) {
            if ((key === "start" || key === "stop") && value !== "") {
              return new Date(Date.parse(value));
            }
            return value;
          });
        }
        return null;
      }
    };
    exports.MsgImpl = MsgImpl;
  }
});

// node_modules/@nats-io/nats-core/lib/semver.js
var require_semver = __commonJS({
  "node_modules/@nats-io/nats-core/lib/semver.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Features = exports.Feature = void 0;
    exports.parseSemVer = parseSemVer;
    exports.compare = compare;
    function parseSemVer(s = "") {
      const m = s.match(/(\d+).(\d+).(\d+)/);
      if (m) {
        return {
          major: parseInt(m[1]),
          minor: parseInt(m[2]),
          micro: parseInt(m[3])
        };
      }
      throw new Error(`'${s}' is not a semver value`);
    }
    function compare(a, b) {
      if (a.major < b.major)
        return -1;
      if (a.major > b.major)
        return 1;
      if (a.minor < b.minor)
        return -1;
      if (a.minor > b.minor)
        return 1;
      if (a.micro < b.micro)
        return -1;
      if (a.micro > b.micro)
        return 1;
      return 0;
    }
    exports.Feature = {
      JS_KV: "js_kv",
      JS_OBJECTSTORE: "js_objectstore",
      JS_PULL_MAX_BYTES: "js_pull_max_bytes",
      JS_NEW_CONSUMER_CREATE_API: "js_new_consumer_create",
      JS_ALLOW_DIRECT: "js_allow_direct",
      JS_MULTIPLE_CONSUMER_FILTER: "js_multiple_consumer_filter",
      JS_SIMPLIFICATION: "js_simplification",
      JS_STREAM_CONSUMER_METADATA: "js_stream_consumer_metadata",
      JS_CONSUMER_FILTER_SUBJECTS: "js_consumer_filter_subjects",
      JS_STREAM_FIRST_SEQ: "js_stream_first_seq",
      JS_STREAM_SUBJECT_TRANSFORM: "js_stream_subject_transform",
      JS_STREAM_SOURCE_SUBJECT_TRANSFORM: "js_stream_source_subject_transform",
      JS_STREAM_COMPRESSION: "js_stream_compression",
      JS_DEFAULT_CONSUMER_LIMITS: "js_default_consumer_limits",
      JS_BATCH_DIRECT_GET: "js_batch_direct_get",
      JS_PRIORITY_GROUPS: "js_priority_groups",
      JS_CONSUMER_RESET: "js_consumer_reset"
    };
    var Features = class {
      server;
      features;
      disabled;
      constructor(v) {
        this.features = /* @__PURE__ */ new Map();
        this.disabled = [];
        this.update(v);
      }
      /**
       * Removes all disabled entries
       */
      resetDisabled() {
        this.disabled.length = 0;
        this.update(this.server);
      }
      /**
       * Disables a particular feature.
       * @param f
       */
      disable(f) {
        this.disabled.push(f);
        this.update(this.server);
      }
      isDisabled(f) {
        return this.disabled.indexOf(f) !== -1;
      }
      update(v) {
        if (typeof v === "string") {
          v = parseSemVer(v);
        }
        this.server = v;
        this.set(exports.Feature.JS_KV, "2.6.2");
        this.set(exports.Feature.JS_OBJECTSTORE, "2.6.3");
        this.set(exports.Feature.JS_PULL_MAX_BYTES, "2.8.3");
        this.set(exports.Feature.JS_NEW_CONSUMER_CREATE_API, "2.9.0");
        this.set(exports.Feature.JS_ALLOW_DIRECT, "2.9.0");
        this.set(exports.Feature.JS_MULTIPLE_CONSUMER_FILTER, "2.10.0");
        this.set(exports.Feature.JS_SIMPLIFICATION, "2.9.4");
        this.set(exports.Feature.JS_STREAM_CONSUMER_METADATA, "2.10.0");
        this.set(exports.Feature.JS_CONSUMER_FILTER_SUBJECTS, "2.10.0");
        this.set(exports.Feature.JS_STREAM_FIRST_SEQ, "2.10.0");
        this.set(exports.Feature.JS_STREAM_SUBJECT_TRANSFORM, "2.10.0");
        this.set(exports.Feature.JS_STREAM_SOURCE_SUBJECT_TRANSFORM, "2.10.0");
        this.set(exports.Feature.JS_STREAM_COMPRESSION, "2.10.0");
        this.set(exports.Feature.JS_DEFAULT_CONSUMER_LIMITS, "2.10.0");
        this.set(exports.Feature.JS_BATCH_DIRECT_GET, "2.11.0");
        this.set(exports.Feature.JS_PRIORITY_GROUPS, "2.11.0");
        this.set(exports.Feature.JS_CONSUMER_RESET, "2.14.0");
        this.disabled.forEach((f) => {
          this.features.delete(f);
        });
      }
      /**
       * Register a feature that requires a particular server version.
       * @param f
       * @param requires
       */
      set(f, requires) {
        this.features.set(f, {
          min: requires,
          ok: compare(this.server, parseSemVer(requires)) >= 0
        });
      }
      /**
       * Returns whether the feature is available and the min server
       * version that supports it.
       * @param f
       */
      get(f) {
        return this.features.get(f) || { min: "unknown", ok: false };
      }
      /**
       * Returns true if the feature is supported
       * @param f
       */
      supports(f) {
        return this.get(f)?.ok || false;
      }
      /**
       * Returns true if the server is at least the specified version
       * @param v
       */
      require(v) {
        if (typeof v === "string") {
          v = parseSemVer(v);
        }
        return compare(this.server, v) >= 0;
      }
    };
    exports.Features = Features;
  }
});

// node_modules/@nats-io/nats-core/lib/nkeys.js
var require_nkeys2 = __commonJS({
  "node_modules/@nats-io/nats-core/lib/nkeys.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result2 = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result2, mod, k[i]);
        }
        __setModuleDefault(result2, mod);
        return result2;
      };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.nkeys = void 0;
    exports.nkeys = __importStar(require_mod());
  }
});

// node_modules/@nats-io/nats-core/lib/authenticator.js
var require_authenticator = __commonJS({
  "node_modules/@nats-io/nats-core/lib/authenticator.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.multiAuthenticator = multiAuthenticator;
    exports.noAuthFn = noAuthFn;
    exports.usernamePasswordAuthenticator = usernamePasswordAuthenticator;
    exports.tokenAuthenticator = tokenAuthenticator;
    exports.nkeyAuthenticator = nkeyAuthenticator3;
    exports.jwtAuthenticator = jwtAuthenticator;
    exports.credsAuthenticator = credsAuthenticator;
    var nkeys_1 = require_nkeys2();
    var encoders_1 = require_encoders();
    function multiAuthenticator(authenticators) {
      return (nonce) => {
        let auth = {};
        authenticators.forEach((a) => {
          const args = a(nonce) || {};
          auth = Object.assign(auth, args);
        });
        return auth;
      };
    }
    function noAuthFn() {
      return () => {
        return;
      };
    }
    function usernamePasswordAuthenticator(user, pass) {
      return () => {
        const u = typeof user === "function" ? user() : user;
        const p = typeof pass === "function" ? pass() : pass;
        return { user: u, pass: p };
      };
    }
    function tokenAuthenticator(token) {
      return () => {
        const auth_token = typeof token === "function" ? token() : token;
        return { auth_token };
      };
    }
    function nkeyAuthenticator3(seed) {
      return (nonce) => {
        const s = typeof seed === "function" ? seed() : seed;
        const kp = s ? nkeys_1.nkeys.fromSeed(s) : void 0;
        const nkey = kp ? kp.getPublicKey() : "";
        const challenge = encoders_1.TE.encode(nonce || "");
        const sigBytes = kp !== void 0 && nonce ? kp.sign(challenge) : void 0;
        const sig = sigBytes ? nkeys_1.nkeys.encode(sigBytes) : "";
        return { nkey, sig };
      };
    }
    function jwtAuthenticator(ajwt, seed) {
      return (nonce) => {
        const jwt = typeof ajwt === "function" ? ajwt() : ajwt;
        const fn = nkeyAuthenticator3(seed);
        const { nkey, sig } = fn(nonce);
        return { jwt, nkey, sig };
      };
    }
    function credsAuthenticator(creds) {
      const fn = typeof creds !== "function" ? () => creds : creds;
      const parse = () => {
        const CREDS = /\s*(?:(?:[-]{3,}[^\n]*[-]{3,}\n)(.+)(?:\n\s*[-]{3,}[^\n]*[-]{3,}\n))/ig;
        const s = encoders_1.TD.decode(fn());
        let m = CREDS.exec(s);
        if (!m) {
          throw new Error("unable to parse credentials");
        }
        const jwt = m[1].trim();
        m = CREDS.exec(s);
        if (!m) {
          throw new Error("unable to parse credentials");
        }
        const seed = encoders_1.TE.encode(m[1].trim());
        return { jwt, seed };
      };
      const jwtFn = () => {
        const { jwt } = parse();
        return jwt;
      };
      const nkeyFn = () => {
        const { seed } = parse();
        return seed;
      };
      return jwtAuthenticator(jwtFn, nkeyFn);
    }
  }
});

// node_modules/@nats-io/nats-core/lib/options.js
var require_options = __commonJS({
  "node_modules/@nats-io/nats-core/lib/options.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_RECONNECT_TIME_WAIT = exports.DEFAULT_MAX_PING_OUT = exports.DEFAULT_PING_INTERVAL = exports.DEFAULT_JITTER_TLS = exports.DEFAULT_JITTER = exports.DEFAULT_MAX_RECONNECT_ATTEMPTS = void 0;
    exports.defaultOptions = defaultOptions;
    exports.hasWsProtocol = hasWsProtocol;
    exports.buildAuthenticator = buildAuthenticator;
    exports.parseOptions = parseOptions;
    exports.checkOptions = checkOptions;
    exports.checkUnsupportedOption = checkUnsupportedOption;
    var util_1 = require_util2();
    var transport_1 = require_transport();
    var core_1 = require_core();
    var authenticator_1 = require_authenticator();
    var errors_1 = require_errors();
    exports.DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
    exports.DEFAULT_JITTER = 100;
    exports.DEFAULT_JITTER_TLS = 1e3;
    exports.DEFAULT_PING_INTERVAL = 2 * 60 * 1e3;
    exports.DEFAULT_MAX_PING_OUT = 2;
    exports.DEFAULT_RECONNECT_TIME_WAIT = 2 * 1e3;
    function defaultOptions() {
      return {
        maxPingOut: exports.DEFAULT_MAX_PING_OUT,
        maxReconnectAttempts: exports.DEFAULT_MAX_RECONNECT_ATTEMPTS,
        noRandomize: false,
        pedantic: false,
        pingInterval: exports.DEFAULT_PING_INTERVAL,
        reconnect: true,
        reconnectJitter: exports.DEFAULT_JITTER,
        reconnectJitterTLS: exports.DEFAULT_JITTER_TLS,
        reconnectTimeWait: exports.DEFAULT_RECONNECT_TIME_WAIT,
        tls: void 0,
        verbose: false,
        waitOnFirstConnect: false,
        ignoreAuthErrorAbort: false
      };
    }
    function hasWsProtocol(opts) {
      if (opts) {
        let { servers } = opts;
        if (typeof servers === "string") {
          servers = [servers];
        }
        if (servers) {
          for (let i = 0; i < servers.length; i++) {
            const s = servers[i].toLowerCase();
            if (s.startsWith("ws://") || s.startsWith("wss://")) {
              return true;
            }
          }
        }
      }
      return false;
    }
    function buildAuthenticator(opts) {
      const buf = [];
      if (typeof opts.authenticator === "function") {
        buf.push(opts.authenticator);
      }
      if (Array.isArray(opts.authenticator)) {
        buf.push(...opts.authenticator);
      }
      if (opts.token) {
        buf.push((0, authenticator_1.tokenAuthenticator)(opts.token));
      }
      if (opts.user) {
        buf.push((0, authenticator_1.usernamePasswordAuthenticator)(opts.user, opts.pass));
      }
      return buf.length === 0 ? (0, authenticator_1.noAuthFn)() : (0, authenticator_1.multiAuthenticator)(buf);
    }
    function parseOptions(opts) {
      const dhp = `${core_1.DEFAULT_HOST}:${(0, transport_1.defaultPort)()}`;
      opts = opts || { servers: [dhp] };
      opts.servers = opts.servers || [];
      if (typeof opts.servers === "string") {
        opts.servers = [opts.servers];
      }
      if (opts.servers.length > 0 && opts.port) {
        throw errors_1.InvalidArgumentError.format(["servers", "port"], "are mutually exclusive");
      }
      if (opts.servers.length === 0 && opts.port) {
        opts.servers = [`${core_1.DEFAULT_HOST}:${opts.port}`];
      }
      if (opts.servers && opts.servers.length === 0) {
        opts.servers = [dhp];
      }
      const options = (0, util_1.extend)(defaultOptions(), opts);
      options.authenticator = buildAuthenticator(options);
      ["reconnectDelayHandler", "authenticator"].forEach((n) => {
        if (options[n] && typeof options[n] !== "function") {
          throw TypeError(`'${n}' must be a function`);
        }
      });
      if (!options.reconnectDelayHandler) {
        options.reconnectDelayHandler = () => {
          let extra = options.tls ? options.reconnectJitterTLS : options.reconnectJitter;
          if (extra) {
            extra++;
            extra = Math.floor(Math.random() * extra);
          }
          return options.reconnectTimeWait + extra;
        };
      }
      if (options.inboxPrefix) {
        (0, core_1.createInbox)(options.inboxPrefix);
      }
      if (options.resolve === void 0) {
        options.resolve = typeof (0, transport_1.getResolveFn)() === "function";
      }
      if (options.resolve) {
        if (typeof (0, transport_1.getResolveFn)() !== "function") {
          throw errors_1.InvalidArgumentError.format("resolve", "is not supported in the current runtime");
        }
      }
      return options;
    }
    function checkOptions(info, options) {
      const { proto, tls_required: tlsRequired, tls_available: tlsAvailable } = info;
      if ((proto === void 0 || proto < 1) && options.noEcho) {
        throw new errors_1.errors.ConnectionError(`server does not support 'noEcho'`);
      }
      const tls = tlsRequired || tlsAvailable || false;
      if (options.tls && !tls) {
        throw new errors_1.errors.ConnectionError(`server does not support 'tls'`);
      }
    }
    function checkUnsupportedOption(prop, v) {
      if (v) {
        throw errors_1.InvalidArgumentError.format(prop, "is not supported");
      }
    }
  }
});

// node_modules/@nats-io/nats-core/lib/protocol.js
var require_protocol = __commonJS({
  "node_modules/@nats-io/nats-core/lib/protocol.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ProtocolHandler = exports.Subscriptions = exports.SubscriptionImpl = exports.Connect = exports.INFO = void 0;
    var encoders_1 = require_encoders();
    var transport_1 = require_transport();
    var util_1 = require_util2();
    var databuffer_1 = require_databuffer();
    var servers_1 = require_servers();
    var queued_iterator_1 = require_queued_iterator();
    var muxsubscription_1 = require_muxsubscription();
    var heartbeats_1 = require_heartbeats();
    var parser_1 = require_parser();
    var msg_1 = require_msg();
    var semver_1 = require_semver();
    var options_1 = require_options();
    var errors_1 = require_errors();
    var FLUSH_THRESHOLD = 1024 * 32;
    exports.INFO = /^INFO\s+([^\r\n]+)\r\n/i;
    var PONG_CMD = (0, encoders_1.encode)("PONG\r\n");
    var PING_CMD = (0, encoders_1.encode)("PING\r\n");
    var ERR_RECONNECT_HANDLER_FAILED = "client option reconnectToServer handler failed";
    var ERR_RECONNECT_HANDLER_NOT_IN_POOL = "returned server is not in the pool";
    function isDelayedServer(x) {
      return x !== null && typeof x === "object" && "server" in x && "delay" in x;
    }
    var Connect = class {
      echo;
      no_responders;
      protocol;
      verbose;
      pedantic;
      jwt;
      nkey;
      sig;
      user;
      pass;
      auth_token;
      tls_required;
      name;
      lang;
      version;
      headers;
      constructor(transport, opts, nonce) {
        this.protocol = 1;
        this.version = transport.version;
        this.lang = transport.lang;
        this.echo = opts.noEcho ? false : void 0;
        this.verbose = opts.verbose;
        this.pedantic = opts.pedantic;
        this.tls_required = opts.tls ? true : void 0;
        this.name = opts.name;
        const creds = (opts && typeof opts.authenticator === "function" ? opts.authenticator(nonce) : {}) || {};
        (0, util_1.extend)(this, creds);
      }
    };
    exports.Connect = Connect;
    var SlowNotifier = class {
      slow;
      cb;
      notified;
      constructor(slow, cb) {
        this.slow = slow;
        this.cb = cb;
        this.notified = false;
      }
      maybeNotify(pending) {
        if (pending <= this.slow) {
          this.notified = false;
        } else {
          if (!this.notified) {
            this.cb(pending);
            this.notified = true;
          }
        }
      }
    };
    var SubscriptionImpl = class extends queued_iterator_1.QueuedIteratorImpl {
      sid;
      queue;
      draining;
      max;
      subject;
      drained;
      protocol;
      timer;
      info;
      cleanupFn;
      closed;
      requestSubject;
      slow;
      constructor(protocol, subject, opts = {}) {
        super();
        (0, util_1.extend)(this, opts);
        this.protocol = protocol;
        this.subject = subject;
        this.draining = false;
        this.noIterator = typeof opts.callback === "function";
        this.closed = (0, util_1.deferred)();
        const asyncTraces = !(protocol.options?.noAsyncTraces || false);
        if (opts.timeout) {
          this.timer = (0, util_1.timeout)(opts.timeout, asyncTraces);
          this.timer.then(() => {
            this.timer = void 0;
          }).catch((err2) => {
            this.stop(err2);
            if (this.noIterator) {
              this.callback(err2, {});
            }
          });
        }
        if (!this.noIterator) {
          this.iterClosed.then((err2) => {
            this.closed.resolve(err2);
            this.unsubscribe();
          });
        }
      }
      setSlowNotificationFn(slow, fn) {
        this.slow = void 0;
        if (fn) {
          if (this.noIterator) {
            throw new Error("callbacks don't support slow notifications");
          }
          this.slow = new SlowNotifier(slow, fn);
        }
      }
      callback(err2, msg) {
        this.cancelTimeout();
        err2 ? this.stop(err2) : this.push(msg);
        if (!err2 && this.slow) {
          this.slow.maybeNotify(this.getPending());
        }
      }
      close(err2) {
        if (!this.isClosed()) {
          this.cancelTimeout();
          const fn = () => {
            this.stop();
            if (this.cleanupFn) {
              try {
                this.cleanupFn(this, this.info);
              } catch (_err) {
              }
            }
            this.closed.resolve(err2);
          };
          if (this.noIterator) {
            fn();
          } else {
            this.push(fn);
          }
        }
      }
      unsubscribe(max) {
        this.protocol.unsubscribe(this, max);
      }
      cancelTimeout() {
        if (this.timer) {
          this.timer.cancel();
          this.timer = void 0;
        }
      }
      drain() {
        if (this.protocol.isClosed()) {
          return Promise.reject(new errors_1.errors.ClosedConnectionError());
        }
        if (this.isClosed()) {
          return Promise.reject(new errors_1.errors.InvalidOperationError("subscription is already closed"));
        }
        if (!this.drained) {
          this.draining = true;
          this.protocol.unsub(this);
          this.drained = this.protocol.flush((0, util_1.deferred)()).then(() => {
            this.protocol.subscriptions.cancel(this);
          }).catch(() => {
            this.protocol.subscriptions.cancel(this);
          });
        }
        return this.drained;
      }
      async [Symbol.asyncDispose]() {
        if (this.protocol.isClosed() || this.isClosed()) {
          return;
        }
        if (this.drained) {
          await this.drained;
          return;
        }
        await this.drain();
      }
      isDraining() {
        return this.draining;
      }
      isClosed() {
        return this.done;
      }
      getSubject() {
        return this.subject;
      }
      getMax() {
        return this.max;
      }
      getID() {
        return this.sid;
      }
    };
    exports.SubscriptionImpl = SubscriptionImpl;
    var Subscriptions = class {
      mux;
      subs;
      sidCounter;
      constructor() {
        this.sidCounter = 0;
        this.mux = null;
        this.subs = /* @__PURE__ */ new Map();
      }
      size() {
        return this.subs.size;
      }
      add(s) {
        this.sidCounter++;
        s.sid = this.sidCounter;
        this.subs.set(s.sid, s);
        return s;
      }
      setMux(s) {
        this.mux = s;
        return s;
      }
      getMux() {
        return this.mux;
      }
      get(sid) {
        return this.subs.get(sid);
      }
      resub(s) {
        this.sidCounter++;
        this.subs.delete(s.sid);
        s.sid = this.sidCounter;
        this.subs.set(s.sid, s);
        return s;
      }
      all() {
        return Array.from(this.subs.values());
      }
      cancel(s) {
        if (s) {
          s.close();
          this.subs.delete(s.sid);
        }
      }
      handleError(err2) {
        const subs = this.all();
        let sub;
        if (err2.operation === "subscription") {
          sub = subs.find((s) => {
            return s.subject === err2.subject && s.queue === err2.queue;
          });
        } else if (err2.operation === "publish") {
          sub = subs.find((s) => {
            return s.requestSubject === err2.subject;
          });
        }
        if (sub) {
          sub.callback(err2, {});
          sub.close(err2);
          this.subs.delete(sub.sid);
          return sub !== this.mux;
        }
        return false;
      }
      close() {
        this.subs.forEach((sub) => {
          sub.close();
        });
      }
    };
    exports.Subscriptions = Subscriptions;
    var ProtocolHandler = class _ProtocolHandler {
      connected;
      connectedOnce;
      infoReceived;
      info;
      muxSubscriptions;
      options;
      outbound;
      pongs;
      subscriptions;
      transport;
      noMorePublishing;
      connectError;
      publisher;
      _closed;
      closed;
      listeners;
      heartbeats;
      parser;
      outMsgs;
      inMsgs;
      outBytes;
      inBytes;
      pendingLimit;
      lastError;
      abortReconnect;
      whyClosed;
      servers;
      server;
      features;
      connectPromise;
      dialDelay;
      raceTimer;
      constructor(options, publisher) {
        this._closed = false;
        this.connected = false;
        this.connectedOnce = false;
        this.infoReceived = false;
        this.noMorePublishing = false;
        this.abortReconnect = false;
        this.listeners = [];
        this.pendingLimit = FLUSH_THRESHOLD;
        this.outMsgs = 0;
        this.inMsgs = 0;
        this.outBytes = 0;
        this.inBytes = 0;
        this.options = options;
        this.publisher = publisher;
        this.subscriptions = new Subscriptions();
        this.muxSubscriptions = new muxsubscription_1.MuxSubscription();
        this.outbound = new databuffer_1.DataBuffer();
        this.pongs = [];
        this.whyClosed = "";
        this.pendingLimit = options.pendingLimit || this.pendingLimit;
        this.features = new semver_1.Features({ major: 0, minor: 0, micro: 0 });
        this.connectPromise = null;
        this.dialDelay = null;
        const servers = typeof options.servers === "string" ? [options.servers] : options.servers;
        this.servers = new servers_1.Servers({
          randomize: !options.noRandomize
        });
        this.servers.setServers(servers);
        this.closed = (0, util_1.deferred)();
        this.parser = new parser_1.Parser(this);
        this.heartbeats = new heartbeats_1.Heartbeat(this, this.options.pingInterval || options_1.DEFAULT_PING_INTERVAL, this.options.maxPingOut || options_1.DEFAULT_MAX_PING_OUT);
      }
      resetOutbound() {
        this.outbound.reset();
        const pongs = this.pongs;
        this.pongs = [];
        const err2 = new errors_1.errors.RequestError("connection disconnected");
        err2.stack = "";
        pongs.forEach((p) => {
          p.reject(err2);
        });
        this.parser = new parser_1.Parser(this);
        this.infoReceived = false;
      }
      dispatchStatus(status) {
        this.listeners.forEach((q) => {
          q.push(status);
        });
      }
      prepare() {
        if (this.transport) {
          this.transport.discard();
        }
        this.info = void 0;
        this.resetOutbound();
        const pong = (0, util_1.deferred)();
        pong.catch(() => {
        });
        this.pongs.unshift(pong);
        this.connectError = (err2) => {
          pong.reject(err2);
        };
        this.transport = (0, transport_1.newTransport)();
        this.transport.closed().then(async (_err) => {
          this.connected = false;
          if (!this.isClosed()) {
            await this.disconnected(this.transport.closeError || this.lastError);
            return;
          }
        });
        return pong;
      }
      disconnect() {
        this.dispatchStatus({ type: "staleConnection" });
        this.transport.disconnect();
      }
      reconnect() {
        if (this.connected) {
          this.dispatchStatus({
            type: "forceReconnect"
          });
          this.transport.disconnect();
        }
        return Promise.resolve();
      }
      async disconnected(err2) {
        this.dispatchStatus({
          type: "disconnect",
          server: this.servers.getCurrentServer().toString()
        });
        if (this.options.reconnect) {
          await this.dialLoop().then(() => {
            this.dispatchStatus({
              type: "reconnect",
              server: this.servers.getCurrentServer().toString()
            });
            if (this.lastError instanceof errors_1.errors.UserAuthenticationExpiredError) {
              this.lastError = void 0;
            }
          }).catch((err3) => {
            this.close(err3).catch();
          });
        } else {
          await this.close(err2).catch();
        }
      }
      async dial(srv) {
        const pong = this.prepare();
        try {
          this.raceTimer = (0, util_1.timeout)(this.options.timeout || 2e4);
          const cp = this.transport.connect(srv, this.options);
          await Promise.race([cp, this.raceTimer]);
          (async () => {
            try {
              for await (const b of this.transport) {
                this.parser.parse(b);
              }
            } catch (err2) {
              console.log("reader closed", err2);
            }
          })().then();
        } catch (err2) {
          pong.reject(err2);
        }
        try {
          await Promise.race([this.raceTimer, pong]);
          this.raceTimer?.cancel();
          this.connected = true;
          this.connectError = void 0;
          this.sendSubscriptions();
          this.connectedOnce = true;
          this.server.didConnect = true;
          this.server.reconnects = 0;
          this.flushPending();
          this.heartbeats.start();
        } catch (err2) {
          this.raceTimer?.cancel();
          await this.transport.close(err2);
          throw err2;
        }
      }
      async _doDial(srv) {
        const { resolve } = this.options;
        const alts = await srv.resolve({
          fn: (0, transport_1.getResolveFn)(),
          debug: this.options.debug,
          randomize: !this.options.noRandomize,
          resolve
        });
        let lastErr = null;
        for (const a of alts) {
          try {
            lastErr = null;
            this.dispatchStatus({ type: "reconnecting" });
            await this.dial(a);
            return;
          } catch (err2) {
            lastErr = err2;
          }
        }
        throw lastErr;
      }
      dialLoop() {
        if (this.connectPromise === null) {
          this.connectPromise = this.dodialLoop();
          this.connectPromise.then(() => {
          }).catch(() => {
          }).finally(() => {
            this.connectPromise = null;
          });
        }
        return this.connectPromise;
      }
      async dodialLoop() {
        let lastError;
        while (true) {
          if (this._closed) {
            this.servers.clear();
          }
          const wait = this.options.reconnectDelayHandler ? this.options.reconnectDelayHandler() : options_1.DEFAULT_RECONNECT_TIME_WAIT;
          let maxWait = wait;
          const srv = this.selectServer();
          if (!srv || this.abortReconnect) {
            if (lastError) {
              throw lastError;
            } else if (this.lastError) {
              throw this.lastError;
            } else {
              throw new errors_1.errors.ConnectionError("connection refused");
            }
          }
          const now = Date.now();
          if (srv.lastConnect === 0 || srv.lastConnect + wait <= now) {
            let target = srv;
            let extraDelay = 0;
            if (this.options.reconnectToServer) {
              try {
                const snap = this.servers.snapshotForHandler();
                const r = this.options.reconnectToServer(snap, this.info ?? null);
                let picked;
                if (isDelayedServer(r)) {
                  picked = r.server;
                  extraDelay = Number.isFinite(r.delay) && r.delay > 0 ? Math.floor(r.delay) : 0;
                } else {
                  picked = r;
                }
                if (picked !== null) {
                  const found = this.servers.find(picked);
                  if (!found) {
                    throw new Error(ERR_RECONNECT_HANDLER_NOT_IN_POOL);
                  }
                  if (found !== srv) {
                    target = found;
                    this.servers.setCurrent(target);
                    this.server = target;
                  }
                }
              } catch (cause) {
                const c = cause instanceof Error ? cause : new Error(String(cause));
                throw new errors_1.errors.ConnectionError(`${ERR_RECONNECT_HANDLER_FAILED}: ${c.message}`, { cause: c });
              }
            }
            if (extraDelay > 0) {
              this.dialDelay = (0, util_1.delay)(extraDelay);
              await this.dialDelay;
            }
            target.lastConnect = Date.now();
            try {
              await this._doDial(target);
              break;
            } catch (err2) {
              lastError = err2;
              if (!this.connectedOnce) {
                if (this.options.waitOnFirstConnect) {
                  continue;
                }
                this.servers.removeCurrentServer();
              }
              target.reconnects++;
              const mra = this.options.maxReconnectAttempts || 0;
              if (mra !== -1 && target.reconnects >= mra) {
                this.servers.removeCurrentServer();
              }
            }
          } else {
            maxWait = Math.min(maxWait, srv.lastConnect + wait - now);
            this.dialDelay = (0, util_1.delay)(maxWait);
            await this.dialDelay;
          }
        }
      }
      static async connect(options, publisher) {
        const h2 = new _ProtocolHandler(options, publisher);
        await h2.dialLoop();
        return h2;
      }
      static toError(s) {
        let err2 = errors_1.errors.PermissionViolationError.parse(s);
        if (err2) {
          return err2;
        }
        err2 = errors_1.errors.UserAuthenticationExpiredError.parse(s);
        if (err2) {
          return err2;
        }
        err2 = errors_1.errors.AuthorizationError.parse(s);
        if (err2) {
          return err2;
        }
        return new errors_1.errors.ProtocolError(s);
      }
      processMsg(msg, data) {
        this.inMsgs++;
        this.inBytes += data.length;
        if (!this.subscriptions.sidCounter) {
          return;
        }
        const sub = this.subscriptions.get(msg.sid);
        if (!sub) {
          return;
        }
        sub.received += 1;
        if (sub.callback) {
          sub.callback(null, new msg_1.MsgImpl(msg, data, this));
        }
        if (sub.max !== void 0 && sub.received >= sub.max) {
          sub.unsubscribe();
        }
      }
      processError(m) {
        let s = (0, encoders_1.decode)(m);
        if (s.startsWith("'") && s.endsWith("'")) {
          s = s.slice(1, s.length - 1);
        }
        const err2 = _ProtocolHandler.toError(s);
        switch (err2.constructor) {
          case errors_1.errors.PermissionViolationError: {
            const pe = err2;
            const mux = this.subscriptions.getMux();
            const isMuxPermission = mux ? pe.subject === mux.subject : false;
            this.subscriptions.handleError(pe);
            this.muxSubscriptions.handleError(isMuxPermission, pe);
            if (isMuxPermission) {
              this.subscriptions.setMux(null);
            }
          }
        }
        this.dispatchStatus({ type: "error", error: err2 });
        this.handleError(err2);
      }
      handleError(err2) {
        if (err2 instanceof errors_1.errors.UserAuthenticationExpiredError || err2 instanceof errors_1.errors.AuthorizationError) {
          this.handleAuthError(err2);
        }
        if (!(err2 instanceof errors_1.errors.PermissionViolationError)) {
          this.lastError = err2;
        }
      }
      handleAuthError(err2) {
        if ((this.lastError instanceof errors_1.errors.UserAuthenticationExpiredError || this.lastError instanceof errors_1.errors.AuthorizationError) && this.options.ignoreAuthErrorAbort === false) {
          this.abortReconnect = true;
        }
        if (this.connectError) {
          this.connectError(err2);
        } else {
          this.disconnect();
        }
      }
      processPing() {
        this.transport.send(PONG_CMD);
      }
      processPong() {
        const cb = this.pongs.shift();
        if (cb) {
          cb.resolve();
        }
      }
      processInfo(m) {
        const info = JSON.parse((0, encoders_1.decode)(m));
        this.info = info;
        const updates = this.options && this.options.ignoreClusterUpdates ? void 0 : this.servers.update(info, this.transport.isEncrypted());
        if (!this.infoReceived) {
          this.features.update((0, semver_1.parseSemVer)(info.version));
          this.infoReceived = true;
          if (this.transport.isEncrypted()) {
            this.servers.updateTLSName();
          }
          const { version, lang } = this.transport;
          try {
            const c = new Connect({ version, lang }, this.options, info.nonce);
            if (info.headers) {
              c.headers = true;
              c.no_responders = true;
            }
            const cs = JSON.stringify(c);
            this.transport.send((0, encoders_1.encode)(`CONNECT ${cs}${transport_1.CR_LF}`));
            this.transport.send(PING_CMD);
          } catch (err2) {
            this.close(err2).catch();
          }
        }
        if (updates) {
          const { added, deleted } = updates;
          this.dispatchStatus({ type: "update", added, deleted });
        }
        const ldm = info.ldm !== void 0 ? info.ldm : false;
        if (ldm) {
          this.dispatchStatus({
            type: "ldm",
            server: this.servers.getCurrentServer().toString()
          });
        }
      }
      push(e) {
        switch (e.kind) {
          case parser_1.Kind.MSG: {
            const { msg, data } = e;
            this.processMsg(msg, data);
            break;
          }
          case parser_1.Kind.OK:
            break;
          case parser_1.Kind.ERR:
            this.processError(e.data);
            break;
          case parser_1.Kind.PING:
            this.processPing();
            break;
          case parser_1.Kind.PONG:
            this.processPong();
            break;
          case parser_1.Kind.INFO:
            this.processInfo(e.data);
            break;
        }
      }
      sendCommand(cmd, ...payloads) {
        const len = this.outbound.length();
        let buf;
        if (typeof cmd === "string") {
          buf = (0, encoders_1.encode)(cmd);
        } else {
          buf = cmd;
        }
        this.outbound.fill(buf, ...payloads);
        if (len === 0) {
          queueMicrotask(() => {
            this.flushPending();
          });
        } else if (this.outbound.size() >= this.pendingLimit) {
          this.flushPending();
        }
      }
      publish(subject, payload = encoders_1.Empty, options) {
        let data;
        if (payload instanceof Uint8Array) {
          data = payload;
        } else if (typeof payload === "string") {
          data = encoders_1.TE.encode(payload);
        } else {
          throw new TypeError("payload types can be strings or Uint8Array");
        }
        let len = data.length;
        options = options || {};
        options.reply = options.reply || "";
        let headers = encoders_1.Empty;
        let hlen = 0;
        if (options.headers) {
          if (this.info && !this.info.headers) {
            errors_1.InvalidArgumentError.format("headers", "are not available on this server");
          }
          const hdrs = options.headers;
          headers = hdrs.encode();
          hlen = headers.length;
          len = data.length + hlen;
        }
        if (this.info && len > this.info.max_payload) {
          throw errors_1.InvalidArgumentError.format("payload", "max_payload size exceeded");
        }
        this.outBytes += len;
        this.outMsgs++;
        let proto;
        if (options.headers) {
          if (options.reply) {
            proto = `HPUB ${subject} ${options.reply} ${hlen} ${len}\r
`;
          } else {
            proto = `HPUB ${subject} ${hlen} ${len}\r
`;
          }
          this.sendCommand(proto, headers, data, transport_1.CRLF);
        } else {
          if (options.reply) {
            proto = `PUB ${subject} ${options.reply} ${len}\r
`;
          } else {
            proto = `PUB ${subject} ${len}\r
`;
          }
          this.sendCommand(proto, data, transport_1.CRLF);
        }
      }
      request(r) {
        this.initMux();
        this.muxSubscriptions.add(r);
        return r;
      }
      subscribe(s) {
        this.subscriptions.add(s);
        this._subunsub(s);
        return s;
      }
      _sub(s) {
        if (s.queue) {
          this.sendCommand(`SUB ${s.subject} ${s.queue} ${s.sid}\r
`);
        } else {
          this.sendCommand(`SUB ${s.subject} ${s.sid}\r
`);
        }
      }
      _subunsub(s) {
        this._sub(s);
        if (s.max) {
          this.unsubscribe(s, s.max);
        }
        return s;
      }
      unsubscribe(s, max) {
        this.unsub(s, max);
        if (s.max === void 0 || s.received >= s.max) {
          this.subscriptions.cancel(s);
        }
      }
      unsub(s, max) {
        if (!s || this.isClosed()) {
          return;
        }
        if (max) {
          this.sendCommand(`UNSUB ${s.sid} ${max}\r
`);
        } else {
          this.sendCommand(`UNSUB ${s.sid}\r
`);
        }
        s.max = max;
      }
      resub(s, subject) {
        if (!s || this.isClosed()) {
          return;
        }
        this.unsub(s);
        s.subject = subject;
        this.subscriptions.resub(s);
        this._sub(s);
      }
      flush(p) {
        if (!p) {
          p = (0, util_1.deferred)();
        }
        this.pongs.push(p);
        this.outbound.fill(PING_CMD);
        this.flushPending();
        return p;
      }
      sendSubscriptions() {
        const cmds = [];
        this.subscriptions.all().forEach((s) => {
          const sub = s;
          if (sub.queue) {
            cmds.push(`SUB ${sub.subject} ${sub.queue} ${sub.sid}${transport_1.CR_LF}`);
          } else {
            cmds.push(`SUB ${sub.subject} ${sub.sid}${transport_1.CR_LF}`);
          }
        });
        if (cmds.length) {
          this.transport.send((0, encoders_1.encode)(cmds.join("")));
        }
      }
      async close(err2) {
        if (this._closed) {
          return;
        }
        this.whyClosed = new Error("close trace").stack || "";
        this.heartbeats.cancel();
        if (this.connectError) {
          this.connectError(err2);
          this.connectError = void 0;
        }
        this.muxSubscriptions.close();
        this.subscriptions.close();
        const proms = [];
        for (let i = 0; i < this.listeners.length; i++) {
          const qi = this.listeners[i];
          if (qi) {
            qi.push({ type: "close" });
            qi.stop();
            proms.push(qi.iterClosed);
          }
        }
        if (proms.length) {
          await Promise.all(proms);
        }
        this._closed = true;
        await this.transport.close(err2);
        this.raceTimer?.cancel();
        this.dialDelay?.cancel();
        this.closed.resolve(err2);
      }
      isClosed() {
        return this._closed;
      }
      async drain() {
        const subs = this.subscriptions.all();
        const promises = [];
        subs.forEach((sub) => {
          promises.push(sub.drain());
        });
        try {
          await Promise.allSettled(promises);
        } catch {
        } finally {
          this.noMorePublishing = true;
          await this.flush();
        }
        return this.close();
      }
      flushPending() {
        if (!this.infoReceived || !this.connected) {
          return;
        }
        if (this.outbound.size()) {
          const d = this.outbound.drain();
          this.transport.send(d);
        }
      }
      initMux() {
        const mux = this.subscriptions.getMux();
        if (!mux) {
          const inbox = this.muxSubscriptions.init(this.options.inboxPrefix);
          const sub = new SubscriptionImpl(this, `${inbox}*`);
          sub.callback = this.muxSubscriptions.dispatcher();
          this.subscriptions.setMux(sub);
          this.subscribe(sub);
        }
      }
      selectServer() {
        const server = this.servers.selectServer();
        if (server === void 0) {
          return void 0;
        }
        this.server = server;
        return this.server;
      }
      getServer() {
        return this.server;
      }
    };
    exports.ProtocolHandler = ProtocolHandler;
  }
});

// node_modules/@nats-io/nats-core/lib/request.js
var require_request = __commonJS({
  "node_modules/@nats-io/nats-core/lib/request.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RequestOne = exports.RequestMany = exports.BaseRequest = void 0;
    var util_1 = require_util2();
    var errors_1 = require_errors();
    var BaseRequest = class {
      token;
      received;
      ctx;
      requestSubject;
      mux;
      constructor(mux, requestSubject, asyncTraces = true) {
        this.mux = mux;
        this.requestSubject = requestSubject;
        this.received = 0;
        this.token = (0, util_1.randomToken)();
        if (asyncTraces) {
          this.ctx = new errors_1.RequestError();
        }
      }
    };
    exports.BaseRequest = BaseRequest;
    var RequestMany = class extends BaseRequest {
      callback;
      done;
      timer;
      max;
      opts;
      constructor(mux, requestSubject, opts = { maxWait: 1e3 }) {
        super(mux, requestSubject);
        this.opts = opts;
        if (typeof this.opts.callback !== "function") {
          throw new TypeError("callback must be a function");
        }
        this.callback = this.opts.callback;
        this.max = typeof opts.maxMessages === "number" && opts.maxMessages > 0 ? opts.maxMessages : -1;
        this.done = (0, util_1.deferred)();
        this.done.then(() => {
          this.callback(null, null);
        });
        this.timer = setTimeout(() => {
          this.cancel();
        }, opts.maxWait);
      }
      cancel(err2) {
        if (err2) {
          this.callback(err2, null);
        }
        clearTimeout(this.timer);
        this.mux.cancel(this);
        this.done.resolve();
      }
      resolver(err2, msg) {
        if (err2) {
          if (this.ctx) {
            err2.stack += `

${this.ctx.stack}`;
          }
          this.cancel(err2);
        } else {
          this.callback(null, msg);
          if (this.opts.strategy === "count") {
            this.max--;
            if (this.max === 0) {
              this.cancel();
            }
          }
          if (this.opts.strategy === "stall") {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
              this.cancel();
            }, this.opts.stall || 300);
          }
          if (this.opts.strategy === "sentinel") {
            if (msg && msg.data.length === 0) {
              this.cancel();
            }
          }
        }
      }
    };
    exports.RequestMany = RequestMany;
    var RequestOne = class extends BaseRequest {
      deferred;
      timer;
      constructor(mux, requestSubject, opts = { timeout: 1e3 }, asyncTraces = true) {
        super(mux, requestSubject, asyncTraces);
        this.deferred = (0, util_1.deferred)();
        this.timer = (0, util_1.timeout)(opts.timeout, asyncTraces);
      }
      resolver(err2, msg) {
        if (this.timer) {
          this.timer.cancel();
        }
        if (err2) {
          if (!(err2 instanceof errors_1.TimeoutError)) {
            if (this.ctx) {
              this.ctx.message = err2.message;
              this.ctx.cause = err2;
              err2 = this.ctx;
            } else {
              err2 = new errors_1.errors.RequestError(err2.message, { cause: err2 });
            }
          }
          this.deferred.reject(err2);
        } else {
          this.deferred.resolve(msg);
        }
        this.cancel();
      }
      cancel(err2) {
        if (this.timer) {
          this.timer.cancel();
        }
        this.mux.cancel(this);
        this.deferred.reject(err2 ? err2 : new errors_1.RequestError("cancelled"));
      }
    };
    exports.RequestOne = RequestOne;
  }
});

// node_modules/@nats-io/nats-core/lib/nats.js
var require_nats = __commonJS({
  "node_modules/@nats-io/nats-core/lib/nats.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NatsConnectionImpl = void 0;
    var util_1 = require_util2();
    var protocol_1 = require_protocol();
    var encoders_1 = require_encoders();
    var headers_1 = require_headers();
    var semver_1 = require_semver();
    var options_1 = require_options();
    var queued_iterator_1 = require_queued_iterator();
    var request_1 = require_request();
    var core_1 = require_core();
    var errors_1 = require_errors();
    var whitespaceRegex = /[ \n\r\t]/;
    var NatsConnectionImpl = class _NatsConnectionImpl {
      options;
      protocol;
      draining;
      closeListeners;
      constructor(opts) {
        this.draining = false;
        this.options = (0, options_1.parseOptions)(opts);
      }
      static connect(opts = {}) {
        return new Promise((resolve, reject) => {
          const nc = new _NatsConnectionImpl(opts);
          protocol_1.ProtocolHandler.connect(nc.options, nc).then((ph) => {
            nc.protocol = ph;
            resolve(nc);
          }).catch((err2) => {
            reject(err2);
          });
        });
      }
      closed() {
        return this.protocol.closed;
      }
      async close() {
        await this.protocol.close();
      }
      _check(subject, sub, pub) {
        if (this.isClosed()) {
          throw new errors_1.errors.ClosedConnectionError();
        }
        if (sub && this.isDraining()) {
          throw new errors_1.errors.DrainingConnectionError();
        }
        if (pub && this.protocol.noMorePublishing) {
          throw new errors_1.errors.DrainingConnectionError();
        }
        subject = subject || "";
        if (subject.length === 0 || whitespaceRegex.test(subject)) {
          throw new errors_1.errors.InvalidSubjectError(subject);
        }
      }
      publish(subject, data, options) {
        this._check(subject, false, true);
        if (options?.reply) {
          this._check(options.reply, false, true);
        }
        if (typeof options?.traceOnly === "boolean") {
          const hdrs = options.headers || (0, headers_1.headers)();
          hdrs.set("Nats-Trace-Only", "true");
          options.headers = hdrs;
        }
        if (typeof options?.traceDestination === "string") {
          const hdrs = options.headers || (0, headers_1.headers)();
          hdrs.set("Nats-Trace-Dest", options.traceDestination);
          options.headers = hdrs;
        }
        this.protocol.publish(subject, data, options);
      }
      publishMessage(msg) {
        return this.publish(msg.subject, msg.data, {
          reply: msg.reply,
          headers: msg.headers
        });
      }
      respondMessage(msg) {
        if (msg.reply) {
          this.publish(msg.reply, msg.data, {
            reply: msg.reply,
            headers: msg.headers
          });
          return true;
        }
        return false;
      }
      subscribe(subject, opts = {}) {
        this._check(subject, true, false);
        const sub = new protocol_1.SubscriptionImpl(this.protocol, subject, opts);
        if (typeof opts.callback !== "function" && typeof opts.slow === "number") {
          sub.setSlowNotificationFn(opts.slow, (pending) => {
            this.protocol.dispatchStatus({
              type: "slowConsumer",
              sub,
              pending
            });
          });
        }
        this.protocol.subscribe(sub);
        return sub;
      }
      _resub(s, subject, max) {
        this._check(subject, true, false);
        const si = s;
        si.max = max;
        if (max) {
          si.max = max + si.received;
        }
        this.protocol.resub(si, subject);
      }
      // possibilities are:
      // stop on error or any non-100 status
      // AND:
      // - wait for timer
      // - wait for n messages or timer
      // - wait for unknown messages, done when empty or reset timer expires (with possible alt wait)
      // - wait for unknown messages, done when an empty payload is received or timer expires (with possible alt wait)
      requestMany(subject, data = encoders_1.Empty, opts = { maxWait: 1e3, maxMessages: -1 }) {
        const asyncTraces = !(this.protocol.options.noAsyncTraces || false);
        try {
          this._check(subject, true, true);
        } catch (err2) {
          return Promise.reject(err2);
        }
        opts.strategy = opts.strategy || "timer";
        opts.maxWait = opts.maxWait || 1e3;
        if (opts.maxWait < 1) {
          return Promise.reject(errors_1.InvalidArgumentError.format("timeout", "must be greater than 0"));
        }
        const qi = new queued_iterator_1.QueuedIteratorImpl();
        function stop(err2) {
          qi.push(() => {
            qi.stop(err2);
          });
        }
        function callback(err2, msg) {
          if (err2 || msg === null) {
            stop(err2 === null ? void 0 : err2);
          } else {
            qi.push(msg);
          }
        }
        if (opts.noMux) {
          const stack = asyncTraces ? new Error().stack : null;
          let max = typeof opts.maxMessages === "number" && opts.maxMessages > 0 ? opts.maxMessages : -1;
          const sub = this.subscribe((0, core_1.createInbox)(this.options.inboxPrefix), {
            callback: (err2, msg) => {
              if (msg?.data?.length === 0 && msg?.headers?.status === "503") {
                err2 = new errors_1.errors.NoRespondersError(subject);
              }
              if (err2) {
                if (stack) {
                  err2.stack += `

${stack}`;
                }
                cancel(err2);
                return;
              }
              callback(null, msg);
              if (opts.strategy === "count") {
                max--;
                if (max === 0) {
                  cancel();
                }
              }
              if (opts.strategy === "stall") {
                clearTimers();
                timer = setTimeout(() => {
                  cancel();
                }, 300);
              }
              if (opts.strategy === "sentinel") {
                if (msg && msg.data.length === 0) {
                  cancel();
                }
              }
            }
          });
          sub.requestSubject = subject;
          sub.closed.then(() => {
            stop();
          }).catch((err2) => {
            qi.stop(err2);
          });
          const cancel = (err2) => {
            if (err2) {
              qi.push(() => {
                throw err2;
              });
            }
            clearTimers();
            sub.drain().then(() => {
              stop();
            }).catch((_err) => {
              stop();
            });
          };
          qi.iterClosed.then(() => {
            clearTimers();
            sub?.unsubscribe();
          }).catch((_err) => {
            clearTimers();
            sub?.unsubscribe();
          });
          const { headers, traceDestination, traceOnly } = opts;
          try {
            this.publish(subject, data, {
              reply: sub.getSubject(),
              headers,
              traceDestination,
              traceOnly
            });
          } catch (err2) {
            cancel(err2);
          }
          let timer = setTimeout(() => {
            cancel();
          }, opts.maxWait);
          const clearTimers = () => {
            if (timer) {
              clearTimeout(timer);
            }
          };
        } else {
          const rmo = opts;
          rmo.callback = callback;
          qi.iterClosed.then(() => {
            r.cancel();
          }).catch((err2) => {
            r.cancel(err2);
          });
          const r = new request_1.RequestMany(this.protocol.muxSubscriptions, subject, rmo);
          this.protocol.request(r);
          const { headers, traceDestination, traceOnly } = opts;
          try {
            this.publish(subject, data, {
              reply: `${this.protocol.muxSubscriptions.baseInbox}${r.token}`,
              headers,
              traceDestination,
              traceOnly
            });
          } catch (err2) {
            r.cancel(err2);
          }
        }
        return Promise.resolve(qi);
      }
      request(subject, data, opts = { timeout: 1e3, noMux: false }) {
        try {
          this._check(subject, true, true);
        } catch (err2) {
          return Promise.reject(err2);
        }
        const asyncTraces = !(this.protocol.options.noAsyncTraces || false);
        opts.timeout = opts.timeout || 1e3;
        if (opts.timeout < 1) {
          return Promise.reject(errors_1.InvalidArgumentError.format("timeout", `must be greater than 0`));
        }
        if (!opts.noMux && opts.reply) {
          return Promise.reject(errors_1.InvalidArgumentError.format(["reply", "noMux"], "are mutually exclusive"));
        }
        if (opts.noMux) {
          const inbox = opts.reply ? opts.reply : (0, core_1.createInbox)(this.options.inboxPrefix);
          const d = (0, util_1.deferred)();
          const errCtx = asyncTraces ? new errors_1.errors.RequestError("") : null;
          const sub = this.subscribe(inbox, {
            max: 1,
            timeout: opts.timeout,
            callback: (err2, msg) => {
              if (msg && msg.data?.length === 0 && msg.headers?.code === 503) {
                err2 = new errors_1.errors.NoRespondersError(subject);
              }
              if (err2) {
                if (!(err2 instanceof errors_1.TimeoutError)) {
                  if (errCtx) {
                    errCtx.message = err2.message;
                    errCtx.cause = err2;
                    err2 = errCtx;
                  } else {
                    err2 = new errors_1.errors.RequestError(err2.message, { cause: err2 });
                  }
                }
                d.reject(err2);
                sub.unsubscribe();
              } else {
                d.resolve(msg);
              }
            }
          });
          sub.requestSubject = subject;
          this.protocol.publish(subject, data, {
            reply: inbox,
            headers: opts.headers
          });
          return d;
        } else {
          const r = new request_1.RequestOne(this.protocol.muxSubscriptions, subject, opts, asyncTraces);
          this.protocol.request(r);
          const { headers, traceDestination, traceOnly } = opts;
          try {
            this.publish(subject, data, {
              reply: `${this.protocol.muxSubscriptions.baseInbox}${r.token}`,
              headers,
              traceDestination,
              traceOnly
            });
          } catch (err2) {
            r.cancel(err2);
          }
          const p = Promise.race([r.timer, r.deferred]);
          p.catch(() => {
            r.cancel();
          });
          return p;
        }
      }
      /** *
       * Flushes to the server. Promise resolves when round-trip completes.
       * @returns {Promise<void>}
       */
      flush() {
        if (this.isClosed()) {
          return Promise.reject(new errors_1.errors.ClosedConnectionError());
        }
        return this.protocol.flush();
      }
      drain() {
        if (this.isClosed()) {
          return Promise.reject(new errors_1.errors.ClosedConnectionError());
        }
        if (this.isDraining()) {
          return Promise.reject(new errors_1.errors.DrainingConnectionError());
        }
        this.draining = true;
        return this.protocol.drain();
      }
      async [Symbol.asyncDispose]() {
        if (this.isClosed()) {
          return;
        }
        if (this.isDraining()) {
          await this.closed();
          return;
        }
        await this.drain();
      }
      isClosed() {
        return this.protocol.isClosed();
      }
      isDraining() {
        return this.draining;
      }
      getServer() {
        const srv = this.protocol.getServer();
        return srv ? srv.listen : "";
      }
      setServers(servers) {
        this.protocol.servers.setServers(servers);
      }
      getServers() {
        return this.protocol.servers.snapshot();
      }
      status() {
        const iter = new queued_iterator_1.QueuedIteratorImpl();
        iter.iterClosed.then(() => {
          const idx = this.protocol.listeners.indexOf(iter);
          if (idx > -1) {
            this.protocol.listeners.splice(idx, 1);
          }
        });
        this.protocol.listeners.push(iter);
        return iter;
      }
      get info() {
        return this.protocol.isClosed() ? void 0 : this.protocol.info;
      }
      async context() {
        const r = await this.request(`$SYS.REQ.USER.INFO`);
        return r.json((key, value) => {
          if (key === "time") {
            return new Date(Date.parse(value));
          }
          return value;
        });
      }
      stats() {
        return {
          inBytes: this.protocol.inBytes,
          outBytes: this.protocol.outBytes,
          inMsgs: this.protocol.inMsgs,
          outMsgs: this.protocol.outMsgs
        };
      }
      getServerVersion() {
        const info = this.info;
        return info ? (0, semver_1.parseSemVer)(info.version) : void 0;
      }
      async rtt() {
        if (this.isClosed()) {
          throw new errors_1.errors.ClosedConnectionError();
        }
        if (!this.protocol.connected) {
          throw new errors_1.errors.RequestError("connection disconnected");
        }
        const start = Date.now();
        await this.flush();
        return Date.now() - start;
      }
      get features() {
        return this.protocol.features;
      }
      reconnect() {
        if (this.isClosed()) {
          return Promise.reject(new errors_1.errors.ClosedConnectionError());
        }
        if (this.isDraining()) {
          return Promise.reject(new errors_1.errors.DrainingConnectionError());
        }
        return this.protocol.reconnect();
      }
      // internal
      addCloseListener(listener) {
        if (this.closeListeners === void 0) {
          this.closeListeners = new CloseListeners(this.closed());
        }
        this.closeListeners.add(listener);
      }
      // internal
      removeCloseListener(listener) {
        if (this.closeListeners) {
          this.closeListeners.remove(listener);
        }
      }
    };
    exports.NatsConnectionImpl = NatsConnectionImpl;
    var CloseListeners = class {
      listeners;
      constructor(closed) {
        this.listeners = [];
        closed.then((err2) => {
          this.notify(err2);
        });
      }
      add(listener) {
        this.listeners.push(listener);
      }
      remove(listener) {
        this.listeners = this.listeners.filter((l) => l !== listener);
      }
      notify(err2) {
        this.listeners.forEach((l) => {
          if (typeof l.connectionClosedCallback === "function") {
            try {
              l.connectionClosedCallback(err2);
            } catch (_) {
            }
          }
        });
        this.listeners = [];
      }
    };
  }
});

// node_modules/@nats-io/nats-core/lib/types.js
var require_types = __commonJS({
  "node_modules/@nats-io/nats-core/lib/types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Empty = void 0;
    var encoders_1 = require_encoders();
    Object.defineProperty(exports, "Empty", { enumerable: true, get: function() {
      return encoders_1.Empty;
    } });
  }
});

// node_modules/@nats-io/nats-core/lib/bench.js
var require_bench = __commonJS({
  "node_modules/@nats-io/nats-core/lib/bench.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Bench = exports.Metric = void 0;
    exports.throughput = throughput;
    exports.msgThroughput = msgThroughput;
    exports.humanizeBytes = humanizeBytes;
    var types_1 = require_types();
    var nuid_1 = require_nuid2();
    var util_1 = require_util2();
    var Metric = class {
      name;
      duration;
      date;
      payload;
      msgs;
      lang;
      version;
      bytes;
      asyncRequests;
      min;
      max;
      constructor(name, duration) {
        this.name = name;
        this.duration = duration;
        this.date = Date.now();
        this.payload = 0;
        this.msgs = 0;
        this.bytes = 0;
      }
      toString() {
        const sec = this.duration / 1e3;
        const mps = Math.round(this.msgs / sec);
        const label = this.asyncRequests ? "asyncRequests" : "";
        let minmax = "";
        if (this.max) {
          minmax = `${this.min}/${this.max}`;
        }
        return `${this.name}${label ? " [asyncRequests]" : ""} ${humanizeNumber(mps)} msgs/sec - [${sec.toFixed(2)} secs] ~ ${throughput(this.bytes, sec)} ${minmax}`;
      }
      toCsv() {
        return `"${this.name}",${new Date(this.date).toISOString()},${this.lang},${this.version},${this.msgs},${this.payload},${this.bytes},${this.duration},${this.asyncRequests ? this.asyncRequests : false}
`;
      }
      static header() {
        return `Test,Date,Lang,Version,Count,MsgPayload,Bytes,Millis,Async
`;
      }
    };
    exports.Metric = Metric;
    var Bench = class {
      nc;
      callbacks;
      msgs;
      size;
      subject;
      asyncRequests;
      pub;
      sub;
      req;
      rep;
      perf;
      payload;
      constructor(nc, opts = {
        msgs: 1e5,
        size: 128,
        subject: "",
        asyncRequests: false,
        pub: false,
        sub: false,
        req: false,
        rep: false
      }) {
        this.nc = nc;
        this.callbacks = opts.callbacks || false;
        this.msgs = opts.msgs || 0;
        this.size = opts.size || 0;
        this.subject = opts.subject || nuid_1.nuid.next();
        this.asyncRequests = opts.asyncRequests || false;
        this.pub = opts.pub || false;
        this.sub = opts.sub || false;
        this.req = opts.req || false;
        this.rep = opts.rep || false;
        this.perf = new util_1.Perf();
        this.payload = this.size ? new Uint8Array(this.size) : types_1.Empty;
        if (!this.pub && !this.sub && !this.req && !this.rep) {
          throw new Error("no options selected");
        }
      }
      async run() {
        this.nc.closed().then((err2) => {
          if (err2) {
            throw err2;
          }
        });
        if (this.callbacks) {
          await this.runCallbacks();
        } else {
          await this.runAsync();
        }
        return this.processMetrics();
      }
      processMetrics() {
        const nc = this.nc;
        const { lang, version } = nc.protocol.transport;
        if (this.pub && this.sub) {
          this.perf.measure("pubsub", "pubStart", "subStop");
        }
        if (this.req && this.rep) {
          this.perf.measure("reqrep", "reqStart", "reqStop");
        }
        const measures = this.perf.getEntries();
        const pubsub = measures.find((m) => m.name === "pubsub");
        const reqrep = measures.find((m) => m.name === "reqrep");
        const req = measures.find((m) => m.name === "req");
        const rep = measures.find((m) => m.name === "rep");
        const pub = measures.find((m) => m.name === "pub");
        const sub = measures.find((m) => m.name === "sub");
        const stats = this.nc.stats();
        const metrics = [];
        if (pubsub) {
          const { name, duration } = pubsub;
          const m = new Metric(name, duration);
          m.msgs = this.msgs * 2;
          m.bytes = stats.inBytes + stats.outBytes;
          m.lang = lang;
          m.version = version;
          m.payload = this.payload.length;
          metrics.push(m);
        }
        if (reqrep) {
          const { name, duration } = reqrep;
          const m = new Metric(name, duration);
          m.msgs = this.msgs * 2;
          m.bytes = stats.inBytes + stats.outBytes;
          m.lang = lang;
          m.version = version;
          m.payload = this.payload.length;
          metrics.push(m);
        }
        if (pub) {
          const { name, duration } = pub;
          const m = new Metric(name, duration);
          m.msgs = this.msgs;
          m.bytes = stats.outBytes;
          m.lang = lang;
          m.version = version;
          m.payload = this.payload.length;
          metrics.push(m);
        }
        if (sub) {
          const { name, duration } = sub;
          const m = new Metric(name, duration);
          m.msgs = this.msgs;
          m.bytes = stats.inBytes;
          m.lang = lang;
          m.version = version;
          m.payload = this.payload.length;
          metrics.push(m);
        }
        if (rep) {
          const { name, duration } = rep;
          const m = new Metric(name, duration);
          m.msgs = this.msgs;
          m.bytes = stats.inBytes + stats.outBytes;
          m.lang = lang;
          m.version = version;
          m.payload = this.payload.length;
          metrics.push(m);
        }
        if (req) {
          const { name, duration } = req;
          const m = new Metric(name, duration);
          m.msgs = this.msgs;
          m.bytes = stats.inBytes + stats.outBytes;
          m.lang = lang;
          m.version = version;
          m.payload = this.payload.length;
          metrics.push(m);
        }
        return metrics;
      }
      async runCallbacks() {
        const jobs = [];
        if (this.sub) {
          const d = (0, util_1.deferred)();
          jobs.push(d);
          let i = 0;
          this.nc.subscribe(this.subject, {
            max: this.msgs,
            callback: () => {
              i++;
              if (i === 1) {
                this.perf.mark("subStart");
              }
              if (i === this.msgs) {
                this.perf.mark("subStop");
                this.perf.measure("sub", "subStart", "subStop");
                d.resolve();
              }
            }
          });
        }
        if (this.rep) {
          const d = (0, util_1.deferred)();
          jobs.push(d);
          let i = 0;
          this.nc.subscribe(this.subject, {
            max: this.msgs,
            callback: (_, m) => {
              m.respond(this.payload);
              i++;
              if (i === 1) {
                this.perf.mark("repStart");
              }
              if (i === this.msgs) {
                this.perf.mark("repStop");
                this.perf.measure("rep", "repStart", "repStop");
                d.resolve();
              }
            }
          });
        }
        if (this.pub) {
          const job = (async () => {
            this.perf.mark("pubStart");
            for (let i = 0; i < this.msgs; i++) {
              this.nc.publish(this.subject, this.payload);
            }
            await this.nc.flush();
            this.perf.mark("pubStop");
            this.perf.measure("pub", "pubStart", "pubStop");
          })();
          jobs.push(job);
        }
        if (this.req) {
          const job = (async () => {
            if (this.asyncRequests) {
              this.perf.mark("reqStart");
              const a = [];
              for (let i = 0; i < this.msgs; i++) {
                a.push(this.nc.request(this.subject, this.payload, { timeout: 2e4 }));
              }
              await Promise.all(a);
              this.perf.mark("reqStop");
              this.perf.measure("req", "reqStart", "reqStop");
            } else {
              this.perf.mark("reqStart");
              for (let i = 0; i < this.msgs; i++) {
                await this.nc.request(this.subject);
              }
              this.perf.mark("reqStop");
              this.perf.measure("req", "reqStart", "reqStop");
            }
          })();
          jobs.push(job);
        }
        await Promise.all(jobs);
      }
      async runAsync() {
        const jobs = [];
        if (this.rep) {
          let first = false;
          const sub = this.nc.subscribe(this.subject, { max: this.msgs });
          const job = (async () => {
            for await (const m of sub) {
              if (!first) {
                this.perf.mark("repStart");
                first = true;
              }
              m.respond(this.payload);
            }
            await this.nc.flush();
            this.perf.mark("repStop");
            this.perf.measure("rep", "repStart", "repStop");
          })();
          jobs.push(job);
        }
        if (this.sub) {
          let first = false;
          const sub = this.nc.subscribe(this.subject, { max: this.msgs });
          const job = (async () => {
            for await (const _m of sub) {
              if (!first) {
                this.perf.mark("subStart");
                first = true;
              }
            }
            this.perf.mark("subStop");
            this.perf.measure("sub", "subStart", "subStop");
          })();
          jobs.push(job);
        }
        if (this.pub) {
          const job = (async () => {
            this.perf.mark("pubStart");
            for (let i = 0; i < this.msgs; i++) {
              this.nc.publish(this.subject, this.payload);
            }
            await this.nc.flush();
            this.perf.mark("pubStop");
            this.perf.measure("pub", "pubStart", "pubStop");
          })();
          jobs.push(job);
        }
        if (this.req) {
          const job = (async () => {
            if (this.asyncRequests) {
              this.perf.mark("reqStart");
              const a = [];
              for (let i = 0; i < this.msgs; i++) {
                a.push(this.nc.request(this.subject, this.payload, { timeout: 2e4 }));
              }
              await Promise.all(a);
              this.perf.mark("reqStop");
              this.perf.measure("req", "reqStart", "reqStop");
            } else {
              this.perf.mark("reqStart");
              for (let i = 0; i < this.msgs; i++) {
                await this.nc.request(this.subject);
              }
              this.perf.mark("reqStop");
              this.perf.measure("req", "reqStart", "reqStop");
            }
          })();
          jobs.push(job);
        }
        await Promise.all(jobs);
      }
    };
    exports.Bench = Bench;
    function throughput(bytes, seconds) {
      return `${humanizeBytes(bytes / seconds)}/sec`;
    }
    function msgThroughput(msgs, seconds) {
      return `${Math.floor(msgs / seconds)} msgs/sec`;
    }
    function humanizeBytes(bytes, si = false) {
      const base = si ? 1e3 : 1024;
      const pre = si ? ["k", "M", "G", "T", "P", "E"] : ["K", "M", "G", "T", "P", "E"];
      const post = si ? "iB" : "B";
      if (bytes < base) {
        return `${bytes.toFixed(2)} ${post}`;
      }
      const exp = parseInt(Math.log(bytes) / Math.log(base) + "");
      const index = parseInt(exp - 1 + "");
      return `${(bytes / Math.pow(base, exp)).toFixed(2)} ${pre[index]}${post}`;
    }
    function humanizeNumber(n) {
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  }
});

// node_modules/@nats-io/nats-core/lib/idleheartbeat_monitor.js
var require_idleheartbeat_monitor = __commonJS({
  "node_modules/@nats-io/nats-core/lib/idleheartbeat_monitor.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IdleHeartbeatMonitor = void 0;
    var IdleHeartbeatMonitor = class {
      interval;
      maxOut;
      cancelAfter;
      timer;
      autoCancelTimer;
      last;
      missed;
      count;
      callback;
      /**
       * Constructor
       * @param interval in millis to check
       * @param cb a callback to report when heartbeats are missed
       * @param opts monitor options @see IdleHeartbeatOptions
       */
      constructor(interval, cb, opts = { maxOut: 2 }) {
        this.interval = interval;
        this.maxOut = opts?.maxOut || 2;
        this.cancelAfter = opts?.cancelAfter || 0;
        this.last = Date.now();
        this.missed = 0;
        this.count = 0;
        this.callback = cb;
        this._schedule();
      }
      /**
       * cancel monitoring
       */
      cancel() {
        if (this.autoCancelTimer) {
          clearTimeout(this.autoCancelTimer);
        }
        if (this.timer) {
          clearInterval(this.timer);
        }
        this.timer = 0;
        this.autoCancelTimer = 0;
        this.missed = 0;
      }
      /**
       * work signals that there was work performed
       */
      work() {
        this.last = Date.now();
        this.missed = 0;
      }
      /**
       * internal api to change the interval, cancelAfter and maxOut
       * @param interval
       * @param cancelAfter
       * @param maxOut
       */
      _change(interval, cancelAfter = 0, maxOut = 2) {
        this.interval = interval;
        this.maxOut = maxOut;
        this.cancelAfter = cancelAfter;
        this.restart();
      }
      /**
       * cancels and restarts the monitoring
       */
      restart() {
        this.cancel();
        this._schedule();
      }
      /**
       * internal api called to start monitoring
       */
      _schedule() {
        if (this.cancelAfter > 0) {
          this.autoCancelTimer = setTimeout(() => {
            this.cancel();
          }, this.cancelAfter);
        }
        this.timer = setInterval(() => {
          this.count++;
          if (Date.now() - this.last > this.interval) {
            this.missed++;
          }
          if (this.missed >= this.maxOut) {
            try {
              if (this.callback(this.missed) === true) {
                this.cancel();
              }
            } catch (err2) {
              console.log(err2);
            }
          }
        }, this.interval);
      }
    };
    exports.IdleHeartbeatMonitor = IdleHeartbeatMonitor;
  }
});

// node_modules/@nats-io/nats-core/lib/version.js
var require_version2 = __commonJS({
  "node_modules/@nats-io/nats-core/lib/version.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.version = void 0;
    exports.version = "3.4.0";
  }
});

// node_modules/@nats-io/nats-core/lib/ws_transport.js
var require_ws_transport = __commonJS({
  "node_modules/@nats-io/nats-core/lib/ws_transport.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WsTransport = void 0;
    exports.wsUrlParseFn = wsUrlParseFn;
    exports.wsconnect = wsconnect;
    var util_1 = require_util2();
    var transport_1 = require_transport();
    var options_1 = require_options();
    var databuffer_1 = require_databuffer();
    var protocol_1 = require_protocol();
    var nats_1 = require_nats();
    var version_1 = require_version2();
    var errors_1 = require_errors();
    var VERSION = version_1.version;
    var LANG = "nats.ws";
    var WsTransport = class {
      version;
      lang;
      closeError;
      connected;
      done;
      // @ts-ignore: expecting global WebSocket
      socket;
      options;
      socketClosed;
      encrypted;
      peeked;
      yields;
      signal;
      closedNotification;
      constructor() {
        this.version = VERSION;
        this.lang = LANG;
        this.connected = false;
        this.done = false;
        this.socketClosed = false;
        this.encrypted = false;
        this.peeked = false;
        this.yields = [];
        this.signal = (0, util_1.deferred)();
        this.closedNotification = (0, util_1.deferred)();
      }
      async connect(server, options) {
        const connected = false;
        const ok = (0, util_1.deferred)();
        this.options = options;
        const u = server.src;
        if (options.wsFactory) {
          const { socket, encrypted } = await options.wsFactory(server.src, options);
          this.socket = socket;
          this.encrypted = encrypted;
        } else {
          this.encrypted = u.indexOf("wss://") === 0;
          this.socket = new WebSocket(u);
        }
        this.socket.binaryType = "arraybuffer";
        this.socket.onopen = () => {
          if (this.done) {
            this._closed(new Error("aborted"));
          }
        };
        this.socket.onmessage = (me) => {
          if (this.done) {
            return;
          }
          this.yields.push(new Uint8Array(me.data));
          if (this.peeked) {
            this.signal.resolve();
            return;
          }
          const t = databuffer_1.DataBuffer.concat(...this.yields);
          const pm = (0, transport_1.extractProtocolMessage)(t);
          if (pm !== "") {
            const m = protocol_1.INFO.exec(pm);
            if (!m) {
              if (options.debug) {
                console.error("!!!", (0, util_1.render)(t));
              }
              ok.reject(new Error("unexpected response from server"));
              return;
            }
            try {
              const info = JSON.parse(m[1]);
              (0, options_1.checkOptions)(info, this.options);
              this.peeked = true;
              this.connected = true;
              this.signal.resolve();
              ok.resolve();
            } catch (err2) {
              ok.reject(err2);
              return;
            }
          }
        };
        this.socket.onclose = (evt) => {
          let reason;
          if (!evt.wasClean && evt.reason !== "") {
            reason = new Error(evt.reason);
          }
          this._closed(reason);
          this._cleanup();
        };
        this.socket.onerror = (e) => {
          if (this.done) {
            return;
          }
          const evt = e;
          const err2 = new errors_1.errors.ConnectionError(evt.message);
          if (!connected) {
            ok.reject(err2);
          } else {
            this._closed(err2);
          }
          this._cleanup();
        };
        return ok;
      }
      _cleanup() {
        if (this.socketClosed === false) {
          this.socketClosed = true;
          this.socket.onopen = null;
          this.socket.onmessage = null;
          this.socket.onerror = null;
          this.socket.onclose = null;
          this.closedNotification.resolve(this.closeError);
        }
      }
      disconnect() {
        this._closed(void 0, true);
      }
      async _closed(err2, _internal = true) {
        if (this.done) {
          try {
            this.socket.close();
          } catch (_) {
          }
          return;
        }
        this.closeError = err2;
        if (!err2) {
          while (!this.socketClosed && this.socket.bufferedAmount > 0) {
            await (0, util_1.delay)(100);
          }
        }
        this.done = true;
        try {
          this.socket.close();
        } catch (_) {
        }
        return this.closedNotification;
      }
      get isClosed() {
        return this.done;
      }
      [Symbol.asyncIterator]() {
        return this.iterate();
      }
      async *iterate() {
        while (true) {
          if (this.done) {
            return;
          }
          if (this.yields.length === 0) {
            await this.signal;
          }
          const yields = this.yields;
          this.yields = [];
          for (let i = 0; i < yields.length; i++) {
            if (this.options.debug) {
              console.info(`> ${(0, util_1.render)(yields[i])}`);
            }
            yield yields[i];
          }
          if (this.done) {
            break;
          } else if (this.yields.length === 0) {
            yields.length = 0;
            this.yields = yields;
            this.signal = (0, util_1.deferred)();
          }
        }
      }
      isEncrypted() {
        return this.connected && this.encrypted;
      }
      send(frame) {
        if (this.done) {
          return;
        }
        try {
          this.socket.send(frame.buffer);
          if (this.options.debug) {
            console.info(`< ${(0, util_1.render)(frame)}`);
          }
          return;
        } catch (err2) {
          if (this.options.debug) {
            console.error(`!!! ${(0, util_1.render)(frame)}: ${err2}`);
          }
        }
      }
      close(err2) {
        return this._closed(err2, false);
      }
      closed() {
        return this.closedNotification;
      }
      // this is to allow a force discard on a connection
      // if the connection fails during the handshake protocol.
      // Firefox for example, will keep connections going,
      // so eventually if it succeeds, the client will have
      // an additional transport running. With this
      discard() {
        this.socket?.close();
      }
    };
    exports.WsTransport = WsTransport;
    function wsUrlParseFn(u, encrypted) {
      const ut = /^(.*:\/\/)(.*)/;
      if (!ut.test(u)) {
        if (typeof encrypted === "boolean") {
          u = `${encrypted === true ? "https" : "http"}://${u}`;
        } else {
          u = `https://${u}`;
        }
      }
      let url = new URL(u);
      const srcProto = url.protocol.toLowerCase();
      if (srcProto === "ws:") {
        encrypted = false;
      }
      if (srcProto === "wss:") {
        encrypted = true;
      }
      if (srcProto !== "https:" && srcProto !== "http") {
        u = u.replace(/^(.*:\/\/)(.*)/gm, "$2");
        url = new URL(`http://${u}`);
      }
      let protocol;
      let port;
      const host = url.hostname;
      const path3 = url.pathname;
      const search = url.search || "";
      switch (srcProto) {
        case "http:":
        case "ws:":
        case "nats:":
          port = url.port || "80";
          protocol = "ws:";
          break;
        case "https:":
        case "wss:":
        case "tls:":
          port = url.port || "443";
          protocol = "wss:";
          break;
        default:
          port = url.port || encrypted === true ? "443" : "80";
          protocol = encrypted === true ? "wss:" : "ws:";
          break;
      }
      return `${protocol}//${host}:${port}${path3}${search}`;
    }
    function wsconnect(opts = {}) {
      (0, transport_1.setTransportFactory)({
        defaultPort: 443,
        urlParseFn: wsUrlParseFn,
        factory: () => {
          if (opts.tls) {
            throw errors_1.InvalidArgumentError.format("tls", "is not configurable on w3c websocket connections");
          }
          return new WsTransport();
        }
      });
      return nats_1.NatsConnectionImpl.connect(opts);
    }
  }
});

// node_modules/@nats-io/nats-core/lib/internal_mod.js
var require_internal_mod = __commonJS({
  "node_modules/@nats-io/nats-core/lib/internal_mod.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Metric = exports.Bench = exports.writeAll = exports.readAll = exports.MAX_SIZE = exports.DenoBuffer = exports.State = exports.Parser = exports.Kind = exports.describe = exports.QueuedIteratorImpl = exports.usernamePasswordAuthenticator = exports.tokenAuthenticator = exports.nkeyAuthenticator = exports.jwtAuthenticator = exports.credsAuthenticator = exports.RequestOne = exports.parseOptions = exports.hasWsProtocol = exports.defaultOptions = exports.DEFAULT_MAX_RECONNECT_ATTEMPTS = exports.checkUnsupportedOption = exports.checkOptions = exports.buildAuthenticator = exports.DataBuffer = exports.MuxSubscription = exports.Heartbeat = exports.MsgHdrsImpl = exports.headers = exports.canonicalMIMEHeaderKey = exports.timeout = exports.SimpleMutex = exports.render = exports.nanos = exports.millis = exports.extend = exports.delay = exports.deferred = exports.deadline = exports.collect = exports.backoff = exports.ProtocolHandler = exports.INFO = exports.Connect = exports.setTransportFactory = exports.getResolveFn = exports.MsgImpl = exports.nuid = exports.Nuid = exports.NatsConnectionImpl = void 0;
    exports.UserAuthenticationExpiredError = exports.TimeoutError = exports.RequestError = exports.ProtocolError = exports.PermissionViolationError = exports.NoRespondersError = exports.InvalidSubjectError = exports.InvalidOperationError = exports.InvalidArgumentError = exports.errors = exports.DrainingConnectionError = exports.ConnectionError = exports.ClosedConnectionError = exports.AuthorizationError = exports.wsUrlParseFn = exports.wsconnect = exports.Servers = exports.isIPV4OrHostname = exports.IdleHeartbeatMonitor = exports.Subscriptions = exports.SubscriptionImpl = exports.syncIterator = exports.Match = exports.createInbox = exports.protoLen = exports.extractProtocolMessage = exports.Empty = exports.parseSemVer = exports.Features = exports.Feature = exports.compare = exports.parseIP = exports.isIP = exports.ipV4 = exports.TE = exports.TD = void 0;
    var nats_1 = require_nats();
    Object.defineProperty(exports, "NatsConnectionImpl", { enumerable: true, get: function() {
      return nats_1.NatsConnectionImpl;
    } });
    var nuid_1 = require_nuid2();
    Object.defineProperty(exports, "Nuid", { enumerable: true, get: function() {
      return nuid_1.Nuid;
    } });
    Object.defineProperty(exports, "nuid", { enumerable: true, get: function() {
      return nuid_1.nuid;
    } });
    var msg_1 = require_msg();
    Object.defineProperty(exports, "MsgImpl", { enumerable: true, get: function() {
      return msg_1.MsgImpl;
    } });
    var transport_1 = require_transport();
    Object.defineProperty(exports, "getResolveFn", { enumerable: true, get: function() {
      return transport_1.getResolveFn;
    } });
    Object.defineProperty(exports, "setTransportFactory", { enumerable: true, get: function() {
      return transport_1.setTransportFactory;
    } });
    var protocol_1 = require_protocol();
    Object.defineProperty(exports, "Connect", { enumerable: true, get: function() {
      return protocol_1.Connect;
    } });
    Object.defineProperty(exports, "INFO", { enumerable: true, get: function() {
      return protocol_1.INFO;
    } });
    Object.defineProperty(exports, "ProtocolHandler", { enumerable: true, get: function() {
      return protocol_1.ProtocolHandler;
    } });
    var util_1 = require_util2();
    Object.defineProperty(exports, "backoff", { enumerable: true, get: function() {
      return util_1.backoff;
    } });
    Object.defineProperty(exports, "collect", { enumerable: true, get: function() {
      return util_1.collect;
    } });
    Object.defineProperty(exports, "deadline", { enumerable: true, get: function() {
      return util_1.deadline;
    } });
    Object.defineProperty(exports, "deferred", { enumerable: true, get: function() {
      return util_1.deferred;
    } });
    Object.defineProperty(exports, "delay", { enumerable: true, get: function() {
      return util_1.delay;
    } });
    Object.defineProperty(exports, "extend", { enumerable: true, get: function() {
      return util_1.extend;
    } });
    Object.defineProperty(exports, "millis", { enumerable: true, get: function() {
      return util_1.millis;
    } });
    Object.defineProperty(exports, "nanos", { enumerable: true, get: function() {
      return util_1.nanos;
    } });
    Object.defineProperty(exports, "render", { enumerable: true, get: function() {
      return util_1.render;
    } });
    Object.defineProperty(exports, "SimpleMutex", { enumerable: true, get: function() {
      return util_1.SimpleMutex;
    } });
    Object.defineProperty(exports, "timeout", { enumerable: true, get: function() {
      return util_1.timeout;
    } });
    var headers_1 = require_headers();
    Object.defineProperty(exports, "canonicalMIMEHeaderKey", { enumerable: true, get: function() {
      return headers_1.canonicalMIMEHeaderKey;
    } });
    Object.defineProperty(exports, "headers", { enumerable: true, get: function() {
      return headers_1.headers;
    } });
    Object.defineProperty(exports, "MsgHdrsImpl", { enumerable: true, get: function() {
      return headers_1.MsgHdrsImpl;
    } });
    var heartbeats_1 = require_heartbeats();
    Object.defineProperty(exports, "Heartbeat", { enumerable: true, get: function() {
      return heartbeats_1.Heartbeat;
    } });
    var muxsubscription_1 = require_muxsubscription();
    Object.defineProperty(exports, "MuxSubscription", { enumerable: true, get: function() {
      return muxsubscription_1.MuxSubscription;
    } });
    var databuffer_1 = require_databuffer();
    Object.defineProperty(exports, "DataBuffer", { enumerable: true, get: function() {
      return databuffer_1.DataBuffer;
    } });
    var options_1 = require_options();
    Object.defineProperty(exports, "buildAuthenticator", { enumerable: true, get: function() {
      return options_1.buildAuthenticator;
    } });
    Object.defineProperty(exports, "checkOptions", { enumerable: true, get: function() {
      return options_1.checkOptions;
    } });
    Object.defineProperty(exports, "checkUnsupportedOption", { enumerable: true, get: function() {
      return options_1.checkUnsupportedOption;
    } });
    Object.defineProperty(exports, "DEFAULT_MAX_RECONNECT_ATTEMPTS", { enumerable: true, get: function() {
      return options_1.DEFAULT_MAX_RECONNECT_ATTEMPTS;
    } });
    Object.defineProperty(exports, "defaultOptions", { enumerable: true, get: function() {
      return options_1.defaultOptions;
    } });
    Object.defineProperty(exports, "hasWsProtocol", { enumerable: true, get: function() {
      return options_1.hasWsProtocol;
    } });
    Object.defineProperty(exports, "parseOptions", { enumerable: true, get: function() {
      return options_1.parseOptions;
    } });
    var request_1 = require_request();
    Object.defineProperty(exports, "RequestOne", { enumerable: true, get: function() {
      return request_1.RequestOne;
    } });
    var authenticator_1 = require_authenticator();
    Object.defineProperty(exports, "credsAuthenticator", { enumerable: true, get: function() {
      return authenticator_1.credsAuthenticator;
    } });
    Object.defineProperty(exports, "jwtAuthenticator", { enumerable: true, get: function() {
      return authenticator_1.jwtAuthenticator;
    } });
    Object.defineProperty(exports, "nkeyAuthenticator", { enumerable: true, get: function() {
      return authenticator_1.nkeyAuthenticator;
    } });
    Object.defineProperty(exports, "tokenAuthenticator", { enumerable: true, get: function() {
      return authenticator_1.tokenAuthenticator;
    } });
    Object.defineProperty(exports, "usernamePasswordAuthenticator", { enumerable: true, get: function() {
      return authenticator_1.usernamePasswordAuthenticator;
    } });
    __exportStar(require_nkeys2(), exports);
    var queued_iterator_1 = require_queued_iterator();
    Object.defineProperty(exports, "QueuedIteratorImpl", { enumerable: true, get: function() {
      return queued_iterator_1.QueuedIteratorImpl;
    } });
    var parser_1 = require_parser();
    Object.defineProperty(exports, "describe", { enumerable: true, get: function() {
      return parser_1.describe;
    } });
    Object.defineProperty(exports, "Kind", { enumerable: true, get: function() {
      return parser_1.Kind;
    } });
    Object.defineProperty(exports, "Parser", { enumerable: true, get: function() {
      return parser_1.Parser;
    } });
    Object.defineProperty(exports, "State", { enumerable: true, get: function() {
      return parser_1.State;
    } });
    var denobuffer_1 = require_denobuffer();
    Object.defineProperty(exports, "DenoBuffer", { enumerable: true, get: function() {
      return denobuffer_1.DenoBuffer;
    } });
    Object.defineProperty(exports, "MAX_SIZE", { enumerable: true, get: function() {
      return denobuffer_1.MAX_SIZE;
    } });
    Object.defineProperty(exports, "readAll", { enumerable: true, get: function() {
      return denobuffer_1.readAll;
    } });
    Object.defineProperty(exports, "writeAll", { enumerable: true, get: function() {
      return denobuffer_1.writeAll;
    } });
    var bench_1 = require_bench();
    Object.defineProperty(exports, "Bench", { enumerable: true, get: function() {
      return bench_1.Bench;
    } });
    Object.defineProperty(exports, "Metric", { enumerable: true, get: function() {
      return bench_1.Metric;
    } });
    var encoders_1 = require_encoders();
    Object.defineProperty(exports, "TD", { enumerable: true, get: function() {
      return encoders_1.TD;
    } });
    Object.defineProperty(exports, "TE", { enumerable: true, get: function() {
      return encoders_1.TE;
    } });
    var ipparser_1 = require_ipparser();
    Object.defineProperty(exports, "ipV4", { enumerable: true, get: function() {
      return ipparser_1.ipV4;
    } });
    Object.defineProperty(exports, "isIP", { enumerable: true, get: function() {
      return ipparser_1.isIP;
    } });
    Object.defineProperty(exports, "parseIP", { enumerable: true, get: function() {
      return ipparser_1.parseIP;
    } });
    var semver_1 = require_semver();
    Object.defineProperty(exports, "compare", { enumerable: true, get: function() {
      return semver_1.compare;
    } });
    Object.defineProperty(exports, "Feature", { enumerable: true, get: function() {
      return semver_1.Feature;
    } });
    Object.defineProperty(exports, "Features", { enumerable: true, get: function() {
      return semver_1.Features;
    } });
    Object.defineProperty(exports, "parseSemVer", { enumerable: true, get: function() {
      return semver_1.parseSemVer;
    } });
    var types_1 = require_types();
    Object.defineProperty(exports, "Empty", { enumerable: true, get: function() {
      return types_1.Empty;
    } });
    var transport_2 = require_transport();
    Object.defineProperty(exports, "extractProtocolMessage", { enumerable: true, get: function() {
      return transport_2.extractProtocolMessage;
    } });
    Object.defineProperty(exports, "protoLen", { enumerable: true, get: function() {
      return transport_2.protoLen;
    } });
    var core_1 = require_core();
    Object.defineProperty(exports, "createInbox", { enumerable: true, get: function() {
      return core_1.createInbox;
    } });
    Object.defineProperty(exports, "Match", { enumerable: true, get: function() {
      return core_1.Match;
    } });
    Object.defineProperty(exports, "syncIterator", { enumerable: true, get: function() {
      return core_1.syncIterator;
    } });
    var protocol_2 = require_protocol();
    Object.defineProperty(exports, "SubscriptionImpl", { enumerable: true, get: function() {
      return protocol_2.SubscriptionImpl;
    } });
    Object.defineProperty(exports, "Subscriptions", { enumerable: true, get: function() {
      return protocol_2.Subscriptions;
    } });
    var idleheartbeat_monitor_1 = require_idleheartbeat_monitor();
    Object.defineProperty(exports, "IdleHeartbeatMonitor", { enumerable: true, get: function() {
      return idleheartbeat_monitor_1.IdleHeartbeatMonitor;
    } });
    var servers_1 = require_servers();
    Object.defineProperty(exports, "isIPV4OrHostname", { enumerable: true, get: function() {
      return servers_1.isIPV4OrHostname;
    } });
    Object.defineProperty(exports, "Servers", { enumerable: true, get: function() {
      return servers_1.Servers;
    } });
    var ws_transport_1 = require_ws_transport();
    Object.defineProperty(exports, "wsconnect", { enumerable: true, get: function() {
      return ws_transport_1.wsconnect;
    } });
    Object.defineProperty(exports, "wsUrlParseFn", { enumerable: true, get: function() {
      return ws_transport_1.wsUrlParseFn;
    } });
    var errors_1 = require_errors();
    Object.defineProperty(exports, "AuthorizationError", { enumerable: true, get: function() {
      return errors_1.AuthorizationError;
    } });
    Object.defineProperty(exports, "ClosedConnectionError", { enumerable: true, get: function() {
      return errors_1.ClosedConnectionError;
    } });
    Object.defineProperty(exports, "ConnectionError", { enumerable: true, get: function() {
      return errors_1.ConnectionError;
    } });
    Object.defineProperty(exports, "DrainingConnectionError", { enumerable: true, get: function() {
      return errors_1.DrainingConnectionError;
    } });
    Object.defineProperty(exports, "errors", { enumerable: true, get: function() {
      return errors_1.errors;
    } });
    Object.defineProperty(exports, "InvalidArgumentError", { enumerable: true, get: function() {
      return errors_1.InvalidArgumentError;
    } });
    Object.defineProperty(exports, "InvalidOperationError", { enumerable: true, get: function() {
      return errors_1.InvalidOperationError;
    } });
    Object.defineProperty(exports, "InvalidSubjectError", { enumerable: true, get: function() {
      return errors_1.InvalidSubjectError;
    } });
    Object.defineProperty(exports, "NoRespondersError", { enumerable: true, get: function() {
      return errors_1.NoRespondersError;
    } });
    Object.defineProperty(exports, "PermissionViolationError", { enumerable: true, get: function() {
      return errors_1.PermissionViolationError;
    } });
    Object.defineProperty(exports, "ProtocolError", { enumerable: true, get: function() {
      return errors_1.ProtocolError;
    } });
    Object.defineProperty(exports, "RequestError", { enumerable: true, get: function() {
      return errors_1.RequestError;
    } });
    Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function() {
      return errors_1.TimeoutError;
    } });
    Object.defineProperty(exports, "UserAuthenticationExpiredError", { enumerable: true, get: function() {
      return errors_1.UserAuthenticationExpiredError;
    } });
  }
});

// node_modules/@nats-io/transport-node/lib/nats-base-client.js
var require_nats_base_client = __commonJS({
  "node_modules/@nats-io/transport-node/lib/nats-base-client.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_internal_mod(), exports);
  }
});

// node_modules/@nats-io/transport-node/lib/version.js
var require_version3 = __commonJS({
  "node_modules/@nats-io/transport-node/lib/version.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.version = void 0;
    exports.version = "3.4.0";
  }
});

// node_modules/@nats-io/transport-node/lib/node_transport.js
var require_node_transport = __commonJS({
  "node_modules/@nats-io/transport-node/lib/node_transport.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NodeTransport = exports.VERSION = void 0;
    exports.nodeResolveHost = nodeResolveHost;
    var nats_base_client_1 = require_nats_base_client();
    var node_net_1 = __require("node:net");
    var node_tls_1 = __require("node:tls");
    var node_path_1 = __require("node:path");
    var node_fs_1 = __require("node:fs");
    var node_dns_1 = __importDefault(__require("node:dns"));
    var version_1 = require_version3();
    exports.VERSION = version_1.version;
    var LANG = "nats.js";
    var NodeTransport = class {
      socket;
      version;
      lang;
      yields = [];
      signal = (0, nats_base_client_1.deferred)();
      closedNotification = (0, nats_base_client_1.deferred)();
      options;
      connected = false;
      tlsName = "";
      done = false;
      closeError;
      constructor() {
        this.lang = LANG;
        this.version = exports.VERSION;
      }
      async connect(hp, options) {
        this.tlsName = hp.tlsName;
        this.options = options;
        const { tls } = this.options;
        const { handshakeFirst } = tls || {};
        try {
          if (handshakeFirst === true) {
            this.socket = await this.tlsFirst(hp);
          } else {
            this.socket = await this.dial(hp);
          }
          if (this.done) {
            this.socket?.destroy();
          }
          const info = await this.peekInfo();
          (0, nats_base_client_1.checkOptions)(info, options);
          const { tls_required: tlsRequired, tls_available: tlsAvailable } = info;
          const desired = tlsAvailable === true && options.tls !== null;
          if (!handshakeFirst && (tlsRequired || desired)) {
            this.socket = await this.startTLS();
          }
          if (this.done) {
            this.socket?.destroy();
          }
          if (tlsRequired && this.socket.encrypted !== true) {
            throw nats_base_client_1.errors.InvalidArgumentError.format("tls", "is not available on this server");
          }
          this.connected = true;
          this.setupHandlers();
          this.signal.resolve();
          return Promise.resolve();
        } catch (ex) {
          let err2 = ex;
          if (!err2) {
            err2 = new nats_base_client_1.errors.ConnectionError("error connecting - node provided an undefined error");
          }
          const { code } = err2;
          const perr = code === "ECONNREFUSED" ? new nats_base_client_1.errors.ConnectionError("connection refused", { cause: err2 }) : err2;
          this.socket?.destroy();
          throw perr;
        }
      }
      dial(hp) {
        const d = (0, nats_base_client_1.deferred)();
        let dialError;
        const socket = (0, node_net_1.createConnection)(hp.port, hp.hostname, () => {
          d.resolve(socket);
          socket.removeAllListeners();
        });
        socket.on("error", (err2) => {
          dialError = err2;
        });
        socket.on("close", () => {
          socket.removeAllListeners();
          d.reject(dialError);
        });
        socket.setNoDelay(true);
        return d;
      }
      get isClosed() {
        return this.done;
      }
      close(err2) {
        return this._closed(err2, false);
      }
      peekInfo() {
        const d = (0, nats_base_client_1.deferred)();
        let peekError;
        this.socket.on("data", (frame) => {
          this.yields.push(frame);
          const t = nats_base_client_1.DataBuffer.concat(...this.yields);
          const pm = (0, nats_base_client_1.extractProtocolMessage)(t);
          if (pm !== "") {
            try {
              const m = nats_base_client_1.INFO.exec(pm);
              if (!m) {
                throw new Error("unexpected response from server");
              }
              const info = JSON.parse(m[1]);
              d.resolve(info);
            } catch (err2) {
              d.reject(err2);
            } finally {
              this.socket.removeAllListeners();
            }
          }
        });
        this.socket.on("error", (err2) => {
          peekError = err2;
        });
        this.socket.on("close", () => {
          this.socket.removeAllListeners();
          d.reject(peekError);
        });
        return d;
      }
      loadFile(fn) {
        if (!fn) {
          return Promise.resolve();
        }
        const d = (0, nats_base_client_1.deferred)();
        try {
          fn = (0, node_path_1.resolve)(fn);
          if (!(0, node_fs_1.existsSync)(fn)) {
            d.reject(new Error(`${fn} doesn't exist`));
          }
          (0, node_fs_1.readFile)(fn, (err2, data) => {
            if (err2) {
              return d.reject(err2);
            }
            d.resolve(data);
          });
        } catch (err2) {
          d.reject(err2);
        }
        return d;
      }
      async loadClientCerts() {
        const tlsOpts = {};
        const { certFile, cert, caFile, ca, keyFile, key } = this.options.tls;
        try {
          if (certFile) {
            const data = await this.loadFile(certFile);
            if (data) {
              tlsOpts.cert = data;
            }
          } else if (cert) {
            tlsOpts.cert = cert;
          }
          if (keyFile) {
            const data = await this.loadFile(keyFile);
            if (data) {
              tlsOpts.key = data;
            }
          } else if (key) {
            tlsOpts.key = key;
          }
          if (caFile) {
            const data = await this.loadFile(caFile);
            if (data) {
              tlsOpts.ca = [data];
            }
          } else if (ca) {
            tlsOpts.ca = ca;
          }
          return Promise.resolve(tlsOpts);
        } catch (err2) {
          return Promise.reject(err2);
        }
      }
      async tlsFirst(hp) {
        let tlsError;
        let tlsOpts = {
          servername: this.tlsName,
          rejectUnauthorized: true
        };
        if (this.socket) {
          tlsOpts.socket = this.socket;
        }
        if (typeof this.options.tls === "object") {
          try {
            const certOpts = await this.loadClientCerts() || {};
            tlsOpts = (0, nats_base_client_1.extend)(tlsOpts, this.options.tls, certOpts);
          } catch (err2) {
            return Promise.reject(new nats_base_client_1.errors.ConnectionError(err2.message, { cause: err2 }));
          }
        }
        const d = (0, nats_base_client_1.deferred)();
        try {
          const tlsSocket = (0, node_tls_1.connect)(hp.port, hp.hostname, tlsOpts, () => {
            tlsSocket.removeAllListeners();
            d.resolve(tlsSocket);
          });
          tlsSocket.on("error", (err2) => {
            tlsError = err2;
          });
          tlsSocket.on("secureConnect", () => {
            if (tlsOpts.rejectUnauthorized === false) {
              return;
            }
            if (!tlsSocket.authorized) {
              throw tlsSocket.authorizationError;
            }
          });
          tlsSocket.on("close", () => {
            d.reject(tlsError);
            tlsSocket.removeAllListeners();
          });
          tlsSocket.setNoDelay(true);
        } catch (err2) {
          d.reject(new nats_base_client_1.errors.ConnectionError(err2.message, { cause: err2 }));
        }
        return d;
      }
      async startTLS() {
        let tlsError;
        let tlsOpts = {
          socket: this.socket,
          servername: this.tlsName,
          rejectUnauthorized: true
        };
        if (typeof this.options.tls === "object") {
          try {
            const certOpts = await this.loadClientCerts() || {};
            tlsOpts = (0, nats_base_client_1.extend)(tlsOpts, this.options.tls, certOpts);
          } catch (err2) {
            return Promise.reject(new nats_base_client_1.errors.ConnectionError(err2.message, {
              cause: err2
            }));
          }
        }
        const d = (0, nats_base_client_1.deferred)();
        try {
          const tlsSocket = (0, node_tls_1.connect)(tlsOpts, () => {
            tlsSocket.removeAllListeners();
            d.resolve(tlsSocket);
          });
          tlsSocket.on("error", (err2) => {
            tlsError = err2;
          });
          tlsSocket.on("secureConnect", () => {
            if (tlsOpts.rejectUnauthorized === false) {
              return;
            }
            if (!tlsSocket.authorized) {
              throw tlsSocket.authorizationError;
            }
          });
          tlsSocket.on("close", () => {
            d.reject(tlsError);
            tlsSocket.removeAllListeners();
          });
        } catch (err2) {
          d.reject(new nats_base_client_1.errors.ConnectionError(err2.message, { cause: err2 }));
        }
        return d;
      }
      setupHandlers() {
        let connError;
        this.socket.on("data", (frame) => {
          this.yields.push(frame);
          return this.signal.resolve();
        });
        this.socket.on("error", (err2) => {
          connError = err2;
        });
        this.socket.on("end", () => {
          if (this.socket?.destroyed) {
            return;
          }
          this.socket?.write(new Uint8Array(0), () => {
            this.socket?.end();
          });
        });
        this.socket.on("close", () => {
          this._closed(connError, false);
        });
      }
      [Symbol.asyncIterator]() {
        return this.iterate();
      }
      async *iterate() {
        while (true) {
          if (this.yields.length === 0) {
            await this.signal;
          }
          const yields = this.yields;
          this.yields = [];
          for (let i = 0; i < yields.length; i++) {
            if (this.options.debug) {
              console.info(`> ${(0, nats_base_client_1.render)(yields[i])}`);
            }
            yield yields[i];
          }
          if (this.done) {
            break;
          } else if (this.yields.length === 0) {
            yields.length = 0;
            this.yields = yields;
            this.signal = (0, nats_base_client_1.deferred)();
          }
        }
      }
      discard() {
        this.done = true;
        if (this.socket) {
          try {
            this.socket.removeAllListeners();
            this.socket.destroy();
          } catch {
          }
        }
      }
      disconnect() {
        this._closed(void 0, true).then().catch();
      }
      isEncrypted() {
        return this.socket instanceof node_tls_1.TLSSocket;
      }
      _send(frame) {
        if (this.isClosed || this.socket === void 0) {
          return Promise.resolve();
        }
        if (this.options.debug) {
          console.info(`< ${(0, nats_base_client_1.render)(frame)}`);
        }
        const d = (0, nats_base_client_1.deferred)();
        try {
          this.socket.write(frame, (err2) => {
            if (err2) {
              if (this.options.debug) {
                console.error(`!!! ${(0, nats_base_client_1.render)(frame)}: ${err2}`);
              }
              return d.reject(err2);
            }
            return d.resolve();
          });
        } catch (err2) {
          if (this.options.debug) {
            console.error(`!!! ${(0, nats_base_client_1.render)(frame)}: ${err2}`);
          }
          d.reject(err2);
        }
        return d;
      }
      send(frame) {
        const p = this._send(frame);
        p.catch((_err) => {
        });
      }
      async _closed(err2, internal = true) {
        if (!this.connected)
          return;
        if (this.done) {
          this.socket?.destroy();
          return;
        }
        this.closeError = err2;
        if (!err2 && this.socket && internal) {
          try {
            await this._send(new TextEncoder().encode(""));
          } catch (err3) {
            if (this.options.debug) {
              console.log("transport close terminated with an error", err3);
            }
          }
        }
        try {
          if (this.socket) {
            this.socket.removeAllListeners();
            this.socket?.destroy();
            this.socket = void 0;
          }
        } catch (err3) {
          console.log(err3);
        }
        this.done = true;
        this.closedNotification.resolve(this.closeError);
      }
      closed() {
        return this.closedNotification;
      }
    };
    exports.NodeTransport = NodeTransport;
    function nodeResolveHost(s) {
      const ips = (0, nats_base_client_1.deferred)();
      node_dns_1.default.lookup(
        s,
        { all: true },
        //@ts-ignore: callback changes shape when all is true
        (err2, address) => {
          if (err2) {
            ips.reject(err2);
            return;
          }
          const buf = [];
          for (const r of address) {
            buf.push(r.address);
          }
          if (buf.length === 0) {
            buf.push(s);
          }
          ips.resolve(buf);
        }
      );
      return ips;
    }
  }
});

// node_modules/@nats-io/transport-node/lib/connect.js
var require_connect = __commonJS({
  "node_modules/@nats-io/transport-node/lib/connect.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.connect = connect3;
    var node_transport_1 = require_node_transport();
    var nats_base_client_1 = require_nats_base_client();
    var nats_base_client_2 = require_nats_base_client();
    function connect3(opts = {}) {
      if ((0, nats_base_client_2.hasWsProtocol)(opts)) {
        return Promise.reject(nats_base_client_2.errors.InvalidArgumentError.format(`servers`, `node client doesn't support websockets, use the 'wsconnect' function instead`));
      }
      (0, nats_base_client_1.setTransportFactory)({
        factory: () => {
          return new node_transport_1.NodeTransport();
        },
        dnsResolveFn: node_transport_1.nodeResolveHost
      });
      return nats_base_client_1.NatsConnectionImpl.connect(opts);
    }
  }
});

// node_modules/@nats-io/transport-node/lib/mod.js
var require_mod3 = __commonJS({
  "node_modules/@nats-io/transport-node/lib/mod.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.connect = void 0;
    var connect_1 = require_connect();
    Object.defineProperty(exports, "connect", { enumerable: true, get: function() {
      return connect_1.connect;
    } });
    __exportStar(require_nats_base_client(), exports);
  }
});

// node_modules/@nats-io/transport-node/index.js
var require_transport_node = __commonJS({
  "node_modules/@nats-io/transport-node/index.js"(exports, module) {
    "use strict";
    module.exports = require_mod3();
  }
});

// node_modules/@nats-io/nats-core/lib/mod.js
var require_mod4 = __commonJS({
  "node_modules/@nats-io/nats-core/lib/mod.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.wsconnect = exports.usernamePasswordAuthenticator = exports.UserAuthenticationExpiredError = exports.tokenAuthenticator = exports.TimeoutError = exports.syncIterator = exports.RequestError = exports.ProtocolError = exports.PermissionViolationError = exports.nuid = exports.Nuid = exports.NoRespondersError = exports.nkeys = exports.nkeyAuthenticator = exports.nanos = exports.MsgHdrsImpl = exports.millis = exports.Metric = exports.Match = exports.jwtAuthenticator = exports.InvalidSubjectError = exports.InvalidOperationError = exports.InvalidArgumentError = exports.headers = exports.hasWsProtocol = exports.errors = exports.Empty = exports.DrainingConnectionError = exports.delay = exports.deferred = exports.deadline = exports.credsAuthenticator = exports.createInbox = exports.ConnectionError = exports.ClosedConnectionError = exports.canonicalMIMEHeaderKey = exports.buildAuthenticator = exports.Bench = exports.backoff = exports.AuthorizationError = void 0;
    var internal_mod_1 = require_internal_mod();
    Object.defineProperty(exports, "AuthorizationError", { enumerable: true, get: function() {
      return internal_mod_1.AuthorizationError;
    } });
    Object.defineProperty(exports, "backoff", { enumerable: true, get: function() {
      return internal_mod_1.backoff;
    } });
    Object.defineProperty(exports, "Bench", { enumerable: true, get: function() {
      return internal_mod_1.Bench;
    } });
    Object.defineProperty(exports, "buildAuthenticator", { enumerable: true, get: function() {
      return internal_mod_1.buildAuthenticator;
    } });
    Object.defineProperty(exports, "canonicalMIMEHeaderKey", { enumerable: true, get: function() {
      return internal_mod_1.canonicalMIMEHeaderKey;
    } });
    Object.defineProperty(exports, "ClosedConnectionError", { enumerable: true, get: function() {
      return internal_mod_1.ClosedConnectionError;
    } });
    Object.defineProperty(exports, "ConnectionError", { enumerable: true, get: function() {
      return internal_mod_1.ConnectionError;
    } });
    Object.defineProperty(exports, "createInbox", { enumerable: true, get: function() {
      return internal_mod_1.createInbox;
    } });
    Object.defineProperty(exports, "credsAuthenticator", { enumerable: true, get: function() {
      return internal_mod_1.credsAuthenticator;
    } });
    Object.defineProperty(exports, "deadline", { enumerable: true, get: function() {
      return internal_mod_1.deadline;
    } });
    Object.defineProperty(exports, "deferred", { enumerable: true, get: function() {
      return internal_mod_1.deferred;
    } });
    Object.defineProperty(exports, "delay", { enumerable: true, get: function() {
      return internal_mod_1.delay;
    } });
    Object.defineProperty(exports, "DrainingConnectionError", { enumerable: true, get: function() {
      return internal_mod_1.DrainingConnectionError;
    } });
    Object.defineProperty(exports, "Empty", { enumerable: true, get: function() {
      return internal_mod_1.Empty;
    } });
    Object.defineProperty(exports, "errors", { enumerable: true, get: function() {
      return internal_mod_1.errors;
    } });
    Object.defineProperty(exports, "hasWsProtocol", { enumerable: true, get: function() {
      return internal_mod_1.hasWsProtocol;
    } });
    Object.defineProperty(exports, "headers", { enumerable: true, get: function() {
      return internal_mod_1.headers;
    } });
    Object.defineProperty(exports, "InvalidArgumentError", { enumerable: true, get: function() {
      return internal_mod_1.InvalidArgumentError;
    } });
    Object.defineProperty(exports, "InvalidOperationError", { enumerable: true, get: function() {
      return internal_mod_1.InvalidOperationError;
    } });
    Object.defineProperty(exports, "InvalidSubjectError", { enumerable: true, get: function() {
      return internal_mod_1.InvalidSubjectError;
    } });
    Object.defineProperty(exports, "jwtAuthenticator", { enumerable: true, get: function() {
      return internal_mod_1.jwtAuthenticator;
    } });
    Object.defineProperty(exports, "Match", { enumerable: true, get: function() {
      return internal_mod_1.Match;
    } });
    Object.defineProperty(exports, "Metric", { enumerable: true, get: function() {
      return internal_mod_1.Metric;
    } });
    Object.defineProperty(exports, "millis", { enumerable: true, get: function() {
      return internal_mod_1.millis;
    } });
    Object.defineProperty(exports, "MsgHdrsImpl", { enumerable: true, get: function() {
      return internal_mod_1.MsgHdrsImpl;
    } });
    Object.defineProperty(exports, "nanos", { enumerable: true, get: function() {
      return internal_mod_1.nanos;
    } });
    Object.defineProperty(exports, "nkeyAuthenticator", { enumerable: true, get: function() {
      return internal_mod_1.nkeyAuthenticator;
    } });
    Object.defineProperty(exports, "nkeys", { enumerable: true, get: function() {
      return internal_mod_1.nkeys;
    } });
    Object.defineProperty(exports, "NoRespondersError", { enumerable: true, get: function() {
      return internal_mod_1.NoRespondersError;
    } });
    Object.defineProperty(exports, "Nuid", { enumerable: true, get: function() {
      return internal_mod_1.Nuid;
    } });
    Object.defineProperty(exports, "nuid", { enumerable: true, get: function() {
      return internal_mod_1.nuid;
    } });
    Object.defineProperty(exports, "PermissionViolationError", { enumerable: true, get: function() {
      return internal_mod_1.PermissionViolationError;
    } });
    Object.defineProperty(exports, "ProtocolError", { enumerable: true, get: function() {
      return internal_mod_1.ProtocolError;
    } });
    Object.defineProperty(exports, "RequestError", { enumerable: true, get: function() {
      return internal_mod_1.RequestError;
    } });
    Object.defineProperty(exports, "syncIterator", { enumerable: true, get: function() {
      return internal_mod_1.syncIterator;
    } });
    Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function() {
      return internal_mod_1.TimeoutError;
    } });
    Object.defineProperty(exports, "tokenAuthenticator", { enumerable: true, get: function() {
      return internal_mod_1.tokenAuthenticator;
    } });
    Object.defineProperty(exports, "UserAuthenticationExpiredError", { enumerable: true, get: function() {
      return internal_mod_1.UserAuthenticationExpiredError;
    } });
    Object.defineProperty(exports, "usernamePasswordAuthenticator", { enumerable: true, get: function() {
      return internal_mod_1.usernamePasswordAuthenticator;
    } });
    Object.defineProperty(exports, "wsconnect", { enumerable: true, get: function() {
      return internal_mod_1.wsconnect;
    } });
  }
});

// node_modules/@nats-io/kv/lib/types.js
var require_types2 = __commonJS({
  "node_modules/@nats-io/kv/lib/types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.kvPrefix = exports.KvWatchInclude = void 0;
    exports.KvWatchInclude = {
      /**
       * Include the last value for all the keys
       */
      LastValue: "",
      /**
       * Include all available history for all keys
       */
      AllHistory: "history",
      /**
       * Don't include history or last values, only notify
       * of updates
       */
      UpdatesOnly: "updates"
    };
    exports.kvPrefix = "KV_";
  }
});

// node_modules/@nats-io/jetstream/lib/types.js
var require_types3 = __commonJS({
  "node_modules/@nats-io/jetstream/lib/types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RepublishHeaders = exports.DirectMsgHeaders = exports.JsHeaders = exports.AdvisoryKind = void 0;
    exports.isOrderedPushConsumerOptions = isOrderedPushConsumerOptions;
    exports.isPullConsumer = isPullConsumer;
    exports.isPushConsumer = isPushConsumer;
    exports.isBoundPushConsumerOptions = isBoundPushConsumerOptions;
    function isOrderedPushConsumerOptions(v) {
      if (v && typeof v === "object") {
        return "name_prefix" in v || "deliver_subject_prefix" in v || "filter_subjects" in v || "filter_subject" in v || "deliver_policy" in v || "opt_start_seq" in v || "opt_start_time" in v || "replay_policy" in v || "inactive_threshold" in v || "headers_only" in v || "deliver_prefix" in v;
      }
      return false;
    }
    function isPullConsumer(v) {
      return v.isPullConsumer();
    }
    function isPushConsumer(v) {
      return v.isPushConsumer();
    }
    function isBoundPushConsumerOptions(v) {
      if (v && typeof v === "object") {
        return "deliver_subject" in v || "deliver_group" in v || "idle_heartbeat" in v;
      }
      return false;
    }
    exports.AdvisoryKind = {
      API: "api_audit",
      StreamAction: "stream_action",
      ConsumerAction: "consumer_action",
      SnapshotCreate: "snapshot_create",
      SnapshotComplete: "snapshot_complete",
      RestoreCreate: "restore_create",
      RestoreComplete: "restore_complete",
      MaxDeliver: "max_deliver",
      Terminated: "terminated",
      Ack: "consumer_ack",
      StreamLeaderElected: "stream_leader_elected",
      StreamQuorumLost: "stream_quorum_lost",
      ConsumerLeaderElected: "consumer_leader_elected",
      ConsumerQuorumLost: "consumer_quorum_lost"
    };
    exports.JsHeaders = {
      /**
       * Set if message is from a stream source - format is `stream seq`
       */
      StreamSourceHdr: "Nats-Stream-Source",
      /**
       * Set for heartbeat messages
       */
      LastConsumerSeqHdr: "Nats-Last-Consumer",
      /**
       * Set for heartbeat messages
       */
      LastStreamSeqHdr: "Nats-Last-Stream",
      /**
       * Set for heartbeat messages if the consumer is stalled, reply subject
       * will unstall the client when the client responds
       */
      ConsumerStalledHdr: "Nats-Consumer-Stalled",
      /**
       * Set for headers_only consumers indicates the number of bytes in the payload
       */
      MessageSizeHdr: "Nats-Msg-Size",
      // rollup header
      RollupHdr: "Nats-Rollup",
      // value for rollup header when rolling up a subject
      RollupValueSubject: "sub",
      // value for rollup header when rolling up all subjects
      RollupValueAll: "all",
      /**
       * Set on protocol messages to indicate pull request message count that
       * was not honored.
       */
      PendingMessagesHdr: "Nats-Pending-Messages",
      /**
       * Set on protocol messages to indicate pull request byte count that
       * was not honored
       */
      PendingBytesHdr: "Nats-Pending-Bytes",
      /**
       * Asserts a minimum JetStream API level on a JS API request (ADR-44).
       */
      RequiredApiLevel: "Nats-Required-Api-Level"
    };
    exports.DirectMsgHeaders = {
      Stream: "Nats-Stream",
      Sequence: "Nats-Sequence",
      TimeStamp: "Nats-Time-Stamp",
      Subject: "Nats-Subject",
      LastSequence: "Nats-Last-Sequence",
      NumPending: "Nats-Num-Pending"
    };
    exports.RepublishHeaders = {
      /**
       * The source stream of the message
       */
      Stream: "Nats-Stream",
      /**
       * The original subject of the message
       */
      Subject: "Nats-Subject",
      /**
       * The sequence of the republished message
       */
      Sequence: "Nats-Sequence",
      /**
       * The stream sequence id of the last message ingested to the same original subject (or 0 if none or deleted)
       */
      LastSequence: "Nats-Last-Sequence",
      /**
       * The size in bytes of the message's body - Only if {@link Republish#headers_only} is set.
       */
      Size: "Nats-Msg-Size"
    };
  }
});

// node_modules/@nats-io/jetstream/lib/jserrors.js
var require_jserrors = __commonJS({
  "node_modules/@nats-io/jetstream/lib/jserrors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.jserrors = exports.StreamNotFoundError = exports.ConsumerNotFoundError = exports.JetStreamApiError = exports.InvalidNameError = exports.JetStreamApiCodes = exports.JetStreamStatus = exports.JetStreamStatusError = exports.JetStreamError = exports.JetStreamNotEnabled = void 0;
    exports.isMessageNotFound = isMessageNotFound;
    var types_1 = require_types3();
    var JetStreamNotEnabled = class extends Error {
      constructor(message, opts) {
        super(message, opts);
        this.name = "JetStreamNotEnabled";
      }
    };
    exports.JetStreamNotEnabled = JetStreamNotEnabled;
    var JetStreamError = class extends Error {
      constructor(message, opts) {
        super(message, opts);
        this.name = "JetStreamError";
      }
    };
    exports.JetStreamError = JetStreamError;
    var JetStreamStatusError = class extends JetStreamError {
      code;
      constructor(message, code, opts) {
        super(message, opts);
        this.code = code;
        this.name = "JetStreamStatusError";
      }
    };
    exports.JetStreamStatusError = JetStreamStatusError;
    var JetStreamStatus = class _JetStreamStatus {
      msg;
      _description;
      constructor(msg) {
        this.msg = msg;
        this._description = "";
      }
      static maybeParseStatus(msg) {
        const status = new _JetStreamStatus(msg);
        return status.code === 0 ? null : status;
      }
      toError() {
        return new JetStreamStatusError(this.description, this.code);
      }
      debug() {
        console.log({
          subject: this.msg.subject,
          reply: this.msg.reply,
          description: this.description,
          status: this.code,
          headers: this.msg.headers
        });
      }
      get code() {
        return this.msg.headers?.code || 0;
      }
      get description() {
        if (this._description === "") {
          this._description = this.msg.headers?.description?.toLowerCase() || "";
          if (this._description === "") {
            this._description = this.code === 503 ? "no responders" : "unknown";
          }
        }
        return this._description;
      }
      isIdleHeartbeat() {
        return this.code === 100 && this.description === "idle heartbeat";
      }
      isFlowControlRequest() {
        return this.code === 100 && this.description === "flowcontrol request";
      }
      parseHeartbeat() {
        if (this.isIdleHeartbeat()) {
          return {
            type: "heartbeat",
            lastConsumerSequence: parseInt(this.msg.headers?.get("Nats-Last-Consumer") || "0"),
            lastStreamSequence: parseInt(this.msg.headers?.get("Nats-Last-Stream") || "0")
          };
        }
        return null;
      }
      isRequestTimeout() {
        return this.code === 408 && this.description === "request timeout";
      }
      parseDiscard() {
        const discard = {
          msgsLeft: 0,
          bytesLeft: 0
        };
        const msgsLeft = this.msg.headers?.get(types_1.JsHeaders.PendingMessagesHdr);
        if (msgsLeft) {
          discard.msgsLeft = parseInt(msgsLeft);
        }
        const bytesLeft = this.msg.headers?.get(types_1.JsHeaders.PendingBytesHdr);
        if (bytesLeft) {
          discard.bytesLeft = parseInt(bytesLeft);
        }
        return discard;
      }
      isBadRequest() {
        return this.code === 400;
      }
      isConsumerDeleted() {
        return this.code === 409 && this.description === "consumer deleted";
      }
      isStreamDeleted() {
        return this.code === 409 && this.description === "stream deleted";
      }
      isIdleHeartbeatMissed() {
        return this.code === 409 && this.description === "idle heartbeats missed";
      }
      isMaxWaitingExceeded() {
        return this.code === 409 && this.description === "exceeded maxwaiting";
      }
      isConsumerIsPushBased() {
        return this.code === 409 && this.description === "consumer is push based";
      }
      isExceededMaxWaiting() {
        return this.code === 409 && this.description.includes("exceeded maxwaiting");
      }
      isExceededMaxRequestBatch() {
        return this.code === 409 && this.description.includes("exceeded maxrequestbatch");
      }
      isExceededMaxExpires() {
        return this.code === 409 && this.description.includes("exceeded maxrequestexpires");
      }
      isExceededLimit() {
        return this.isExceededMaxExpires() || this.isExceededMaxWaiting() || this.isExceededMaxRequestBatch() || this.isMessageSizeExceedsMaxBytes();
      }
      isMessageNotFound() {
        return this.code === 404 && this.description === "message not found";
      }
      isNoResults() {
        return this.code === 404 && this.description === "no results";
      }
      isMessageSizeExceedsMaxBytes() {
        return this.code === 409 && this.description === "message size exceeds maxbytes";
      }
      isEndOfBatch() {
        return this.code === 204 && this.description === "eob";
      }
    };
    exports.JetStreamStatus = JetStreamStatus;
    exports.JetStreamApiCodes = {
      ConsumerNotFound: 10014,
      StreamNotFound: 10059,
      JetStreamNotEnabledForAccount: 10039,
      StreamWrongLastSequence: 10071,
      StreamWrongLastSequenceUnknown: 10164,
      NoMessageFound: 10037
    };
    function isMessageNotFound(err2) {
      return err2 instanceof JetStreamApiError && err2.code === exports.JetStreamApiCodes.NoMessageFound;
    }
    var InvalidNameError = class extends Error {
      constructor(message = "", opts) {
        super(message, opts);
        this.name = "InvalidNameError";
      }
    };
    exports.InvalidNameError = InvalidNameError;
    var JetStreamApiError = class extends Error {
      #apiError;
      constructor(jsErr, opts) {
        super(jsErr.description, opts);
        this.#apiError = jsErr;
        this.name = "JetStreamApiError";
      }
      get code() {
        return this.#apiError.err_code;
      }
      get status() {
        return this.#apiError.code;
      }
      apiError() {
        return Object.assign({}, this.#apiError);
      }
    };
    exports.JetStreamApiError = JetStreamApiError;
    var ConsumerNotFoundError = class extends JetStreamApiError {
      constructor(jsErr, opts) {
        super(jsErr, opts);
        this.name = "ConsumerNotFoundError";
      }
    };
    exports.ConsumerNotFoundError = ConsumerNotFoundError;
    var StreamNotFoundError = class _StreamNotFoundError extends JetStreamApiError {
      constructor(jsErr, opts) {
        super(jsErr, opts);
        this.name = "StreamNotFoundError";
      }
      static fromMessage(message) {
        return new _StreamNotFoundError({
          err_code: exports.JetStreamApiCodes.StreamNotFound,
          description: message,
          code: 404
        });
      }
    };
    exports.StreamNotFoundError = StreamNotFoundError;
    exports.jserrors = {
      InvalidNameError,
      ConsumerNotFoundError,
      StreamNotFoundError,
      JetStreamError,
      JetStreamApiError,
      JetStreamNotEnabled
    };
  }
});

// node_modules/@nats-io/jetstream/lib/jsbaseclient_api.js
var require_jsbaseclient_api = __commonJS({
  "node_modules/@nats-io/jetstream/lib/jsbaseclient_api.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BaseApiClientImpl = void 0;
    exports.parseJsResponse = parseJsResponse;
    exports.defaultJsOptions = defaultJsOptions;
    var internal_1 = require_internal_mod();
    var types_1 = require_types3();
    var jserrors_1 = require_jserrors();
    var defaultPrefix = "$JS.API";
    var defaultTimeout = 5e3;
    function parseJsResponse(m) {
      const v = JSON.parse(new TextDecoder().decode(m.data));
      const r = v;
      if (r.error) {
        switch (r.error.err_code) {
          case jserrors_1.JetStreamApiCodes.ConsumerNotFound:
            throw new jserrors_1.ConsumerNotFoundError(r.error);
          case jserrors_1.JetStreamApiCodes.StreamNotFound:
            throw new jserrors_1.StreamNotFoundError(r.error);
          case jserrors_1.JetStreamApiCodes.JetStreamNotEnabledForAccount: {
            const jserr = new jserrors_1.JetStreamApiError(r.error);
            throw new jserrors_1.JetStreamNotEnabled(jserr.message, { cause: jserr });
          }
          default:
            throw new jserrors_1.JetStreamApiError(r.error);
        }
      }
      return v;
    }
    function defaultJsOptions(opts) {
      opts = opts || {};
      if (opts.domain) {
        opts.apiPrefix = `$JS.${opts.domain}.API`;
        delete opts.domain;
      }
      return (0, internal_1.extend)({ apiPrefix: defaultPrefix, timeout: defaultTimeout }, opts);
    }
    var BaseApiClientImpl = class {
      nc;
      opts;
      prefix;
      timeout;
      constructor(nc, opts) {
        this.nc = nc;
        opts = opts || {};
        opts.watcherPrefix = opts.watcherPrefix || this.nc.options.inboxPrefix;
        this.opts = defaultJsOptions(opts);
        this._parseOpts();
        this.prefix = this.opts.apiPrefix;
        this.timeout = this.opts.timeout;
      }
      getOptions() {
        return Object.assign({}, this.opts);
      }
      sendRequiredApiLevel() {
        return this.opts.sendRequiredApiLevel === true;
      }
      _parseOpts() {
        let prefix = this.opts.apiPrefix;
        if (!prefix || prefix.length === 0) {
          throw internal_1.errors.InvalidArgumentError.format("prefix", "cannot be empty");
        }
        const c = prefix[prefix.length - 1];
        if (c === ".") {
          prefix = prefix.substr(0, prefix.length - 1);
        }
        this.opts.apiPrefix = prefix;
        (0, internal_1.createInbox)(this.opts.watcherPrefix);
      }
      async _request(subj, data = null, opts) {
        const { retries: r, minApiVersion, ...rest } = opts ?? {};
        const reqOpts = { ...rest, timeout: this.timeout };
        let a = internal_1.Empty;
        if (data) {
          a = new TextEncoder().encode(JSON.stringify(data));
        }
        if (typeof minApiVersion === "number") {
          const h2 = reqOpts.headers ?? (0, internal_1.headers)();
          h2.set(types_1.JsHeaders.RequiredApiLevel, minApiVersion.toString());
          reqOpts.headers = h2;
        }
        let retries = r || 1;
        retries = retries === -1 ? Number.MAX_SAFE_INTEGER : retries;
        const bo = (0, internal_1.backoff)();
        for (let i = 0; i < retries; i++) {
          try {
            const m = await this.nc.request(subj, a, reqOpts);
            return this.parseJsResponse(m);
          } catch (err2) {
            const re = err2 instanceof internal_1.RequestError ? err2 : null;
            if ((err2 instanceof internal_1.errors.TimeoutError || re?.isNoResponders()) && i + 1 < retries) {
              await (0, internal_1.delay)(bo.backoff(i));
            } else {
              throw re?.isNoResponders() ? new jserrors_1.JetStreamNotEnabled("jetstream is not enabled", {
                cause: err2
              }) : err2;
            }
          }
        }
      }
      async findStream(subject) {
        const q = { subject };
        const r = await this._request(`${this.prefix}.STREAM.NAMES`, q);
        const names = r;
        if (!names.streams || names.streams.length !== 1) {
          throw jserrors_1.StreamNotFoundError.fromMessage("no stream matches subject");
        }
        return names.streams[0];
      }
      getConnection() {
        return this.nc;
      }
      parseJsResponse(m) {
        return parseJsResponse(m);
      }
    };
    exports.BaseApiClientImpl = BaseApiClientImpl;
  }
});

// node_modules/@nats-io/jetstream/lib/jslister.js
var require_jslister = __commonJS({
  "node_modules/@nats-io/jetstream/lib/jslister.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ListerImpl = void 0;
    var internal_1 = require_internal_mod();
    var ListerImpl = class {
      err;
      offset;
      pageInfo;
      subject;
      jsm;
      filter;
      payload;
      constructor(subject, filter, jsm, payload) {
        if (!subject) {
          throw internal_1.errors.InvalidArgumentError.format("subject", "is required");
        }
        this.subject = subject;
        this.jsm = jsm;
        this.offset = 0;
        this.pageInfo = {};
        this.filter = filter;
        this.payload = payload || {};
      }
      async next() {
        if (this.err) {
          return [];
        }
        if (this.pageInfo && this.offset >= this.pageInfo.total) {
          return [];
        }
        const offset = { offset: this.offset };
        if (this.payload) {
          Object.assign(offset, this.payload);
        }
        try {
          const r = await this.jsm._request(this.subject, offset, { timeout: this.jsm.timeout });
          this.pageInfo = r;
          const count = this.countResponse(r);
          if (count === 0) {
            return [];
          }
          this.offset += count;
          return this.filter(r);
        } catch (err2) {
          this.err = err2;
          throw err2;
        }
      }
      countResponse(r) {
        switch (r?.type) {
          case "io.nats.jetstream.api.v1.stream_names_response":
          case "io.nats.jetstream.api.v1.stream_list_response":
            return r.streams?.length || 0;
          case "io.nats.jetstream.api.v1.consumer_list_response":
            return r.consumers?.length || 0;
          default:
            console.error(`jslister.ts: unknown API response for paged output: ${r?.type}`);
            return r.streams?.length || 0;
        }
      }
      async *[Symbol.asyncIterator]() {
        let page = await this.next();
        while (page.length > 0) {
          for (const item of page) {
            yield item;
          }
          page = await this.next();
        }
      }
    };
    exports.ListerImpl = ListerImpl;
  }
});

// node_modules/@nats-io/jetstream/lib/jsutil.js
var require_jsutil = __commonJS({
  "node_modules/@nats-io/jetstream/lib/jsutil.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateDurableName = validateDurableName;
    exports.validateStreamName = validateStreamName;
    exports.minValidation = minValidation;
    exports.validateName = validateName;
    exports.validName = validName;
    var jserrors_1 = require_jserrors();
    function validateDurableName(name) {
      return minValidation("durable", name);
    }
    function validateStreamName(name) {
      return minValidation("stream", name);
    }
    function minValidation(context, name = "") {
      if (name === "") {
        throw Error(`${context} name required`);
      }
      const bad = [".", "*", ">", "/", "\\", " ", "	", "\n", "\r"];
      bad.forEach((v) => {
        if (name.indexOf(v) !== -1) {
          switch (v) {
            case "\n":
              v = "\\n";
              break;
            case "\r":
              v = "\\r";
              break;
            case "	":
              v = "\\t";
              break;
            default:
          }
          throw new jserrors_1.InvalidNameError(`${context} name ('${name}') cannot contain '${v}'`);
        }
      });
      return "";
    }
    function validateName(context, name = "") {
      if (name === "") {
        throw Error(`${context} name required`);
      }
      const m = validName(name);
      if (m.length) {
        throw new Error(`invalid ${context} name - ${context} name ${m}`);
      }
    }
    function validName(name = "") {
      if (name === "") {
        throw Error(`name required`);
      }
      const RE = /^[-\w]+$/g;
      const m = name.match(RE);
      if (m === null) {
        for (const c of name.split("")) {
          const mm = c.match(RE);
          if (mm === null) {
            return `cannot contain '${c}'`;
          }
        }
      }
      return "";
    }
  }
});

// node_modules/@nats-io/jetstream/lib/jsapi_types.js
var require_jsapi_types = __commonJS({
  "node_modules/@nats-io/jetstream/lib/jsapi_types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PubHeaders = exports.PriorityPolicy = exports.ConsumerApiAction = exports.PersistMode = exports.StoreCompression = exports.ReplayPolicy = exports.AckPolicy = exports.DeliverPolicy = exports.StorageType = exports.DiscardPolicy = exports.RetentionPolicy = void 0;
    exports.defaultConsumer = defaultConsumer;
    var nats_core_1 = require_mod4();
    exports.RetentionPolicy = {
      /**
       * Retain messages until the limits are reached, then trigger the discard policy.
       */
      Limits: "limits",
      /**
       * Retain messages while there is consumer interest on the particular subject.
       */
      Interest: "interest",
      /**
       * Retain messages until acknowledged
       */
      Workqueue: "workqueue"
    };
    exports.DiscardPolicy = {
      /**
       * Discard old messages to make room for the new ones
       */
      Old: "old",
      /**
       * Discard the new messages
       */
      New: "new"
    };
    exports.StorageType = {
      /**
       * Store persistently on files
       */
      File: "file",
      /**
       * Store in server memory - doesn't survive server restarts
       */
      Memory: "memory"
    };
    exports.DeliverPolicy = {
      /**
       * Deliver all messages
       */
      All: "all",
      /**
       * Deliver starting with the last message
       */
      Last: "last",
      /**
       * Deliver starting with new messages
       */
      New: "new",
      /**
       * Deliver starting with the specified sequence
       */
      StartSequence: "by_start_sequence",
      /**
       * Deliver starting with the specified time
       */
      StartTime: "by_start_time",
      /**
       * Deliver starting with the last messages for every subject
       */
      LastPerSubject: "last_per_subject"
    };
    exports.AckPolicy = {
      /**
       * Messages don't need to be Ack'ed.
       */
      None: "none",
      /**
       * Ack, acknowledges all messages with a lower sequence
       */
      All: "all",
      /**
       * All sequences must be explicitly acknowledged
       */
      Explicit: "explicit",
      /**
       * Functions like AckAll, but acks based on flow control responses. Used
       * for durable mirror/source consumers (ADR-60). Available on server 2.14+.
       */
      FlowControl: "flow_control",
      /**
       * @ignore
       */
      NotSet: ""
    };
    exports.ReplayPolicy = {
      /**
       * Replays messages as fast as possible
       */
      Instant: "instant",
      /**
       * Replays messages following the original delay between messages
       */
      Original: "original"
    };
    exports.StoreCompression = {
      /**
       * No compression
       */
      None: "none",
      /**
       * S2 compression
       */
      S2: "s2"
    };
    exports.PersistMode = {
      /**
       * All writes are committed and stream data is synced to disk before the publish
       * acknowledgement is sent.
       * This is the default mode, and provides the strongest data durability guarantee.
       */
      Default: "default",
      /**
       * Writes to the stream are committed, but writes to the disk are asynchronously synced.
       * The publish acknowledgement is sent before the sync to the disk is complete.
       * This could result in data-loss if the server crashes before the sync is completed, however
       * with an R3+ stream, the replication provides in-flight redundancy to reduce the likelihood of
       * this occurring with distinct fault domains.
       * This can significantly increase the publish throughput.
       */
      Async: "async"
    };
    exports.ConsumerApiAction = {
      CreateOrUpdate: "",
      Update: "update",
      Create: "create"
    };
    exports.PriorityPolicy = {
      None: "none",
      Overflow: "overflow",
      PinnedClient: "pinned_client",
      Prioritized: "prioritized"
    };
    function defaultConsumer(name, opts = {}) {
      return Object.assign({
        name,
        deliver_policy: exports.DeliverPolicy.All,
        ack_policy: exports.AckPolicy.Explicit,
        ack_wait: (0, nats_core_1.nanos)(30 * 1e3),
        replay_policy: exports.ReplayPolicy.Instant
      }, opts);
    }
    exports.PubHeaders = {
      MsgIdHdr: "Nats-Msg-Id",
      ExpectedStreamHdr: "Nats-Expected-Stream",
      ExpectedLastSeqHdr: "Nats-Expected-Last-Sequence",
      ExpectedLastMsgIdHdr: "Nats-Expected-Last-Msg-Id",
      ExpectedLastSubjectSequenceHdr: "Nats-Expected-Last-Subject-Sequence",
      ExpectedLastSubjectSequenceSubjectHdr: "Nats-Expected-Last-Subject-Sequence-Subject",
      /**
       * Sets the TTL for a message (Nanos value). Only have effect on streams that
       * enable `StreamConfig.allow_msg_ttl`.
       */
      MessageTTL: "Nats-TTL",
      Schedule: "Nats-Schedule",
      ScheduleTarget: "Nats-Schedule-Target",
      ScheduleSource: "Nats-Schedule-Source",
      ScheduleTTL: "Nats-Schedule-TTL",
      ScheduleTimeZone: "Nats-Schedule-Time-Zone",
      ScheduleRollup: "Nats-Schedule-Rollup",
      /**
       * Set on messages produced by the scheduler. Holds the subject of the
       * schedule that produced the message. Also used by clients to atomically
       * cancel a schedule (set together with `ScheduleNext: "purge"`).
       */
      Scheduler: "Nats-Scheduler",
      /**
       * Set on messages produced by the scheduler. Holds the timestamp of the
       * next invocation for cron schedules, or `purge` for delayed messages.
       * Also used by clients with value `purge` to atomically cancel a schedule.
       */
      ScheduleNext: "Nats-Schedule-Next"
    };
  }
});

// node_modules/@nats-io/jetstream/lib/jsmconsumer_api.js
var require_jsmconsumer_api = __commonJS({
  "node_modules/@nats-io/jetstream/lib/jsmconsumer_api.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ConsumerAPIImpl = void 0;
    var jsbaseclient_api_1 = require_jsbaseclient_api();
    var jslister_1 = require_jslister();
    var jsutil_1 = require_jsutil();
    var internal_1 = require_internal_mod();
    var jsapi_types_1 = require_jsapi_types();
    var ConsumerAPIImpl = class extends jsbaseclient_api_1.BaseApiClientImpl {
      constructor(nc, opts) {
        super(nc, opts);
      }
      async addUpdate(stream, cfg, opts, delta) {
        (0, jsutil_1.validateStreamName)(stream);
        opts = opts || {};
        if (cfg.deliver_group && cfg.flow_control) {
          throw internal_1.InvalidArgumentError.format(["flow_control", "deliver_group"], "are mutually exclusive");
        }
        if (cfg.deliver_group && cfg.idle_heartbeat) {
          throw internal_1.InvalidArgumentError.format(["idle_heartbeat", "deliver_group"], "are mutually exclusive");
        }
        if (isPriorityGroup(cfg)) {
          const { min: min2, ok } = this.nc.features.get(internal_1.Feature.JS_PRIORITY_GROUPS);
          if (!ok) {
            throw new Error(`priority_groups require server ${min2}`);
          }
          if (cfg.deliver_subject) {
            throw internal_1.InvalidArgumentError.format("deliver_subject", "cannot be set when using priority groups");
          }
          validatePriorityGroups(cfg);
        }
        const cr2 = {};
        cr2.config = cfg;
        cr2.stream_name = stream;
        cr2.action = opts.action || jsapi_types_1.ConsumerApiAction.Create;
        cr2.pedantic = opts.pedantic || false;
        if (cr2.config.durable_name) {
          (0, jsutil_1.validateDurableName)(cr2.config.durable_name);
        }
        const nci = this.nc;
        let { min, ok: newAPI } = nci.features.get(internal_1.Feature.JS_NEW_CONSUMER_CREATE_API);
        const name = cfg.name === "" ? void 0 : cfg.name;
        if (name && !newAPI) {
          throw internal_1.InvalidArgumentError.format("name", `requires server ${min}`);
        }
        if (name) {
          try {
            (0, jsutil_1.minValidation)("name", name);
          } catch (err2) {
            const m = err2.message;
            const idx = m.indexOf("cannot contain");
            if (idx !== -1) {
              throw new Error(`consumer 'name' ${m.substring(idx)}`);
            }
            throw err2;
          }
        }
        let subj;
        let consumerName = "";
        if (Array.isArray(cfg.filter_subjects)) {
          const { min: min2, ok } = nci.features.get(internal_1.Feature.JS_MULTIPLE_CONSUMER_FILTER);
          if (!ok) {
            throw internal_1.InvalidArgumentError.format("filter_subjects", `requires server ${min2}`);
          }
          newAPI = false;
        }
        if (cfg.metadata) {
          const { min: min2, ok } = nci.features.get(internal_1.Feature.JS_STREAM_CONSUMER_METADATA);
          if (!ok) {
            throw internal_1.InvalidArgumentError.format("metadata", `requires server ${min2}`);
          }
        }
        if (newAPI) {
          consumerName = cfg.name ?? cfg.durable_name ?? "";
        }
        if (consumerName !== "") {
          let fs = cfg.filter_subject ?? void 0;
          if (fs === ">") {
            fs = void 0;
          }
          subj = fs !== void 0 ? `${this.prefix}.CONSUMER.CREATE.${stream}.${consumerName}.${fs}` : `${this.prefix}.CONSUMER.CREATE.${stream}.${consumerName}`;
        } else {
          subj = cfg.durable_name ? `${this.prefix}.CONSUMER.DURABLE.CREATE.${stream}.${cfg.durable_name}` : `${this.prefix}.CONSUMER.CREATE.${stream}`;
        }
        const assertCfg = delta ?? cr2.config;
        const r = await this._request(subj, cr2, { ...opts, ...this.requiredApiOpts(assertCfg) });
        return r;
      }
      // mirrors server/jetstream_versioning.go:setStaticConsumerMetadata
      minConsumerApi(c) {
        if (c.ack_policy === jsapi_types_1.AckPolicy.FlowControl)
          return 4;
        if (typeof c.pause_until === "string" && c.pause_until !== "")
          return 1;
        if (c.priority_policy !== void 0 && c.priority_policy !== jsapi_types_1.PriorityPolicy.None)
          return 1;
        if (typeof c.priority_timeout === "number" && c.priority_timeout > 0) {
          return 1;
        }
        if (Array.isArray(c.priority_groups) && c.priority_groups.length > 0) {
          return 1;
        }
        return 0;
      }
      requiredApiOpts(c) {
        if (!this.sendRequiredApiLevel())
          return {};
        const minApiVersion = this.minConsumerApi(c);
        return minApiVersion > 0 ? { minApiVersion } : {};
      }
      add(stream, cfg, opts) {
        opts = opts || {};
        let action = jsapi_types_1.ConsumerApiAction.Create;
        if (typeof opts === "string") {
          action = opts;
          opts = {};
        }
        const cco = Object.assign({}, { action }, opts);
        return this.addUpdate(stream, cfg, cco);
      }
      async update(stream, durable, cfg) {
        const ci = await this.info(stream, durable);
        const changable = cfg;
        return this.addUpdate(stream, Object.assign(ci.config, changable), { action: jsapi_types_1.ConsumerApiAction.Update }, changable);
      }
      async info(stream, name) {
        (0, jsutil_1.validateStreamName)(stream);
        (0, jsutil_1.validateDurableName)(name);
        const r = await this._request(`${this.prefix}.CONSUMER.INFO.${stream}.${name}`);
        return r;
      }
      async delete(stream, name) {
        (0, jsutil_1.validateStreamName)(stream);
        (0, jsutil_1.validateDurableName)(name);
        const r = await this._request(`${this.prefix}.CONSUMER.DELETE.${stream}.${name}`);
        const cr2 = r;
        return cr2.success;
      }
      list(stream) {
        (0, jsutil_1.validateStreamName)(stream);
        const filter = (v) => {
          const clr = v;
          return clr.consumers;
        };
        const subj = `${this.prefix}.CONSUMER.LIST.${stream}`;
        return new jslister_1.ListerImpl(subj, filter, this);
      }
      // Fixme: the API returns the number of nanoseconds, but really should return
      //  millis,
      pause(stream, name, until) {
        const subj = `${this.prefix}.CONSUMER.PAUSE.${stream}.${name}`;
        const opts = {
          pause_until: until.toISOString()
        };
        return this._request(subj, opts);
      }
      // Fixme: the API returns the number of nanoseconds, but really should return
      //  millis,
      resume(stream, name) {
        return this.pause(stream, name, /* @__PURE__ */ new Date(0));
      }
      unpin(stream, name, group) {
        const subj = `${this.prefix}.CONSUMER.UNPIN.${stream}.${name}`;
        return this._request(subj, { group });
      }
      async reset(stream, name, seq2) {
        (0, jsutil_1.validateStreamName)(stream);
        (0, jsutil_1.validateDurableName)(name);
        const nci = this.nc;
        const { min, ok } = nci.features.get(internal_1.Feature.JS_CONSUMER_RESET);
        if (!ok) {
          throw new Error(`consumer reset requires server ${min}`);
        }
        if (typeof seq2 === "number" && (!Number.isInteger(seq2) || seq2 < 0)) {
          throw internal_1.InvalidArgumentError.format("seq", "must be a non-negative integer");
        }
        const subj = `${this.prefix}.CONSUMER.RESET.${stream}.${name}`;
        const body = typeof seq2 === "number" ? { seq: seq2 } : void 0;
        const r = await this._request(subj, body);
        return r;
      }
    };
    exports.ConsumerAPIImpl = ConsumerAPIImpl;
    function isPriorityGroup(config) {
      const pg = config;
      return pg && pg.priority_groups !== void 0 || pg.priority_policy !== void 0;
    }
    function validatePriorityGroups(pg) {
      if (isPriorityGroup(pg)) {
        if (!Array.isArray(pg.priority_groups)) {
          throw internal_1.InvalidArgumentError.format(["priority_groups"], "must be an array");
        }
        if (pg.priority_groups.length === 0) {
          throw internal_1.InvalidArgumentError.format(["priority_groups"], "must have at least one group");
        }
        pg.priority_groups.forEach((g) => {
          (0, jsutil_1.minValidation)("priority_group", g);
          if (g.length > 16) {
            throw internal_1.errors.InvalidArgumentError.format("group", "must be 16 characters or less");
          }
        });
        if (pg.priority_policy !== jsapi_types_1.PriorityPolicy.None && pg.priority_policy !== jsapi_types_1.PriorityPolicy.Overflow && pg.priority_policy !== jsapi_types_1.PriorityPolicy.PinnedClient && pg.priority_policy !== jsapi_types_1.PriorityPolicy.Prioritized) {
          throw internal_1.InvalidArgumentError.format(["priority_policy"], "must be 'none', 'prioritized', 'overflow', or 'pinned_client'");
        }
      }
    }
  }
});

// node_modules/@nats-io/jetstream/lib/jsmsg.js
var require_jsmsg = __commonJS({
  "node_modules/@nats-io/jetstream/lib/jsmsg.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.JsMsgImpl = exports.ACK = void 0;
    exports.toJsMsg = toJsMsg;
    exports.parseInfo = parseInfo;
    var internal_1 = require_internal_mod();
    exports.ACK = Uint8Array.of(43, 65, 67, 75);
    var NAK = Uint8Array.of(45, 78, 65, 75);
    var WPI = Uint8Array.of(43, 87, 80, 73);
    var NXT = Uint8Array.of(43, 78, 88, 84);
    var TERM = Uint8Array.of(43, 84, 69, 82, 77);
    var SPACE = Uint8Array.of(32);
    function toJsMsg(m, ackTimeout = 5e3) {
      return new JsMsgImpl(m, ackTimeout);
    }
    function parseInfo(s) {
      const tokens = s.split(".");
      if (tokens.length === 9) {
        tokens.splice(2, 0, "_", "");
      }
      if (tokens.length < 11 || tokens[0] !== "$JS" || tokens[1] !== "ACK") {
        throw new Error(`unable to parse delivery info - not a jetstream message`);
      }
      const di = {};
      di.domain = tokens[2] === "_" ? "" : tokens[2];
      di.account_hash = tokens[3];
      di.stream = tokens[4];
      di.consumer = tokens[5];
      di.deliveryCount = parseInt(tokens[6], 10);
      di.redelivered = di.deliveryCount > 1;
      di.streamSequence = parseInt(tokens[7], 10);
      di.deliverySequence = parseInt(tokens[8], 10);
      di.timestampNanos = parseInt(tokens[9], 10);
      di.pending = parseInt(tokens[10], 10);
      return di;
    }
    function parseTimestampNanos(s) {
      const tokens = s.split(".");
      if (tokens.length === 9) {
        tokens.splice(2, 0, "_", "");
      }
      if (tokens.length < 11 || tokens[0] !== "$JS" || tokens[1] !== "ACK") {
        throw new Error(`unable to parse delivery info - not a jetstream message`);
      }
      return BigInt(tokens[9]);
    }
    var JsMsgImpl = class {
      msg;
      di;
      didAck;
      timeout;
      constructor(msg, timeout) {
        this.msg = msg;
        this.didAck = false;
        this.timeout = timeout;
      }
      get subject() {
        return this.msg.subject;
      }
      get sid() {
        return this.msg.sid;
      }
      get data() {
        return this.msg.data;
      }
      get headers() {
        return this.msg.headers;
      }
      get info() {
        if (!this.di) {
          this.di = parseInfo(this.reply);
        }
        return this.di;
      }
      get redelivered() {
        return this.info.deliveryCount > 1;
      }
      get reply() {
        return this.msg.reply || "";
      }
      get seq() {
        return this.info.streamSequence;
      }
      get time() {
        const ms = (0, internal_1.millis)(this.info.timestampNanos);
        return new Date(ms);
      }
      get timestamp() {
        return this.time.toISOString();
      }
      get timestampNanos() {
        return parseTimestampNanos(this.reply);
      }
      doAck(payload) {
        if (!this.didAck) {
          this.didAck = !this.isWIP(payload);
          this.msg.respond(payload);
        }
      }
      isWIP(p) {
        return p.length === 4 && p[0] === WPI[0] && p[1] === WPI[1] && p[2] === WPI[2] && p[3] === WPI[3];
      }
      // this has to dig into the internals as the message has access
      // to the protocol but not the high-level client.
      async ackAck(opts) {
        const d = (0, internal_1.deferred)();
        if (!this.didAck) {
          this.didAck = true;
          if (this.msg.reply) {
            opts = opts || {};
            opts.timeout = opts.timeout || this.timeout;
            const mi = this.msg;
            const proto = mi.publisher;
            const trace = !(proto.options?.noAsyncTraces || false);
            const r = new internal_1.RequestOne(proto.muxSubscriptions, this.msg.reply, {
              timeout: opts.timeout
            }, trace);
            proto.request(r);
            try {
              proto.publish(this.msg.reply, exports.ACK, {
                reply: `${proto.muxSubscriptions.baseInbox}${r.token}`
              });
            } catch (err2) {
              r.cancel(err2);
            }
            try {
              await Promise.race([r.timer, r.deferred]);
              d.resolve(true);
            } catch (err2) {
              r.cancel(err2);
              d.reject(err2);
            }
          } else {
            d.resolve(false);
          }
        } else {
          d.resolve(false);
        }
        return d;
      }
      ack() {
        this.doAck(exports.ACK);
      }
      nak(millis) {
        let payload = NAK;
        if (millis) {
          payload = new TextEncoder().encode(`-NAK ${JSON.stringify({ delay: (0, internal_1.nanos)(millis) })}`);
        }
        this.doAck(payload);
      }
      working() {
        this.doAck(WPI);
      }
      next(subj, opts = { batch: 1 }) {
        const args = {};
        args.batch = opts.batch || 1;
        args.no_wait = opts.no_wait || false;
        if (opts.expires && opts.expires > 0) {
          args.expires = (0, internal_1.nanos)(opts.expires);
        }
        const data = new TextEncoder().encode(JSON.stringify(args));
        const payload = internal_1.DataBuffer.concat(NXT, SPACE, data);
        const reqOpts = subj ? { reply: subj } : void 0;
        this.msg.respond(payload, reqOpts);
      }
      term(reason = "") {
        let term = TERM;
        if (reason?.length > 0) {
          term = new TextEncoder().encode(`+TERM ${reason}`);
        }
        this.doAck(term);
      }
      json() {
        return this.msg.json();
      }
      string() {
        return this.msg.string();
      }
    };
    exports.JsMsgImpl = JsMsgImpl;
  }
});

// node_modules/@nats-io/jetstream/lib/consumer.js
var require_consumer = __commonJS({
  "node_modules/@nats-io/jetstream/lib/consumer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PullConsumerImpl = exports.PullConsumerMessagesImpl = exports.PullConsumerType = void 0;
    exports.isOverflowOptions = isOverflowOptions;
    exports.isPrioritizedOptions = isPrioritizedOptions;
    exports.validateOverflowPullOptions = validateOverflowPullOptions;
    exports.validatePrioritizedPullOptions = validatePrioritizedPullOptions;
    var internal_1 = require_internal_mod();
    var jsmsg_1 = require_jsmsg();
    var jsapi_types_1 = require_jsapi_types();
    var jserrors_1 = require_jserrors();
    var jsutil_1 = require_jsutil();
    exports.PullConsumerType = {
      Unset: "",
      Consume: "consume",
      Fetch: "fetch"
    };
    function isOverflowOptions(opts) {
      const oo = opts;
      return oo && typeof oo.group === "string" || typeof oo.min_pending === "number" || typeof oo.min_ack_pending === "number";
    }
    function isPrioritizedOptions(opts) {
      const oo = opts;
      return oo && typeof oo.group === "string" && typeof oo.priority === "number";
    }
    var PullConsumerMessagesImpl = class extends internal_1.QueuedIteratorImpl {
      consumer;
      opts;
      sub;
      monitor;
      pending;
      isConsume;
      callback;
      listeners;
      statusIterator;
      abortOnMissingResource;
      bind;
      inboxPrefix;
      inbox;
      cancelables;
      inReset;
      closeListener;
      isPinned;
      isPriority;
      natsPinId;
      // callback: ConsumerCallbackFn;
      constructor(c, opts, refilling = false) {
        super();
        this.consumer = c;
        this.isConsume = refilling;
        this.cancelables = [];
        this.inboxPrefix = (0, internal_1.createInbox)(this.consumer.api.nc.options.inboxPrefix);
        this.inbox = `${this.inboxPrefix}.${this.consumer.serial}`;
        this.inReset = false;
        this.isPinned = false;
        this.isPriority = false;
        this.natsPinId = "";
        if (this.consumer.ordered) {
          if (isOverflowOptions(opts)) {
            throw internal_1.errors.InvalidArgumentError.format([
              "group",
              "min_pending",
              "min_ack_pending"
            ], "cannot be specified for ordered consumers");
          }
          if (this.consumer.orderedConsumerState === void 0) {
            const ocs = {};
            const iopts = c.opts;
            ocs.namePrefix = iopts.name_prefix ?? `oc_${internal_1.nuid.next()}`;
            ocs.opts = iopts;
            ocs.cursor = { stream_seq: 1, deliver_seq: 0 };
            const startSeq = c._info.config.opt_start_seq || 0;
            ocs.cursor.stream_seq = startSeq > 0 ? startSeq - 1 : 0;
            ocs.createFails = 0;
            this.consumer.orderedConsumerState = ocs;
          }
        }
        const copts = opts;
        this.opts = this.parseOptions(opts, this.isConsume);
        this.callback = copts.callback || null;
        this.noIterator = typeof this.callback === "function";
        this.monitor = null;
        this.pending = { msgs: 0, bytes: 0, requests: 0 };
        this.listeners = [];
        this.abortOnMissingResource = copts.abort_on_missing_resource === true;
        this.bind = copts.bind === true;
        if (copts.group) {
          const { min_pending, min_ack_pending } = copts;
          this.isPinned = min_pending === void 0 && min_ack_pending === void 0;
          const { priority } = copts;
          this.isPriority = typeof priority === "number";
        }
        this.closeListener = {
          // we don't propagate the error here
          connectionClosedCallback: () => {
            this._push(() => {
              this.stop();
            });
          }
        };
        this.consumer.api.nc.addCloseListener(this.closeListener);
        this.start();
      }
      start() {
        const { max_messages, max_bytes, idle_heartbeat, threshold_bytes, threshold_messages } = this.opts;
        this.sub = this.consumer.api.nc.subscribe(this.inbox, {
          callback: (err2, msg) => {
            if (err2) {
              this.stop(err2);
              return;
            }
            this.monitor?.work();
            const isProtocol = this.consumer.ordered ? msg.subject.indexOf(this?.inboxPrefix) === 0 : msg.subject === this.inbox;
            if (isProtocol) {
              if (msg.subject !== this.sub.getSubject()) {
                return;
              }
              const status = new jserrors_1.JetStreamStatus(msg);
              const hb = status.parseHeartbeat();
              if (hb) {
                this.notify(hb);
                return;
              }
              const code = status.code;
              const description = status.description;
              const { msgsLeft, bytesLeft } = status.parseDiscard();
              if (msgsLeft && msgsLeft > 0 || bytesLeft && bytesLeft > 0) {
                this.pending.msgs -= msgsLeft;
                this.pending.bytes -= bytesLeft;
                this.pending.requests--;
                this.notify({
                  type: "discard",
                  messagesLeft: msgsLeft,
                  bytesLeft
                });
              }
              switch (code) {
                case 400:
                  this.stop(status.toError());
                  return;
                case 409: {
                  const err3 = this.handle409(status);
                  if (err3) {
                    this.stop(err3);
                    return;
                  }
                  if (status.isMessageSizeExceedsMaxBytes() && this.yields.length > 0) {
                    break;
                  }
                  return;
                }
                case 423:
                  this.natsPinId = "";
                  this.notify({ type: "consumer_unpinned" });
                  break;
                case 503:
                  this.notify({ type: "no_responders", code });
                  if (this.consumer.ordered) {
                    const ocs = this.consumer.orderedConsumerState;
                    ocs.needsReset = true;
                  }
                  if (!this.isConsume) {
                    this.stop(status.toError());
                    return;
                  }
                  break;
                default:
                  this.notify({ type: "debug", code, description });
              }
            } else {
              const m = (0, jsmsg_1.toJsMsg)(msg, this.consumer.api.timeout);
              if (this.isPinned) {
                const pinID = m?.headers?.get("Nats-Pin-Id");
                if (pinID && this.natsPinId === "") {
                  this.natsPinId = pinID;
                  this.notify({ type: "consumer_pinned", id: pinID });
                }
              }
              if (this.consumer.ordered) {
                const cursor = this.consumer.orderedConsumerState.cursor;
                const dseq = m.info.deliverySequence;
                const sseq = m.info.streamSequence;
                const expected_dseq = cursor.deliver_seq + 1;
                if (dseq !== expected_dseq) {
                  this.reset();
                  return;
                }
                cursor.deliver_seq = dseq;
                cursor.stream_seq = sseq;
              }
              this._push(m);
              this.received++;
              if (this.pending.msgs) {
                this.pending.msgs--;
              }
              if (this.pending.bytes) {
                this.pending.bytes -= msg.size();
              }
            }
            if (this.pending.msgs === 0 && this.pending.bytes === 0) {
              this.pending.requests = 0;
            }
            if (this.isConsume) {
              if (max_messages && this.pending.msgs <= threshold_messages || max_bytes && this.pending.bytes <= threshold_bytes) {
                const batch = this.pullOptions();
                this.pull(batch);
              }
            } else if (this.pending.requests === 0) {
              this._push(() => {
                this.stop();
              });
            }
          }
        });
        if (idle_heartbeat) {
          this.monitor = new internal_1.IdleHeartbeatMonitor(idle_heartbeat, (count) => {
            this.notify({ type: "heartbeats_missed", count });
            if (!this.isConsume && !this.consumer.ordered) {
              this.stop(new jserrors_1.JetStreamError("heartbeats missed"));
              return true;
            }
            this.resetPending().then(() => {
            }).catch(() => {
            });
            return false;
          }, { maxOut: 2 });
        }
        (async () => {
          const status = this.consumer.api.nc.status();
          this.statusIterator = status;
          for await (const s of status) {
            switch (s.type) {
              case "disconnect":
                this.monitor?.cancel();
                break;
              case "reconnect":
                this.resetPending().then((ok) => {
                  if (ok) {
                    this.monitor?.restart();
                  }
                }).catch(() => {
                });
                break;
              default:
            }
          }
        })();
        this.sub.closed.then(() => {
          if (this.sub.isDraining()) {
            this._push(() => {
              this.stop();
            });
          }
        });
        this.pull(this.pullOptions());
      }
      /**
       * Handle the notification of 409 error and whether
       * it should reject the operation by returning an Error or null
       * @param status
       */
      handle409(status) {
        const { code, description } = status;
        if (status.isConsumerDeleted()) {
          this.notify({ type: "consumer_deleted", code, description });
        } else if (status.isExceededLimit()) {
          this.notify({ type: "exceeded_limits", code, description });
        }
        if (!this.isConsume) {
          return status.toError();
        }
        if (status.isConsumerDeleted() && this.abortOnMissingResource) {
          return status.toError();
        }
        return null;
      }
      reset() {
        this.monitor?.cancel();
        const ocs = this.consumer.orderedConsumerState;
        const { name } = this.consumer._info?.config;
        if (name) {
          this.notify({ type: "reset", name });
          this.consumer.api.delete(this.consumer.stream, name).catch(() => {
          });
        }
        const config = this.consumer.getConsumerOpts();
        this.inbox = `${this.inboxPrefix}.${this.consumer.serial}`;
        ocs.cursor.deliver_seq = 0;
        this.consumer.name = config.name;
        this.consumer.api.nc._resub(this.sub, this.inbox);
        this.consumer.api.add(this.consumer.stream, config).then((ci) => {
          ocs.createFails = 0;
          this.consumer._info = ci;
          this.notify({ type: "ordered_consumer_recreated", name: ci.name });
          this.monitor?.restart();
          this.pull(this.pullOptions());
        }).catch((err2) => {
          ocs.createFails++;
          if (err2.message === "stream not found") {
            this.notify({
              type: "stream_not_found",
              consumerCreateFails: ocs.createFails,
              name: this.consumer.stream
            });
            if (this.abortOnMissingResource) {
              this.stop(err2);
              return;
            }
          }
          if (ocs.createFails >= 30 && this.received === 0) {
            this.stop(err2);
          }
          const bo = (0, internal_1.backoff)();
          const c = (0, internal_1.delay)(bo.backoff(ocs.createFails));
          c.then(() => {
            const idx = this.cancelables.indexOf(c);
            if (idx !== -1) {
              this.cancelables = this.cancelables.splice(idx, idx);
            }
            if (!this.done) {
              this.reset();
            }
          }).catch((_) => {
          });
          this.cancelables.push(c);
        });
      }
      _push(r) {
        if (!this.callback) {
          super.push(r);
        } else {
          const fn = typeof r === "function" ? r : null;
          try {
            if (!fn) {
              const m = r;
              this.callback(m);
            } else {
              fn();
            }
          } catch (err2) {
            this.stop(err2);
          }
        }
      }
      notify(n) {
        if (this.listeners.length > 0) {
          (() => {
            this.listeners.forEach((l) => {
              const qi = l;
              if (!qi.done) {
                qi.push(n);
              }
            });
          })();
        }
      }
      async resetPending() {
        if (this.inReset) {
          return Promise.resolve(true);
        }
        this.inReset = true;
        const v = this.bind ? this.resetPendingNoInfo() : this.resetPendingWithInfo();
        const tf = await v;
        this.inReset = false;
        return tf;
      }
      resetPendingNoInfo() {
        this.pending.msgs = 0;
        this.pending.bytes = 0;
        this.pending.requests = 0;
        this.pull(this.pullOptions());
        return Promise.resolve(true);
      }
      async resetPendingWithInfo() {
        let notFound = 0;
        let streamNotFound = 0;
        const bo = (0, internal_1.backoff)([this.opts.expires || 3e4]);
        let attempt = 0;
        while (true) {
          if (this.done) {
            return false;
          }
          if (this.consumer.api.nc.isClosed()) {
            return false;
          }
          try {
            await this.consumer.info();
            notFound = 0;
            this.pending.msgs = 0;
            this.pending.bytes = 0;
            this.pending.requests = 0;
            this.pull(this.pullOptions());
            return true;
          } catch (err2) {
            if (err2 instanceof internal_1.errors.ClosedConnectionError) {
              this.stop(err2);
              return false;
            }
            if (err2.message === "stream not found") {
              streamNotFound++;
              this.notify({ type: "stream_not_found", name: this.consumer.stream });
              if (!this.isConsume || this.abortOnMissingResource) {
                this.stop(err2);
                return false;
              }
            } else if (err2.message === "consumer not found") {
              notFound++;
              this.notify({
                type: "consumer_not_found",
                name: this.consumer.name,
                stream: this.consumer.stream,
                count: notFound
              });
              if (!this.isConsume || this.abortOnMissingResource) {
                if (this.consumer.ordered) {
                  const ocs = this.consumer.orderedConsumerState;
                  ocs.needsReset = true;
                }
                this.stop(err2);
                return false;
              }
              if (this.consumer.ordered) {
                this.reset();
                return false;
              }
            } else {
              notFound = 0;
              streamNotFound = 0;
            }
            const to = bo.backoff(attempt);
            const de = (0, internal_1.delay)(to);
            await Promise.race([de, this.consumer.api.nc.closed()]);
            de.cancel();
            attempt++;
          }
        }
      }
      pull(opts) {
        this.pending.bytes += opts.max_bytes ?? 0;
        this.pending.msgs += opts.batch ?? 0;
        this.pending.requests++;
        const nc = this.consumer.api.nc;
        const subj = `${this.consumer.api.prefix}.CONSUMER.MSG.NEXT.${this.consumer.stream}.${this.consumer._info.name}`;
        this._push(() => {
          nc.publish(subj, JSON.stringify(opts), { reply: this.inbox });
          this.notify({ type: "next", options: opts });
        });
      }
      pullOptions() {
        const batch = this.opts.max_messages - this.pending.msgs;
        const max_bytes = this.opts.max_bytes - this.pending.bytes;
        const idle_heartbeat = (0, internal_1.nanos)(this.opts.idle_heartbeat);
        const expires = (0, internal_1.nanos)(this.opts.expires);
        const opts = { batch, max_bytes, idle_heartbeat, expires };
        if (this.isPinned && this.natsPinId !== "") {
          opts.id = this.natsPinId;
        }
        if (isOverflowOptions(this.opts)) {
          opts.group = this.opts.group;
          if (this.opts.min_pending) {
            opts.min_pending = this.opts.min_pending;
          }
          if (this.opts.min_ack_pending) {
            opts.min_ack_pending = this.opts.min_ack_pending;
          }
        }
        if (isPrioritizedOptions(this.opts)) {
          opts.group = this.opts.group;
          opts.priority = this.opts.priority;
        }
        return opts;
      }
      close() {
        this.stop();
        return this.iterClosed;
      }
      closed() {
        return this.iterClosed;
      }
      clearTimers() {
        this.monitor?.cancel();
        this.monitor = null;
      }
      stop(err2) {
        if (this.done) {
          return;
        }
        this.consumer.api.nc.removeCloseListener(this.closeListener);
        this.sub?.unsubscribe();
        this.clearTimers();
        this.statusIterator?.stop();
        this._push(() => {
          super.stop(err2);
          this.listeners.forEach((iter) => {
            iter.stop();
          });
        });
      }
      parseOptions(opts, refilling = false) {
        const args = opts || {};
        args.max_messages = args.max_messages || 0;
        args.max_bytes = args.max_bytes || 0;
        if (args.max_messages !== 0 && args.max_bytes !== 0) {
          throw internal_1.errors.InvalidArgumentError.format(["max_messages", "max_bytes"], "are mutually exclusive");
        }
        if (args.max_messages === 0) {
          args.max_messages = 100;
        }
        args.expires = args.expires || 3e4;
        if (args.expires < 1e3) {
          throw internal_1.errors.InvalidArgumentError.format("expires", "must be at least 1000ms");
        }
        args.idle_heartbeat = args.idle_heartbeat || args.expires / 2;
        args.idle_heartbeat = args.idle_heartbeat > 3e4 ? 3e4 : args.idle_heartbeat;
        if (args.idle_heartbeat < 500) {
          args.idle_heartbeat = 500;
        }
        if (refilling) {
          const minMsgs = Math.round(args.max_messages * 0.75) || 1;
          args.threshold_messages = args.threshold_messages || minMsgs;
          const minBytes = Math.round(args.max_bytes * 0.75) || 1;
          args.threshold_bytes = args.threshold_bytes || minBytes;
        }
        if (isOverflowOptions(opts)) {
          const { min, ok } = this.consumer.api.nc.features.get(internal_1.Feature.JS_PRIORITY_GROUPS);
          if (!ok) {
            throw new Error(`priority_groups require server ${min}`);
          }
          validateOverflowPullOptions(opts);
          if (opts.group) {
            args.group = opts.group;
          }
          if (opts.min_ack_pending) {
            args.min_ack_pending = opts.min_ack_pending;
          }
          if (opts.min_pending) {
            args.min_pending = opts.min_pending;
          }
        } else if (isPrioritizedOptions(opts)) {
          validatePrioritizedPullOptions(opts);
          if (opts.group) {
            args.group = opts.group;
          }
          if (typeof opts.priority === "number") {
            args.priority = opts.priority;
          }
        }
        return args;
      }
      status() {
        const iter = new internal_1.QueuedIteratorImpl();
        this.listeners.push(iter);
        return iter;
      }
    };
    exports.PullConsumerMessagesImpl = PullConsumerMessagesImpl;
    var PullConsumerImpl = class {
      api;
      _info;
      stream;
      name;
      opts;
      type;
      messages;
      ordered;
      serial;
      orderedConsumerState;
      constructor(api, info, opts = null) {
        this.api = api;
        this._info = info;
        this.name = info.name;
        this.stream = info.stream_name;
        this.ordered = opts !== null;
        this.opts = opts || {};
        this.serial = 1;
        this.type = exports.PullConsumerType.Unset;
      }
      debug() {
        console.log({
          serial: this.serial,
          cursor: this.orderedConsumerState?.cursor
        });
      }
      isPullConsumer() {
        return true;
      }
      isPushConsumer() {
        return false;
      }
      consume(opts = {
        max_messages: 100,
        expires: 3e4
      }) {
        opts = { ...opts };
        if (this.ordered) {
          if (opts.bind) {
            return Promise.reject(internal_1.errors.InvalidArgumentError.format("bind", "is not supported"));
          }
          if (this.type === exports.PullConsumerType.Fetch) {
            return Promise.reject(new internal_1.errors.InvalidOperationError("ordered consumer initialized as fetch"));
          }
          if (this.type === exports.PullConsumerType.Consume) {
            return Promise.reject(new internal_1.errors.InvalidOperationError("ordered consumer doesn't support concurrent consume"));
          }
          this.type = exports.PullConsumerType.Consume;
        }
        return Promise.resolve(new PullConsumerMessagesImpl(this, opts, true));
      }
      async fetch(opts = {
        max_messages: 100,
        expires: 3e4
      }) {
        opts = { ...opts };
        if (this.ordered) {
          if (opts.group) {
            return Promise.reject(internal_1.errors.InvalidArgumentError.format("group", "ordered consumers don't support priority groups"));
          }
          if (opts.bind) {
            return Promise.reject(internal_1.errors.InvalidArgumentError.format("bind", "is not supported"));
          }
          if (this.type === exports.PullConsumerType.Consume) {
            return Promise.reject(new internal_1.errors.InvalidOperationError("ordered consumer already initialized as consume"));
          }
          if (this.messages?.done === false) {
            return Promise.reject(new internal_1.errors.InvalidOperationError("ordered consumer doesn't support concurrent fetch"));
          }
          if (this.ordered) {
            if (this.orderedConsumerState?.cursor?.deliver_seq) {
              this._info.config.opt_start_seq = this.orderedConsumerState?.cursor.stream_seq + 1;
            }
            if (this.orderedConsumerState?.needsReset === true) {
              await this._reset();
            }
          }
          this.type = exports.PullConsumerType.Fetch;
        }
        const m = new PullConsumerMessagesImpl(this, opts);
        if (this.ordered) {
          this.messages = m;
        }
        return Promise.resolve(m);
      }
      async next(opts = { expires: 3e4 }) {
        opts = { ...opts };
        const fopts = opts;
        fopts.max_messages = 1;
        const iter = await this.fetch(fopts);
        try {
          for await (const m of iter) {
            return m;
          }
        } catch (err2) {
          return Promise.reject(err2);
        }
        return null;
      }
      delete() {
        const { stream_name, name } = this._info;
        return this.api.delete(stream_name, name);
      }
      getConsumerOpts() {
        const ocs = this.orderedConsumerState;
        this.serial++;
        this.name = `${ocs.namePrefix}_${this.serial}`;
        const conf = Object.assign({}, this._info.config, {
          name: this.name,
          deliver_policy: jsapi_types_1.DeliverPolicy.StartSequence,
          opt_start_seq: ocs.cursor.stream_seq + 1,
          ack_policy: jsapi_types_1.AckPolicy.None,
          inactive_threshold: (0, internal_1.nanos)(5 * 60 * 1e3),
          num_replicas: 1
        });
        delete conf.metadata;
        return conf;
      }
      async _reset() {
        if (this.messages === void 0) {
          throw new Error("not possible to reset");
        }
        this.delete().catch(() => {
        });
        const conf = this.getConsumerOpts();
        const ci = await this.api.add(this.stream, conf);
        this._info = ci;
        return ci;
      }
      async info(cached = false) {
        if (cached) {
          return Promise.resolve(this._info);
        }
        const { stream_name, name } = this._info;
        this._info = await this.api.info(stream_name, name);
        return this._info;
      }
    };
    exports.PullConsumerImpl = PullConsumerImpl;
    function validateOverflowPullOptions(opts) {
      if (isOverflowOptions(opts)) {
        (0, jsutil_1.minValidation)("group", opts.group);
        if (opts.group.length > 16) {
          throw internal_1.errors.InvalidArgumentError.format("group", "must be 16 characters or less");
        }
        const { min_pending, min_ack_pending } = opts;
        if (min_pending && typeof min_pending !== "number") {
          throw internal_1.errors.InvalidArgumentError.format(["min_pending"], "must be a number");
        }
        if (min_ack_pending && typeof min_ack_pending !== "number") {
          throw internal_1.errors.InvalidArgumentError.format(["min_ack_pending"], "must be a number");
        }
      }
    }
    function validatePrioritizedPullOptions(opts) {
      if (isPrioritizedOptions(opts)) {
        (0, jsutil_1.minValidation)("group", opts.group);
        if (opts.group.length > 16) {
          throw internal_1.errors.InvalidArgumentError.format("group", "must be 16 characters or less");
        }
        const { priority } = opts;
        if (priority && typeof priority !== "number") {
          throw internal_1.errors.InvalidArgumentError.format(["priority"], "must be a number");
        }
      }
    }
  }
});

// node_modules/@nats-io/jetstream/lib/pushconsumer.js
var require_pushconsumer = __commonJS({
  "node_modules/@nats-io/jetstream/lib/pushconsumer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PushConsumerImpl = exports.PushConsumerMessagesImpl = void 0;
    var jsmsg_1 = require_jsmsg();
    var jsapi_types_1 = require_jsapi_types();
    var types_1 = require_types3();
    var internal_1 = require_internal_mod();
    var jserrors_1 = require_jserrors();
    var PushConsumerMessagesImpl = class extends internal_1.QueuedIteratorImpl {
      consumer;
      sub;
      monitor;
      listeners;
      abortOnMissingResource;
      callback;
      ordered;
      cursor;
      namePrefix;
      deliverPrefix;
      serial;
      createFails;
      statusIterator;
      cancelables;
      constructor(c, userOptions = {}, internalOptions = {}) {
        super();
        this.consumer = c;
        this.monitor = null;
        this.listeners = [];
        this.cancelables = [];
        this.abortOnMissingResource = userOptions.abort_on_missing_resource === true;
        this.callback = userOptions.callback || null;
        this.noIterator = this.callback !== null;
        this.namePrefix = null;
        this.deliverPrefix = null;
        this.ordered = internalOptions.ordered === true;
        this.serial = 1;
        if (this.ordered) {
          this.namePrefix = internalOptions.name_prefix ?? `oc_${internal_1.nuid.next()}`;
          this.deliverPrefix = internalOptions.deliver_prefix ?? (0, internal_1.createInbox)(this.consumer.api.nc.options.inboxPrefix);
          this.cursor = { stream_seq: 1, deliver_seq: 0 };
          const startSeq = c._info.config.opt_start_seq || 0;
          this.cursor.stream_seq = startSeq > 0 ? startSeq - 1 : 0;
          this.createFails = 0;
        }
        this.start();
      }
      reset() {
        const { name } = this.consumer._info?.config;
        if (name) {
          this.consumer.api.delete(this.consumer.stream, name).catch(() => {
          });
        }
        const config = this.getConsumerOpts();
        this.cursor.deliver_seq = 0;
        this.consumer.name = config.name;
        this.consumer.serial = this.serial;
        this.consumer.api.nc._resub(this.sub, config.deliver_subject);
        this.consumer.api.add(this.consumer.stream, config).then((ci) => {
          this.createFails = 0;
          this.consumer._info = ci;
          this.notify({ type: "ordered_consumer_recreated", name: ci.name });
        }).catch((err2) => {
          this.createFails++;
          if (err2.message === "stream not found") {
            this.notify({
              type: "stream_not_found",
              name: this.consumer.stream,
              consumerCreateFails: this.createFails
            });
            if (this.abortOnMissingResource) {
              this.stop(err2);
              return;
            }
          }
          if (this.createFails >= 30 && this.received === 0) {
            this.stop(err2);
          }
          const bo = (0, internal_1.backoff)();
          const c = (0, internal_1.delay)(bo.backoff(this.createFails));
          c.then(() => {
            if (!this.done) {
              this.reset();
            }
          }).catch(() => {
          }).finally(() => {
            const idx = this.cancelables.indexOf(c);
            if (idx !== -1) {
              this.cancelables = this.cancelables.splice(idx, idx);
            }
          });
          this.cancelables.push(c);
        });
      }
      getConsumerOpts() {
        const src = Object.assign({}, this.consumer._info.config);
        this.serial++;
        const name = `${this.namePrefix}_${this.serial}`;
        return Object.assign(src, {
          name,
          deliver_policy: jsapi_types_1.DeliverPolicy.StartSequence,
          opt_start_seq: this.cursor.stream_seq + 1,
          ack_policy: jsapi_types_1.AckPolicy.None,
          inactive_threshold: (0, internal_1.nanos)(5 * 60 * 1e3),
          num_replicas: 1,
          flow_control: true,
          idle_heartbeat: (0, internal_1.nanos)(30 * 1e3),
          deliver_subject: `${this.deliverPrefix}.${this.serial}`
        });
      }
      closed() {
        return this.iterClosed;
      }
      close() {
        this.stop();
        return this.iterClosed;
      }
      stop(err2) {
        if (this.done) {
          return;
        }
        this.statusIterator?.stop();
        this.monitor?.cancel();
        this.monitor = null;
        this.cancelables.forEach((c) => {
          c.cancel();
        });
        Promise.all(this.cancelables).then(() => {
          this.cancelables = [];
        }).catch(() => {
        }).finally(() => {
          this._push(() => {
            super.stop(err2);
            this.listeners.forEach((n) => {
              n.stop();
            });
          });
        });
      }
      _push(r) {
        if (!this.callback) {
          super.push(r);
        } else {
          const fn = typeof r === "function" ? r : null;
          try {
            if (!fn) {
              const m = r;
              this.received++;
              this.callback(m);
              this.processed++;
            } else {
              fn();
            }
          } catch (err2) {
            this.stop(err2);
          }
        }
      }
      status() {
        const iter = new internal_1.QueuedIteratorImpl();
        this.listeners.push(iter);
        return iter;
      }
      start() {
        const { deliver_subject: subject, deliver_group: queue, idle_heartbeat: hbNanos } = this.consumer._info.config;
        if (!subject) {
          throw new Error("bad consumer info");
        }
        if (hbNanos) {
          const ms = (0, internal_1.millis)(hbNanos);
          this.monitor = new internal_1.IdleHeartbeatMonitor(ms, (count) => {
            this.notify({ type: "heartbeats_missed", count });
            if (this.ordered) {
              this.reset();
            }
            return false;
          }, { maxOut: 2 });
          (async () => {
            this.statusIterator = this.consumer.api.nc.status();
            for await (const s of this.statusIterator) {
              switch (s.type) {
                case "disconnect":
                  this.monitor?.cancel();
                  break;
                case "reconnect":
                  this.monitor?.restart();
                  break;
                default:
              }
            }
          })();
        }
        this.sub = this.consumer.api.nc.subscribe(subject, {
          queue,
          callback: (err2, msg) => {
            if (err2) {
              this.stop(err2);
              return;
            }
            this.monitor?.work();
            const isProtocol = this.ordered ? msg.subject.indexOf(this?.deliverPrefix) === 0 : msg.subject === subject;
            if (isProtocol) {
              if (msg.subject !== this.sub.getSubject()) {
                return;
              }
              const status = new jserrors_1.JetStreamStatus(msg);
              if (status.isFlowControlRequest()) {
                this._push(() => {
                  msg.respond();
                  this.notify({ type: "flow_control" });
                });
                return;
              }
              if (status.isIdleHeartbeat()) {
                const lastConsumerSequence = parseInt(msg.headers?.get(types_1.JsHeaders.LastConsumerSeqHdr) || "0");
                const lastStreamSequence = parseInt(msg.headers?.get(types_1.JsHeaders.LastStreamSeqHdr) ?? "0");
                this.notify({
                  type: "heartbeat",
                  lastStreamSequence,
                  lastConsumerSequence
                });
                const maybeStuck = msg.headers?.get(types_1.JsHeaders.ConsumerStalledHdr);
                if (typeof maybeStuck === "string" && maybeStuck !== "") {
                  msg.publisher.publish(maybeStuck, internal_1.Empty);
                }
                return;
              }
              const code = status.code;
              const description = status.description;
              if (status.isConsumerDeleted()) {
                this.notify({ type: "consumer_deleted", code, description });
              }
              if (this.abortOnMissingResource) {
                this._push(() => {
                  this.stop(status.toError());
                });
                return;
              }
            } else {
              const m = (0, jsmsg_1.toJsMsg)(msg);
              if (this.ordered) {
                const dseq = m.info.deliverySequence;
                if (dseq !== this.cursor.deliver_seq + 1) {
                  this.reset();
                  return;
                }
                this.cursor.deliver_seq = dseq;
                this.cursor.stream_seq = m.info.streamSequence;
              }
              this._push(m);
            }
          }
        });
        this.sub.closed.then(() => {
          this._push(() => {
            this.stop();
          });
        });
        this.closed().then(() => {
          this.sub?.unsubscribe();
        });
      }
      notify(n) {
        if (this.listeners.length > 0) {
          (() => {
            this.listeners.forEach((l) => {
              const qi = l;
              if (!qi.done) {
                qi.push(n);
              }
            });
          })();
        }
      }
    };
    exports.PushConsumerMessagesImpl = PushConsumerMessagesImpl;
    var PushConsumerImpl = class {
      api;
      _info;
      stream;
      name;
      bound;
      ordered;
      started;
      serial;
      opts;
      constructor(api, info, opts = {}) {
        this.api = api;
        this._info = info;
        this.stream = info.stream_name;
        this.name = info.name;
        this.bound = opts.bound === true;
        this.started = false;
        this.opts = opts;
        this.serial = 0;
        this.ordered = opts.ordered || false;
        if (this.ordered) {
          this.serial = 1;
        }
      }
      consume(userOptions = {}) {
        userOptions = { ...userOptions };
        if (this.started) {
          return Promise.reject(new internal_1.errors.InvalidOperationError("consumer already started"));
        }
        if (!this._info.config.deliver_subject) {
          return Promise.reject(new Error("deliver_subject is not set, not a push consumer"));
        }
        if (!this._info.config.deliver_group && this._info.push_bound) {
          return Promise.reject(new internal_1.errors.InvalidOperationError("consumer is already bound"));
        }
        const v = new PushConsumerMessagesImpl(this, userOptions, this.opts);
        this.started = true;
        v.closed().then(() => {
          this.started = false;
        });
        return Promise.resolve(v);
      }
      delete() {
        if (this.bound) {
          return Promise.reject(new internal_1.errors.InvalidOperationError("bound consumers cannot delete"));
        }
        const { stream_name, name } = this._info;
        return this.api.delete(stream_name, name);
      }
      async info(cached) {
        if (this.bound) {
          return Promise.reject(new internal_1.errors.InvalidOperationError("bound consumers cannot info"));
        }
        if (cached) {
          return Promise.resolve(this._info);
        }
        const info = await this.api.info(this.stream, this.name);
        this._info = info;
        return info;
      }
      isPullConsumer() {
        return false;
      }
      isPushConsumer() {
        return true;
      }
    };
    exports.PushConsumerImpl = PushConsumerImpl;
  }
});

// node_modules/@nats-io/jetstream/lib/jsmstream_api.js
var require_jsmstream_api = __commonJS({
  "node_modules/@nats-io/jetstream/lib/jsmstream_api.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StreamsImpl = exports.StoredMsgImpl = exports.StreamAPIImpl = exports.StreamImpl = exports.ConsumersImpl = void 0;
    exports.convertStreamSourceDomain = convertStreamSourceDomain;
    var internal_1 = require_internal_mod();
    var jsbaseclient_api_1 = require_jsbaseclient_api();
    var jslister_1 = require_jslister();
    var jsutil_1 = require_jsutil();
    var types_1 = require_types3();
    var jsapi_types_1 = require_jsapi_types();
    var consumer_1 = require_consumer();
    var jsmconsumer_api_1 = require_jsmconsumer_api();
    var pushconsumer_1 = require_pushconsumer();
    var jserrors_1 = require_jserrors();
    function convertStreamSourceDomain(s) {
      if (s === void 0) {
        return void 0;
      }
      const { domain } = s;
      if (domain === void 0) {
        return s;
      }
      const copy = Object.assign({}, s);
      delete copy.domain;
      if (domain === "") {
        return copy;
      }
      if (copy.external) {
        throw internal_1.InvalidArgumentError.format(["domain", "external"], "are mutually exclusive");
      }
      copy.external = { api: `$JS.${domain}.API` };
      return copy;
    }
    var ConsumersImpl = class {
      api;
      notified;
      constructor(api) {
        this.api = api;
        this.notified = false;
      }
      checkVersion() {
        const fv = this.api.nc.features.get(internal_1.Feature.JS_SIMPLIFICATION);
        if (!fv.ok) {
          return Promise.reject(new Error(`consumers framework is only supported on servers ${fv.min} or better`));
        }
        return Promise.resolve();
      }
      async getPushConsumer(stream, name) {
        await this.checkVersion();
        (0, jsutil_1.minValidation)("stream", stream);
        if (typeof name === "string") {
          (0, jsutil_1.minValidation)("name", name);
          const ci = await this.api.info(stream, name);
          if (typeof ci.config.deliver_subject !== "string") {
            return Promise.reject(new Error("not a push consumer"));
          }
          return new pushconsumer_1.PushConsumerImpl(this.api, ci);
        } else if (name === void 0) {
          return this.getOrderedPushConsumer(stream);
        } else if ((0, types_1.isOrderedPushConsumerOptions)(name)) {
          const opts = name;
          return this.getOrderedPushConsumer(stream, opts);
        }
        return Promise.reject(new Error("unsupported push consumer type"));
      }
      async getOrderedPushConsumer(stream, opts = {}) {
        opts = Object.assign({}, opts);
        let { name_prefix, deliver_prefix, filter_subjects } = opts;
        delete opts.deliver_prefix;
        delete opts.name_prefix;
        delete opts.filter_subjects;
        if (typeof opts.opt_start_seq === "number") {
          opts.deliver_policy = jsapi_types_1.DeliverPolicy.StartSequence;
        }
        if (typeof opts.opt_start_time === "string") {
          opts.deliver_policy = jsapi_types_1.DeliverPolicy.StartTime;
        }
        name_prefix = name_prefix || `oc_${internal_1.nuid.next()}`;
        (0, jsutil_1.minValidation)("name_prefix", name_prefix);
        deliver_prefix = deliver_prefix || (0, internal_1.createInbox)(this.api.getOptions().watcherPrefix);
        const cc = Object.assign({}, opts);
        cc.ack_policy = jsapi_types_1.AckPolicy.None;
        cc.inactive_threshold = (0, internal_1.nanos)(5 * 60 * 1e3);
        cc.num_replicas = 1;
        cc.max_deliver = 1;
        cc.flow_control = true;
        cc.idle_heartbeat = (0, internal_1.nanos)(3e4);
        if (Array.isArray(filter_subjects)) {
          cc.filter_subjects = filter_subjects;
        }
        if (typeof filter_subjects === "string") {
          cc.filter_subject = filter_subjects;
        }
        if (typeof cc.filter_subjects === "undefined" && typeof cc.filter_subject === "undefined") {
          cc.filter_subject = ">";
        }
        cc.name = `${name_prefix}_1`;
        cc.deliver_subject = `${deliver_prefix}.1`;
        const ci = await this.api.add(stream, cc);
        const iopts = {
          name_prefix,
          deliver_prefix,
          ordered: true
        };
        return new pushconsumer_1.PushConsumerImpl(this.api, ci, iopts);
      }
      getBoundPushConsumer(opts) {
        if ((0, types_1.isBoundPushConsumerOptions)(opts)) {
          const ci = { config: opts };
          return Promise.resolve(new pushconsumer_1.PushConsumerImpl(this.api, ci, { bound: true }));
        } else {
          return Promise.reject(internal_1.errors.InvalidArgumentError.format("deliver_subject", "is required"));
        }
      }
      async get(stream, name) {
        await this.checkVersion();
        if (typeof name === "string") {
          const ci = await this.api.info(stream, name);
          if (typeof ci.config.deliver_subject === "string") {
            return Promise.reject(new Error("not a pull consumer"));
          } else {
            return new consumer_1.PullConsumerImpl(this.api, ci);
          }
        } else {
          return this.ordered(stream, name);
        }
      }
      getConsumerFromInfo(ci) {
        if (typeof ci.config.deliver_subject === "string") {
          throw new Error("not a pull consumer");
        }
        return new consumer_1.PullConsumerImpl(this.api, ci);
      }
      async ordered(stream, opts = {}) {
        await this.checkVersion();
        const impl = this.api;
        const sapi = new StreamAPIImpl(impl.nc, impl.opts);
        await sapi.info(stream);
        if (typeof opts.name_prefix === "string") {
          (0, jsutil_1.minValidation)("name_prefix", opts.name_prefix);
        }
        opts.name_prefix = opts.name_prefix || internal_1.nuid.next();
        const name = `${opts.name_prefix}_1`;
        const config = {
          name,
          deliver_policy: jsapi_types_1.DeliverPolicy.StartSequence,
          opt_start_seq: opts.opt_start_seq || 1,
          ack_policy: jsapi_types_1.AckPolicy.None,
          inactive_threshold: (0, internal_1.nanos)(5 * 60 * 1e3),
          num_replicas: 1,
          max_deliver: 1,
          mem_storage: true
        };
        if (opts.headers_only === true) {
          config.headers_only = true;
        }
        if (Array.isArray(opts.filter_subjects)) {
          config.filter_subjects = opts.filter_subjects;
        }
        if (typeof opts.filter_subjects === "string") {
          config.filter_subject = opts.filter_subjects;
        }
        if (opts.replay_policy) {
          config.replay_policy = opts.replay_policy;
        }
        config.deliver_policy = opts.deliver_policy || jsapi_types_1.DeliverPolicy.StartSequence;
        if (opts.deliver_policy === jsapi_types_1.DeliverPolicy.All || opts.deliver_policy === jsapi_types_1.DeliverPolicy.LastPerSubject || opts.deliver_policy === jsapi_types_1.DeliverPolicy.New || opts.deliver_policy === jsapi_types_1.DeliverPolicy.Last) {
          delete config.opt_start_seq;
          config.deliver_policy = opts.deliver_policy;
        }
        if (config.deliver_policy === jsapi_types_1.DeliverPolicy.LastPerSubject) {
          if (typeof config.filter_subjects === "undefined" && typeof config.filter_subject === "undefined") {
            config.filter_subject = ">";
          }
        }
        if (opts.opt_start_time) {
          delete config.opt_start_seq;
          config.deliver_policy = jsapi_types_1.DeliverPolicy.StartTime;
          config.opt_start_time = opts.opt_start_time;
        }
        if (opts.inactive_threshold) {
          config.inactive_threshold = (0, internal_1.nanos)(opts.inactive_threshold);
        }
        const ci = await this.api.add(stream, config);
        return Promise.resolve(new consumer_1.PullConsumerImpl(this.api, ci, opts));
      }
    };
    exports.ConsumersImpl = ConsumersImpl;
    var StreamImpl = class _StreamImpl {
      api;
      _info;
      constructor(api, info) {
        this.api = api;
        this._info = info;
      }
      get name() {
        return this._info.config.name;
      }
      alternates() {
        return this.info().then((si) => {
          return si.alternates ? si.alternates : [];
        });
      }
      async best() {
        await this.info();
        if (this._info.alternates) {
          const asi = await this.api.info(this._info.alternates[0].name);
          return new _StreamImpl(this.api, asi);
        } else {
          return this;
        }
      }
      info(cached = false, opts) {
        if (cached) {
          return Promise.resolve(this._info);
        }
        return this.api.info(this.name, opts).then((si) => {
          this._info = si;
          return this._info;
        });
      }
      getConsumer(name) {
        return new ConsumersImpl(new jsmconsumer_api_1.ConsumerAPIImpl(this.api.nc, this.api.opts)).get(this.name, name);
      }
      getPushConsumer(name) {
        return new ConsumersImpl(new jsmconsumer_api_1.ConsumerAPIImpl(this.api.nc, this.api.opts)).getPushConsumer(this.name, name);
      }
      getMessage(query) {
        return this.api.getMessage(this.name, query);
      }
      deleteMessage(seq2, erase = true) {
        return this.api.deleteMessage(this.name, seq2, erase);
      }
      resetConsumer(name, seq2) {
        return new jsmconsumer_api_1.ConsumerAPIImpl(this.api.nc, this.api.opts).reset(this.name, name, seq2);
      }
    };
    exports.StreamImpl = StreamImpl;
    var StreamAPIImpl = class extends jsbaseclient_api_1.BaseApiClientImpl {
      constructor(nc, opts) {
        super(nc, opts);
      }
      checkStreamConfigVersions(cfg) {
        const nci = this.nc;
        if (cfg.metadata) {
          const { min, ok } = nci.features.get(internal_1.Feature.JS_STREAM_CONSUMER_METADATA);
          if (!ok) {
            throw new Error(`stream 'metadata' requires server ${min}`);
          }
        }
        if (cfg.first_seq) {
          const { min, ok } = nci.features.get(internal_1.Feature.JS_STREAM_FIRST_SEQ);
          if (!ok) {
            throw new Error(`stream 'first_seq' requires server ${min}`);
          }
        }
        if (cfg.subject_transform) {
          const { min, ok } = nci.features.get(internal_1.Feature.JS_STREAM_SUBJECT_TRANSFORM);
          if (!ok) {
            throw new Error(`stream 'subject_transform' requires server ${min}`);
          }
        }
        if (cfg.compression) {
          const { min, ok } = nci.features.get(internal_1.Feature.JS_STREAM_COMPRESSION);
          if (!ok) {
            throw new Error(`stream 'compression' requires server ${min}`);
          }
        }
        if (cfg.consumer_limits) {
          const { min, ok } = nci.features.get(internal_1.Feature.JS_DEFAULT_CONSUMER_LIMITS);
          if (!ok) {
            throw new Error(`stream 'consumer_limits' requires server ${min}`);
          }
        }
        function validateStreamSource(context, src) {
          const count = src?.subject_transforms?.length || 0;
          if (count > 0) {
            const { min, ok } = nci.features.get(internal_1.Feature.JS_STREAM_SOURCE_SUBJECT_TRANSFORM);
            if (!ok) {
              throw new Error(`${context} 'subject_transforms' requires server ${min}`);
            }
          }
        }
        if (cfg.sources) {
          cfg.sources.forEach((src) => {
            validateStreamSource("stream sources", src);
          });
        }
        if (cfg.mirror) {
          validateStreamSource("stream mirror", cfg.mirror);
        }
      }
      // mirrors server/jetstream_versioning.go:setStaticStreamMetadata
      minStreamApi(c) {
        if (c.allow_batched === true || c.mirror?.consumer || c.sources?.some((s) => s.consumer))
          return 4;
        if (c.allow_msg_counter === true || c.allow_atomic === true || c.allow_msg_schedules === true || c.persist_mode === jsapi_types_1.PersistMode.Async)
          return 2;
        if (c.allow_msg_ttl === true || typeof c.subject_delete_marker_ttl === "number" && c.subject_delete_marker_ttl > 0)
          return 1;
        return 0;
      }
      requiredApiOpts(c) {
        if (!this.sendRequiredApiLevel())
          return {};
        const minApiVersion = this.minStreamApi(c);
        return minApiVersion > 0 ? { minApiVersion } : {};
      }
      async add(cfg) {
        this.checkStreamConfigVersions(cfg);
        (0, jsutil_1.validateStreamName)(cfg.name);
        cfg.mirror = convertStreamSourceDomain(cfg.mirror);
        cfg.sources = cfg.sources?.map(convertStreamSourceDomain);
        const r = await this._request(`${this.prefix}.STREAM.CREATE.${cfg.name}`, cfg, this.requiredApiOpts(cfg));
        const si = r;
        this._fixInfo(si);
        return si;
      }
      async delete(stream) {
        (0, jsutil_1.validateStreamName)(stream);
        const r = await this._request(`${this.prefix}.STREAM.DELETE.${stream}`);
        const cr2 = r;
        return cr2.success;
      }
      async update(name, cfg = {}) {
        if (typeof name === "object") {
          const sc = name;
          name = sc.name;
          cfg = sc;
          console.trace(`\x1B[33m >> streams.update(config: StreamConfig) api changed to streams.update(name: string, config: StreamUpdateConfig) - this shim will be removed - update your code.  \x1B[0m`);
        }
        this.checkStreamConfigVersions(cfg);
        (0, jsutil_1.validateStreamName)(name);
        const old = await this.info(name);
        const update = Object.assign(old.config, cfg);
        update.mirror = convertStreamSourceDomain(update.mirror);
        update.sources = update.sources?.map(convertStreamSourceDomain);
        const r = await this._request(`${this.prefix}.STREAM.UPDATE.${name}`, update, this.requiredApiOpts(cfg));
        const si = r;
        this._fixInfo(si);
        return si;
      }
      async info(name, data) {
        (0, jsutil_1.validateStreamName)(name);
        const subj = `${this.prefix}.STREAM.INFO.${name}`;
        const r = await this._request(subj, data);
        let si = r;
        let { total, limit } = si;
        let have = si.state.subjects ? Object.getOwnPropertyNames(si.state.subjects).length : 1;
        if (total && total > have) {
          const infos = [si];
          const paged = data || {};
          let i = 0;
          while (total > have) {
            i++;
            paged.offset = limit * i;
            const r2 = await this._request(subj, paged);
            total = r2.total;
            infos.push(r2);
            const count = Object.getOwnPropertyNames(r2.state.subjects).length;
            have += count;
            if (count < limit) {
              break;
            }
          }
          let subjects = {};
          for (let i2 = 0; i2 < infos.length; i2++) {
            si = infos[i2];
            if (si.state.subjects) {
              subjects = Object.assign(subjects, si.state.subjects);
            }
          }
          si.offset = 0;
          si.total = 0;
          si.limit = 0;
          si.state.subjects = subjects;
        }
        this._fixInfo(si);
        return si;
      }
      list(subject = "") {
        const payload = subject?.length ? { subject } : {};
        const listerFilter = (v) => {
          const slr = v;
          slr.streams.forEach((si) => {
            this._fixInfo(si);
          });
          return slr.streams;
        };
        const subj = `${this.prefix}.STREAM.LIST`;
        return new jslister_1.ListerImpl(subj, listerFilter, this, payload);
      }
      // FIXME: init of sealed, deny_delete, deny_purge shouldn't be necessary
      //  https://github.com/nats-io/nats-server/issues/2633
      _fixInfo(si) {
        si.config.sealed = si.config.sealed || false;
        si.config.deny_delete = si.config.deny_delete || false;
        si.config.deny_purge = si.config.deny_purge || false;
        si.config.allow_rollup_hdrs = si.config.allow_rollup_hdrs || false;
      }
      async purge(name, opts) {
        if (opts) {
          const { keep, seq: seq2 } = opts;
          if (typeof keep === "number" && typeof seq2 === "number") {
            throw internal_1.InvalidArgumentError.format(["keep", "seq"], "are mutually exclusive");
          }
        }
        (0, jsutil_1.validateStreamName)(name);
        const v = await this._request(`${this.prefix}.STREAM.PURGE.${name}`, opts);
        return v;
      }
      async deleteMessage(stream, seq2, erase = true) {
        (0, jsutil_1.validateStreamName)(stream);
        const dr = { seq: seq2 };
        if (!erase) {
          dr.no_erase = true;
        }
        const r = await this._request(`${this.prefix}.STREAM.MSG.DELETE.${stream}`, dr);
        const cr2 = r;
        return cr2.success;
      }
      async getMessage(stream, query) {
        (0, jsutil_1.validateStreamName)(stream);
        try {
          const r = await this._request(`${this.prefix}.STREAM.MSG.GET.${stream}`, query);
          const sm = r;
          return new StoredMsgImpl(sm);
        } catch (err2) {
          if (err2 instanceof jserrors_1.JetStreamApiError && err2.code === jserrors_1.JetStreamApiCodes.NoMessageFound) {
            return null;
          }
          return Promise.reject(err2);
        }
      }
      find(subject) {
        return this.findStream(subject);
      }
      names(subject = "") {
        const payload = subject?.length ? { subject } : {};
        const listerFilter = (v) => {
          const sr = v;
          return sr.streams;
        };
        const subj = `${this.prefix}.STREAM.NAMES`;
        return new jslister_1.ListerImpl(subj, listerFilter, this, payload);
      }
      async get(name) {
        const si = await this.info(name);
        return Promise.resolve(new StreamImpl(this, si));
      }
    };
    exports.StreamAPIImpl = StreamAPIImpl;
    var StoredMsgImpl = class {
      _header;
      smr;
      static jc;
      constructor(smr) {
        this.smr = smr;
      }
      get pending() {
        return 0;
      }
      get lastSequence() {
        return 0;
      }
      get subject() {
        return this.smr.message.subject;
      }
      get seq() {
        return this.smr.message.seq;
      }
      get timestamp() {
        return this.smr.message.time;
      }
      get time() {
        return new Date(Date.parse(this.timestamp));
      }
      get data() {
        return this.smr.message.data ? this._parse(this.smr.message.data) : internal_1.Empty;
      }
      get header() {
        if (!this._header) {
          if (this.smr.message.hdrs) {
            const hd = this._parse(this.smr.message.hdrs);
            this._header = internal_1.MsgHdrsImpl.decode(hd);
          } else {
            this._header = (0, internal_1.headers)();
          }
        }
        return this._header;
      }
      _parse(s) {
        const bs = atob(s);
        const len = bs.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = bs.charCodeAt(i);
        }
        return bytes;
      }
      json(reviver) {
        return JSON.parse(new TextDecoder().decode(this.data), reviver);
      }
      string() {
        return internal_1.TD.decode(this.data);
      }
    };
    exports.StoredMsgImpl = StoredMsgImpl;
    var StreamsImpl = class {
      api;
      constructor(api) {
        this.api = api;
      }
      get(stream) {
        return this.api.info(stream).then((si) => {
          return new StreamImpl(this.api, si);
        });
      }
    };
    exports.StreamsImpl = StreamsImpl;
  }
});

// node_modules/@nats-io/jetstream/lib/jsm_direct.js
var require_jsm_direct = __commonJS({
  "node_modules/@nats-io/jetstream/lib/jsm_direct.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DirectConsumer = exports.DirectMsgImpl = exports.DirectStreamAPIImpl = void 0;
    var jsbaseclient_api_1 = require_jsbaseclient_api();
    var types_1 = require_types3();
    var internal_1 = require_internal_mod();
    var jsutil_1 = require_jsutil();
    var jserrors_1 = require_jserrors();
    var DirectStreamAPIImpl = class extends jsbaseclient_api_1.BaseApiClientImpl {
      constructor(nc, opts) {
        super(nc, opts);
      }
      async getMessage(stream, query) {
        (0, jsutil_1.validateStreamName)(stream);
        if ("start_time" in query) {
          const { min, ok } = this.nc.features.get(internal_1.Feature.JS_BATCH_DIRECT_GET);
          if (!ok) {
            throw new Error(`start_time direct option require server ${min}`);
          }
        }
        let qq = query;
        const { last_by_subj } = qq;
        if (last_by_subj) {
          qq = null;
        }
        const payload = qq ? JSON.stringify(qq) : internal_1.Empty;
        const pre = this.opts.apiPrefix || "$JS.API";
        const subj = last_by_subj ? `${pre}.DIRECT.GET.${stream}.${last_by_subj}` : `${pre}.DIRECT.GET.${stream}`;
        const r = await this.nc.request(subj, payload, { timeout: this.timeout });
        if (r.headers?.code !== 0) {
          const status = new jserrors_1.JetStreamStatus(r);
          if (status.isMessageNotFound()) {
            return Promise.resolve(null);
          } else {
            return Promise.reject(status.toError());
          }
        }
        const dm = new DirectMsgImpl(r);
        return Promise.resolve(dm);
      }
      getBatch(stream, opts) {
        opts.batch = opts.batch || 1024;
        return this.get(stream, opts);
      }
      getLastMessagesFor(stream, opts) {
        return this.get(stream, opts);
      }
      get(stream, opts) {
        opts = { ...opts };
        const { min, ok } = this.nc.features.get(internal_1.Feature.JS_BATCH_DIRECT_GET);
        if (!ok) {
          return Promise.reject(new Error(`batch direct require server ${min}`));
        }
        (0, jsutil_1.validateStreamName)(stream);
        const callback = typeof opts.callback === "function" ? opts.callback : null;
        const iter = new internal_1.QueuedIteratorImpl();
        function pushIter(done, d) {
          if (done) {
            iter.push(() => {
              done.err ? iter.stop(done.err) : iter.stop();
            });
            return;
          }
          iter.push(d);
        }
        function pushCb(done, m) {
          const cb = callback;
          if (typeof m === "function") {
            m();
            return;
          }
          cb(done, m);
        }
        if (callback) {
          iter.iterClosed.then((err2) => {
            push({ err: err2 ? err2 : void 0 }, {});
            sub.unsubscribe();
          });
        }
        const push = callback ? pushCb : pushIter;
        const inbox = (0, internal_1.createInbox)(this.nc.options.inboxPrefix);
        let batchSupported = false;
        const sub = this.nc.subscribe(inbox, {
          timeout: 5e3,
          callback: (err2, msg) => {
            if (err2) {
              iter.stop(err2);
              sub.unsubscribe();
              return;
            }
            const status = jserrors_1.JetStreamStatus.maybeParseStatus(msg);
            if (status) {
              if (status.isNoResults()) {
                push({}, () => {
                  iter.stop();
                });
              }
              if (status.isEndOfBatch()) {
                push({}, () => {
                  iter.stop();
                });
              } else {
                const err3 = status.toError();
                push({ err: err3 }, () => {
                  iter.stop(err3);
                });
              }
              return;
            }
            if (!batchSupported) {
              if (typeof msg.headers?.get("Nats-Num-Pending") !== "string") {
                sub.unsubscribe();
                push({}, () => {
                  iter.stop();
                });
              } else {
                batchSupported = true;
              }
            }
            push(null, new DirectMsgImpl(msg));
          }
        });
        const pre = this.opts.apiPrefix || "$JS.API";
        const subj = `${pre}.DIRECT.GET.${stream}`;
        const payload = JSON.stringify(opts, (key, value) => {
          if ((key === "up_to_time" || key === "start_time") && value instanceof Date) {
            return value.toISOString();
          }
          return value;
        });
        this.nc.publish(subj, payload, { reply: inbox });
        return Promise.resolve(iter);
      }
    };
    exports.DirectStreamAPIImpl = DirectStreamAPIImpl;
    var DirectMsgImpl = class {
      data;
      header;
      constructor(m) {
        if (!m.headers) {
          throw new Error("headers expected");
        }
        this.data = m.data;
        this.header = m.headers;
      }
      get subject() {
        return this.header.last(types_1.DirectMsgHeaders.Subject);
      }
      get seq() {
        const v = this.header.last(types_1.DirectMsgHeaders.Sequence);
        return typeof v === "string" ? parseInt(v) : 0;
      }
      get time() {
        return new Date(Date.parse(this.timestamp));
      }
      get timestamp() {
        return this.header.last(types_1.DirectMsgHeaders.TimeStamp);
      }
      get stream() {
        return this.header.last(types_1.DirectMsgHeaders.Stream);
      }
      get lastSequence() {
        const v = this.header.last(types_1.DirectMsgHeaders.LastSequence);
        return typeof v === "string" ? parseInt(v) : 0;
      }
      get pending() {
        const v = this.header.last(types_1.DirectMsgHeaders.NumPending);
        return typeof v === "string" ? parseInt(v) : -1;
      }
      json(reviver) {
        return JSON.parse(new TextDecoder().decode(this.data), reviver);
      }
      string() {
        return internal_1.TD.decode(this.data);
      }
    };
    exports.DirectMsgImpl = DirectMsgImpl;
    function isDirectBatchStartTime(t) {
      return typeof t === "object" && "start_time" in t;
    }
    function isMaxBytes(t) {
      return typeof t === "object" && "max_bytes" in t;
    }
    var DirectConsumer = class {
      stream;
      api;
      cursor;
      listeners;
      start;
      constructor(stream, api, start) {
        this.stream = stream;
        this.api = api;
        this.cursor = { last: 0 };
        this.listeners = [];
        this.start = start;
      }
      getOptions(opts) {
        opts = opts || {};
        const dbo = {};
        if (this.cursor.last === 0) {
          if (isDirectBatchStartTime(this.start)) {
            dbo.start_time = this.start.start_time;
          } else {
            dbo.seq = this.start.seq || 1;
          }
        } else {
          dbo.seq = this.cursor.last + 1;
        }
        if (isMaxBytes(opts)) {
          dbo.max_bytes = opts.max_bytes;
        } else {
          dbo.batch = opts.batch ?? 100;
        }
        return dbo;
      }
      status() {
        const iter = new internal_1.QueuedIteratorImpl();
        this.listeners.push(iter);
        return iter;
      }
      notify(n) {
        if (this.listeners.length > 0) {
          (() => {
            const remove = [];
            this.listeners.forEach((l) => {
              const qi = l;
              if (!qi.done) {
                qi.push(n);
              } else {
                remove.push(qi);
              }
            });
            this.listeners = this.listeners.filter((l) => !remove.includes(l));
          })();
        }
      }
      debug() {
        console.log(this.cursor);
      }
      consume(opts) {
        let pending;
        let requestDone;
        const qi = new internal_1.QueuedIteratorImpl();
        (async () => {
          while (true) {
            if (this.cursor.pending === 0) {
              this.notify({
                type: "debug",
                code: 0,
                description: "sleeping for 2500"
              });
              pending = (0, internal_1.delay)(2500);
              await pending;
            }
            if (qi.done) {
              break;
            }
            requestDone = (0, internal_1.deferred)();
            const dbo = this.getOptions(opts);
            this.notify({
              type: "next",
              options: Object.assign({}, opts)
            });
            dbo.callback = (r, sm) => {
              if (r) {
                if (r.err) {
                  if (r.err instanceof jserrors_1.JetStreamStatusError) {
                    this.notify({
                      type: "debug",
                      code: r.err.code,
                      description: r.err.message
                    });
                  } else {
                    this.notify({
                      type: "debug",
                      code: 0,
                      description: r.err.message
                    });
                  }
                }
                requestDone.resolve();
              } else if (sm.lastSequence > 0 && sm.lastSequence !== this.cursor.last) {
                src.stop();
                requestDone.resolve();
                this.notify({
                  type: "reset",
                  name: "direct"
                });
              } else {
                qi.push(sm);
                qi.received++;
                this.cursor.last = sm.seq;
                this.cursor.pending = sm.pending;
              }
            };
            const src = await this.api.getBatch(this.stream, dbo);
            qi.iterClosed.then(() => {
              src.stop();
              pending?.cancel();
              requestDone?.resolve();
            });
            await requestDone;
          }
        })().catch((err2) => {
          qi.stop(err2);
        });
        return Promise.resolve(qi);
      }
      async fetch(opts) {
        const dbo = this.getOptions(opts);
        const qi = new internal_1.QueuedIteratorImpl();
        const src = await this.api.get(this.stream, Object.assign({
          callback: (done, sm) => {
            if (done) {
              qi.push(() => {
                done.err ? qi.stop(done.err) : qi.stop();
              });
            } else if (sm.lastSequence > 0 && sm.lastSequence !== this.cursor.last) {
              qi.push(() => {
                qi.stop();
              });
              src.stop();
            } else {
              qi.push(sm);
              qi.received++;
              this.cursor.last = sm.seq;
              this.cursor.pending = sm.pending;
            }
          }
        }, dbo));
        qi.iterClosed.then(() => {
          src.stop();
        });
        return qi;
      }
      async next() {
        const sm = await this.api.getMessage(this.stream, {
          seq: this.cursor.last + 1
        });
        const seq2 = sm?.seq;
        if (seq2) {
          this.cursor.last = seq2;
        }
        return sm;
      }
    };
    exports.DirectConsumer = DirectConsumer;
  }
});

// node_modules/@nats-io/jetstream/lib/jsclient.js
var require_jsclient = __commonJS({
  "node_modules/@nats-io/jetstream/lib/jsclient.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BatchPublisherImpl = exports.JetStreamClientImpl = exports.JetStreamManagerImpl = void 0;
    exports.startFastIngest = startFastIngest;
    exports.toJetStreamClient = toJetStreamClient;
    exports.jetstream = jetstream;
    exports.jetstreamManager = jetstreamManager;
    exports.scheduleSpecToHeader = scheduleSpecToHeader;
    var jsbaseclient_api_1 = require_jsbaseclient_api();
    var jsmconsumer_api_1 = require_jsmconsumer_api();
    var internal_1 = require_internal_mod();
    var jsmstream_api_1 = require_jsmstream_api();
    var jsapi_types_1 = require_jsapi_types();
    var jserrors_1 = require_jserrors();
    var jsm_direct_1 = require_jsm_direct();
    function startFastIngest(nc, subj, payload, opts, defaultTimeout = 5e3) {
      const { ackInterval, allowGaps, inboxPrefix, maxOutstandingAcks, ...publishOpts } = opts;
      const prefix = inboxPrefix ?? "_INBOX";
      if (!prefix || /\s/.test(prefix) || /[*>]/.test(prefix)) {
        return Promise.reject(new Error(`inboxPrefix must be non-empty, no wildcards or whitespace (got "${prefix}")`));
      }
      const o = {
        ackInterval: ackInterval ?? 10,
        allowGaps,
        inboxPrefix: prefix,
        maxOutstandingAcks: Math.min(3, Math.max(1, maxOutstandingAcks ?? 2))
      };
      const fi = new FastIngestImpl(nc, o, subj, defaultTimeout);
      return fi.start(payload, publishOpts).then(() => fi);
    }
    function buildPublishHeaders(opts) {
      const expect = opts.expect || {};
      const mh = opts.headers || (0, internal_1.headers)();
      if (opts.msgID) {
        mh.set(jsapi_types_1.PubHeaders.MsgIdHdr, opts.msgID);
      }
      if (expect.lastMsgID) {
        mh.set(jsapi_types_1.PubHeaders.ExpectedLastMsgIdHdr, expect.lastMsgID);
      }
      if (expect.streamName) {
        mh.set(jsapi_types_1.PubHeaders.ExpectedStreamHdr, expect.streamName);
      }
      if (typeof expect.lastSequence === "number") {
        mh.set(jsapi_types_1.PubHeaders.ExpectedLastSeqHdr, `${expect.lastSequence}`);
      }
      if (typeof expect.lastSubjectSequence === "number") {
        mh.set(jsapi_types_1.PubHeaders.ExpectedLastSubjectSequenceHdr, `${expect.lastSubjectSequence}`);
      }
      if (expect.lastSubjectSequenceSubject) {
        mh.set(jsapi_types_1.PubHeaders.ExpectedLastSubjectSequenceSubjectHdr, expect.lastSubjectSequenceSubject);
      }
      if (opts.ttl) {
        mh.set(jsapi_types_1.PubHeaders.MessageTTL, `${opts.ttl}`);
      }
      if (opts.schedule && opts.cancelSchedule) {
        throw new Error("schedule and cancelSchedule are mutually exclusive");
      }
      if (opts.schedule) {
        const so = opts.schedule;
        if (so.specification) {
          mh.set(jsapi_types_1.PubHeaders.Schedule, scheduleSpecToHeader(so.specification));
        }
        if (so.target) {
          mh.set(jsapi_types_1.PubHeaders.ScheduleTarget, so.target);
        }
        if (so.source) {
          mh.set(jsapi_types_1.PubHeaders.ScheduleSource, so.source);
        }
        if (so.ttl) {
          mh.set(jsapi_types_1.PubHeaders.ScheduleTTL, so.ttl);
        }
        if (so.timezone) {
          mh.set(jsapi_types_1.PubHeaders.ScheduleTimeZone, so.timezone);
        }
        if (so.rollup) {
          mh.set(jsapi_types_1.PubHeaders.ScheduleRollup, so.rollup);
        }
      }
      if (opts.cancelSchedule) {
        mh.set(jsapi_types_1.PubHeaders.Scheduler, opts.cancelSchedule.scheduleSubject);
        mh.set(jsapi_types_1.PubHeaders.ScheduleNext, "purge");
      }
      return mh;
    }
    function toJetStreamClient(nc) {
      if (typeof nc.nc === "undefined") {
        return jetstream(nc);
      }
      return nc;
    }
    function jetstream(nc, opts = {}) {
      return new JetStreamClientImpl(nc, opts);
    }
    async function jetstreamManager(nc, opts = {}) {
      const adm = new JetStreamManagerImpl(nc, opts);
      if (opts.checkAPI !== false) {
        try {
          await adm.getAccountInfo();
        } catch (err2) {
          throw err2;
        }
      }
      return adm;
    }
    var JetStreamManagerImpl = class extends jsbaseclient_api_1.BaseApiClientImpl {
      streams;
      consumers;
      direct;
      constructor(nc, opts) {
        super(nc, opts);
        this.streams = new jsmstream_api_1.StreamAPIImpl(nc, opts);
        this.consumers = new jsmconsumer_api_1.ConsumerAPIImpl(nc, opts);
        this.direct = new jsm_direct_1.DirectStreamAPIImpl(nc, opts);
      }
      async getAccountInfo() {
        const r = await this._request(`${this.prefix}.INFO`);
        return r;
      }
      jetstream() {
        return jetstream(this.nc, this.getOptions());
      }
      advisories() {
        const iter = new internal_1.QueuedIteratorImpl();
        this.nc.subscribe(`$JS.EVENT.ADVISORY.>`, {
          callback: (err2, msg) => {
            if (err2) {
              throw err2;
            }
            try {
              const d = this.parseJsResponse(msg);
              const chunks = d.type.split(".");
              const kind = chunks[chunks.length - 1];
              iter.push({ kind, data: d });
            } catch (err3) {
              iter.stop(err3);
            }
          }
        });
        return iter;
      }
    };
    exports.JetStreamManagerImpl = JetStreamManagerImpl;
    function scheduleSpecToHeader(spec) {
      if (typeof spec === "string") {
        return spec;
      }
      if (spec instanceof Date) {
        return `@at ${spec.toISOString()}`;
      }
      if ("at" in spec) {
        const iso = spec.at instanceof Date ? spec.at.toISOString() : spec.at;
        return `@at ${iso}`;
      }
      if ("every" in spec) {
        assertEveryAtLeastOneSecond(spec.every);
        return `@every ${spec.every}`;
      }
      if ("cron" in spec) {
        return spec.cron;
      }
      if ("predefined" in spec) {
        return spec.predefined;
      }
      throw new Error("invalid schedule specification");
    }
    function assertEveryAtLeastOneSecond(d) {
      const trimmed = d.trim();
      const re = /(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)/g;
      let totalMs = 0;
      let pos = 0;
      let m;
      while ((m = re.exec(trimmed)) !== null) {
        if (m.index !== pos)
          break;
        pos += m[0].length;
        const n = parseFloat(m[1]);
        const unit = m[2];
        totalMs += unit === "ns" ? n / 1e6 : unit === "us" || unit === "\xB5s" ? n / 1e3 : unit === "ms" ? n : unit === "s" ? n * 1e3 : unit === "m" ? n * 6e4 : n * 36e5;
      }
      if (trimmed === "" || pos !== trimmed.length) {
        throw new Error(`@every: unrecognized duration format: "${d}"`);
      }
      if (totalMs < 1e3) {
        throw new Error("@every interval must be at least 1s");
      }
    }
    var JetStreamClientImpl = class extends jsbaseclient_api_1.BaseApiClientImpl {
      consumers;
      streams;
      consumerAPI;
      streamAPI;
      constructor(nc, opts) {
        super(nc, opts);
        this.consumerAPI = new jsmconsumer_api_1.ConsumerAPIImpl(nc, opts);
        this.streamAPI = new jsmstream_api_1.StreamAPIImpl(nc, opts);
        this.consumers = new jsmstream_api_1.ConsumersImpl(this.consumerAPI);
        this.streams = new jsmstream_api_1.StreamsImpl(this.streamAPI);
      }
      jetstreamManager(checkAPI) {
        if (checkAPI === void 0) {
          checkAPI = this.opts.checkAPI;
        }
        const opts = Object.assign({}, this.opts, { checkAPI });
        try {
          (0, internal_1.createInbox)(opts.watcherPrefix);
        } catch (err2) {
          return Promise.reject(err2);
        }
        return jetstreamManager(this.nc, opts);
      }
      get apiPrefix() {
        return this.prefix;
      }
      startBatch(subj, payload, opts) {
        const d = (0, internal_1.deferred)();
        const bp = new BatchPublisherImpl(this);
        bp.first(subj, payload, opts).then(() => {
          d.resolve(bp);
        }).catch((err2) => {
          d.reject(err2);
        });
        return d;
      }
      async _publish(subj, data = internal_1.Empty, opts) {
        opts = opts || {};
        opts = { ...opts };
        if (opts.cancelSchedule && opts.cancelSchedule.scheduleSubject === subj) {
          throw new Error("cancelSchedule.scheduleSubject must not equal the publish subject");
        }
        const mh = buildPublishHeaders(opts);
        const to = opts.timeout || this.timeout;
        const ro = {};
        if (to) {
          ro.timeout = to;
        }
        if (opts) {
          ro.headers = mh;
        }
        let { retries } = opts;
        retries = retries || 1;
        const bo = (0, internal_1.backoff)();
        let r = null;
        for (let i = 0; i < retries; i++) {
          try {
            r = await this.nc.request(subj, data, ro);
            break;
          } catch (err2) {
            const re = err2 instanceof internal_1.RequestError ? err2 : null;
            if ((err2 instanceof internal_1.errors.TimeoutError || re?.isNoResponders()) && i + 1 < retries) {
              await (0, internal_1.delay)(bo.backoff(i));
            } else {
              throw re?.isNoResponders() ? new jserrors_1.JetStreamNotEnabled(`jetstream is not enabled`, {
                cause: err2
              }) : err2;
            }
          }
        }
        return r;
      }
      async publish(subj, data = internal_1.Empty, opts) {
        const r = await this._publish(subj, data, opts);
        const pa = this.parseJsResponse(r);
        if (pa.stream === "") {
          throw new jserrors_1.JetStreamError("invalid ack response");
        }
        pa.duplicate = pa.duplicate ? pa.duplicate : false;
        return pa;
      }
    };
    exports.JetStreamClientImpl = JetStreamClientImpl;
    var BatchPublisherImpl = class {
      nc;
      js;
      id;
      count;
      done;
      constructor(js) {
        this.count = 0;
        this.id = internal_1.nuid.next();
        this.js = js;
        this.nc = this.js.nc;
        this.done = false;
      }
      async first(subj, payload, opts) {
        opts = opts || {};
        opts.headers = opts?.headers || (0, internal_1.headers)();
        opts.headers.set("Nats-Batch-Id", this.id);
        this.count++;
        opts.headers.set("Nats-Batch-Sequence", this.count.toString());
        const r = await this.js._publish(subj, payload, opts);
        if (r.data.length > 0) {
          this.js.parseJsResponse(r);
        }
      }
      add(subj, payload, opts = { ack: false }) {
        if (this.done) {
          throw new Error("batch publisher is done");
        }
        opts.headers = opts?.headers || (0, internal_1.headers)();
        opts.headers.set("Nats-Batch-Id", this.id);
        this.count++;
        opts.headers.set("Nats-Batch-Sequence", this.count.toString());
        const hasAck = "ack" in opts && opts.ack === true;
        if (hasAck) {
          const d = (0, internal_1.deferred)();
          this.js._publish(subj, payload, {
            headers: opts.headers,
            timeout: opts.timeout
          }).then((m) => {
            if (m.data.length > 0) {
              this.js.parseJsResponse(m);
            }
            d.resolve();
          }).catch((err2) => {
            this.done = true;
            d.reject(err2);
          });
          return d;
        } else {
          return this.nc.publish(subj, payload, { headers: opts.headers });
        }
      }
      async commit(subj, payload, opts = {}) {
        if (this.done) {
          throw new Error("batch publisher is done");
        } else {
          this.done = true;
        }
        opts.headers = opts?.headers || (0, internal_1.headers)();
        opts.headers.set("Nats-Batch-Id", this.id);
        this.count++;
        opts.headers.set("Nats-Batch-Sequence", this.count.toString());
        opts.headers.set("Nats-Batch-Commit", "1");
        const r = await this.js._publish(subj, payload, {
          headers: opts.headers,
          timeout: opts.timeout || 0
        });
        const ack2 = r.json();
        if (ack2.count !== this.count) {
          throw new Error("batch didn't contain number of published messages");
        }
        return ack2;
      }
    };
    exports.BatchPublisherImpl = BatchPublisherImpl;
    var BATCH_CLOSED = "batch closed";
    var FastIngestOp = {
      Start: 0,
      Append: 1,
      Final: 2,
      EOB: 3,
      Ping: 4
    };
    var FastIngestImpl = class {
      batch;
      nc;
      batchSubj;
      gapMode;
      initialFlow;
      seq;
      acked;
      ackInterval;
      inboxPrefix;
      maxOutstandingAcks;
      defaultTimeout;
      gapIter;
      sub;
      pending;
      closed;
      closeErr;
      startDeferred;
      closedDeferred;
      constructor(nc, opts, firstSubj, defaultTimeout) {
        this.nc = nc;
        this.batchSubj = firstSubj;
        this.gapMode = opts.allowGaps ? "ok" : "fail";
        this.initialFlow = opts.ackInterval;
        this.inboxPrefix = opts.inboxPrefix;
        this.maxOutstandingAcks = opts.maxOutstandingAcks;
        this.defaultTimeout = defaultTimeout;
        this.batch = internal_1.nuid.next();
        this.seq = 0;
        this.acked = 0;
        this.ackInterval = opts.ackInterval;
        this.pending = /* @__PURE__ */ new Map();
        this.closed = false;
        this.startDeferred = (0, internal_1.deferred)();
        this.closedDeferred = (0, internal_1.deferred)();
        this.closedDeferred.catch(() => {
        });
        this.startDeferred.catch(() => {
        });
        const inbox = `${this.inboxPrefix}.${this.batch}.>`;
        this.sub = this.nc.subscribe(inbox, {
          callback: (err2, msg) => this.route(err2, msg)
        });
      }
      replyFor(op, seq2) {
        return `${this.inboxPrefix}.${this.batch}.${this.initialFlow}.${this.gapMode}.${seq2}.${op}.$FI`;
      }
      start(payload, opts) {
        this.seq = 1;
        const rs = this.replyFor(FastIngestOp.Start, 1);
        const headers = opts ? buildPublishHeaders(opts) : void 0;
        this.nc.publish(this.batchSubj, payload, { reply: rs, headers });
        return this.deadlineOrClose(this.startDeferred, opts?.timeout ?? this.defaultTimeout);
      }
      deadlineOrClose(p, ms) {
        return (0, internal_1.deadline)(p, ms).catch((err2) => {
          if (!this.closed)
            this.close(err2);
          throw err2;
        });
      }
      route(err2, m) {
        if (err2) {
          this.close(err2);
          return;
        }
        let data;
        try {
          data = (0, jsbaseclient_api_1.parseJsResponse)(m);
        } catch (err3) {
          this.close(err3);
          return;
        }
        if ("batch" in data && typeof data.batch === "string") {
          const ack2 = data;
          const e = this.pending.get(m.subject);
          if (e && (e.op === FastIngestOp.Final || e.op === FastIngestOp.EOB)) {
            e.deferred.resolve(ack2);
            this.pending.delete(m.subject);
          }
          for (const [, entry] of this.pending) {
            if (entry.op === FastIngestOp.Append || entry.op === FastIngestOp.Ping) {
              entry.deferred.resolve({ batchSeq: entry.seq, ackSeq: this.acked });
            } else {
              entry.deferred.reject(new Error(BATCH_CLOSED));
            }
          }
          this.pending.clear();
          this.resolveStart();
          this.closedDeferred.resolve(ack2);
          this.closed = true;
          this.gapIter?.stop();
          this.sub.unsubscribe();
          return;
        }
        const typed = data;
        if (typed.type === "gap") {
          if (this.gapIter) {
            const g = data;
            this.gapIter.push({ lastSeq: g.last_seq, seq: g.seq });
          }
          return;
        }
        const fa = data;
        if (typeof fa.msgs === "number")
          this.ackInterval = fa.msgs;
        if (typeof fa.seq === "number" && fa.seq > this.acked) {
          this.acked = fa.seq;
        }
        this.resolveStart();
        const exact = this.pending.get(m.subject);
        if (exact && (exact.op === FastIngestOp.Append || exact.op === FastIngestOp.Ping)) {
          exact.deferred.resolve({ batchSeq: exact.seq, ackSeq: this.acked });
          this.pending.delete(m.subject);
        }
        for (const [rs, e] of this.pending) {
          if (e.op === FastIngestOp.Append && e.seq - this.acked < this.ackInterval * this.maxOutstandingAcks) {
            e.deferred.resolve({ batchSeq: e.seq, ackSeq: this.acked });
            this.pending.delete(rs);
          }
        }
      }
      resolveStart() {
        this.startDeferred.resolve();
      }
      close(err2) {
        this.closed = true;
        this.closeErr = err2;
        for (const [, e] of this.pending)
          e.deferred.reject(err2);
        this.pending.clear();
        this.startDeferred.reject(err2);
        this.closedDeferred.reject(err2);
        this.gapIter?.stop();
        this.sub.unsubscribe();
      }
      add(subj, payload, opts) {
        if (this.closed)
          return Promise.reject(new Error(BATCH_CLOSED));
        const mySeq = ++this.seq;
        const rs = this.replyFor(FastIngestOp.Append, mySeq);
        const headers = opts ? buildPublishHeaders(opts) : void 0;
        this.nc.publish(subj, payload, { reply: rs, headers });
        if (mySeq - this.acked < this.ackInterval * this.maxOutstandingAcks) {
          return Promise.resolve({ batchSeq: mySeq, ackSeq: this.acked });
        }
        const d = (0, internal_1.deferred)();
        this.pending.set(rs, { seq: mySeq, op: FastIngestOp.Append, deferred: d });
        return this.deadlineOrClose(d, opts?.timeout ?? this.defaultTimeout);
      }
      last(subj, payload, opts) {
        if (this.closed)
          return Promise.reject(new Error(BATCH_CLOSED));
        const mySeq = ++this.seq;
        const rs = this.replyFor(FastIngestOp.Final, mySeq);
        const d = (0, internal_1.deferred)();
        this.pending.set(rs, { seq: mySeq, op: FastIngestOp.Final, deferred: d });
        const headers = opts ? buildPublishHeaders(opts) : void 0;
        this.nc.publish(subj, payload, { reply: rs, headers });
        return this.deadlineOrClose(d, opts?.timeout ?? this.defaultTimeout);
      }
      end(opts) {
        if (this.closed)
          return Promise.reject(new Error(BATCH_CLOSED));
        const mySeq = ++this.seq;
        const rs = this.replyFor(FastIngestOp.EOB, mySeq);
        const d = (0, internal_1.deferred)();
        this.pending.set(rs, { seq: mySeq, op: FastIngestOp.EOB, deferred: d });
        const headers = opts ? buildPublishHeaders(opts) : void 0;
        this.nc.publish(this.batchSubj, internal_1.Empty, { reply: rs, headers });
        return this.deadlineOrClose(d, opts?.timeout ?? this.defaultTimeout);
      }
      ping(timeout = this.defaultTimeout) {
        if (this.closed)
          return Promise.reject(new Error(BATCH_CLOSED));
        const rs = this.replyFor(FastIngestOp.Ping, this.seq);
        const existing = this.pending.get(rs);
        if (existing && existing.op === FastIngestOp.Ping) {
          return (0, internal_1.deadline)(existing.deferred, timeout);
        }
        const d = (0, internal_1.deferred)();
        this.pending.set(rs, { seq: this.seq, op: FastIngestOp.Ping, deferred: d });
        this.nc.publish(this.batchSubj, internal_1.Empty, { reply: rs });
        return this.deadlineOrClose(d, timeout);
      }
      done() {
        return this.closedDeferred;
      }
      gaps() {
        if (!this.gapIter) {
          this.gapIter = new internal_1.QueuedIteratorImpl();
        }
        return this.gapIter;
      }
    };
  }
});

// node_modules/@nats-io/jetstream/lib/internal_mod.js
var require_internal_mod2 = __commonJS({
  "node_modules/@nats-io/jetstream/lib/internal_mod.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateStreamName = exports.jserrors = exports.JetStreamStatusError = exports.JetStreamStatus = exports.JetStreamError = exports.JetStreamApiError = exports.JetStreamApiCodes = exports.isMessageNotFound = exports.ListerImpl = exports.StoreCompression = exports.StorageType = exports.RetentionPolicy = exports.ReplayPolicy = exports.PubHeaders = exports.PersistMode = exports.DiscardPolicy = exports.DeliverPolicy = exports.AckPolicy = exports.DirectMsgImpl = exports.BaseApiClientImpl = exports.toJetStreamClient = exports.startFastIngest = exports.jetstreamManager = exports.JetStreamClientImpl = exports.jetstream = exports.RepublishHeaders = exports.JsHeaders = exports.isPushConsumer = exports.isPullConsumer = exports.isOrderedPushConsumerOptions = exports.isBoundPushConsumerOptions = exports.DirectMsgHeaders = exports.AdvisoryKind = void 0;
    var types_1 = require_types3();
    Object.defineProperty(exports, "AdvisoryKind", { enumerable: true, get: function() {
      return types_1.AdvisoryKind;
    } });
    Object.defineProperty(exports, "DirectMsgHeaders", { enumerable: true, get: function() {
      return types_1.DirectMsgHeaders;
    } });
    Object.defineProperty(exports, "isBoundPushConsumerOptions", { enumerable: true, get: function() {
      return types_1.isBoundPushConsumerOptions;
    } });
    Object.defineProperty(exports, "isOrderedPushConsumerOptions", { enumerable: true, get: function() {
      return types_1.isOrderedPushConsumerOptions;
    } });
    Object.defineProperty(exports, "isPullConsumer", { enumerable: true, get: function() {
      return types_1.isPullConsumer;
    } });
    Object.defineProperty(exports, "isPushConsumer", { enumerable: true, get: function() {
      return types_1.isPushConsumer;
    } });
    Object.defineProperty(exports, "JsHeaders", { enumerable: true, get: function() {
      return types_1.JsHeaders;
    } });
    Object.defineProperty(exports, "RepublishHeaders", { enumerable: true, get: function() {
      return types_1.RepublishHeaders;
    } });
    var jsclient_1 = require_jsclient();
    Object.defineProperty(exports, "jetstream", { enumerable: true, get: function() {
      return jsclient_1.jetstream;
    } });
    Object.defineProperty(exports, "JetStreamClientImpl", { enumerable: true, get: function() {
      return jsclient_1.JetStreamClientImpl;
    } });
    Object.defineProperty(exports, "jetstreamManager", { enumerable: true, get: function() {
      return jsclient_1.jetstreamManager;
    } });
    Object.defineProperty(exports, "startFastIngest", { enumerable: true, get: function() {
      return jsclient_1.startFastIngest;
    } });
    Object.defineProperty(exports, "toJetStreamClient", { enumerable: true, get: function() {
      return jsclient_1.toJetStreamClient;
    } });
    var jsbaseclient_api_1 = require_jsbaseclient_api();
    Object.defineProperty(exports, "BaseApiClientImpl", { enumerable: true, get: function() {
      return jsbaseclient_api_1.BaseApiClientImpl;
    } });
    var jsm_direct_1 = require_jsm_direct();
    Object.defineProperty(exports, "DirectMsgImpl", { enumerable: true, get: function() {
      return jsm_direct_1.DirectMsgImpl;
    } });
    var jsapi_types_1 = require_jsapi_types();
    Object.defineProperty(exports, "AckPolicy", { enumerable: true, get: function() {
      return jsapi_types_1.AckPolicy;
    } });
    Object.defineProperty(exports, "DeliverPolicy", { enumerable: true, get: function() {
      return jsapi_types_1.DeliverPolicy;
    } });
    Object.defineProperty(exports, "DiscardPolicy", { enumerable: true, get: function() {
      return jsapi_types_1.DiscardPolicy;
    } });
    Object.defineProperty(exports, "PersistMode", { enumerable: true, get: function() {
      return jsapi_types_1.PersistMode;
    } });
    Object.defineProperty(exports, "PubHeaders", { enumerable: true, get: function() {
      return jsapi_types_1.PubHeaders;
    } });
    Object.defineProperty(exports, "ReplayPolicy", { enumerable: true, get: function() {
      return jsapi_types_1.ReplayPolicy;
    } });
    Object.defineProperty(exports, "RetentionPolicy", { enumerable: true, get: function() {
      return jsapi_types_1.RetentionPolicy;
    } });
    Object.defineProperty(exports, "StorageType", { enumerable: true, get: function() {
      return jsapi_types_1.StorageType;
    } });
    Object.defineProperty(exports, "StoreCompression", { enumerable: true, get: function() {
      return jsapi_types_1.StoreCompression;
    } });
    var jslister_1 = require_jslister();
    Object.defineProperty(exports, "ListerImpl", { enumerable: true, get: function() {
      return jslister_1.ListerImpl;
    } });
    var jserrors_1 = require_jserrors();
    Object.defineProperty(exports, "isMessageNotFound", { enumerable: true, get: function() {
      return jserrors_1.isMessageNotFound;
    } });
    Object.defineProperty(exports, "JetStreamApiCodes", { enumerable: true, get: function() {
      return jserrors_1.JetStreamApiCodes;
    } });
    Object.defineProperty(exports, "JetStreamApiError", { enumerable: true, get: function() {
      return jserrors_1.JetStreamApiError;
    } });
    Object.defineProperty(exports, "JetStreamError", { enumerable: true, get: function() {
      return jserrors_1.JetStreamError;
    } });
    Object.defineProperty(exports, "JetStreamStatus", { enumerable: true, get: function() {
      return jserrors_1.JetStreamStatus;
    } });
    Object.defineProperty(exports, "JetStreamStatusError", { enumerable: true, get: function() {
      return jserrors_1.JetStreamStatusError;
    } });
    Object.defineProperty(exports, "jserrors", { enumerable: true, get: function() {
      return jserrors_1.jserrors;
    } });
    var jsutil_1 = require_jsutil();
    Object.defineProperty(exports, "validateStreamName", { enumerable: true, get: function() {
      return jsutil_1.validateStreamName;
    } });
  }
});

// node_modules/@nats-io/kv/lib/kv.js
var require_kv = __commonJS({
  "node_modules/@nats-io/kv/lib/kv.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KvStatusImpl = exports.Bucket = exports.Kvm = exports.kvOperationHdr = void 0;
    exports.Base64KeyCodec = Base64KeyCodec;
    exports.NoopKvCodecs = NoopKvCodecs;
    exports.defaultBucketOpts = defaultBucketOpts;
    exports.validateKey = validateKey;
    exports.validateSearchKey = validateSearchKey;
    exports.hasWildcards = hasWildcards;
    exports.validateBucket = validateBucket;
    var internal_1 = require_internal_mod();
    var internal_2 = require_internal_mod2();
    var types_1 = require_types2();
    function Base64KeyCodec() {
      const fn = (key, codec) => {
        const chunks = [];
        for (const t of key.split(".")) {
          switch (t) {
            case ">":
            case "*":
              chunks.push(t);
              break;
            default:
              chunks.push(codec(t));
              break;
          }
        }
        return chunks.join(".");
      };
      return {
        encode(key) {
          return fn(key, btoa);
        },
        decode(bkey) {
          return fn(bkey, atob);
        }
      };
    }
    function NoopKvCodecs() {
      return {
        key: {
          encode(k) {
            return k;
          },
          decode(k) {
            return k;
          }
        },
        value: {
          encode(v) {
            return typeof v === "string" ? new TextEncoder().encode(v) : v;
          },
          decode(v) {
            return v;
          }
        }
      };
    }
    function defaultBucketOpts() {
      return {
        replicas: 1,
        history: 1,
        timeout: 2e3,
        max_bytes: -1,
        maxValueSize: -1,
        codec: NoopKvCodecs(),
        storage: internal_2.StorageType.File
      };
    }
    exports.kvOperationHdr = "KV-Operation";
    var kvSubjectPrefix = "$KV";
    var validKeyRe = /^[-/=.\w]+$/;
    var validSearchKey = /^[-/=.>*\w]+$/;
    var validBucketRe = /^[-\w]+$/;
    function validateKey(k) {
      if (k.startsWith(".") || k.endsWith(".") || !validKeyRe.test(k)) {
        throw new Error(`invalid key: ${k}`);
      }
    }
    function validateSearchKey(k) {
      if (k.startsWith(".") || k.endsWith(".") || k.includes("..") || !validSearchKey.test(k)) {
        throw new Error(`invalid key: ${k}`);
      }
    }
    function hasWildcards(k) {
      if (k.startsWith(".") || k.endsWith(".")) {
        throw new Error(`invalid key: ${k}`);
      }
      const chunks = k.split(".");
      let hasWildcards2 = false;
      for (let i = 0; i < chunks.length; i++) {
        switch (chunks[i]) {
          case "*":
            hasWildcards2 = true;
            break;
          case ">":
            if (i !== chunks.length - 1) {
              throw new Error(`invalid key: ${k}`);
            }
            hasWildcards2 = true;
            break;
          default:
        }
      }
      return hasWildcards2;
    }
    function validateBucket(name) {
      if (!validBucketRe.test(name)) {
        throw new Error(`invalid bucket name: ${name}`);
      }
    }
    var Kvm3 = class {
      js;
      /**
       * Creates an instance of the Kv that allows you to create and access KV stores.
       * Note that if the argument is a NatsConnection, default JetStream Options are
       * used. If you want to set some options, please provide a JetStreamClient instead.
       * @param nc
       */
      constructor(nc) {
        this.js = (0, internal_2.toJetStreamClient)(nc);
      }
      /**
       * Creates and opens the specified KV. If the KV already exists, it opens the existing KV.
       * @param name
       * @param opts
       */
      create(name, opts = {}) {
        return this.#maybeCreate(name, opts);
      }
      /**
       * Open to the specified KV. If the KV doesn't exist, this API will fail on accessing
       * the KV.
       * @param name
       * @param opts
       */
      open(name, opts = {}) {
        opts.bindOnly = true;
        return this.#maybeCreate(name, opts);
      }
      #maybeCreate(name, opts = {}) {
        const { ok, min } = this.js.nc.features.get(internal_1.Feature.JS_KV);
        if (!ok) {
          return Promise.reject(new Error(`kv is only supported on servers ${min} or better`));
        }
        if (opts.bindOnly) {
          return Bucket.bind(this.js, name, opts);
        }
        return Bucket.create(this.js, name, opts);
      }
      /**
       * Lists all available KVs
       */
      list() {
        const filter = (v) => {
          const slr = v;
          const kvStreams = slr.streams.filter((v2) => {
            return v2.config.name.startsWith(types_1.kvPrefix);
          });
          kvStreams.forEach((si) => {
            si.config.sealed = si.config.sealed || false;
            si.config.deny_delete = si.config.deny_delete || false;
            si.config.deny_purge = si.config.deny_purge || false;
            si.config.allow_rollup_hdrs = si.config.allow_rollup_hdrs || false;
          });
          let cluster = "";
          if (kvStreams.length) {
            cluster = this.js.nc.info?.cluster ?? "";
          }
          return kvStreams.map((si) => {
            return new KvStatusImpl(si, cluster);
          });
        };
        const subj = `${this.js.prefix}.STREAM.LIST`;
        return new internal_2.ListerImpl(subj, filter, this.js);
      }
    };
    exports.Kvm = Kvm3;
    var Bucket = class _Bucket {
      js;
      jsm;
      stream;
      bucket;
      direct;
      codec;
      prefix;
      editPrefix;
      useJsPrefix;
      _prefixLen;
      constructor(bucket, js, jsm) {
        validateBucket(bucket);
        this.js = js;
        this.jsm = jsm;
        this.bucket = bucket;
        this.prefix = kvSubjectPrefix;
        this.editPrefix = "";
        this.useJsPrefix = false;
        this._prefixLen = 0;
      }
      static async create(js, name, opts = {}) {
        validateBucket(name);
        const jsm = await js.jetstreamManager();
        const bucket = new _Bucket(name, js, jsm);
        await bucket.init(opts);
        return bucket;
      }
      static async bind(js, name, opts = {}) {
        const checkAPI = js.getOptions()?.checkAPI || opts.bindOnly === false;
        const jsm = await js.jetstreamManager(checkAPI);
        const info = {
          config: {
            allow_direct: opts.allow_direct
          }
        };
        validateBucket(name);
        const bucket = new _Bucket(name, js, jsm);
        info.config.name = opts.streamName ?? bucket.bucketName();
        Object.assign(bucket, info);
        bucket.stream = info.config.name;
        bucket.codec = opts.codec || NoopKvCodecs();
        bucket.direct = info.config.allow_direct ?? false;
        bucket.initializePrefixes(info);
        return bucket;
      }
      async init(opts = {}) {
        const bo = Object.assign(defaultBucketOpts(), opts);
        this.codec = bo.codec;
        const sc = {};
        this.stream = sc.name = opts.streamName ?? this.bucketName();
        sc.retention = internal_2.RetentionPolicy.Limits;
        sc.max_msgs_per_subject = bo.history;
        if (bo.max_bytes) {
          sc.max_bytes = bo.max_bytes;
        }
        sc.max_msg_size = bo.maxValueSize;
        sc.storage = bo.storage;
        if (opts.placement) {
          sc.placement = opts.placement;
        }
        if (opts.republish) {
          sc.republish = opts.republish;
        }
        if (opts.description) {
          sc.description = opts.description;
        }
        if (opts.markerTTL) {
          sc.allow_msg_ttl = true;
          sc.subject_delete_marker_ttl = (0, internal_1.nanos)(bo.markerTTL);
        }
        if (opts.mirror) {
          const mirror = Object.assign({}, opts.mirror);
          if (!mirror.name.startsWith(types_1.kvPrefix)) {
            mirror.name = `${types_1.kvPrefix}${mirror.name}`;
          }
          sc.mirror = mirror;
          sc.mirror_direct = true;
        } else if (opts.sources) {
          const sources = opts.sources.map((s) => {
            const c = Object.assign({}, s);
            const srcBucketName = c.name.startsWith(types_1.kvPrefix) ? c.name.substring(types_1.kvPrefix.length) : c.name;
            if (!c.name.startsWith(types_1.kvPrefix)) {
              c.name = `${types_1.kvPrefix}${c.name}`;
            }
            if (!s.external && srcBucketName !== this.bucket) {
              c.subject_transforms = [
                { src: `$KV.${srcBucketName}.>`, dest: `$KV.${this.bucket}.>` }
              ];
            }
            return c;
          });
          sc.sources = sources;
          sc.subjects = [this.subjectForBucket()];
        } else {
          sc.subjects = [this.subjectForBucket()];
        }
        if (opts.metadata) {
          sc.metadata = opts.metadata;
        }
        if (typeof opts.compression === "boolean") {
          sc.compression = opts.compression ? internal_2.StoreCompression.S2 : internal_2.StoreCompression.None;
        }
        const nci = this.js.nc;
        const have = nci.getServerVersion();
        const discardNew = have ? (0, internal_1.compare)(have, (0, internal_1.parseSemVer)("2.7.2")) >= 0 : false;
        sc.discard = discardNew ? internal_2.DiscardPolicy.New : internal_2.DiscardPolicy.Old;
        const { ok: direct, min } = nci.features.get(internal_1.Feature.JS_ALLOW_DIRECT);
        if (!direct && opts.allow_direct === true) {
          const v = have ? `${have.major}.${have.minor}.${have.micro}` : "unknown";
          return Promise.reject(new Error(`allow_direct is not available on server version ${v} - requires ${min}`));
        }
        opts.allow_direct = typeof opts.allow_direct === "boolean" ? opts.allow_direct : direct;
        sc.allow_direct = opts.allow_direct;
        this.direct = sc.allow_direct;
        sc.num_replicas = bo.replicas;
        if (bo.ttl) {
          sc.max_age = (0, internal_1.nanos)(bo.ttl);
        }
        sc.allow_rollup_hdrs = true;
        let info;
        try {
          info = await this.jsm.streams.info(sc.name);
          if (!info.config.allow_direct && this.direct === true) {
            this.direct = false;
          }
        } catch (err2) {
          if (err2.message === "stream not found") {
            info = await this.jsm.streams.add(sc);
          } else {
            throw err2;
          }
        }
        this.initializePrefixes(info);
      }
      initializePrefixes(info) {
        this._prefixLen = 0;
        this.prefix = `$KV.${this.bucket}`;
        this.useJsPrefix = this.js.apiPrefix !== "$JS.API";
        const { mirror } = info.config;
        if (mirror) {
          let n = mirror.name;
          if (n.startsWith(types_1.kvPrefix)) {
            n = n.substring(types_1.kvPrefix.length);
          }
          if (mirror.external && mirror.external.api !== "") {
            const mb = mirror.name.substring(types_1.kvPrefix.length);
            this.useJsPrefix = false;
            this.prefix = `$KV.${mb}`;
            this.editPrefix = `${mirror.external.api}.$KV.${n}`;
          } else {
            this.editPrefix = this.prefix;
          }
        }
      }
      bucketName() {
        return this.stream ?? `${types_1.kvPrefix}${this.bucket}`;
      }
      subjectForBucket() {
        return `${this.prefix}.${this.bucket}.>`;
      }
      subjectForKey(k, edit = false) {
        const builder = [];
        if (edit) {
          if (this.useJsPrefix) {
            builder.push(this.js.apiPrefix);
          }
          if (this.editPrefix !== "") {
            builder.push(this.editPrefix);
          } else {
            builder.push(this.prefix);
          }
        } else {
          if (this.prefix) {
            builder.push(this.prefix);
          }
        }
        builder.push(k);
        return builder.join(".");
      }
      fullKeyName(k) {
        if (this.prefix !== "") {
          return `${this.prefix}.${k}`;
        }
        return `${kvSubjectPrefix}.${this.bucket}.${k}`;
      }
      get prefixLen() {
        if (this._prefixLen === 0) {
          this._prefixLen = this.prefix.length + 1;
        }
        return this._prefixLen;
      }
      encodeKey(key) {
        const chunks = [];
        for (const t of key.split(".")) {
          switch (t) {
            case ">":
            case "*":
              chunks.push(t);
              break;
            default:
              chunks.push(this.codec.key.encode(t));
              break;
          }
        }
        return chunks.join(".");
      }
      decodeKey(ekey) {
        const chunks = [];
        for (const t of ekey.split(".")) {
          switch (t) {
            case ">":
            case "*":
              chunks.push(t);
              break;
            default:
              chunks.push(this.codec.key.decode(t));
              break;
          }
        }
        return chunks.join(".");
      }
      validateKey = validateKey;
      validateSearchKey = validateSearchKey;
      hasWildcards = hasWildcards;
      close() {
        return Promise.resolve();
      }
      dataLen(data, h2) {
        const slen = h2 ? h2.get(internal_2.JsHeaders.MessageSizeHdr) || "" : "";
        if (slen !== "") {
          return parseInt(slen, 10);
        }
        return data.length;
      }
      smToEntry(sm) {
        return new KvStoredEntryImpl(this.bucket, this.prefixLen, sm, this.codec);
      }
      jmToWatchEntry(jm, isUpdate) {
        return new KvJsMsgEntryImpl(this.bucket, this.prefixLen, jm, isUpdate, this.codec);
      }
      async create(k, data, markerTTL) {
        let firstErr;
        try {
          const opts = { previousSeq: 0 };
          const n = await this._put(k, data, opts, markerTTL);
          return Promise.resolve(n);
        } catch (err2) {
          firstErr = err2;
          if (err2 instanceof internal_2.JetStreamApiError) {
            const jserr = err2;
            if (jserr.code !== internal_2.JetStreamApiCodes.StreamWrongLastSequence && jserr.code !== internal_2.JetStreamApiCodes.StreamWrongLastSequenceUnknown) {
              return Promise.reject(err2);
            }
          }
        }
        let rev = 0;
        try {
          const e = await this.get(k);
          if (e?.operation === "DEL" || e?.operation === "PURGE") {
            rev = e !== null ? e.revision : 0;
            return this._put(k, data, { previousSeq: rev }, markerTTL);
          } else {
            return Promise.reject(firstErr);
          }
        } catch (err2) {
          return Promise.reject(err2);
        }
      }
      update(k, data, version, timeout) {
        if (version <= 0) {
          throw new Error("version must be greater than 0");
        }
        return this.put(k, data, { previousSeq: version, timeout });
      }
      async _put(k, data, opts = {}, markerTTL) {
        const ek = this.encodeKey(k);
        this.validateKey(ek);
        data = this.codec.value.encode(data);
        const o = { timeout: opts?.timeout };
        if (opts.previousSeq !== void 0) {
          const h2 = (0, internal_1.headers)();
          o.headers = h2;
          h2.set(internal_2.PubHeaders.ExpectedLastSubjectSequenceHdr, `${opts.previousSeq}`);
        }
        if (markerTTL) {
          const h2 = o.headers || (0, internal_1.headers)();
          h2.set(internal_2.PubHeaders.MessageTTL, markerTTL);
        }
        try {
          const pa = await this.js.publish(this.subjectForKey(ek, true), data, o);
          return pa.seq;
        } catch (err2) {
          return Promise.reject(err2);
        }
      }
      put(k, data, opts = {}) {
        return this._put(k, data, opts);
      }
      async get(k, opts) {
        const ek = this.encodeKey(k);
        this.validateKey(ek);
        let arg = { last_by_subj: this.subjectForKey(ek) };
        if (opts && opts.revision > 0) {
          arg = { seq: opts.revision };
        }
        let sm = null;
        try {
          if (this.direct) {
            const direct = this.jsm.direct;
            sm = await direct.getMessage(this.bucketName(), arg);
          } else {
            sm = await this.jsm.streams.getMessage(this.bucketName(), arg);
          }
          if (sm === null) {
            return null;
          }
          const ke = this.smToEntry(sm);
          if (ke.rawKey !== ek) {
            return null;
          }
          return ke;
        } catch (err2) {
          throw err2;
        }
      }
      purge(k, opts) {
        return this._deleteOrPurge(k, "PURGE", opts);
      }
      delete(k, opts) {
        return this._deleteOrPurge(k, "DEL", opts);
      }
      async purgeDeletes(olderMillis = 30 * 60 * 1e3) {
        const buf = [];
        const i = await this.history({
          key: ">"
        });
        await (async () => {
          for await (const e of i) {
            if (e.operation === "DEL" || e.operation === "PURGE") {
              buf.push(e);
            }
          }
        })().then();
        i.stop();
        const min = Date.now() - olderMillis;
        const proms = buf.map((e) => {
          const subj = this.subjectForKey(e.key);
          if (e.created.getTime() >= min) {
            return this.jsm.streams.purge(this.stream, { filter: subj, keep: 1 });
          } else {
            return this.jsm.streams.purge(this.stream, { filter: subj, keep: 0 });
          }
        });
        const purged = await Promise.all(proms);
        purged.unshift({ success: true, purged: 0 });
        return purged.reduce((pv, cv) => {
          pv.purged += cv.purged;
          return pv;
        });
      }
      async _deleteOrPurge(k, op, opts) {
        if (!this.hasWildcards(k)) {
          return this._doDeleteOrPurge(k, op, opts);
        }
        const iter = await this.keys(k);
        const buf = [];
        for await (const k2 of iter) {
          buf.push(this._doDeleteOrPurge(k2, op));
          if (buf.length === 100) {
            await Promise.all(buf);
            buf.length = 0;
          }
        }
        if (buf.length > 0) {
          await Promise.all(buf);
        }
      }
      async _doDeleteOrPurge(k, op, opts) {
        const ek = this.encodeKey(k);
        this.validateKey(ek);
        const h2 = (0, internal_1.headers)();
        h2.set(exports.kvOperationHdr, op);
        if (op === "PURGE") {
          const popts = opts;
          h2.set(internal_2.JsHeaders.RollupHdr, internal_2.JsHeaders.RollupValueSubject);
          if (typeof popts?.ttl === "string" && popts.ttl !== "") {
            h2.set(internal_2.PubHeaders.MessageTTL, `${popts.ttl}`);
          }
        }
        if (opts?.previousSeq) {
          h2.set(internal_2.PubHeaders.ExpectedLastSubjectSequenceHdr, `${opts.previousSeq}`);
        }
        await this.js.publish(this.subjectForKey(ek, true), internal_1.Empty, { headers: h2 });
      }
      _buildCC(k, content, opts = {}) {
        const a = !Array.isArray(k) ? [k] : k;
        let filter_subjects = a.map((k2) => {
          const ek = this.encodeKey(k2);
          this.validateSearchKey(k2);
          return this.fullKeyName(ek);
        });
        let deliver_policy = internal_2.DeliverPolicy.LastPerSubject;
        if (content === types_1.KvWatchInclude.AllHistory) {
          deliver_policy = internal_2.DeliverPolicy.All;
        }
        if (content === types_1.KvWatchInclude.UpdatesOnly) {
          deliver_policy = internal_2.DeliverPolicy.New;
        }
        let filter_subject = void 0;
        if (filter_subjects.length === 1) {
          filter_subject = filter_subjects[0];
          filter_subjects = void 0;
        }
        return Object.assign({
          deliver_policy,
          "ack_policy": internal_2.AckPolicy.None,
          filter_subjects,
          filter_subject,
          "flow_control": true,
          "idle_heartbeat": (0, internal_1.nanos)(5 * 1e3)
        }, opts);
      }
      remove(k) {
        return this.purge(k);
      }
      async history(opts = {}) {
        const k = opts.key ?? ">";
        const co = {};
        co.headers_only = opts.headers_only || false;
        const qi = new internal_1.QueuedIteratorImpl();
        const fn = () => {
          qi.stop();
        };
        const cc = this._buildCC(k, types_1.KvWatchInclude.AllHistory, co);
        const oc = await this.js.consumers.getPushConsumer(this.stream, cc);
        qi._data = oc;
        const info = await oc.info(true);
        if (info.num_pending === 0) {
          qi.push(fn);
          return qi;
        }
        const iter = await oc.consume({
          callback: (m) => {
            const e = this.jmToWatchEntry(m, false);
            qi.push(e);
            qi.received++;
            if (m.info.pending === 0) {
              qi.push(fn);
            }
          }
        });
        iter.closed().then(() => {
          qi.push(fn);
        });
        (async () => {
          for await (const s of iter.status()) {
            switch (s.type) {
              // if we get a heartbeat we got all the keys
              case "heartbeat":
                qi.push(() => {
                  qi.stop();
                });
                break;
            }
          }
        })().then();
        qi.iterClosed.then(() => {
          iter.stop();
        });
        return qi;
      }
      canSetWatcherName() {
        const nci = this.js.nc;
        const { ok } = nci.features.get(internal_1.Feature.JS_NEW_CONSUMER_CREATE_API);
        return ok;
      }
      async watch(opts = {}) {
        const k = opts.key ?? ">";
        const qi = new internal_1.QueuedIteratorImpl();
        const co = {};
        co.headers_only = opts.headers_only || false;
        let content = types_1.KvWatchInclude.LastValue;
        if (opts.include === types_1.KvWatchInclude.AllHistory) {
          content = types_1.KvWatchInclude.AllHistory;
        } else if (opts.include === types_1.KvWatchInclude.UpdatesOnly) {
          content = types_1.KvWatchInclude.UpdatesOnly;
        }
        const ignoreDeletes = opts.ignoreDeletes === true;
        const cc = this._buildCC(k, content, co);
        cc.name = `KV_WATCHER_${internal_1.nuid.next()}`;
        if (opts.resumeFromRevision && opts.resumeFromRevision > 0) {
          cc.deliver_policy = internal_2.DeliverPolicy.StartSequence;
          cc.opt_start_seq = opts.resumeFromRevision;
        }
        const oc = await this.js.consumers.getPushConsumer(this.stream, cc);
        const info = await oc.info(true);
        const count = info.num_pending;
        let isUpdate = content === types_1.KvWatchInclude.UpdatesOnly || count === 0;
        qi._data = oc;
        let i = 0;
        const iter = await oc.consume({
          callback: (m) => {
            if (!isUpdate) {
              i++;
              isUpdate = i >= count;
            }
            const e = this.jmToWatchEntry(m, isUpdate);
            if (ignoreDeletes && e.operation === "DEL") {
              return;
            }
            qi.push(e);
            qi.received++;
          }
        });
        qi.iterClosed.then(() => {
          iter.stop();
        });
        iter.closed().then(() => {
          qi.push(() => {
            qi.stop();
          });
        });
        return qi;
      }
      async keys(k = ">") {
        const keys = new internal_1.QueuedIteratorImpl();
        const cc = this._buildCC(k, types_1.KvWatchInclude.LastValue, {
          headers_only: true
        });
        const oc = await this.js.consumers.getPushConsumer(this.stream, cc);
        const info = await oc.info();
        if (info.num_pending === 0) {
          keys.stop();
          return keys;
        }
        keys._data = oc;
        const iter = await oc.consume({
          callback: (m) => {
            const op = m.headers?.get(exports.kvOperationHdr);
            if (op !== "DEL" && op !== "PURGE") {
              const key = this.decodeKey(m.subject.substring(this.prefixLen));
              keys.push(key);
            }
            if (m.info.pending === 0) {
              iter.stop();
            }
          }
        });
        (async () => {
          for await (const s of iter.status()) {
            switch (s.type) {
              // if we get a heartbeat we got all the keys
              case "heartbeat":
                keys.push(() => {
                  keys.stop();
                });
                break;
            }
          }
        })().then();
        iter.closed().then(() => {
          keys.push(() => {
            keys.stop();
          });
        });
        keys.iterClosed.then(() => {
          iter.stop();
        });
        return keys;
      }
      purgeBucket(opts) {
        return this.jsm.streams.purge(this.bucketName(), opts);
      }
      destroy() {
        return this.jsm.streams.delete(this.bucketName());
      }
      async status() {
        const nc = this.js.nc;
        const cluster = nc.info?.cluster ?? "";
        const bn = this.bucketName();
        const si = await this.jsm.streams.info(bn);
        return new KvStatusImpl(si, cluster);
      }
    };
    exports.Bucket = Bucket;
    var KvStatusImpl = class {
      si;
      cluster;
      constructor(si, cluster = "") {
        this.si = si;
        this.cluster = cluster;
      }
      get bucket() {
        return this.si.config.name.startsWith(types_1.kvPrefix) ? this.si.config.name.substring(types_1.kvPrefix.length) : this.si.config.name;
      }
      get values() {
        return this.si.state.messages;
      }
      get history() {
        return this.si.config.max_msgs_per_subject;
      }
      get ttl() {
        return (0, internal_1.millis)(this.si.config.max_age);
      }
      get markerTTL() {
        if (typeof this.si.config.subject_delete_marker_ttl === "number") {
          return (0, internal_1.millis)(this.si.config.subject_delete_marker_ttl);
        }
        return 0;
      }
      get bucket_location() {
        return this.cluster;
      }
      get backingStore() {
        return this.si.config.storage;
      }
      get storage() {
        return this.si.config.storage;
      }
      get replicas() {
        return this.si.config.num_replicas;
      }
      get description() {
        return this.si.config.description ?? "";
      }
      get maxBucketSize() {
        return this.si.config.max_bytes;
      }
      get maxValueSize() {
        return this.si.config.max_msg_size;
      }
      get max_bytes() {
        return this.si.config.max_bytes;
      }
      get placement() {
        return this.si.config.placement || { cluster: "", tags: [] };
      }
      get placementCluster() {
        return this.si.config.placement?.cluster ?? "";
      }
      get republish() {
        return this.si.config.republish ?? { src: "", dest: "" };
      }
      get streamInfo() {
        return this.si;
      }
      get size() {
        return this.si.state.bytes;
      }
      get metadata() {
        return this.si.config.metadata ?? {};
      }
      get compression() {
        if (this.si.config.compression) {
          return this.si.config.compression !== internal_2.StoreCompression.None;
        }
        return false;
      }
    };
    exports.KvStatusImpl = KvStatusImpl;
    var KvStoredEntryImpl = class {
      bucket;
      sm;
      prefixLen;
      codec;
      constructor(bucket, prefixLen, sm, codec) {
        this.bucket = bucket;
        this.prefixLen = prefixLen;
        this.sm = sm;
        this.codec = codec;
      }
      get rawKey() {
        return this.sm.subject.substring(this.prefixLen);
      }
      get key() {
        return this.codec.key.decode(this.rawKey);
      }
      get value() {
        return this.codec.value.decode(this.sm.data);
      }
      get delta() {
        return 0;
      }
      get created() {
        return this.sm.time;
      }
      get revision() {
        return this.sm.seq;
      }
      get operation() {
        if (this.sm.header?.has("Nats-Marker-Reason")) {
          const op = this.sm.header?.get("Nats-Marker-Reason");
          if (op === "MaxAge") {
            return "PURGE";
          }
        }
        return this.sm.header?.get(exports.kvOperationHdr) || "PUT";
      }
      get length() {
        const slen = this.sm.header.get(internal_2.JsHeaders.MessageSizeHdr) || "";
        if (slen !== "") {
          return parseInt(slen, 10);
        }
        return this.sm.data.length;
      }
      json(reviver) {
        return JSON.parse(internal_1.TD.decode(this.value), reviver);
      }
      string() {
        return internal_1.TD.decode(this.value);
      }
    };
    var KvJsMsgEntryImpl = class {
      bucket;
      sm;
      prefixLen;
      update;
      codec;
      constructor(bucket, prefixLen, sm, isUpdate, codec) {
        this.bucket = bucket;
        this.prefixLen = prefixLen;
        this.sm = sm;
        this.update = isUpdate;
        this.codec = codec;
      }
      get rawKey() {
        return this.sm.subject.substring(this.prefixLen);
      }
      get key() {
        return this.codec.key.decode(this.rawKey);
      }
      get value() {
        return this.codec.value.decode(this.sm.data);
      }
      get created() {
        return new Date((0, internal_1.millis)(this.sm.info.timestampNanos));
      }
      get revision() {
        return this.sm.seq;
      }
      get operation() {
        if (this.sm.headers?.has("Nats-Marker-Reason")) {
          const op = this.sm.headers?.get("Nats-Marker-Reason");
          if (op === "MaxAge") {
            return "PURGE";
          }
        }
        return this.sm.headers?.get(exports.kvOperationHdr) || "PUT";
      }
      get delta() {
        return this.sm.info.pending;
      }
      get length() {
        const slen = this.sm.headers?.get(internal_2.JsHeaders.MessageSizeHdr) || "";
        if (slen !== "") {
          return parseInt(slen, 10);
        }
        return this.sm.data.length;
      }
      get isUpdate() {
        return this.update;
      }
      json(reviver) {
        return JSON.parse(internal_1.TD.decode(this.value), reviver);
      }
      string() {
        return internal_1.TD.decode(this.value);
      }
    };
  }
});

// node_modules/@nats-io/kv/lib/internal_mod.js
var require_internal_mod3 = __commonJS({
  "node_modules/@nats-io/kv/lib/internal_mod.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateKey = exports.validateBucket = exports.NoopKvCodecs = exports.Kvm = exports.defaultBucketOpts = exports.Bucket = exports.Base64KeyCodec = exports.KvWatchInclude = exports.kvPrefix = void 0;
    var types_1 = require_types2();
    Object.defineProperty(exports, "kvPrefix", { enumerable: true, get: function() {
      return types_1.kvPrefix;
    } });
    Object.defineProperty(exports, "KvWatchInclude", { enumerable: true, get: function() {
      return types_1.KvWatchInclude;
    } });
    var kv_1 = require_kv();
    Object.defineProperty(exports, "Base64KeyCodec", { enumerable: true, get: function() {
      return kv_1.Base64KeyCodec;
    } });
    Object.defineProperty(exports, "Bucket", { enumerable: true, get: function() {
      return kv_1.Bucket;
    } });
    Object.defineProperty(exports, "defaultBucketOpts", { enumerable: true, get: function() {
      return kv_1.defaultBucketOpts;
    } });
    Object.defineProperty(exports, "Kvm", { enumerable: true, get: function() {
      return kv_1.Kvm;
    } });
    Object.defineProperty(exports, "NoopKvCodecs", { enumerable: true, get: function() {
      return kv_1.NoopKvCodecs;
    } });
    Object.defineProperty(exports, "validateBucket", { enumerable: true, get: function() {
      return kv_1.validateBucket;
    } });
    Object.defineProperty(exports, "validateKey", { enumerable: true, get: function() {
      return kv_1.validateKey;
    } });
  }
});

// node_modules/@nats-io/kv/lib/mod.js
var require_mod5 = __commonJS({
  "node_modules/@nats-io/kv/lib/mod.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoopKvCodecs = exports.Kvm = exports.defaultBucketOpts = exports.Bucket = exports.Base64KeyCodec = exports.KvWatchInclude = void 0;
    var internal_mod_1 = require_internal_mod3();
    Object.defineProperty(exports, "KvWatchInclude", { enumerable: true, get: function() {
      return internal_mod_1.KvWatchInclude;
    } });
    var internal_mod_2 = require_internal_mod3();
    Object.defineProperty(exports, "Base64KeyCodec", { enumerable: true, get: function() {
      return internal_mod_2.Base64KeyCodec;
    } });
    Object.defineProperty(exports, "Bucket", { enumerable: true, get: function() {
      return internal_mod_2.Bucket;
    } });
    Object.defineProperty(exports, "defaultBucketOpts", { enumerable: true, get: function() {
      return internal_mod_2.defaultBucketOpts;
    } });
    Object.defineProperty(exports, "Kvm", { enumerable: true, get: function() {
      return internal_mod_2.Kvm;
    } });
    Object.defineProperty(exports, "NoopKvCodecs", { enumerable: true, get: function() {
      return internal_mod_2.NoopKvCodecs;
    } });
  }
});

// src/pi-extension/index.ts
import { spawn as spawn2 } from "node:child_process";

// src/env.ts
function env(name) {
  const vclaw = process.env[`VCLAW_${name}`];
  if (vclaw !== void 0 && vclaw !== "") return vclaw;
  const legacy = process.env[`VCHAT_${name}`];
  if (legacy !== void 0 && legacy !== "") return legacy;
  return void 0;
}

// src/lib/store.ts
var import_nkeys = __toESM(require_mod(), 1);
import { readFile, writeFile, mkdir, unlink, copyFile } from "node:fs/promises";
import { chmodSync, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
function credsDirOverride() {
  return env("CREDS_DIR");
}
function vclawConfigDir() {
  return credsDirOverride() || join(homedir(), ".config", "vclaw");
}
function legacyConfigDir() {
  return credsDirOverride() || join(homedir(), ".config", "vchat");
}
function legacyDirRoot() {
  return credsDirOverride() || join(homedir(), ".vchat");
}
function credentialsFile() {
  return join(vclawConfigDir(), "credentials.json");
}
function legacyConfigCredentialsFile() {
  return join(legacyConfigDir(), "credentials.json");
}
function legacyCredentialsFile() {
  return join(legacyDirRoot(), "credentials.json");
}
function configFile() {
  return join(vclawConfigDir(), "config.json");
}
function legacyConfigFile() {
  return join(legacyConfigDir(), "config.json");
}
function legacyRootConfigFile() {
  return join(legacyDirRoot(), "config.json");
}
function credentialDisplayPath() {
  const override = credsDirOverride();
  return override ? join(override, "credentials.json") : "~/.config/vclaw/credentials.json";
}
function pendingFlagPaths() {
  return [
    join(vclawConfigDir(), ".pending"),
    join(legacyConfigDir(), ".pending"),
    join(legacyDirRoot(), ".pending")
  ];
}
function configFilePaths() {
  return [configFile(), legacyConfigFile(), legacyRootConfigFile()];
}
async function readConfig() {
  for (const f of configFilePaths()) {
    try {
      const data = await readFile(f, "utf-8");
      return JSON.parse(data);
    } catch {
    }
  }
  return null;
}
function readConfigSync() {
  for (const f of configFilePaths()) {
    try {
      return JSON.parse(readFileSync(f, "utf-8"));
    } catch {
    }
  }
  return null;
}
function enforceSecretMode(file) {
  try {
    chmodSync(file, 384);
  } catch {
  }
}
async function saveConfig(cfg) {
  if (!existsSync(vclawConfigDir())) {
    await mkdir(vclawConfigDir(), { recursive: true });
  }
  await writeFile(configFile(), JSON.stringify(cfg, null, 2), { encoding: "utf-8", mode: 384 });
  enforceSecretMode(configFile());
}
function hasPendingFlag() {
  return pendingFlagPaths().some((p) => existsSync(p));
}
async function writePendingFlag(nkey) {
  if (!existsSync(vclawConfigDir())) {
    await mkdir(vclawConfigDir(), { recursive: true });
  }
  await writeFile(pendingFlagPaths()[0], nkey, { encoding: "utf-8", mode: 384 });
  enforceSecretMode(pendingFlagPaths()[0]);
}
async function clearPendingFlag() {
  for (const f of pendingFlagPaths()) {
    try {
      await unlink(f);
    } catch {
    }
  }
}
async function loadCredentials() {
  for (const f of [credentialsFile(), legacyConfigCredentialsFile(), legacyCredentialsFile()]) {
    try {
      const data = await readFile(f, "utf-8");
      const creds = JSON.parse(data);
      const valid = validateStoredCredentials(creds);
      if (valid) return valid;
    } catch {
    }
  }
  return null;
}
function validateStoredCredentials(creds) {
  if (!creds.seed || !creds.seed.startsWith("S") || creds.seed.length !== 58) {
    return null;
  }
  try {
    (0, import_nkeys.fromSeed)(new TextEncoder().encode(creds.seed));
  } catch {
    return null;
  }
  return creds;
}
async function saveCredentials(creds) {
  if (!existsSync(vclawConfigDir())) {
    await mkdir(vclawConfigDir(), { recursive: true });
  }
  await writeFile(credentialsFile(), JSON.stringify(creds, null, 2), {
    encoding: "utf-8",
    mode: 384
  });
  enforceSecretMode(credentialsFile());
}
async function backupCredentials() {
  const tiers = [
    [credentialsFile(), vclawConfigDir()],
    [legacyConfigCredentialsFile(), legacyConfigDir()],
    [legacyCredentialsFile(), legacyDirRoot()]
  ];
  const live = tiers.find(([file]) => existsSync(file));
  if (!live) return null;
  const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const backupPath = join(live[1], `credentials.json.bak-${stamp}`);
  await copyFile(live[0], backupPath);
  return backupPath;
}

// src/mcp/redact.ts
var SEED_PATTERN = /\bS[A-Z2-7]{57}\b/g;
var PROOF_QUERY_PATTERN = /(\?|&)proof=[A-Za-z0-9._~\-]+/g;
function redactSecrets(text) {
  return text.replace(SEED_PATTERN, "S\u2026REDACTED_SEED");
}
function redactError(text) {
  return redactSecrets(text).replace(PROOF_QUERY_PATTERN, (_m, p1) => `${p1}proof=REDACTED`);
}

// src/vclaw/state.ts
import { readFileSync as readFileSync3, readdirSync as readdirSync2, statSync } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";

// src/net/p2p/status.ts
import { existsSync as existsSync3, readdirSync, readFileSync as readFileSync2 } from "node:fs";
import { execFileSync } from "node:child_process";
import { connect as netConnect2 } from "node:net";
import path2 from "node:path";

// src/net/p2p/client.ts
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { connect as netConnect } from "node:net";
import { existsSync as existsSync2, mkdirSync, unlinkSync } from "node:fs";

// src/net/p2p/identity.ts
import { hkdfSync } from "node:crypto";

// node_modules/@noble/ed25519/index.js
var ed25519_CURVE = Object.freeze({
  p: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffedn,
  n: 0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn,
  h: 8n,
  a: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffecn,
  d: 0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3n,
  Gx: 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an,
  Gy: 0x6666666666666666666666666666666666666666666666666666666666666658n
});
var { p: P, n: N, Gx, Gy, a: _a, d: _d, h } = ed25519_CURVE;
var L = 32;
var captureTrace = (...args) => {
  if ("captureStackTrace" in Error && typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(...args);
  }
};
var err = (message = "") => {
  const e = new Error(message);
  captureTrace(e, err);
  throw e;
};
var isBig = (n) => typeof n === "bigint";
var isStr = (s) => typeof s === "string";
var isBytes = (a) => a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
var abytes = (value, length, title = "") => {
  const bytes = isBytes(value);
  const len = value?.length;
  const needsLen = length !== void 0;
  if (!bytes || needsLen && len !== length) {
    const prefix = title && `"${title}" `;
    const ofLen = needsLen ? ` of length ${length}` : "";
    const got = bytes ? `length=${len}` : `type=${typeof value}`;
    const msg = prefix + "expected Uint8Array" + ofLen + ", got " + got;
    throw bytes ? new RangeError(msg) : new TypeError(msg);
  }
  return value;
};
var u8n = (len) => new Uint8Array(len);
var u8fr = (buf) => Uint8Array.from(buf);
var padh = (n, pad) => n.toString(16).padStart(pad, "0");
var bytesToHex = (b) => Array.from(abytes(b)).map((e) => padh(e, 2)).join("");
var C = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
var _ch = (ch) => {
  if (ch >= C._0 && ch <= C._9)
    return ch - C._0;
  if (ch >= C.A && ch <= C.F)
    return ch - (C.A - 10);
  if (ch >= C.a && ch <= C.f)
    return ch - (C.a - 10);
  return;
};
var hexToBytes = (hex) => {
  const e = "hex invalid";
  if (!isStr(hex))
    return err(e);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    return err(e);
  const array = u8n(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = _ch(hex.charCodeAt(hi));
    const n2 = _ch(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0)
      return err(e);
    array[ai] = n1 * 16 + n2;
  }
  return array;
};
var cr = () => globalThis?.crypto;
var subtle = () => cr()?.subtle ?? err("crypto.subtle must be defined, consider polyfill");
var concatBytes = (...arrs) => {
  let len = 0;
  for (const a of arrs)
    len += abytes(a).length;
  const r = u8n(len);
  let pad = 0;
  arrs.forEach((a) => {
    r.set(a, pad);
    pad += a.length;
  });
  return r;
};
var big = BigInt;
var assertRange = (n, min, max, msg = "bad number: out of range") => {
  if (!isBig(n))
    throw new TypeError(msg);
  if (min <= n && n < max)
    return n;
  throw new RangeError(msg);
};
var M = (a, b = P) => {
  const r = a % b;
  return r >= 0n ? r : b + r;
};
var P_MASK = (1n << 255n) - 1n;
var modP = (num) => {
  if (num < 0n)
    err("negative coordinate");
  let r = (num >> 255n) * 19n + (num & P_MASK);
  r = (r >> 255n) * 19n + (r & P_MASK);
  return r % P;
};
var modN = (a) => M(a, N);
var invert = (num, md) => {
  if (num === 0n || md <= 0n)
    err("no inverse n=" + num + " mod=" + md);
  let a = M(num, md), b = md, x = 0n, y = 1n, u = 1n, v = 0n;
  while (a !== 0n) {
    const q = b / a, r = b % a;
    const m = x - u * q, n = y - v * q;
    b = a, a = r, x = u, y = v, u = m, v = n;
  }
  return b === 1n ? M(x, md) : err("no inverse");
};
var callHash = (name) => {
  const fn = hashes[name];
  if (typeof fn !== "function")
    err("hashes." + name + " not set");
  return fn;
};
var checkDigest = (value) => abytes(value, 64, "digest");
var apoint = (p) => p instanceof Point ? p : err("Point expected");
var B256 = 2n ** 256n;
var Point = class _Point {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  T;
  // Constructor only bounds-checks and freezes XYZT coordinates; it does not prove the point is
  // on-curve or that T matches X*Y/Z.
  constructor(X, Y, Z, T) {
    const max = B256;
    this.X = assertRange(X, 0n, max);
    this.Y = assertRange(Y, 0n, max);
    this.Z = assertRange(Z, 1n, max);
    this.T = assertRange(T, 0n, max);
    Object.freeze(this);
  }
  static CURVE() {
    return ed25519_CURVE;
  }
  static fromAffine(p) {
    return new _Point(p.x, p.y, 1n, modP(p.x * p.y));
  }
  /** RFC8032 5.1.3: Bytes to Point. */
  static fromBytes(hex, zip215 = false) {
    const d = _d;
    const normed = u8fr(abytes(hex, L));
    const lastByte = hex[31];
    normed[31] = lastByte & ~128;
    const y = bytesToNumberLE(normed);
    const max = zip215 ? B256 : P;
    assertRange(y, 0n, max);
    const y2 = modP(y * y);
    const u = M(y2 - 1n);
    const v = modP(d * y2 + 1n);
    let { isValid, value: x } = uvRatio(u, v);
    if (!isValid)
      err("bad point: y not sqrt");
    const isXOdd = (x & 1n) === 1n;
    const isLastByteOdd = (lastByte & 128) !== 0;
    if (!zip215 && x === 0n && isLastByteOdd)
      err("bad point: x==0, isLastByteOdd");
    if (isLastByteOdd !== isXOdd)
      x = M(-x);
    return new _Point(x, y, 1n, modP(x * y));
  }
  static fromHex(hex, zip215) {
    return _Point.fromBytes(hexToBytes(hex), zip215);
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const a = _a;
    const d = _d;
    const p = this;
    if (p.is0())
      return err("bad point: ZERO");
    const { X, Y, Z, T } = p;
    const X2 = modP(X * X);
    const Y2 = modP(Y * Y);
    const Z2 = modP(Z * Z);
    const Z4 = modP(Z2 * Z2);
    const aX2 = modP(X2 * a);
    const left = modP(Z2 * (aX2 + Y2));
    const right = M(Z4 + modP(d * modP(X2 * Y2)));
    if (left !== right)
      return err("bad point: equation left != right (1)");
    const XY = modP(X * Y);
    const ZT = modP(Z * T);
    if (XY !== ZT)
      return err("bad point: equation left != right (2)");
    return this;
  }
  /** Equality check: compare points P&Q. */
  equals(other) {
    const { X: X1, Y: Y1, Z: Z1 } = this;
    const { X: X2, Y: Y2, Z: Z2 } = apoint(other);
    const X1Z2 = modP(X1 * Z2);
    const X2Z1 = modP(X2 * Z1);
    const Y1Z2 = modP(Y1 * Z2);
    const Y2Z1 = modP(Y2 * Z1);
    return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
  }
  is0() {
    return this.equals(I);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new _Point(M(-this.X), this.Y, this.Z, M(-this.T));
  }
  /** Point doubling. Complete formula. Cost: `4M + 4S + 1*a + 6add + 1*2`. */
  double() {
    const { X: X1, Y: Y1, Z: Z1 } = this;
    const a = _a;
    const A = modP(X1 * X1);
    const B = modP(Y1 * Y1);
    const C2 = modP(2n * Z1 * Z1);
    const D = modP(a * A);
    const x1y1 = M(X1 + Y1);
    const E = M(modP(x1y1 * x1y1) - A - B);
    const G2 = M(D + B);
    const F = M(G2 - C2);
    const H = M(D - B);
    const X3 = modP(E * F);
    const Y3 = modP(G2 * H);
    const T3 = modP(E * H);
    const Z3 = modP(F * G2);
    return new _Point(X3, Y3, Z3, T3);
  }
  /** Point addition. Complete formula. Cost: `8M + 1*k + 8add + 1*2`. */
  add(other) {
    const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
    const { X: X2, Y: Y2, Z: Z2, T: T2 } = apoint(other);
    const a = _a;
    const d = _d;
    const A = modP(X1 * X2);
    const B = modP(Y1 * Y2);
    const C2 = modP(modP(T1 * d) * T2);
    const D = modP(Z1 * Z2);
    const E = M(modP(M(X1 + Y1) * M(X2 + Y2)) - A - B);
    const F = M(D - C2);
    const G2 = M(D + C2);
    const H = M(B - modP(a * A));
    const X3 = modP(E * F);
    const Y3 = modP(G2 * H);
    const T3 = modP(E * H);
    const Z3 = modP(F * G2);
    return new _Point(X3, Y3, Z3, T3);
  }
  subtract(other) {
    return this.add(apoint(other).negate());
  }
  /**
   * Point-by-scalar multiplication. Safe mode requires `1 <= n < CURVE.n`.
   * Unsafe mode additionally permits `n = 0` and returns the identity point for that case.
   * Uses {@link wNAF} for base point.
   * Uses fake point to mitigate side-channel leakage.
   * @param n - scalar by which point is multiplied
   * @param safe - safe mode guards against timing attacks; unsafe mode is faster
   */
  multiply(n, safe = true) {
    if (!safe && n === 0n)
      return I;
    assertRange(n, 1n, N);
    if (!safe && this.is0())
      return I;
    if (n === 1n)
      return this;
    if (this.equals(G))
      return wNAF(n).p;
    let p = I;
    let f = G;
    for (let d = this; n > 0n; d = d.double(), n >>= 1n) {
      if (n & 1n)
        p = p.add(d);
      else if (safe)
        f = f.add(d);
    }
    return p;
  }
  multiplyUnsafe(scalar) {
    return this.multiply(scalar, false);
  }
  /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
  toAffine() {
    const { X, Y, Z } = this;
    if (this.equals(I))
      return { x: 0n, y: 1n };
    const iz = invert(Z, P);
    if (modP(Z * iz) !== 1n)
      err("invalid inverse");
    const x = modP(X * iz);
    const y = modP(Y * iz);
    return { x, y };
  }
  toBytes() {
    const { x, y } = this.toAffine();
    const b = numTo32bLE(y);
    b[31] |= x & 1n ? 128 : 0;
    return b;
  }
  toHex() {
    return bytesToHex(this.toBytes());
  }
  clearCofactor() {
    return this.multiply(big(h), false);
  }
  isSmallOrder() {
    return this.clearCofactor().is0();
  }
  isTorsionFree() {
    let p = this.multiply(N / 2n, false).double();
    if (N % 2n)
      p = p.add(this);
    return p.is0();
  }
};
var G = new Point(Gx, Gy, 1n, M(Gx * Gy));
var I = new Point(0n, 1n, 1n, 0n);
Point.BASE = G;
Point.ZERO = I;
var numTo32bLE = (num) => hexToBytes(padh(assertRange(num, 0n, B256), 64)).reverse();
var bytesToNumberLE = (b) => big("0x" + bytesToHex(u8fr(abytes(b)).reverse()));
var pow2 = (x, power) => {
  let r = x;
  while (power-- > 0n) {
    r = modP(r * r);
  }
  return r;
};
var pow_2_252_3 = (x) => {
  const x2 = modP(x * x);
  const b2 = modP(x2 * x);
  const b4 = modP(pow2(b2, 2n) * b2);
  const b5 = modP(pow2(b4, 1n) * x);
  const b10 = modP(pow2(b5, 5n) * b5);
  const b20 = modP(pow2(b10, 10n) * b10);
  const b40 = modP(pow2(b20, 20n) * b20);
  const b80 = modP(pow2(b40, 40n) * b40);
  const b160 = modP(pow2(b80, 80n) * b80);
  const b240 = modP(pow2(b160, 80n) * b80);
  const b250 = modP(pow2(b240, 10n) * b10);
  const pow_p_5_8 = modP(pow2(b250, 2n) * x);
  return { pow_p_5_8, b2 };
};
var RM1 = 0x2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0n;
var uvRatio = (u, v) => {
  const v3 = modP(v * modP(v * v));
  const v7 = modP(modP(v3 * v3) * v);
  const pow = pow_2_252_3(modP(u * v7)).pow_p_5_8;
  let x = modP(u * modP(v3 * pow));
  const vx2 = modP(v * modP(x * x));
  const root1 = x;
  const root2 = modP(x * RM1);
  const useRoot1 = vx2 === u;
  const useRoot2 = vx2 === M(-u);
  const noRoot = vx2 === M(-u * RM1);
  if (useRoot1)
    x = root1;
  if (useRoot2 || noRoot)
    x = root2;
  if ((M(x) & 1n) === 1n)
    x = M(-x);
  return { isValid: useRoot1 || useRoot2, value: x };
};
var modL_LE = (hash) => modN(bytesToNumberLE(hash));
var sha512s = (...m) => checkDigest(callHash("sha512")(concatBytes(...m)));
var hash2extK = (hashed) => {
  const copy = u8fr(hashed);
  const head = copy.slice(0, 32);
  head[0] &= 248;
  head[31] &= 127;
  head[31] |= 64;
  const prefix = copy.slice(32, 64);
  const scalar = modL_LE(head);
  const point = G.multiply(scalar);
  const pointBytes = point.toBytes();
  return { head, prefix, scalar, point, pointBytes };
};
var getExtendedPublicKey = (secretKey) => hash2extK(sha512s(abytes(secretKey, L)));
var getPublicKey = (priv) => getExtendedPublicKey(priv).pointBytes;
var hashes = {
  sha512Async: async (message) => {
    const s = subtle();
    const m = concatBytes(message);
    return u8n(await s.digest("SHA-512", m.buffer));
  },
  sha512: void 0
};
var W = 8;
var scalarBits = 256;
var pwindows = Math.ceil(scalarBits / W) + 1;
var pwindowSize = 2 ** (W - 1);
var precompute = () => {
  const points = [];
  let p = G;
  let b = p;
  for (let w = 0; w < pwindows; w++) {
    b = p;
    points.push(b);
    for (let i = 1; i < pwindowSize; i++) {
      b = b.add(p);
      points.push(b);
    }
    p = b.double();
  }
  return points;
};
var Gpows = void 0;
var ctneg = (cnd, p) => {
  const n = p.negate();
  return cnd ? n : p;
};
var wNAF = (n) => {
  const comp = Gpows || (Gpows = precompute());
  let p = I;
  let f = G;
  const pow_2_w = 2 ** W;
  const maxNum = pow_2_w;
  const mask = big(pow_2_w - 1);
  const shiftBy = big(W);
  for (let w = 0; w < pwindows; w++) {
    let wbits = Number(n & mask);
    n >>= shiftBy;
    if (wbits > pwindowSize) {
      wbits -= maxNum;
      n += 1n;
    }
    const off = w * pwindowSize;
    const offF = off;
    const offP = off + Math.abs(wbits) - 1;
    const isEven = w % 2 !== 0;
    const isNeg = wbits < 0;
    if (wbits === 0) {
      f = f.add(ctneg(isEven, comp[offF]));
    } else {
      p = p.add(ctneg(isNeg, comp[offP]));
    }
  }
  if (n !== 0n)
    err("invalid wnaf");
  return { p, f };
};

// src/net/p2p/identity.ts
import { createHash as createHash2 } from "node:crypto";

// src/lib/keygen.ts
var import_nkeys2 = __toESM(require_mod(), 1);
import { createHash } from "node:crypto";
hashes.sha512 = (message) => {
  const hash = createHash("sha512");
  hash.update(message);
  return new Uint8Array(hash.digest());
};
function seedToString(seedArr) {
  return new TextDecoder().decode(seedArr);
}
async function generateNkeyPair() {
  const kp = (0, import_nkeys2.createUser)();
  const seed = seedToString(kp.getSeed());
  const publicKey = kp.getPublicKey();
  const validated = (0, import_nkeys2.fromSeed)(kp.getSeed());
  (0, import_nkeys2.fromPublic)(publicKey);
  const rawSeed = validated.getRawSeed();
  const rawPublicKey = getPublicKey(rawSeed);
  return {
    seed,
    publicKey,
    rawSeed,
    rawPublicKey,
    hexPublicKey: Buffer.from(rawPublicKey).toString("hex")
  };
}
async function keypairFromSeed(nkeySeed) {
  const kp = (0, import_nkeys2.fromSeed)(new TextEncoder().encode(nkeySeed));
  const seed = seedToString(kp.getSeed());
  const publicKey = kp.getPublicKey();
  const rawSeed = kp.getRawSeed();
  const rawPublicKey = getPublicKey(rawSeed);
  return {
    seed,
    publicKey,
    rawSeed,
    rawPublicKey,
    hexPublicKey: Buffer.from(rawPublicKey).toString("hex")
  };
}

// src/net/p2p/identity.ts
hashes.sha512 = (message) => {
  const hash = createHash2("sha512");
  hash.update(message);
  return new Uint8Array(hash.digest());
};

// src/net/p2p/client.ts
var BLOB_CHUNK_BYTES = 1024 * 1024;
function resolveSidecarDir(fromModuleUrl = import.meta.url) {
  const override = process.env.PEARS_SIDECAR_DIR;
  if (override && existsSync2(path.join(override, "dist", "main.js"))) return override;
  const here = path.dirname(fileURLToPath(fromModuleUrl));
  const candidates = [
    path.join(os.homedir(), ".vclaw", "pears", "sidecar"),
    path.join(here, "sidecar"),
    path.join(here, "pears-sidecar"),
    path.resolve(here, "../../net/p2p/sidecar")
  ];
  for (const candidate of candidates) {
    if (existsSync2(path.join(candidate, "dist", "main.js"))) return candidate;
  }
  return null;
}
function resolveNodeBinary() {
  const explicit = process.env.PEARS_NODE_BIN;
  if (explicit && existsSync2(explicit)) return explicit;
  const pathEnv = process.env.PEARS_TEST_NODE_PATH ?? process.env.PATH ?? "";
  for (const dir of pathEnv.split(":")) {
    if (dir === "") continue;
    const candidate = path.join(dir, "node");
    if (existsSync2(candidate)) return candidate;
  }
  return null;
}
function resolveHelperSocketPath() {
  return process.env.PEARS_HELPER_SOCK || path.join(os.homedir(), ".vclaw", "pears", "helper.sock");
}
function resolveHelperStoreDir() {
  return process.env.PEARS_HELPER_STORE_DIR || path.join(os.homedir(), ".vclaw", "pears", "store");
}

// src/net/p2p/status.ts
var PEARS_NODE_FLOOR = [22, 18];
function nodeVersionOf(nodeBin) {
  try {
    return execFileSync(nodeBin, ["--version"], { encoding: "utf8", timeout: 5e3 }).trim();
  } catch {
    return null;
  }
}
function satisfiesFloor(version) {
  if (!version) return false;
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!m) return false;
  const [major, minor] = [Number(m[1]), Number(m[2])];
  return major > PEARS_NODE_FLOOR[0] || major === PEARS_NODE_FLOOR[0] && minor >= PEARS_NODE_FLOOR[1];
}
function sidecarVersionOf(dir) {
  if (!dir) return null;
  try {
    const pkg = JSON.parse(readFileSync2(path2.join(dir, "package.json"), "utf8"));
    return pkg.version ?? null;
  } catch {
    return null;
  }
}
function sidecarDepsOk(dir) {
  if (!dir) return false;
  return existsSync3(path2.join(dir, "node_modules", "sodium-native")) && existsSync3(path2.join(dir, "node_modules", "hyperswarm"));
}
function delegationsUnder(storeDir) {
  const dir = path2.join(storeDir, "delegations");
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  } catch {
    return [];
  }
}
function nativeBindingLoads(nodeBin, sidecarDir) {
  try {
    execFileSync(nodeBin, ["-e", "require('sodium-native')"], {
      cwd: sidecarDir,
      timeout: 5e3,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}
function socketAnswers(socketPath) {
  return new Promise((resolve) => {
    const sock = netConnect2(socketPath);
    const done = (ok) => {
      sock.destroy();
      resolve(ok);
    };
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
    setTimeout(() => done(false), 200);
  });
}
async function pearsStatus(opts = {}) {
  const sidecarDir = resolveSidecarDir();
  const node = resolveNodeBinary();
  const nodeVersion = node ? nodeVersionOf(node) : null;
  const nodeOk = satisfiesFloor(nodeVersion);
  const helperSocket = resolveHelperSocketPath();
  const helperStoreDir = resolveHelperStoreDir();
  const depsOk = sidecarDepsOk(sidecarDir);
  const reason = sidecarDir === null ? "no helper build found (the join pipe installs it to ~/.vclaw/pears/sidecar; a repo checkout has it under agent-sdk/src/net/p2p/sidecar after npm run build)" : !nodeOk ? `node ${nodeVersion ?? "(absent)"} does not satisfy >= ${PEARS_NODE_FLOOR.join(".")} (Tier P runs on node, never bun)` : !depsOk ? "the helper's dependencies are not installed (npm ci in the helper dir)" : "";
  const nativeLoadOk = opts.deep && sidecarDir !== null && nodeOk && depsOk ? nativeBindingLoads(node, sidecarDir) : void 0;
  const helperSocketLive = opts.deep ? await socketAnswers(helperSocket) : void 0;
  const available = sidecarDir !== null && nodeOk && depsOk && nativeLoadOk !== false;
  const effectiveReason = nativeLoadOk === false ? "the helper's native binding does not load on this node (" + (nodeVersion ?? "?") + ") \u2014 wrong ABI or architecture; reinstall the helper on this host" : reason;
  return {
    available,
    nativeLoadOk,
    helperSocketLive,
    reason: effectiveReason,
    sidecarDir,
    sidecarVersion: sidecarVersionOf(sidecarDir),
    depsOk,
    node,
    nodeVersion,
    nodeOk,
    helperSocket,
    helperRunning: existsSync3(helperSocket),
    helperStoreDir,
    delegations: delegationsUnder(helperStoreDir)
  };
}

// src/vclaw/state.ts
var SITE_CONF = () => join2(homedir2(), ".config", "pi-a2a", "nats-ipc.conf");
var OMP_DIR = () => join2(homedir2(), ".omp", "agent");
var PEARS_DIR = () => join2(homedir2(), ".vclaw", "pears");
function safeStat(p) {
  try {
    const s = statSync(p);
    return { exists: true, mtimeMs: s.mtimeMs };
  } catch {
    return { exists: false };
  }
}
async function readCloud() {
  const creds = await loadCredentials().catch(() => null);
  const cfg = readConfigSync();
  const cfgPath = configFilePaths().find((p) => safeStat(p).exists);
  return {
    credentials: { path: credentialDisplayPath(), present: creds !== null },
    ...creds?.name ? { name: creds.name } : {},
    ...creds?.public_key ? { nkey: creds.public_key } : {},
    ...creds?.steward ? { steward: creds.steward } : {},
    pendingClaim: hasPendingFlag(),
    config: {
      ...cfg?.server ? { server: cfg.server } : {},
      ...cfg?.runtime ? { runtime: cfg.runtime } : {},
      ...cfg?.segment ? { segment: cfg.segment } : {},
      ...cfgPath ? { path: cfgPath } : {}
    }
  };
}
function readSite() {
  const p = SITE_CONF();
  const st = safeStat(p);
  let tokenPresent = false;
  let url = "nats://127.0.0.1:14222";
  if (st.exists) {
    try {
      const text = readFileSync3(p, "utf8");
      tokenPresent = /^\s*token\s*:/m.test(text);
      const port = /^\s*port\s*:\s*(\d+)/m.exec(text)?.[1];
      const host = /^\s*host\s*:\s*"?([^"\s]+)"?/m.exec(text)?.[1];
      if (port) url = `nats://${host ?? "127.0.0.1"}:${port}`;
    } catch {
    }
  }
  return { configPath: p, present: st.exists, tokenPresent, url };
}
async function readPears(deep = false) {
  try {
    const s = await pearsStatus({ deep });
    return {
      available: s.available,
      ...s.sidecarVersion ? { helper: s.sidecarVersion } : {},
      ...s.nodeVersion ? { node: s.nodeVersion } : {},
      delegations: s.delegations.length,
      ...s.available ? {} : { detail: s.reason },
      ...deep && s.helperSocketLive !== void 0 ? { socketLive: s.helperSocketLive } : {}
    };
  } catch (e) {
    return { available: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
function readPeers() {
  const dir = OMP_DIR();
  const rows = /* @__PURE__ */ new Map();
  if (!safeStat(dir).exists) return [];
  const files = (() => {
    try {
      return readdirSync2(dir);
    } catch {
      return [];
    }
  })();
  for (const f of files) {
    if (!f.startsWith("roster.") || !f.endsWith(".json")) continue;
    const p = join2(dir, f);
    try {
      const raw = JSON.parse(readFileSync3(p, "utf8"));
      for (const [id, v] of Object.entries(raw)) {
        const e = v ?? {};
        rows.set(id, {
          id,
          ...typeof e.name === "string" ? { name: e.name } : {},
          ...typeof e.owner === "string" ? { owner: e.owner } : {},
          ...typeof e.fabric === "string" ? { fabric: e.fabric } : {},
          tier: "cloud",
          buddy: e.buddy === true,
          ...typeof e.lastSeen === "string" ? { lastSeen: e.lastSeen } : {},
          source: f
        });
      }
    } catch {
    }
  }
  for (const f of files) {
    if (!f.startsWith("cross_buddies.") || !f.endsWith(".json")) continue;
    try {
      const ids = JSON.parse(readFileSync3(join2(dir, f), "utf8"));
      if (!Array.isArray(ids)) continue;
      for (const id of ids) {
        if (typeof id !== "string") continue;
        const cur = rows.get(id);
        if (cur) rows.set(id, { ...cur, buddy: true });
        else rows.set(id, { id, tier: "unknown", buddy: true, source: f });
      }
    } catch {
    }
  }
  return [...rows.values()].sort((a, b) => a.id.localeCompare(b.id));
}
function readInbox() {
  const dir = join2(PEARS_DIR(), "inbox");
  if (!safeStat(dir).exists) return { files: 0, messages: 0, bytes: 0 };
  let files = 0;
  let messages = 0;
  let bytes = 0;
  try {
    for (const f of readdirSync2(dir)) {
      if (!f.endsWith(".jsonl")) continue;
      files += 1;
      const p = join2(dir, f);
      const size = statSync(p).size;
      bytes += size;
      if (size > 0) {
        const lines = readFileSync3(p, "utf8").split("\n").filter((l) => l.trim().length > 0).length;
        messages += lines;
      }
    }
  } catch {
  }
  return { files, messages, bytes };
}

// src/vclaw/verbs/doctor.ts
async function collectChecks() {
  const cloud = await readCloud();
  const site = readSite();
  const pears = await readPears(false);
  const checks = [
    {
      id: "identity",
      ok: cloud.credentials.present,
      detail: cloud.credentials.present ? `credentials at ${cloud.credentials.path}` : "no credentials",
      fix: "vclaw-agent claim"
    },
    {
      // Not a failure when there is no identity: nothing can fix a claim you
      // have not started, and counting it twice would bury the real blocker.
      id: "claim",
      ok: !cloud.credentials.present || !cloud.pendingClaim,
      detail: !cloud.credentials.present ? "n/a \u2014 no identity yet" : cloud.pendingClaim ? "claim pending browser approval" : "approved",
      ...cloud.credentials.present && cloud.pendingClaim ? { fix: "vclaw-agent status  # then approve in the browser" } : {}
    },
    {
      id: "cloud-config",
      ok: Boolean(cloud.config.server),
      detail: cloud.config.server ? `server ${cloud.config.server}` : "config has no server",
      fix: "set `server` in ~/.config/vclaw/config.json (vclaw connect lands in roadmap D)"
    },
    {
      id: "site-fabric",
      ok: site.present && site.tokenPresent,
      detail: !site.present ? `no ${site.configPath}` : site.tokenPresent ? `token in ${site.configPath}` : "config has no token",
      fix: "start a NATS server with ~/.config/pi-a2a/nats-ipc.conf"
    },
    {
      id: "tier-p",
      ok: pears.available,
      detail: pears.available ? `helper ${pears.helper ?? "?"}` : pears.detail ?? "unavailable",
      fix: "vclaw-agent pears status --deep"
    }
  ];
  return checks;
}
async function doctorVerb(_ctx) {
  const checks = await collectChecks();
  const identityFails = checks.some((c) => !c.ok && (c.id === "identity" || c.id === "claim"));
  const anyFails = checks.some((c) => !c.ok);
  const state = anyFails ? "degraded" : "ok";
  const exit = !anyFails ? 0 : identityFails ? 4 : 3;
  const data = { state, checks, failures: checks.filter((c) => !c.ok).map((c) => c.id) };
  const lines = [
    "vclaw doctor",
    ...checks.map((c) => c.ok ? `  \u2713 ${c.id.padEnd(12)} ${c.detail}` : `  \u2717 ${c.id.padEnd(12)} ${c.detail}${c.fix ? `
      fix: ${c.fix}` : ""}`),
    anyFails ? `
${checks.filter((c) => !c.ok).length} check(s) failing` : "\nall checks pass"
  ];
  return { state, data, text: lines.join("\n"), exit };
}

// src/vclaw/render.ts
function kv(pairs) {
  const rows = pairs.filter(([, v]) => v !== void 0);
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map(([k]) => k.length));
  return rows.map(([k, v]) => `  ${k.padEnd(width)}  ${String(v)}`).join("\n");
}
function table(headers, rows) {
  if (rows.length === 0) return "  (none)";
  const cells = rows.map((r) => r.map((c) => c === null || c === void 0 ? "\u2014" : String(c)));
  const widths = headers.map((h2, i) => Math.max(h2.length, ...cells.map((r) => (r[i] ?? "").length)));
  const line = (r) => `  ${r.map((c, i) => (c ?? "").padEnd(widths[i])).join("  ")}`.trimEnd();
  return [line(headers), line(widths.map((w) => "\u2500".repeat(w))), ...cells.map(line)].join("\n");
}

// src/vclaw/verbs/peers.ts
async function peersVerb(ctx) {
  const tier = typeof ctx.flags.tier === "string" ? ctx.flags.tier : "all";
  const allowed = ["cloud", "site", "unknown", "all"];
  if (!allowed.includes(tier)) {
    return { state: "unavailable", data: { tier }, text: `--tier must be one of ${allowed.join("|")}`, exit: 2 };
  }
  const cloud = await readCloud();
  const all = readPeers();
  const rows = tier === "all" ? all : all.filter((p) => p.tier === tier);
  if (!cloud.credentials.present && all.length === 0) {
    return {
      state: "unavailable",
      data: { tier, peers: [], reason: "no identity and no roster" },
      text: "no identity and no cached roster \u2014 run `vclaw-agent claim` first",
      exit: 4
    };
  }
  const state = all.length === 0 ? "degraded" : "ok";
  const data = { tier, source: "cached", peers: rows };
  const text = [
    `vclaw peers${tier === "all" ? "" : ` --tier ${tier}`}  (cached)`,
    table(
      ["id", "name", "tier", "buddy", "last seen", "source"],
      rows.map((p) => [p.id, p.name ?? null, p.tier, p.buddy ? "yes" : null, p.lastSeen ?? null, p.source])
    ),
    rows.length === 0 ? "\nno peers recorded \u2014 live discovery lands with the tool surface (roadmap C)" : ""
  ].filter((l) => l !== "").join("\n");
  return { state, data, text, exit: 0 };
}

// src/vclaw/verbs/status.ts
async function statusVerb(ctx) {
  const deep = ctx.flags.deep === true;
  const cloud = await readCloud();
  const site = readSite();
  const pears = await readPears(deep);
  const inbox = readInbox();
  const peers = readPeers();
  const identityReady = cloud.credentials.present;
  const siteOk = site.present && site.tokenPresent;
  const byTier = {
    cloud: peers.filter((p) => p.tier === "cloud").length,
    site: peers.filter((p) => p.tier === "site").length,
    unknown: peers.filter((p) => p.tier === "unknown").length
  };
  const state = !identityReady ? "unavailable" : siteOk && pears.available ? "ok" : "degraded";
  const exit = identityReady ? 0 : 4;
  const next = !identityReady ? "vclaw-agent claim            # establish this host's identity" : !siteOk ? "start the site fabric, or ignore it (site-only features stay off)" : peers.length === 0 ? "vclaw-agent vclaw peers     # no peers recorded yet" : "vclaw-agent vclaw peers --tier all";
  const data = {
    state,
    deep,
    identity: {
      present: identityReady,
      name: cloud.name ?? null,
      nkey: cloud.nkey ?? null,
      steward: cloud.steward ?? null,
      pendingClaim: cloud.pendingClaim,
      path: cloud.credentials.path,
      source: "cached"
    },
    cloud: {
      server: cloud.config.server ?? null,
      runtime: cloud.config.runtime ?? null,
      segment: cloud.config.segment ?? null,
      configPath: cloud.config.path ?? null
    },
    site: {
      present: site.present,
      tokenPresent: site.tokenPresent,
      url: site.url,
      configPath: site.configPath
    },
    pears,
    inbox,
    peers: { total: peers.length, byTier },
    next
  };
  const text = [
    "vclaw status",
    kv([
      ["identity", identityReady ? `${cloud.name ?? "?"}  ${(cloud.nkey ?? "").slice(0, 12)}\u2026` : "not onboarded"],
      ["claim", cloud.pendingClaim ? "PENDING \u2014 approve in the browser" : identityReady ? "approved" : "\u2014"],
      ["cloud", cloud.config.server ? `${cloud.config.server}${cloud.config.runtime ? `  (runtime ${cloud.config.runtime})` : ""}` : "no config"],
      ["site", site.present ? `${site.url}  token:${site.tokenPresent ? "yes" : "no"}` : "absent (optional)"],
      ["tier P", pears.available ? `helper ${pears.helper ?? "?"}  node ${pears.node ?? "?"}  delegations ${pears.delegations ?? 0}${deep && pears.socketLive !== void 0 ? `  socket:${pears.socketLive}` : ""}` : `unavailable \u2014 ${pears.detail ?? "no reason given"}`],
      ["inbox", `${inbox.messages} message(s) in ${inbox.files} file(s)`],
      ["peers", `${peers.length} cached  (cloud ${byTier.cloud} \xB7 site ${byTier.site} \xB7 unknown ${byTier.unknown})`],
      ["next", next]
    ])
  ].join("\n");
  return { state, data, text, exit };
}

// src/agent/lifecycle.ts
var import_transport_node2 = __toESM(require_transport_node(), 1);
var import_nats_core2 = __toESM(require_mod4(), 1);

// src/net/connect.ts
var import_transport_node = __toESM(require_transport_node(), 1);

// node_modules/@sinclair/typebox/build/esm/value/guard/guard.mjs
function IsAsyncIterator(value) {
  return IsObject(value) && globalThis.Symbol.asyncIterator in value;
}
function IsIterator(value) {
  return IsObject(value) && globalThis.Symbol.iterator in value;
}
function IsStandardObject(value) {
  return IsObject(value) && (globalThis.Object.getPrototypeOf(value) === Object.prototype || globalThis.Object.getPrototypeOf(value) === null);
}
function IsPromise(value) {
  return value instanceof globalThis.Promise;
}
function IsDate(value) {
  return value instanceof Date && globalThis.Number.isFinite(value.getTime());
}
function IsMap(value) {
  return value instanceof globalThis.Map;
}
function IsSet(value) {
  return value instanceof globalThis.Set;
}
function IsTypedArray(value) {
  return globalThis.ArrayBuffer.isView(value);
}
function IsUint8Array(value) {
  return value instanceof globalThis.Uint8Array;
}
function HasPropertyKey(value, key) {
  return key in value;
}
function IsObject(value) {
  return value !== null && typeof value === "object";
}
function IsArray(value) {
  return globalThis.Array.isArray(value) && !globalThis.ArrayBuffer.isView(value);
}
function IsUndefined(value) {
  return value === void 0;
}
function IsNull(value) {
  return value === null;
}
function IsBoolean(value) {
  return typeof value === "boolean";
}
function IsNumber(value) {
  return typeof value === "number";
}
function IsInteger(value) {
  return globalThis.Number.isInteger(value);
}
function IsBigInt(value) {
  return typeof value === "bigint";
}
function IsString(value) {
  return typeof value === "string";
}
function IsFunction(value) {
  return typeof value === "function";
}
function IsSymbol(value) {
  return typeof value === "symbol";
}
function IsValueType(value) {
  return IsBigInt(value) || IsBoolean(value) || IsNull(value) || IsNumber(value) || IsString(value) || IsSymbol(value) || IsUndefined(value);
}

// node_modules/@sinclair/typebox/build/esm/system/policy.mjs
var TypeSystemPolicy;
(function(TypeSystemPolicy2) {
  TypeSystemPolicy2.InstanceMode = "default";
  TypeSystemPolicy2.ExactOptionalPropertyTypes = false;
  TypeSystemPolicy2.AllowArrayObject = false;
  TypeSystemPolicy2.AllowNaN = false;
  TypeSystemPolicy2.AllowNullVoid = false;
  function IsExactOptionalProperty(value, key) {
    return TypeSystemPolicy2.ExactOptionalPropertyTypes ? key in value : value[key] !== void 0;
  }
  TypeSystemPolicy2.IsExactOptionalProperty = IsExactOptionalProperty;
  function IsObjectLike(value) {
    const isObject = IsObject(value);
    return TypeSystemPolicy2.AllowArrayObject ? isObject : isObject && !IsArray(value);
  }
  TypeSystemPolicy2.IsObjectLike = IsObjectLike;
  function IsRecordLike(value) {
    return IsObjectLike(value) && !(value instanceof Date) && !(value instanceof Uint8Array);
  }
  TypeSystemPolicy2.IsRecordLike = IsRecordLike;
  function IsNumberLike(value) {
    return TypeSystemPolicy2.AllowNaN ? IsNumber(value) : Number.isFinite(value);
  }
  TypeSystemPolicy2.IsNumberLike = IsNumberLike;
  function IsVoidLike(value) {
    const isUndefined = IsUndefined(value);
    return TypeSystemPolicy2.AllowNullVoid ? isUndefined || value === null : isUndefined;
  }
  TypeSystemPolicy2.IsVoidLike = IsVoidLike;
})(TypeSystemPolicy || (TypeSystemPolicy = {}));

// node_modules/@sinclair/typebox/build/esm/type/registry/format.mjs
var format_exports = {};
__export(format_exports, {
  Clear: () => Clear,
  Delete: () => Delete,
  Entries: () => Entries,
  Get: () => Get,
  Has: () => Has,
  Set: () => Set2
});
var map = /* @__PURE__ */ new Map();
function Entries() {
  return new Map(map);
}
function Clear() {
  return map.clear();
}
function Delete(format) {
  return map.delete(format);
}
function Has(format) {
  return map.has(format);
}
function Set2(format, func) {
  map.set(format, func);
}
function Get(format) {
  return map.get(format);
}

// node_modules/@sinclair/typebox/build/esm/type/registry/type.mjs
var type_exports = {};
__export(type_exports, {
  Clear: () => Clear2,
  Delete: () => Delete2,
  Entries: () => Entries2,
  Get: () => Get2,
  Has: () => Has2,
  Set: () => Set3
});
var map2 = /* @__PURE__ */ new Map();
function Entries2() {
  return new Map(map2);
}
function Clear2() {
  return map2.clear();
}
function Delete2(kind) {
  return map2.delete(kind);
}
function Has2(kind) {
  return map2.has(kind);
}
function Set3(kind, func) {
  map2.set(kind, func);
}
function Get2(kind) {
  return map2.get(kind);
}

// node_modules/@sinclair/typebox/build/esm/type/guard/value.mjs
var value_exports = {};
__export(value_exports, {
  HasPropertyKey: () => HasPropertyKey2,
  IsArray: () => IsArray2,
  IsAsyncIterator: () => IsAsyncIterator2,
  IsBigInt: () => IsBigInt2,
  IsBoolean: () => IsBoolean2,
  IsDate: () => IsDate2,
  IsFunction: () => IsFunction2,
  IsIterator: () => IsIterator2,
  IsNull: () => IsNull2,
  IsNumber: () => IsNumber2,
  IsObject: () => IsObject2,
  IsRegExp: () => IsRegExp,
  IsString: () => IsString2,
  IsSymbol: () => IsSymbol2,
  IsUint8Array: () => IsUint8Array2,
  IsUndefined: () => IsUndefined2
});
function HasPropertyKey2(value, key) {
  return key in value;
}
function IsAsyncIterator2(value) {
  return IsObject2(value) && !IsArray2(value) && !IsUint8Array2(value) && Symbol.asyncIterator in value;
}
function IsArray2(value) {
  return Array.isArray(value);
}
function IsBigInt2(value) {
  return typeof value === "bigint";
}
function IsBoolean2(value) {
  return typeof value === "boolean";
}
function IsDate2(value) {
  return value instanceof globalThis.Date;
}
function IsFunction2(value) {
  return typeof value === "function";
}
function IsIterator2(value) {
  return IsObject2(value) && !IsArray2(value) && !IsUint8Array2(value) && Symbol.iterator in value;
}
function IsNull2(value) {
  return value === null;
}
function IsNumber2(value) {
  return typeof value === "number";
}
function IsObject2(value) {
  return typeof value === "object" && value !== null;
}
function IsRegExp(value) {
  return value instanceof globalThis.RegExp;
}
function IsString2(value) {
  return typeof value === "string";
}
function IsSymbol2(value) {
  return typeof value === "symbol";
}
function IsUint8Array2(value) {
  return value instanceof globalThis.Uint8Array;
}
function IsUndefined2(value) {
  return value === void 0;
}

// node_modules/@sinclair/typebox/build/esm/type/create/immutable.mjs
function ImmutableArray(value) {
  return globalThis.Object.freeze(value).map((value2) => Immutable(value2));
}
function ImmutableDate(value) {
  return value;
}
function ImmutableUint8Array(value) {
  return value;
}
function ImmutableRegExp(value) {
  return value;
}
function ImmutableObject(value) {
  const result2 = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    result2[key] = Immutable(value[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    result2[key] = Immutable(value[key]);
  }
  return globalThis.Object.freeze(result2);
}
function Immutable(value) {
  return IsArray2(value) ? ImmutableArray(value) : IsDate2(value) ? ImmutableDate(value) : IsUint8Array2(value) ? ImmutableUint8Array(value) : IsRegExp(value) ? ImmutableRegExp(value) : IsObject2(value) ? ImmutableObject(value) : value;
}

// node_modules/@sinclair/typebox/build/esm/type/clone/value.mjs
function ArrayType(value) {
  return value.map((value2) => Visit(value2));
}
function DateType(value) {
  return new Date(value.getTime());
}
function Uint8ArrayType(value) {
  return new Uint8Array(value);
}
function RegExpType(value) {
  return new RegExp(value.source, value.flags);
}
function ObjectType(value) {
  const result2 = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    result2[key] = Visit(value[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    result2[key] = Visit(value[key]);
  }
  return result2;
}
function Visit(value) {
  return IsArray2(value) ? ArrayType(value) : IsDate2(value) ? DateType(value) : IsUint8Array2(value) ? Uint8ArrayType(value) : IsRegExp(value) ? RegExpType(value) : IsObject2(value) ? ObjectType(value) : value;
}
function Clone(value) {
  return Visit(value);
}

// node_modules/@sinclair/typebox/build/esm/type/create/type.mjs
function CreateType(schema, options) {
  const result2 = options !== void 0 ? { ...options, ...schema } : schema;
  switch (TypeSystemPolicy.InstanceMode) {
    case "freeze":
      return Immutable(result2);
    case "clone":
      return Clone(result2);
    default:
      return result2;
  }
}

// node_modules/@sinclair/typebox/build/esm/type/symbols/symbols.mjs
var TransformKind = Symbol.for("TypeBox.Transform");
var ReadonlyKind = Symbol.for("TypeBox.Readonly");
var OptionalKind = Symbol.for("TypeBox.Optional");
var Hint = Symbol.for("TypeBox.Hint");
var Kind = Symbol.for("TypeBox.Kind");

// node_modules/@sinclair/typebox/build/esm/type/unsafe/unsafe.mjs
function Unsafe(options = {}) {
  return CreateType({ [Kind]: options[Kind] ?? "Unsafe" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/error/error.mjs
var TypeBoxError = class extends Error {
  constructor(message) {
    super(message);
  }
};

// node_modules/@sinclair/typebox/build/esm/type/mapped/mapped-result.mjs
function MappedResult(properties) {
  return CreateType({
    [Kind]: "MappedResult",
    properties
  });
}

// node_modules/@sinclair/typebox/build/esm/type/discard/discard.mjs
function DiscardKey(value, key) {
  const { [key]: _, ...rest } = value;
  return rest;
}
function Discard(value, keys) {
  return keys.reduce((acc, key) => DiscardKey(acc, key), value);
}

// node_modules/@sinclair/typebox/build/esm/type/array/array.mjs
function Array2(items, options) {
  return CreateType({ [Kind]: "Array", type: "array", items }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/async-iterator/async-iterator.mjs
function AsyncIterator(items, options) {
  return CreateType({ [Kind]: "AsyncIterator", type: "AsyncIterator", items }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/constructor/constructor.mjs
function Constructor(parameters, returns, options) {
  return CreateType({ [Kind]: "Constructor", type: "Constructor", parameters, returns }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/function/function.mjs
function Function(parameters, returns, options) {
  return CreateType({ [Kind]: "Function", type: "Function", parameters, returns }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/computed/computed.mjs
function Computed(target, parameters, options) {
  return CreateType({ [Kind]: "Computed", target, parameters }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/never/never.mjs
function Never(options) {
  return CreateType({ [Kind]: "Never", not: {} }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/guard/kind.mjs
function IsReadonly(value) {
  return IsObject2(value) && value[ReadonlyKind] === "Readonly";
}
function IsOptional(value) {
  return IsObject2(value) && value[OptionalKind] === "Optional";
}
function IsAny(value) {
  return IsKindOf(value, "Any");
}
function IsArgument(value) {
  return IsKindOf(value, "Argument");
}
function IsArray3(value) {
  return IsKindOf(value, "Array");
}
function IsAsyncIterator3(value) {
  return IsKindOf(value, "AsyncIterator");
}
function IsBigInt3(value) {
  return IsKindOf(value, "BigInt");
}
function IsBoolean3(value) {
  return IsKindOf(value, "Boolean");
}
function IsComputed(value) {
  return IsKindOf(value, "Computed");
}
function IsConstructor(value) {
  return IsKindOf(value, "Constructor");
}
function IsDate3(value) {
  return IsKindOf(value, "Date");
}
function IsFunction3(value) {
  return IsKindOf(value, "Function");
}
function IsInteger2(value) {
  return IsKindOf(value, "Integer");
}
function IsIntersect(value) {
  return IsKindOf(value, "Intersect");
}
function IsIterator3(value) {
  return IsKindOf(value, "Iterator");
}
function IsKindOf(value, kind) {
  return IsObject2(value) && Kind in value && value[Kind] === kind;
}
function IsLiteralValue(value) {
  return IsBoolean2(value) || IsNumber2(value) || IsString2(value);
}
function IsLiteral(value) {
  return IsKindOf(value, "Literal");
}
function IsMappedKey(value) {
  return IsKindOf(value, "MappedKey");
}
function IsMappedResult(value) {
  return IsKindOf(value, "MappedResult");
}
function IsNever(value) {
  return IsKindOf(value, "Never");
}
function IsNot(value) {
  return IsKindOf(value, "Not");
}
function IsNull3(value) {
  return IsKindOf(value, "Null");
}
function IsNumber3(value) {
  return IsKindOf(value, "Number");
}
function IsObject3(value) {
  return IsKindOf(value, "Object");
}
function IsPromise2(value) {
  return IsKindOf(value, "Promise");
}
function IsRecord(value) {
  return IsKindOf(value, "Record");
}
function IsRef(value) {
  return IsKindOf(value, "Ref");
}
function IsRegExp2(value) {
  return IsKindOf(value, "RegExp");
}
function IsString3(value) {
  return IsKindOf(value, "String");
}
function IsSymbol3(value) {
  return IsKindOf(value, "Symbol");
}
function IsTemplateLiteral(value) {
  return IsKindOf(value, "TemplateLiteral");
}
function IsThis(value) {
  return IsKindOf(value, "This");
}
function IsTransform(value) {
  return IsObject2(value) && TransformKind in value;
}
function IsTuple(value) {
  return IsKindOf(value, "Tuple");
}
function IsUndefined3(value) {
  return IsKindOf(value, "Undefined");
}
function IsUnion(value) {
  return IsKindOf(value, "Union");
}
function IsUint8Array3(value) {
  return IsKindOf(value, "Uint8Array");
}
function IsUnknown(value) {
  return IsKindOf(value, "Unknown");
}
function IsUnsafe(value) {
  return IsKindOf(value, "Unsafe");
}
function IsVoid(value) {
  return IsKindOf(value, "Void");
}
function IsKind(value) {
  return IsObject2(value) && Kind in value && IsString2(value[Kind]);
}
function IsSchema(value) {
  return IsAny(value) || IsArgument(value) || IsArray3(value) || IsBoolean3(value) || IsBigInt3(value) || IsAsyncIterator3(value) || IsComputed(value) || IsConstructor(value) || IsDate3(value) || IsFunction3(value) || IsInteger2(value) || IsIntersect(value) || IsIterator3(value) || IsLiteral(value) || IsMappedKey(value) || IsMappedResult(value) || IsNever(value) || IsNot(value) || IsNull3(value) || IsNumber3(value) || IsObject3(value) || IsPromise2(value) || IsRecord(value) || IsRef(value) || IsRegExp2(value) || IsString3(value) || IsSymbol3(value) || IsTemplateLiteral(value) || IsThis(value) || IsTuple(value) || IsUndefined3(value) || IsUnion(value) || IsUint8Array3(value) || IsUnknown(value) || IsUnsafe(value) || IsVoid(value) || IsKind(value);
}

// node_modules/@sinclair/typebox/build/esm/type/optional/optional.mjs
function RemoveOptional(schema) {
  return CreateType(Discard(schema, [OptionalKind]));
}
function AddOptional(schema) {
  return CreateType({ ...schema, [OptionalKind]: "Optional" });
}
function OptionalWithFlag(schema, F) {
  return F === false ? RemoveOptional(schema) : AddOptional(schema);
}
function Optional(schema, enable) {
  const F = enable ?? true;
  return IsMappedResult(schema) ? OptionalFromMappedResult(schema, F) : OptionalWithFlag(schema, F);
}

// node_modules/@sinclair/typebox/build/esm/type/optional/optional-from-mapped-result.mjs
function FromProperties(P2, F) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P2))
    Acc[K2] = Optional(P2[K2], F);
  return Acc;
}
function FromMappedResult(R, F) {
  return FromProperties(R.properties, F);
}
function OptionalFromMappedResult(R, F) {
  const P2 = FromMappedResult(R, F);
  return MappedResult(P2);
}

// node_modules/@sinclair/typebox/build/esm/type/intersect/intersect-create.mjs
function IntersectCreate(T, options = {}) {
  const allObjects = T.every((schema) => IsObject3(schema));
  const clonedUnevaluatedProperties = IsSchema(options.unevaluatedProperties) ? { unevaluatedProperties: options.unevaluatedProperties } : {};
  return CreateType(options.unevaluatedProperties === false || IsSchema(options.unevaluatedProperties) || allObjects ? { ...clonedUnevaluatedProperties, [Kind]: "Intersect", type: "object", allOf: T } : { ...clonedUnevaluatedProperties, [Kind]: "Intersect", allOf: T }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/intersect/intersect-evaluated.mjs
function IsIntersectOptional(types) {
  return types.every((left) => IsOptional(left));
}
function RemoveOptionalFromType(type) {
  return Discard(type, [OptionalKind]);
}
function RemoveOptionalFromRest(types) {
  return types.map((left) => IsOptional(left) ? RemoveOptionalFromType(left) : left);
}
function ResolveIntersect(types, options) {
  return IsIntersectOptional(types) ? Optional(IntersectCreate(RemoveOptionalFromRest(types), options)) : IntersectCreate(RemoveOptionalFromRest(types), options);
}
function IntersectEvaluated(types, options = {}) {
  if (types.length === 1)
    return CreateType(types[0], options);
  if (types.length === 0)
    return Never(options);
  if (types.some((schema) => IsTransform(schema)))
    throw new Error("Cannot intersect transform types");
  return ResolveIntersect(types, options);
}

// node_modules/@sinclair/typebox/build/esm/type/intersect/intersect.mjs
function Intersect(types, options) {
  if (types.length === 1)
    return CreateType(types[0], options);
  if (types.length === 0)
    return Never(options);
  if (types.some((schema) => IsTransform(schema)))
    throw new Error("Cannot intersect transform types");
  return IntersectCreate(types, options);
}

// node_modules/@sinclair/typebox/build/esm/type/union/union-create.mjs
function UnionCreate(T, options) {
  return CreateType({ [Kind]: "Union", anyOf: T }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/union/union-evaluated.mjs
function IsUnionOptional(types) {
  return types.some((type) => IsOptional(type));
}
function RemoveOptionalFromRest2(types) {
  return types.map((left) => IsOptional(left) ? RemoveOptionalFromType2(left) : left);
}
function RemoveOptionalFromType2(T) {
  return Discard(T, [OptionalKind]);
}
function ResolveUnion(types, options) {
  const isOptional = IsUnionOptional(types);
  return isOptional ? Optional(UnionCreate(RemoveOptionalFromRest2(types), options)) : UnionCreate(RemoveOptionalFromRest2(types), options);
}
function UnionEvaluated(T, options) {
  return T.length === 1 ? CreateType(T[0], options) : T.length === 0 ? Never(options) : ResolveUnion(T, options);
}

// node_modules/@sinclair/typebox/build/esm/type/union/union.mjs
function Union(types, options) {
  return types.length === 0 ? Never(options) : types.length === 1 ? CreateType(types[0], options) : UnionCreate(types, options);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/parse.mjs
var TemplateLiteralParserError = class extends TypeBoxError {
};
function Unescape(pattern) {
  return pattern.replace(/\\\$/g, "$").replace(/\\\*/g, "*").replace(/\\\^/g, "^").replace(/\\\|/g, "|").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
}
function IsNonEscaped(pattern, index, char) {
  return pattern[index] === char && pattern.charCodeAt(index - 1) !== 92;
}
function IsOpenParen(pattern, index) {
  return IsNonEscaped(pattern, index, "(");
}
function IsCloseParen(pattern, index) {
  return IsNonEscaped(pattern, index, ")");
}
function IsSeparator(pattern, index) {
  return IsNonEscaped(pattern, index, "|");
}
function IsGroup(pattern) {
  if (!(IsOpenParen(pattern, 0) && IsCloseParen(pattern, pattern.length - 1)))
    return false;
  let count = 0;
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (count === 0 && index !== pattern.length - 1)
      return false;
  }
  return true;
}
function InGroup(pattern) {
  return pattern.slice(1, pattern.length - 1);
}
function IsPrecedenceOr(pattern) {
  let count = 0;
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (IsSeparator(pattern, index) && count === 0)
      return true;
  }
  return false;
}
function IsPrecedenceAnd(pattern) {
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      return true;
  }
  return false;
}
function Or(pattern) {
  let [count, start] = [0, 0];
  const expressions = [];
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (IsSeparator(pattern, index) && count === 0) {
      const range2 = pattern.slice(start, index);
      if (range2.length > 0)
        expressions.push(TemplateLiteralParse(range2));
      start = index + 1;
    }
  }
  const range = pattern.slice(start);
  if (range.length > 0)
    expressions.push(TemplateLiteralParse(range));
  if (expressions.length === 0)
    return { type: "const", const: "" };
  if (expressions.length === 1)
    return expressions[0];
  return { type: "or", expr: expressions };
}
function And(pattern) {
  function Group(value, index) {
    if (!IsOpenParen(value, index))
      throw new TemplateLiteralParserError(`TemplateLiteralParser: Index must point to open parens`);
    let count = 0;
    for (let scan = index; scan < value.length; scan++) {
      if (IsOpenParen(value, scan))
        count += 1;
      if (IsCloseParen(value, scan))
        count -= 1;
      if (count === 0)
        return [index, scan];
    }
    throw new TemplateLiteralParserError(`TemplateLiteralParser: Unclosed group parens in expression`);
  }
  function Range(pattern2, index) {
    for (let scan = index; scan < pattern2.length; scan++) {
      if (IsOpenParen(pattern2, scan))
        return [index, scan];
    }
    return [index, pattern2.length];
  }
  const expressions = [];
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index)) {
      const [start, end] = Group(pattern, index);
      const range = pattern.slice(start, end + 1);
      expressions.push(TemplateLiteralParse(range));
      index = end;
    } else {
      const [start, end] = Range(pattern, index);
      const range = pattern.slice(start, end);
      if (range.length > 0)
        expressions.push(TemplateLiteralParse(range));
      index = end - 1;
    }
  }
  return expressions.length === 0 ? { type: "const", const: "" } : expressions.length === 1 ? expressions[0] : { type: "and", expr: expressions };
}
function TemplateLiteralParse(pattern) {
  return IsGroup(pattern) ? TemplateLiteralParse(InGroup(pattern)) : IsPrecedenceOr(pattern) ? Or(pattern) : IsPrecedenceAnd(pattern) ? And(pattern) : { type: "const", const: Unescape(pattern) };
}
function TemplateLiteralParseExact(pattern) {
  return TemplateLiteralParse(pattern.slice(1, pattern.length - 1));
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/finite.mjs
var TemplateLiteralFiniteError = class extends TypeBoxError {
};
function IsNumberExpression(expression) {
  return expression.type === "or" && expression.expr.length === 2 && expression.expr[0].type === "const" && expression.expr[0].const === "0" && expression.expr[1].type === "const" && expression.expr[1].const === "[1-9][0-9]*";
}
function IsBooleanExpression(expression) {
  return expression.type === "or" && expression.expr.length === 2 && expression.expr[0].type === "const" && expression.expr[0].const === "true" && expression.expr[1].type === "const" && expression.expr[1].const === "false";
}
function IsStringExpression(expression) {
  return expression.type === "const" && expression.const === ".*";
}
function IsTemplateLiteralExpressionFinite(expression) {
  return IsNumberExpression(expression) || IsStringExpression(expression) ? false : IsBooleanExpression(expression) ? true : expression.type === "and" ? expression.expr.every((expr) => IsTemplateLiteralExpressionFinite(expr)) : expression.type === "or" ? expression.expr.every((expr) => IsTemplateLiteralExpressionFinite(expr)) : expression.type === "const" ? true : (() => {
    throw new TemplateLiteralFiniteError(`Unknown expression type`);
  })();
}
function IsTemplateLiteralFinite(schema) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  return IsTemplateLiteralExpressionFinite(expression);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/generate.mjs
var TemplateLiteralGenerateError = class extends TypeBoxError {
};
function* GenerateReduce(buffer) {
  if (buffer.length === 1)
    return yield* buffer[0];
  for (const left of buffer[0]) {
    for (const right of GenerateReduce(buffer.slice(1))) {
      yield `${left}${right}`;
    }
  }
}
function* GenerateAnd(expression) {
  return yield* GenerateReduce(expression.expr.map((expr) => [...TemplateLiteralExpressionGenerate(expr)]));
}
function* GenerateOr(expression) {
  for (const expr of expression.expr)
    yield* TemplateLiteralExpressionGenerate(expr);
}
function* GenerateConst(expression) {
  return yield expression.const;
}
function* TemplateLiteralExpressionGenerate(expression) {
  return expression.type === "and" ? yield* GenerateAnd(expression) : expression.type === "or" ? yield* GenerateOr(expression) : expression.type === "const" ? yield* GenerateConst(expression) : (() => {
    throw new TemplateLiteralGenerateError("Unknown expression");
  })();
}
function TemplateLiteralGenerate(schema) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  return IsTemplateLiteralExpressionFinite(expression) ? [...TemplateLiteralExpressionGenerate(expression)] : [];
}

// node_modules/@sinclair/typebox/build/esm/type/literal/literal.mjs
function Literal(value, options) {
  return CreateType({
    [Kind]: "Literal",
    const: value,
    type: typeof value
  }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/boolean/boolean.mjs
function Boolean2(options) {
  return CreateType({ [Kind]: "Boolean", type: "boolean" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/bigint/bigint.mjs
function BigInt2(options) {
  return CreateType({ [Kind]: "BigInt", type: "bigint" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/number/number.mjs
function Number2(options) {
  return CreateType({ [Kind]: "Number", type: "number" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/string/string.mjs
function String2(options) {
  return CreateType({ [Kind]: "String", type: "string" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/syntax.mjs
function* FromUnion(syntax) {
  const trim = syntax.trim().replace(/"|'/g, "");
  return trim === "boolean" ? yield Boolean2() : trim === "number" ? yield Number2() : trim === "bigint" ? yield BigInt2() : trim === "string" ? yield String2() : yield (() => {
    const literals = trim.split("|").map((literal) => Literal(literal.trim()));
    return literals.length === 0 ? Never() : literals.length === 1 ? literals[0] : UnionEvaluated(literals);
  })();
}
function* FromTerminal(syntax) {
  if (syntax[1] !== "{") {
    const L2 = Literal("$");
    const R = FromSyntax(syntax.slice(1));
    return yield* [L2, ...R];
  }
  for (let i = 2; i < syntax.length; i++) {
    if (syntax[i] === "}") {
      const L2 = FromUnion(syntax.slice(2, i));
      const R = FromSyntax(syntax.slice(i + 1));
      return yield* [...L2, ...R];
    }
  }
  yield Literal(syntax);
}
function* FromSyntax(syntax) {
  for (let i = 0; i < syntax.length; i++) {
    if (syntax[i] === "$") {
      const L2 = Literal(syntax.slice(0, i));
      const R = FromTerminal(syntax.slice(i));
      return yield* [L2, ...R];
    }
  }
  yield Literal(syntax);
}
function TemplateLiteralSyntax(syntax) {
  return [...FromSyntax(syntax)];
}

// node_modules/@sinclair/typebox/build/esm/type/patterns/patterns.mjs
var PatternBoolean = "(true|false)";
var PatternNumber = "(0|[1-9][0-9]*)";
var PatternString = "(.*)";
var PatternNever = "(?!.*)";
var PatternBooleanExact = `^${PatternBoolean}$`;
var PatternNumberExact = `^${PatternNumber}$`;
var PatternStringExact = `^${PatternString}$`;
var PatternNeverExact = `^${PatternNever}$`;

// node_modules/@sinclair/typebox/build/esm/type/template-literal/pattern.mjs
var TemplateLiteralPatternError = class extends TypeBoxError {
};
function Escape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function Visit2(schema, acc) {
  return IsTemplateLiteral(schema) ? schema.pattern.slice(1, schema.pattern.length - 1) : IsUnion(schema) ? `(${schema.anyOf.map((schema2) => Visit2(schema2, acc)).join("|")})` : IsNumber3(schema) ? `${acc}${PatternNumber}` : IsInteger2(schema) ? `${acc}${PatternNumber}` : IsBigInt3(schema) ? `${acc}${PatternNumber}` : IsString3(schema) ? `${acc}${PatternString}` : IsLiteral(schema) ? `${acc}${Escape(schema.const.toString())}` : IsBoolean3(schema) ? `${acc}${PatternBoolean}` : (() => {
    throw new TemplateLiteralPatternError(`Unexpected Kind '${schema[Kind]}'`);
  })();
}
function TemplateLiteralPattern(kinds) {
  return `^${kinds.map((schema) => Visit2(schema, "")).join("")}$`;
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/union.mjs
function TemplateLiteralToUnion(schema) {
  const R = TemplateLiteralGenerate(schema);
  const L2 = R.map((S) => Literal(S));
  return UnionEvaluated(L2);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/template-literal.mjs
function TemplateLiteral(unresolved, options) {
  const pattern = IsString2(unresolved) ? TemplateLiteralPattern(TemplateLiteralSyntax(unresolved)) : TemplateLiteralPattern(unresolved);
  return CreateType({ [Kind]: "TemplateLiteral", type: "string", pattern }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-property-keys.mjs
function FromTemplateLiteral(templateLiteral) {
  const keys = TemplateLiteralGenerate(templateLiteral);
  return keys.map((key) => key.toString());
}
function FromUnion2(types) {
  const result2 = [];
  for (const type of types)
    result2.push(...IndexPropertyKeys(type));
  return result2;
}
function FromLiteral(literalValue) {
  return [literalValue.toString()];
}
function IndexPropertyKeys(type) {
  return [...new Set(IsTemplateLiteral(type) ? FromTemplateLiteral(type) : IsUnion(type) ? FromUnion2(type.anyOf) : IsLiteral(type) ? FromLiteral(type.const) : IsNumber3(type) ? ["[number]"] : IsInteger2(type) ? ["[number]"] : [])];
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-from-mapped-result.mjs
function FromProperties2(type, properties, options) {
  const result2 = {};
  for (const K2 of Object.getOwnPropertyNames(properties)) {
    result2[K2] = Index(type, IndexPropertyKeys(properties[K2]), options);
  }
  return result2;
}
function FromMappedResult2(type, mappedResult, options) {
  return FromProperties2(type, mappedResult.properties, options);
}
function IndexFromMappedResult(type, mappedResult, options) {
  const properties = FromMappedResult2(type, mappedResult, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed.mjs
function FromRest(types, key) {
  return types.map((type) => IndexFromPropertyKey(type, key));
}
function FromIntersectRest(types) {
  return types.filter((type) => !IsNever(type));
}
function FromIntersect(types, key) {
  return IntersectEvaluated(FromIntersectRest(FromRest(types, key)));
}
function FromUnionRest(types) {
  return types.some((L2) => IsNever(L2)) ? [] : types;
}
function FromUnion3(types, key) {
  return UnionEvaluated(FromUnionRest(FromRest(types, key)));
}
function FromTuple(types, key) {
  return key in types ? types[key] : key === "[number]" ? UnionEvaluated(types) : Never();
}
function FromArray(type, key) {
  return key === "[number]" ? type : Never();
}
function FromProperty(properties, propertyKey) {
  return propertyKey in properties ? properties[propertyKey] : Never();
}
function IndexFromPropertyKey(type, propertyKey) {
  return IsIntersect(type) ? FromIntersect(type.allOf, propertyKey) : IsUnion(type) ? FromUnion3(type.anyOf, propertyKey) : IsTuple(type) ? FromTuple(type.items ?? [], propertyKey) : IsArray3(type) ? FromArray(type.items, propertyKey) : IsObject3(type) ? FromProperty(type.properties, propertyKey) : Never();
}
function IndexFromPropertyKeys(type, propertyKeys) {
  return propertyKeys.map((propertyKey) => IndexFromPropertyKey(type, propertyKey));
}
function FromSchema(type, propertyKeys) {
  return UnionEvaluated(IndexFromPropertyKeys(type, propertyKeys));
}
function Index(type, key, options) {
  if (IsRef(type) || IsRef(key)) {
    const error = `Index types using Ref parameters require both Type and Key to be of TSchema`;
    if (!IsSchema(type) || !IsSchema(key))
      throw new TypeBoxError(error);
    return Computed("Index", [type, key]);
  }
  if (IsMappedResult(key))
    return IndexFromMappedResult(type, key, options);
  if (IsMappedKey(key))
    return IndexFromMappedKey(type, key, options);
  return CreateType(IsSchema(key) ? FromSchema(type, IndexPropertyKeys(key)) : FromSchema(type, key), options);
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-from-mapped-key.mjs
function MappedIndexPropertyKey(type, key, options) {
  return { [key]: Index(type, [key], Clone(options)) };
}
function MappedIndexPropertyKeys(type, propertyKeys, options) {
  return propertyKeys.reduce((result2, left) => {
    return { ...result2, ...MappedIndexPropertyKey(type, left, options) };
  }, {});
}
function MappedIndexProperties(type, mappedKey, options) {
  return MappedIndexPropertyKeys(type, mappedKey.keys, options);
}
function IndexFromMappedKey(type, mappedKey, options) {
  const properties = MappedIndexProperties(type, mappedKey, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/iterator/iterator.mjs
function Iterator(items, options) {
  return CreateType({ [Kind]: "Iterator", type: "Iterator", items }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/object/object.mjs
function RequiredArray(properties) {
  return globalThis.Object.keys(properties).filter((key) => !IsOptional(properties[key]));
}
function _Object_(properties, options) {
  const required = RequiredArray(properties);
  const schema = required.length > 0 ? { [Kind]: "Object", type: "object", required, properties } : { [Kind]: "Object", type: "object", properties };
  return CreateType(schema, options);
}
var Object2 = _Object_;

// node_modules/@sinclair/typebox/build/esm/type/promise/promise.mjs
function Promise2(item, options) {
  return CreateType({ [Kind]: "Promise", type: "Promise", item }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/readonly/readonly.mjs
function RemoveReadonly(schema) {
  return CreateType(Discard(schema, [ReadonlyKind]));
}
function AddReadonly(schema) {
  return CreateType({ ...schema, [ReadonlyKind]: "Readonly" });
}
function ReadonlyWithFlag(schema, F) {
  return F === false ? RemoveReadonly(schema) : AddReadonly(schema);
}
function Readonly(schema, enable) {
  const F = enable ?? true;
  return IsMappedResult(schema) ? ReadonlyFromMappedResult(schema, F) : ReadonlyWithFlag(schema, F);
}

// node_modules/@sinclair/typebox/build/esm/type/readonly/readonly-from-mapped-result.mjs
function FromProperties3(K, F) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(K))
    Acc[K2] = Readonly(K[K2], F);
  return Acc;
}
function FromMappedResult3(R, F) {
  return FromProperties3(R.properties, F);
}
function ReadonlyFromMappedResult(R, F) {
  const P2 = FromMappedResult3(R, F);
  return MappedResult(P2);
}

// node_modules/@sinclair/typebox/build/esm/type/tuple/tuple.mjs
function Tuple(types, options) {
  return CreateType(types.length > 0 ? { [Kind]: "Tuple", type: "array", items: types, additionalItems: false, minItems: types.length, maxItems: types.length } : { [Kind]: "Tuple", type: "array", minItems: types.length, maxItems: types.length }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/sets/set.mjs
function SetIncludes(T, S) {
  return T.includes(S);
}
function SetDistinct(T) {
  return [...new Set(T)];
}
function SetIntersect(T, S) {
  return T.filter((L2) => S.includes(L2));
}
function SetIntersectManyResolve(T, Init) {
  return T.reduce((Acc, L2) => {
    return SetIntersect(Acc, L2);
  }, Init);
}
function SetIntersectMany(T) {
  return T.length === 1 ? T[0] : T.length > 1 ? SetIntersectManyResolve(T.slice(1), T[0]) : [];
}
function SetUnionMany(T) {
  const Acc = [];
  for (const L2 of T)
    Acc.push(...L2);
  return Acc;
}

// node_modules/@sinclair/typebox/build/esm/type/mapped/mapped.mjs
function FromMappedResult4(K, P2) {
  return K in P2 ? FromSchemaType(K, P2[K]) : MappedResult(P2);
}
function MappedKeyToKnownMappedResultProperties(K) {
  return { [K]: Literal(K) };
}
function MappedKeyToUnknownMappedResultProperties(P2) {
  const Acc = {};
  for (const L2 of P2)
    Acc[L2] = Literal(L2);
  return Acc;
}
function MappedKeyToMappedResultProperties(K, P2) {
  return SetIncludes(P2, K) ? MappedKeyToKnownMappedResultProperties(K) : MappedKeyToUnknownMappedResultProperties(P2);
}
function FromMappedKey(K, P2) {
  const R = MappedKeyToMappedResultProperties(K, P2);
  return FromMappedResult4(K, R);
}
function FromRest2(K, T) {
  return T.map((L2) => FromSchemaType(K, L2));
}
function FromProperties4(K, T) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(T))
    Acc[K2] = FromSchemaType(K, T[K2]);
  return Acc;
}
function FromSchemaType(K, T) {
  const options = { ...T };
  return (
    // unevaluated modifier types
    IsOptional(T) ? Optional(FromSchemaType(K, Discard(T, [OptionalKind]))) : IsReadonly(T) ? Readonly(FromSchemaType(K, Discard(T, [ReadonlyKind]))) : (
      // unevaluated mapped types
      IsMappedResult(T) ? FromMappedResult4(K, T.properties) : IsMappedKey(T) ? FromMappedKey(K, T.keys) : (
        // unevaluated types
        IsConstructor(T) ? Constructor(FromRest2(K, T.parameters), FromSchemaType(K, T.returns), options) : IsFunction3(T) ? Function(FromRest2(K, T.parameters), FromSchemaType(K, T.returns), options) : IsAsyncIterator3(T) ? AsyncIterator(FromSchemaType(K, T.items), options) : IsIterator3(T) ? Iterator(FromSchemaType(K, T.items), options) : IsIntersect(T) ? Intersect(FromRest2(K, T.allOf), options) : IsUnion(T) ? Union(FromRest2(K, T.anyOf), options) : IsTuple(T) ? Tuple(FromRest2(K, T.items ?? []), options) : IsObject3(T) ? Object2(FromProperties4(K, T.properties), options) : IsArray3(T) ? Array2(FromSchemaType(K, T.items), options) : IsPromise2(T) ? Promise2(FromSchemaType(K, T.item), options) : T
      )
    )
  );
}
function MappedFunctionReturnType(K, T) {
  const Acc = {};
  for (const L2 of K)
    Acc[L2] = FromSchemaType(L2, T);
  return Acc;
}
function Mapped(key, map3, options) {
  const K = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const RT = map3({ [Kind]: "MappedKey", keys: K });
  const R = MappedFunctionReturnType(K, RT);
  return Object2(R, options);
}

// node_modules/@sinclair/typebox/build/esm/type/ref/ref.mjs
function Ref(...args) {
  const [$ref, options] = typeof args[0] === "string" ? [args[0], args[1]] : [args[0].$id, args[1]];
  if (typeof $ref !== "string")
    throw new TypeBoxError("Ref: $ref must be a string");
  return CreateType({ [Kind]: "Ref", $ref }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-property-keys.mjs
function FromRest3(types) {
  const result2 = [];
  for (const L2 of types)
    result2.push(KeyOfPropertyKeys(L2));
  return result2;
}
function FromIntersect2(types) {
  const propertyKeysArray = FromRest3(types);
  const propertyKeys = SetUnionMany(propertyKeysArray);
  return propertyKeys;
}
function FromUnion4(types) {
  const propertyKeysArray = FromRest3(types);
  const propertyKeys = SetIntersectMany(propertyKeysArray);
  return propertyKeys;
}
function FromTuple2(types) {
  return types.map((_, indexer) => indexer.toString());
}
function FromArray2(_) {
  return ["[number]"];
}
function FromProperties5(T) {
  return globalThis.Object.getOwnPropertyNames(T);
}
function FromPatternProperties(patternProperties) {
  if (!includePatternProperties)
    return [];
  const patternPropertyKeys = globalThis.Object.getOwnPropertyNames(patternProperties);
  return patternPropertyKeys.map((key) => {
    return key[0] === "^" && key[key.length - 1] === "$" ? key.slice(1, key.length - 1) : key;
  });
}
function KeyOfPropertyKeys(type) {
  return IsIntersect(type) ? FromIntersect2(type.allOf) : IsUnion(type) ? FromUnion4(type.anyOf) : IsTuple(type) ? FromTuple2(type.items ?? []) : IsArray3(type) ? FromArray2(type.items) : IsObject3(type) ? FromProperties5(type.properties) : IsRecord(type) ? FromPatternProperties(type.patternProperties) : [];
}
var includePatternProperties = false;
function KeyOfPattern(schema) {
  includePatternProperties = true;
  const keys = KeyOfPropertyKeys(schema);
  includePatternProperties = false;
  const pattern = keys.map((key) => `(${key})`);
  return `^(${pattern.join("|")})$`;
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof.mjs
function FromComputed(target, parameters) {
  return Computed("KeyOf", [Computed(target, parameters)]);
}
function FromRef($ref) {
  return Computed("KeyOf", [Ref($ref)]);
}
function KeyOfFromType(type, options) {
  const propertyKeys = KeyOfPropertyKeys(type);
  const propertyKeyTypes = KeyOfPropertyKeysToRest(propertyKeys);
  const result2 = UnionEvaluated(propertyKeyTypes);
  return CreateType(result2, options);
}
function KeyOfPropertyKeysToRest(propertyKeys) {
  return propertyKeys.map((L2) => L2 === "[number]" ? Number2() : Literal(L2));
}
function KeyOf(type, options) {
  return IsComputed(type) ? FromComputed(type.target, type.parameters) : IsRef(type) ? FromRef(type.$ref) : IsMappedResult(type) ? KeyOfFromMappedResult(type, options) : KeyOfFromType(type, options);
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-from-mapped-result.mjs
function FromProperties6(properties, options) {
  const result2 = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result2[K2] = KeyOf(properties[K2], Clone(options));
  return result2;
}
function FromMappedResult5(mappedResult, options) {
  return FromProperties6(mappedResult.properties, options);
}
function KeyOfFromMappedResult(mappedResult, options) {
  const properties = FromMappedResult5(mappedResult, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-property-entries.mjs
function KeyOfPropertyEntries(schema) {
  const keys = KeyOfPropertyKeys(schema);
  const schemas = IndexFromPropertyKeys(schema, keys);
  return keys.map((_, index) => [keys[index], schemas[index]]);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-undefined.mjs
function Intersect2(schema) {
  return schema.allOf.every((schema2) => ExtendsUndefinedCheck(schema2));
}
function Union2(schema) {
  return schema.anyOf.some((schema2) => ExtendsUndefinedCheck(schema2));
}
function Not(schema) {
  return !ExtendsUndefinedCheck(schema.not);
}
function ExtendsUndefinedCheck(schema) {
  return schema[Kind] === "Intersect" ? Intersect2(schema) : schema[Kind] === "Union" ? Union2(schema) : schema[Kind] === "Not" ? Not(schema) : schema[Kind] === "Undefined" ? true : false;
}

// node_modules/@sinclair/typebox/build/esm/errors/function.mjs
function DefaultErrorFunction(error) {
  switch (error.errorType) {
    case ValueErrorType.ArrayContains:
      return "Expected array to contain at least one matching value";
    case ValueErrorType.ArrayMaxContains:
      return `Expected array to contain no more than ${error.schema.maxContains} matching values`;
    case ValueErrorType.ArrayMinContains:
      return `Expected array to contain at least ${error.schema.minContains} matching values`;
    case ValueErrorType.ArrayMaxItems:
      return `Expected array length to be less or equal to ${error.schema.maxItems}`;
    case ValueErrorType.ArrayMinItems:
      return `Expected array length to be greater or equal to ${error.schema.minItems}`;
    case ValueErrorType.ArrayUniqueItems:
      return "Expected array elements to be unique";
    case ValueErrorType.Array:
      return "Expected array";
    case ValueErrorType.AsyncIterator:
      return "Expected AsyncIterator";
    case ValueErrorType.BigIntExclusiveMaximum:
      return `Expected bigint to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.BigIntExclusiveMinimum:
      return `Expected bigint to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.BigIntMaximum:
      return `Expected bigint to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.BigIntMinimum:
      return `Expected bigint to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.BigIntMultipleOf:
      return `Expected bigint to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.BigInt:
      return "Expected bigint";
    case ValueErrorType.Boolean:
      return "Expected boolean";
    case ValueErrorType.DateExclusiveMinimumTimestamp:
      return `Expected Date timestamp to be greater than ${error.schema.exclusiveMinimumTimestamp}`;
    case ValueErrorType.DateExclusiveMaximumTimestamp:
      return `Expected Date timestamp to be less than ${error.schema.exclusiveMaximumTimestamp}`;
    case ValueErrorType.DateMinimumTimestamp:
      return `Expected Date timestamp to be greater or equal to ${error.schema.minimumTimestamp}`;
    case ValueErrorType.DateMaximumTimestamp:
      return `Expected Date timestamp to be less or equal to ${error.schema.maximumTimestamp}`;
    case ValueErrorType.DateMultipleOfTimestamp:
      return `Expected Date timestamp to be a multiple of ${error.schema.multipleOfTimestamp}`;
    case ValueErrorType.Date:
      return "Expected Date";
    case ValueErrorType.Function:
      return "Expected function";
    case ValueErrorType.IntegerExclusiveMaximum:
      return `Expected integer to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.IntegerExclusiveMinimum:
      return `Expected integer to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.IntegerMaximum:
      return `Expected integer to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.IntegerMinimum:
      return `Expected integer to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.IntegerMultipleOf:
      return `Expected integer to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.Integer:
      return "Expected integer";
    case ValueErrorType.IntersectUnevaluatedProperties:
      return "Unexpected property";
    case ValueErrorType.Intersect:
      return "Expected all values to match";
    case ValueErrorType.Iterator:
      return "Expected Iterator";
    case ValueErrorType.Literal:
      return `Expected ${typeof error.schema.const === "string" ? `'${error.schema.const}'` : error.schema.const}`;
    case ValueErrorType.Never:
      return "Never";
    case ValueErrorType.Not:
      return "Value should not match";
    case ValueErrorType.Null:
      return "Expected null";
    case ValueErrorType.NumberExclusiveMaximum:
      return `Expected number to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.NumberExclusiveMinimum:
      return `Expected number to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.NumberMaximum:
      return `Expected number to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.NumberMinimum:
      return `Expected number to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.NumberMultipleOf:
      return `Expected number to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.Number:
      return "Expected number";
    case ValueErrorType.Object:
      return "Expected object";
    case ValueErrorType.ObjectAdditionalProperties:
      return "Unexpected property";
    case ValueErrorType.ObjectMaxProperties:
      return `Expected object to have no more than ${error.schema.maxProperties} properties`;
    case ValueErrorType.ObjectMinProperties:
      return `Expected object to have at least ${error.schema.minProperties} properties`;
    case ValueErrorType.ObjectRequiredProperty:
      return "Expected required property";
    case ValueErrorType.Promise:
      return "Expected Promise";
    case ValueErrorType.RegExp:
      return "Expected string to match regular expression";
    case ValueErrorType.StringFormatUnknown:
      return `Unknown format '${error.schema.format}'`;
    case ValueErrorType.StringFormat:
      return `Expected string to match '${error.schema.format}' format`;
    case ValueErrorType.StringMaxLength:
      return `Expected string length less or equal to ${error.schema.maxLength}`;
    case ValueErrorType.StringMinLength:
      return `Expected string length greater or equal to ${error.schema.minLength}`;
    case ValueErrorType.StringPattern:
      return `Expected string to match '${error.schema.pattern}'`;
    case ValueErrorType.String:
      return "Expected string";
    case ValueErrorType.Symbol:
      return "Expected symbol";
    case ValueErrorType.TupleLength:
      return `Expected tuple to have ${error.schema.maxItems || 0} elements`;
    case ValueErrorType.Tuple:
      return "Expected tuple";
    case ValueErrorType.Uint8ArrayMaxByteLength:
      return `Expected byte length less or equal to ${error.schema.maxByteLength}`;
    case ValueErrorType.Uint8ArrayMinByteLength:
      return `Expected byte length greater or equal to ${error.schema.minByteLength}`;
    case ValueErrorType.Uint8Array:
      return "Expected Uint8Array";
    case ValueErrorType.Undefined:
      return "Expected undefined";
    case ValueErrorType.Union:
      return "Expected union value";
    case ValueErrorType.Void:
      return "Expected void";
    case ValueErrorType.Kind:
      return `Expected kind '${error.schema[Kind]}'`;
    default:
      return "Unknown error type";
  }
}
var errorFunction = DefaultErrorFunction;
function GetErrorFunction() {
  return errorFunction;
}

// node_modules/@sinclair/typebox/build/esm/value/deref/deref.mjs
var TypeDereferenceError = class extends TypeBoxError {
  constructor(schema) {
    super(`Unable to dereference schema with $id '${schema.$ref}'`);
    this.schema = schema;
  }
};
function Resolve(schema, references) {
  const target = references.find((target2) => target2.$id === schema.$ref);
  if (target === void 0)
    throw new TypeDereferenceError(schema);
  return Deref(target, references);
}
function Pushref(schema, references) {
  if (!IsString(schema.$id) || references.some((target) => target.$id === schema.$id))
    return references;
  references.push(schema);
  return references;
}
function Deref(schema, references) {
  return schema[Kind] === "This" || schema[Kind] === "Ref" ? Resolve(schema, references) : schema;
}

// node_modules/@sinclair/typebox/build/esm/value/hash/hash.mjs
var ValueHashError = class extends TypeBoxError {
  constructor(value) {
    super(`Unable to hash value`);
    this.value = value;
  }
};
var ByteMarker;
(function(ByteMarker2) {
  ByteMarker2[ByteMarker2["Undefined"] = 0] = "Undefined";
  ByteMarker2[ByteMarker2["Null"] = 1] = "Null";
  ByteMarker2[ByteMarker2["Boolean"] = 2] = "Boolean";
  ByteMarker2[ByteMarker2["Number"] = 3] = "Number";
  ByteMarker2[ByteMarker2["String"] = 4] = "String";
  ByteMarker2[ByteMarker2["Object"] = 5] = "Object";
  ByteMarker2[ByteMarker2["Array"] = 6] = "Array";
  ByteMarker2[ByteMarker2["Date"] = 7] = "Date";
  ByteMarker2[ByteMarker2["Uint8Array"] = 8] = "Uint8Array";
  ByteMarker2[ByteMarker2["Symbol"] = 9] = "Symbol";
  ByteMarker2[ByteMarker2["BigInt"] = 10] = "BigInt";
})(ByteMarker || (ByteMarker = {}));
var Accumulator = BigInt("14695981039346656037");
var [Prime, Size] = [BigInt("1099511628211"), BigInt(
  "18446744073709551616"
  /* 2 ^ 64 */
)];
var Bytes = Array.from({ length: 256 }).map((_, i) => BigInt(i));
var F64 = new Float64Array(1);
var F64In = new DataView(F64.buffer);
var F64Out = new Uint8Array(F64.buffer);
function* NumberToBytes(value) {
  const byteCount = value === 0 ? 1 : Math.ceil(Math.floor(Math.log2(value) + 1) / 8);
  for (let i = 0; i < byteCount; i++) {
    yield value >> 8 * (byteCount - 1 - i) & 255;
  }
}
function ArrayType2(value) {
  FNV1A64(ByteMarker.Array);
  for (const item of value) {
    Visit3(item);
  }
}
function BooleanType(value) {
  FNV1A64(ByteMarker.Boolean);
  FNV1A64(value ? 1 : 0);
}
function BigIntType(value) {
  FNV1A64(ByteMarker.BigInt);
  F64In.setBigInt64(0, value);
  for (const byte of F64Out) {
    FNV1A64(byte);
  }
}
function DateType2(value) {
  FNV1A64(ByteMarker.Date);
  Visit3(value.getTime());
}
function NullType(value) {
  FNV1A64(ByteMarker.Null);
}
function NumberType(value) {
  FNV1A64(ByteMarker.Number);
  F64In.setFloat64(0, value);
  for (const byte of F64Out) {
    FNV1A64(byte);
  }
}
function ObjectType2(value) {
  FNV1A64(ByteMarker.Object);
  for (const key of globalThis.Object.getOwnPropertyNames(value).sort()) {
    Visit3(key);
    Visit3(value[key]);
  }
}
function StringType(value) {
  FNV1A64(ByteMarker.String);
  for (let i = 0; i < value.length; i++) {
    for (const byte of NumberToBytes(value.charCodeAt(i))) {
      FNV1A64(byte);
    }
  }
}
function SymbolType(value) {
  FNV1A64(ByteMarker.Symbol);
  Visit3(value.description);
}
function Uint8ArrayType2(value) {
  FNV1A64(ByteMarker.Uint8Array);
  for (let i = 0; i < value.length; i++) {
    FNV1A64(value[i]);
  }
}
function UndefinedType(value) {
  return FNV1A64(ByteMarker.Undefined);
}
function Visit3(value) {
  if (IsArray(value))
    return ArrayType2(value);
  if (IsBoolean(value))
    return BooleanType(value);
  if (IsBigInt(value))
    return BigIntType(value);
  if (IsDate(value))
    return DateType2(value);
  if (IsNull(value))
    return NullType(value);
  if (IsNumber(value))
    return NumberType(value);
  if (IsObject(value))
    return ObjectType2(value);
  if (IsString(value))
    return StringType(value);
  if (IsSymbol(value))
    return SymbolType(value);
  if (IsUint8Array(value))
    return Uint8ArrayType2(value);
  if (IsUndefined(value))
    return UndefinedType(value);
  throw new ValueHashError(value);
}
function FNV1A64(byte) {
  Accumulator = Accumulator ^ Bytes[byte];
  Accumulator = Accumulator * Prime % Size;
}
function Hash(value) {
  Accumulator = BigInt("14695981039346656037");
  Visit3(value);
  return Accumulator;
}

// node_modules/@sinclair/typebox/build/esm/type/any/any.mjs
function Any(options) {
  return CreateType({ [Kind]: "Any" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/unknown/unknown.mjs
function Unknown(options) {
  return CreateType({ [Kind]: "Unknown" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/guard/type.mjs
var type_exports2 = {};
__export(type_exports2, {
  IsAny: () => IsAny2,
  IsArgument: () => IsArgument2,
  IsArray: () => IsArray4,
  IsAsyncIterator: () => IsAsyncIterator4,
  IsBigInt: () => IsBigInt4,
  IsBoolean: () => IsBoolean4,
  IsComputed: () => IsComputed2,
  IsConstructor: () => IsConstructor2,
  IsDate: () => IsDate4,
  IsFunction: () => IsFunction4,
  IsImport: () => IsImport,
  IsInteger: () => IsInteger3,
  IsIntersect: () => IsIntersect2,
  IsIterator: () => IsIterator4,
  IsKind: () => IsKind2,
  IsKindOf: () => IsKindOf2,
  IsLiteral: () => IsLiteral2,
  IsLiteralBoolean: () => IsLiteralBoolean,
  IsLiteralNumber: () => IsLiteralNumber,
  IsLiteralString: () => IsLiteralString,
  IsLiteralValue: () => IsLiteralValue2,
  IsMappedKey: () => IsMappedKey2,
  IsMappedResult: () => IsMappedResult2,
  IsNever: () => IsNever2,
  IsNot: () => IsNot2,
  IsNull: () => IsNull4,
  IsNumber: () => IsNumber4,
  IsObject: () => IsObject4,
  IsOptional: () => IsOptional2,
  IsPromise: () => IsPromise3,
  IsProperties: () => IsProperties,
  IsReadonly: () => IsReadonly2,
  IsRecord: () => IsRecord2,
  IsRecursive: () => IsRecursive,
  IsRef: () => IsRef2,
  IsRegExp: () => IsRegExp3,
  IsSchema: () => IsSchema2,
  IsString: () => IsString4,
  IsSymbol: () => IsSymbol4,
  IsTemplateLiteral: () => IsTemplateLiteral2,
  IsThis: () => IsThis2,
  IsTransform: () => IsTransform2,
  IsTuple: () => IsTuple2,
  IsUint8Array: () => IsUint8Array4,
  IsUndefined: () => IsUndefined4,
  IsUnion: () => IsUnion2,
  IsUnionLiteral: () => IsUnionLiteral,
  IsUnknown: () => IsUnknown2,
  IsUnsafe: () => IsUnsafe2,
  IsVoid: () => IsVoid2,
  TypeGuardUnknownTypeError: () => TypeGuardUnknownTypeError
});
var TypeGuardUnknownTypeError = class extends TypeBoxError {
};
var KnownTypes = [
  "Argument",
  "Any",
  "Array",
  "AsyncIterator",
  "BigInt",
  "Boolean",
  "Computed",
  "Constructor",
  "Date",
  "Enum",
  "Function",
  "Integer",
  "Intersect",
  "Iterator",
  "Literal",
  "MappedKey",
  "MappedResult",
  "Not",
  "Null",
  "Number",
  "Object",
  "Promise",
  "Record",
  "Ref",
  "RegExp",
  "String",
  "Symbol",
  "TemplateLiteral",
  "This",
  "Tuple",
  "Undefined",
  "Union",
  "Uint8Array",
  "Unknown",
  "Void"
];
function IsPattern(value) {
  try {
    new RegExp(value);
    return true;
  } catch {
    return false;
  }
}
function IsControlCharacterFree(value) {
  if (!IsString2(value))
    return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 7 && code <= 13 || code === 27 || code === 127) {
      return false;
    }
  }
  return true;
}
function IsAdditionalProperties(value) {
  return IsOptionalBoolean(value) || IsSchema2(value);
}
function IsOptionalBigInt(value) {
  return IsUndefined2(value) || IsBigInt2(value);
}
function IsOptionalNumber(value) {
  return IsUndefined2(value) || IsNumber2(value);
}
function IsOptionalBoolean(value) {
  return IsUndefined2(value) || IsBoolean2(value);
}
function IsOptionalString(value) {
  return IsUndefined2(value) || IsString2(value);
}
function IsOptionalPattern(value) {
  return IsUndefined2(value) || IsString2(value) && IsControlCharacterFree(value) && IsPattern(value);
}
function IsOptionalFormat(value) {
  return IsUndefined2(value) || IsString2(value) && IsControlCharacterFree(value);
}
function IsOptionalSchema(value) {
  return IsUndefined2(value) || IsSchema2(value);
}
function IsReadonly2(value) {
  return IsObject2(value) && value[ReadonlyKind] === "Readonly";
}
function IsOptional2(value) {
  return IsObject2(value) && value[OptionalKind] === "Optional";
}
function IsAny2(value) {
  return IsKindOf2(value, "Any") && IsOptionalString(value.$id);
}
function IsArgument2(value) {
  return IsKindOf2(value, "Argument") && IsNumber2(value.index);
}
function IsArray4(value) {
  return IsKindOf2(value, "Array") && value.type === "array" && IsOptionalString(value.$id) && IsSchema2(value.items) && IsOptionalNumber(value.minItems) && IsOptionalNumber(value.maxItems) && IsOptionalBoolean(value.uniqueItems) && IsOptionalSchema(value.contains) && IsOptionalNumber(value.minContains) && IsOptionalNumber(value.maxContains);
}
function IsAsyncIterator4(value) {
  return IsKindOf2(value, "AsyncIterator") && value.type === "AsyncIterator" && IsOptionalString(value.$id) && IsSchema2(value.items);
}
function IsBigInt4(value) {
  return IsKindOf2(value, "BigInt") && value.type === "bigint" && IsOptionalString(value.$id) && IsOptionalBigInt(value.exclusiveMaximum) && IsOptionalBigInt(value.exclusiveMinimum) && IsOptionalBigInt(value.maximum) && IsOptionalBigInt(value.minimum) && IsOptionalBigInt(value.multipleOf);
}
function IsBoolean4(value) {
  return IsKindOf2(value, "Boolean") && value.type === "boolean" && IsOptionalString(value.$id);
}
function IsComputed2(value) {
  return IsKindOf2(value, "Computed") && IsString2(value.target) && IsArray2(value.parameters) && value.parameters.every((schema) => IsSchema2(schema));
}
function IsConstructor2(value) {
  return IsKindOf2(value, "Constructor") && value.type === "Constructor" && IsOptionalString(value.$id) && IsArray2(value.parameters) && value.parameters.every((schema) => IsSchema2(schema)) && IsSchema2(value.returns);
}
function IsDate4(value) {
  return IsKindOf2(value, "Date") && value.type === "Date" && IsOptionalString(value.$id) && IsOptionalNumber(value.exclusiveMaximumTimestamp) && IsOptionalNumber(value.exclusiveMinimumTimestamp) && IsOptionalNumber(value.maximumTimestamp) && IsOptionalNumber(value.minimumTimestamp) && IsOptionalNumber(value.multipleOfTimestamp);
}
function IsFunction4(value) {
  return IsKindOf2(value, "Function") && value.type === "Function" && IsOptionalString(value.$id) && IsArray2(value.parameters) && value.parameters.every((schema) => IsSchema2(schema)) && IsSchema2(value.returns);
}
function IsImport(value) {
  return IsKindOf2(value, "Import") && HasPropertyKey2(value, "$defs") && IsObject2(value.$defs) && IsProperties(value.$defs) && HasPropertyKey2(value, "$ref") && IsString2(value.$ref) && value.$ref in value.$defs;
}
function IsInteger3(value) {
  return IsKindOf2(value, "Integer") && value.type === "integer" && IsOptionalString(value.$id) && IsOptionalNumber(value.exclusiveMaximum) && IsOptionalNumber(value.exclusiveMinimum) && IsOptionalNumber(value.maximum) && IsOptionalNumber(value.minimum) && IsOptionalNumber(value.multipleOf);
}
function IsProperties(value) {
  return IsObject2(value) && Object.entries(value).every(([key, schema]) => IsControlCharacterFree(key) && IsSchema2(schema));
}
function IsIntersect2(value) {
  return IsKindOf2(value, "Intersect") && (IsString2(value.type) && value.type !== "object" ? false : true) && IsArray2(value.allOf) && value.allOf.every((schema) => IsSchema2(schema) && !IsTransform2(schema)) && IsOptionalString(value.type) && (IsOptionalBoolean(value.unevaluatedProperties) || IsOptionalSchema(value.unevaluatedProperties)) && IsOptionalString(value.$id);
}
function IsIterator4(value) {
  return IsKindOf2(value, "Iterator") && value.type === "Iterator" && IsOptionalString(value.$id) && IsSchema2(value.items);
}
function IsKindOf2(value, kind) {
  return IsObject2(value) && Kind in value && value[Kind] === kind;
}
function IsLiteralString(value) {
  return IsLiteral2(value) && IsString2(value.const);
}
function IsLiteralNumber(value) {
  return IsLiteral2(value) && IsNumber2(value.const);
}
function IsLiteralBoolean(value) {
  return IsLiteral2(value) && IsBoolean2(value.const);
}
function IsLiteral2(value) {
  return IsKindOf2(value, "Literal") && IsOptionalString(value.$id) && IsLiteralValue2(value.const);
}
function IsLiteralValue2(value) {
  return IsBoolean2(value) || IsNumber2(value) || IsString2(value);
}
function IsMappedKey2(value) {
  return IsKindOf2(value, "MappedKey") && IsArray2(value.keys) && value.keys.every((key) => IsNumber2(key) || IsString2(key));
}
function IsMappedResult2(value) {
  return IsKindOf2(value, "MappedResult") && IsProperties(value.properties);
}
function IsNever2(value) {
  return IsKindOf2(value, "Never") && IsObject2(value.not) && Object.getOwnPropertyNames(value.not).length === 0;
}
function IsNot2(value) {
  return IsKindOf2(value, "Not") && IsSchema2(value.not);
}
function IsNull4(value) {
  return IsKindOf2(value, "Null") && value.type === "null" && IsOptionalString(value.$id);
}
function IsNumber4(value) {
  return IsKindOf2(value, "Number") && value.type === "number" && IsOptionalString(value.$id) && IsOptionalNumber(value.exclusiveMaximum) && IsOptionalNumber(value.exclusiveMinimum) && IsOptionalNumber(value.maximum) && IsOptionalNumber(value.minimum) && IsOptionalNumber(value.multipleOf);
}
function IsObject4(value) {
  return IsKindOf2(value, "Object") && value.type === "object" && IsOptionalString(value.$id) && IsProperties(value.properties) && IsAdditionalProperties(value.additionalProperties) && IsOptionalNumber(value.minProperties) && IsOptionalNumber(value.maxProperties);
}
function IsPromise3(value) {
  return IsKindOf2(value, "Promise") && value.type === "Promise" && IsOptionalString(value.$id) && IsSchema2(value.item);
}
function IsRecord2(value) {
  return IsKindOf2(value, "Record") && value.type === "object" && IsOptionalString(value.$id) && IsAdditionalProperties(value.additionalProperties) && IsObject2(value.patternProperties) && ((schema) => {
    const keys = Object.getOwnPropertyNames(schema.patternProperties);
    return keys.length === 1 && IsPattern(keys[0]) && IsObject2(schema.patternProperties) && IsSchema2(schema.patternProperties[keys[0]]);
  })(value);
}
function IsRecursive(value) {
  return IsObject2(value) && Hint in value && value[Hint] === "Recursive";
}
function IsRef2(value) {
  return IsKindOf2(value, "Ref") && IsOptionalString(value.$id) && IsString2(value.$ref);
}
function IsRegExp3(value) {
  return IsKindOf2(value, "RegExp") && IsOptionalString(value.$id) && IsString2(value.source) && IsString2(value.flags) && IsOptionalNumber(value.maxLength) && IsOptionalNumber(value.minLength);
}
function IsString4(value) {
  return IsKindOf2(value, "String") && value.type === "string" && IsOptionalString(value.$id) && IsOptionalNumber(value.minLength) && IsOptionalNumber(value.maxLength) && IsOptionalPattern(value.pattern) && IsOptionalFormat(value.format);
}
function IsSymbol4(value) {
  return IsKindOf2(value, "Symbol") && value.type === "symbol" && IsOptionalString(value.$id);
}
function IsTemplateLiteral2(value) {
  return IsKindOf2(value, "TemplateLiteral") && value.type === "string" && IsString2(value.pattern) && value.pattern[0] === "^" && value.pattern[value.pattern.length - 1] === "$";
}
function IsThis2(value) {
  return IsKindOf2(value, "This") && IsOptionalString(value.$id) && IsString2(value.$ref);
}
function IsTransform2(value) {
  return IsObject2(value) && TransformKind in value;
}
function IsTuple2(value) {
  return IsKindOf2(value, "Tuple") && value.type === "array" && IsOptionalString(value.$id) && IsNumber2(value.minItems) && IsNumber2(value.maxItems) && value.minItems === value.maxItems && // empty
  (IsUndefined2(value.items) && IsUndefined2(value.additionalItems) && value.minItems === 0 || IsArray2(value.items) && value.items.every((schema) => IsSchema2(schema)));
}
function IsUndefined4(value) {
  return IsKindOf2(value, "Undefined") && value.type === "undefined" && IsOptionalString(value.$id);
}
function IsUnionLiteral(value) {
  return IsUnion2(value) && value.anyOf.every((schema) => IsLiteralString(schema) || IsLiteralNumber(schema));
}
function IsUnion2(value) {
  return IsKindOf2(value, "Union") && IsOptionalString(value.$id) && IsObject2(value) && IsArray2(value.anyOf) && value.anyOf.every((schema) => IsSchema2(schema));
}
function IsUint8Array4(value) {
  return IsKindOf2(value, "Uint8Array") && value.type === "Uint8Array" && IsOptionalString(value.$id) && IsOptionalNumber(value.minByteLength) && IsOptionalNumber(value.maxByteLength);
}
function IsUnknown2(value) {
  return IsKindOf2(value, "Unknown") && IsOptionalString(value.$id);
}
function IsUnsafe2(value) {
  return IsKindOf2(value, "Unsafe");
}
function IsVoid2(value) {
  return IsKindOf2(value, "Void") && value.type === "void" && IsOptionalString(value.$id);
}
function IsKind2(value) {
  return IsObject2(value) && Kind in value && IsString2(value[Kind]) && !KnownTypes.includes(value[Kind]);
}
function IsSchema2(value) {
  return IsObject2(value) && (IsAny2(value) || IsArgument2(value) || IsArray4(value) || IsBoolean4(value) || IsBigInt4(value) || IsAsyncIterator4(value) || IsComputed2(value) || IsConstructor2(value) || IsDate4(value) || IsFunction4(value) || IsInteger3(value) || IsIntersect2(value) || IsIterator4(value) || IsLiteral2(value) || IsMappedKey2(value) || IsMappedResult2(value) || IsNever2(value) || IsNot2(value) || IsNull4(value) || IsNumber4(value) || IsObject4(value) || IsPromise3(value) || IsRecord2(value) || IsRef2(value) || IsRegExp3(value) || IsString4(value) || IsSymbol4(value) || IsTemplateLiteral2(value) || IsThis2(value) || IsTuple2(value) || IsUndefined4(value) || IsUnion2(value) || IsUint8Array4(value) || IsUnknown2(value) || IsUnsafe2(value) || IsVoid2(value) || IsKind2(value));
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-check.mjs
var ExtendsResolverError = class extends TypeBoxError {
};
var ExtendsResult;
(function(ExtendsResult2) {
  ExtendsResult2[ExtendsResult2["Union"] = 0] = "Union";
  ExtendsResult2[ExtendsResult2["True"] = 1] = "True";
  ExtendsResult2[ExtendsResult2["False"] = 2] = "False";
})(ExtendsResult || (ExtendsResult = {}));
function IntoBooleanResult(result2) {
  return result2 === ExtendsResult.False ? result2 : ExtendsResult.True;
}
function Throw(message) {
  throw new ExtendsResolverError(message);
}
function IsStructuralRight(right) {
  return type_exports2.IsNever(right) || type_exports2.IsIntersect(right) || type_exports2.IsUnion(right) || type_exports2.IsUnknown(right) || type_exports2.IsAny(right);
}
function StructuralRight(left, right) {
  return type_exports2.IsNever(right) ? FromNeverRight(left, right) : type_exports2.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports2.IsUnion(right) ? FromUnionRight(left, right) : type_exports2.IsUnknown(right) ? FromUnknownRight(left, right) : type_exports2.IsAny(right) ? FromAnyRight(left, right) : Throw("StructuralRight");
}
function FromAnyRight(left, right) {
  return ExtendsResult.True;
}
function FromAny(left, right) {
  return type_exports2.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports2.IsUnion(right) && right.anyOf.some((schema) => type_exports2.IsAny(schema) || type_exports2.IsUnknown(schema)) ? ExtendsResult.True : type_exports2.IsUnion(right) ? ExtendsResult.Union : type_exports2.IsUnknown(right) ? ExtendsResult.True : type_exports2.IsAny(right) ? ExtendsResult.True : ExtendsResult.Union;
}
function FromArrayRight(left, right) {
  return type_exports2.IsUnknown(left) ? ExtendsResult.False : type_exports2.IsAny(left) ? ExtendsResult.Union : type_exports2.IsNever(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromArray3(left, right) {
  return type_exports2.IsObject(right) && IsObjectArrayLike(right) ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : !type_exports2.IsArray(right) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.items, right.items));
}
function FromAsyncIterator(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : !type_exports2.IsAsyncIterator(right) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.items, right.items));
}
function FromBigInt(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsBigInt(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromBooleanRight(left, right) {
  return type_exports2.IsLiteralBoolean(left) ? ExtendsResult.True : type_exports2.IsBoolean(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromBoolean(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsBoolean(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromConstructor(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : !type_exports2.IsConstructor(right) ? ExtendsResult.False : left.parameters.length > right.parameters.length ? ExtendsResult.False : !left.parameters.every((schema, index) => IntoBooleanResult(Visit4(right.parameters[index], schema)) === ExtendsResult.True) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.returns, right.returns));
}
function FromDate(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsDate(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromFunction(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : !type_exports2.IsFunction(right) ? ExtendsResult.False : left.parameters.length > right.parameters.length ? ExtendsResult.False : !left.parameters.every((schema, index) => IntoBooleanResult(Visit4(right.parameters[index], schema)) === ExtendsResult.True) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.returns, right.returns));
}
function FromIntegerRight(left, right) {
  return type_exports2.IsLiteral(left) && value_exports.IsNumber(left.const) ? ExtendsResult.True : type_exports2.IsNumber(left) || type_exports2.IsInteger(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromInteger(left, right) {
  return type_exports2.IsInteger(right) || type_exports2.IsNumber(right) ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : ExtendsResult.False;
}
function FromIntersectRight(left, right) {
  return right.allOf.every((schema) => Visit4(left, schema) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromIntersect3(left, right) {
  return left.allOf.some((schema) => Visit4(schema, right) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromIterator(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : !type_exports2.IsIterator(right) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.items, right.items));
}
function FromLiteral2(left, right) {
  return type_exports2.IsLiteral(right) && right.const === left.const ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsString(right) ? FromStringRight(left, right) : type_exports2.IsNumber(right) ? FromNumberRight(left, right) : type_exports2.IsInteger(right) ? FromIntegerRight(left, right) : type_exports2.IsBoolean(right) ? FromBooleanRight(left, right) : ExtendsResult.False;
}
function FromNeverRight(left, right) {
  return ExtendsResult.False;
}
function FromNever(left, right) {
  return ExtendsResult.True;
}
function UnwrapTNot(schema) {
  let [current, depth] = [schema, 0];
  while (true) {
    if (!type_exports2.IsNot(current))
      break;
    current = current.not;
    depth += 1;
  }
  return depth % 2 === 0 ? current : Unknown();
}
function FromNot(left, right) {
  return type_exports2.IsNot(left) ? Visit4(UnwrapTNot(left), right) : type_exports2.IsNot(right) ? Visit4(left, UnwrapTNot(right)) : Throw("Invalid fallthrough for Not");
}
function FromNull(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsNull(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromNumberRight(left, right) {
  return type_exports2.IsLiteralNumber(left) ? ExtendsResult.True : type_exports2.IsNumber(left) || type_exports2.IsInteger(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromNumber(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsInteger(right) || type_exports2.IsNumber(right) ? ExtendsResult.True : ExtendsResult.False;
}
function IsObjectPropertyCount(schema, count) {
  return Object.getOwnPropertyNames(schema.properties).length === count;
}
function IsObjectStringLike(schema) {
  return IsObjectArrayLike(schema);
}
function IsObjectSymbolLike(schema) {
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "description" in schema.properties && type_exports2.IsUnion(schema.properties.description) && schema.properties.description.anyOf.length === 2 && (type_exports2.IsString(schema.properties.description.anyOf[0]) && type_exports2.IsUndefined(schema.properties.description.anyOf[1]) || type_exports2.IsString(schema.properties.description.anyOf[1]) && type_exports2.IsUndefined(schema.properties.description.anyOf[0]));
}
function IsObjectNumberLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectBooleanLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectBigIntLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectDateLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectUint8ArrayLike(schema) {
  return IsObjectArrayLike(schema);
}
function IsObjectFunctionLike(schema) {
  const length = Number2();
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "length" in schema.properties && IntoBooleanResult(Visit4(schema.properties["length"], length)) === ExtendsResult.True;
}
function IsObjectConstructorLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectArrayLike(schema) {
  const length = Number2();
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "length" in schema.properties && IntoBooleanResult(Visit4(schema.properties["length"], length)) === ExtendsResult.True;
}
function IsObjectPromiseLike(schema) {
  const then = Function([Any()], Any());
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "then" in schema.properties && IntoBooleanResult(Visit4(schema.properties["then"], then)) === ExtendsResult.True;
}
function Property(left, right) {
  return Visit4(left, right) === ExtendsResult.False ? ExtendsResult.False : type_exports2.IsOptional(left) && !type_exports2.IsOptional(right) ? ExtendsResult.False : ExtendsResult.True;
}
function FromObjectRight(left, right) {
  return type_exports2.IsUnknown(left) ? ExtendsResult.False : type_exports2.IsAny(left) ? ExtendsResult.Union : type_exports2.IsNever(left) || type_exports2.IsLiteralString(left) && IsObjectStringLike(right) || type_exports2.IsLiteralNumber(left) && IsObjectNumberLike(right) || type_exports2.IsLiteralBoolean(left) && IsObjectBooleanLike(right) || type_exports2.IsSymbol(left) && IsObjectSymbolLike(right) || type_exports2.IsBigInt(left) && IsObjectBigIntLike(right) || type_exports2.IsString(left) && IsObjectStringLike(right) || type_exports2.IsSymbol(left) && IsObjectSymbolLike(right) || type_exports2.IsNumber(left) && IsObjectNumberLike(right) || type_exports2.IsInteger(left) && IsObjectNumberLike(right) || type_exports2.IsBoolean(left) && IsObjectBooleanLike(right) || type_exports2.IsUint8Array(left) && IsObjectUint8ArrayLike(right) || type_exports2.IsDate(left) && IsObjectDateLike(right) || type_exports2.IsConstructor(left) && IsObjectConstructorLike(right) || type_exports2.IsFunction(left) && IsObjectFunctionLike(right) ? ExtendsResult.True : type_exports2.IsRecord(left) && type_exports2.IsString(RecordKey(left)) ? (() => {
    return right[Hint] === "Record" ? ExtendsResult.True : ExtendsResult.False;
  })() : type_exports2.IsRecord(left) && type_exports2.IsNumber(RecordKey(left)) ? (() => {
    return IsObjectPropertyCount(right, 0) ? ExtendsResult.True : ExtendsResult.False;
  })() : ExtendsResult.False;
}
function FromObject(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : !type_exports2.IsObject(right) ? ExtendsResult.False : (() => {
    for (const key of Object.getOwnPropertyNames(right.properties)) {
      if (!(key in left.properties) && !type_exports2.IsOptional(right.properties[key])) {
        return ExtendsResult.False;
      }
      if (type_exports2.IsOptional(right.properties[key])) {
        return ExtendsResult.True;
      }
      if (Property(left.properties[key], right.properties[key]) === ExtendsResult.False) {
        return ExtendsResult.False;
      }
    }
    return ExtendsResult.True;
  })();
}
function FromPromise(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) && IsObjectPromiseLike(right) ? ExtendsResult.True : !type_exports2.IsPromise(right) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.item, right.item));
}
function RecordKey(schema) {
  return PatternNumberExact in schema.patternProperties ? Number2() : PatternStringExact in schema.patternProperties ? String2() : Throw("Unknown record key pattern");
}
function RecordValue(schema) {
  return PatternNumberExact in schema.patternProperties ? schema.patternProperties[PatternNumberExact] : PatternStringExact in schema.patternProperties ? schema.patternProperties[PatternStringExact] : Throw("Unable to get record value schema");
}
function FromRecordRight(left, right) {
  const [Key, Value] = [RecordKey(right), RecordValue(right)];
  return type_exports2.IsLiteralString(left) && type_exports2.IsNumber(Key) && IntoBooleanResult(Visit4(left, Value)) === ExtendsResult.True ? ExtendsResult.True : type_exports2.IsUint8Array(left) && type_exports2.IsNumber(Key) ? Visit4(left, Value) : type_exports2.IsString(left) && type_exports2.IsNumber(Key) ? Visit4(left, Value) : type_exports2.IsArray(left) && type_exports2.IsNumber(Key) ? Visit4(left, Value) : type_exports2.IsObject(left) ? (() => {
    for (const key of Object.getOwnPropertyNames(left.properties)) {
      if (Property(Value, left.properties[key]) === ExtendsResult.False) {
        return ExtendsResult.False;
      }
    }
    return ExtendsResult.True;
  })() : ExtendsResult.False;
}
function FromRecord(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : !type_exports2.IsRecord(right) ? ExtendsResult.False : Visit4(RecordValue(left), RecordValue(right));
}
function FromRegExp(left, right) {
  const L2 = type_exports2.IsRegExp(left) ? String2() : left;
  const R = type_exports2.IsRegExp(right) ? String2() : right;
  return Visit4(L2, R);
}
function FromStringRight(left, right) {
  return type_exports2.IsLiteral(left) && value_exports.IsString(left.const) ? ExtendsResult.True : type_exports2.IsString(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromString(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsString(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromSymbol(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsSymbol(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromTemplateLiteral2(left, right) {
  return type_exports2.IsTemplateLiteral(left) ? Visit4(TemplateLiteralToUnion(left), right) : type_exports2.IsTemplateLiteral(right) ? Visit4(left, TemplateLiteralToUnion(right)) : Throw("Invalid fallthrough for TemplateLiteral");
}
function IsArrayOfTuple(left, right) {
  return type_exports2.IsArray(right) && left.items !== void 0 && left.items.every((schema) => Visit4(schema, right.items) === ExtendsResult.True);
}
function FromTupleRight(left, right) {
  return type_exports2.IsNever(left) ? ExtendsResult.True : type_exports2.IsUnknown(left) ? ExtendsResult.False : type_exports2.IsAny(left) ? ExtendsResult.Union : ExtendsResult.False;
}
function FromTuple3(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) && IsObjectArrayLike(right) ? ExtendsResult.True : type_exports2.IsArray(right) && IsArrayOfTuple(left, right) ? ExtendsResult.True : !type_exports2.IsTuple(right) ? ExtendsResult.False : value_exports.IsUndefined(left.items) && !value_exports.IsUndefined(right.items) || !value_exports.IsUndefined(left.items) && value_exports.IsUndefined(right.items) ? ExtendsResult.False : value_exports.IsUndefined(left.items) && !value_exports.IsUndefined(right.items) ? ExtendsResult.True : left.items.every((schema, index) => Visit4(schema, right.items[index]) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUint8Array(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsUint8Array(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUndefined(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsVoid(right) ? FromVoidRight(left, right) : type_exports2.IsUndefined(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnionRight(left, right) {
  return right.anyOf.some((schema) => Visit4(left, schema) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnion5(left, right) {
  return left.anyOf.every((schema) => Visit4(schema, right) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnknownRight(left, right) {
  return ExtendsResult.True;
}
function FromUnknown(left, right) {
  return type_exports2.IsNever(right) ? FromNeverRight(left, right) : type_exports2.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports2.IsUnion(right) ? FromUnionRight(left, right) : type_exports2.IsAny(right) ? FromAnyRight(left, right) : type_exports2.IsString(right) ? FromStringRight(left, right) : type_exports2.IsNumber(right) ? FromNumberRight(left, right) : type_exports2.IsInteger(right) ? FromIntegerRight(left, right) : type_exports2.IsBoolean(right) ? FromBooleanRight(left, right) : type_exports2.IsArray(right) ? FromArrayRight(left, right) : type_exports2.IsTuple(right) ? FromTupleRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsUnknown(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromVoidRight(left, right) {
  return type_exports2.IsUndefined(left) ? ExtendsResult.True : type_exports2.IsUndefined(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromVoid(left, right) {
  return type_exports2.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports2.IsUnion(right) ? FromUnionRight(left, right) : type_exports2.IsUnknown(right) ? FromUnknownRight(left, right) : type_exports2.IsAny(right) ? FromAnyRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsVoid(right) ? ExtendsResult.True : ExtendsResult.False;
}
function Visit4(left, right) {
  return (
    // resolvable
    type_exports2.IsTemplateLiteral(left) || type_exports2.IsTemplateLiteral(right) ? FromTemplateLiteral2(left, right) : type_exports2.IsRegExp(left) || type_exports2.IsRegExp(right) ? FromRegExp(left, right) : type_exports2.IsNot(left) || type_exports2.IsNot(right) ? FromNot(left, right) : (
      // standard
      type_exports2.IsAny(left) ? FromAny(left, right) : type_exports2.IsArray(left) ? FromArray3(left, right) : type_exports2.IsBigInt(left) ? FromBigInt(left, right) : type_exports2.IsBoolean(left) ? FromBoolean(left, right) : type_exports2.IsAsyncIterator(left) ? FromAsyncIterator(left, right) : type_exports2.IsConstructor(left) ? FromConstructor(left, right) : type_exports2.IsDate(left) ? FromDate(left, right) : type_exports2.IsFunction(left) ? FromFunction(left, right) : type_exports2.IsInteger(left) ? FromInteger(left, right) : type_exports2.IsIntersect(left) ? FromIntersect3(left, right) : type_exports2.IsIterator(left) ? FromIterator(left, right) : type_exports2.IsLiteral(left) ? FromLiteral2(left, right) : type_exports2.IsNever(left) ? FromNever(left, right) : type_exports2.IsNull(left) ? FromNull(left, right) : type_exports2.IsNumber(left) ? FromNumber(left, right) : type_exports2.IsObject(left) ? FromObject(left, right) : type_exports2.IsRecord(left) ? FromRecord(left, right) : type_exports2.IsString(left) ? FromString(left, right) : type_exports2.IsSymbol(left) ? FromSymbol(left, right) : type_exports2.IsTuple(left) ? FromTuple3(left, right) : type_exports2.IsPromise(left) ? FromPromise(left, right) : type_exports2.IsUint8Array(left) ? FromUint8Array(left, right) : type_exports2.IsUndefined(left) ? FromUndefined(left, right) : type_exports2.IsUnion(left) ? FromUnion5(left, right) : type_exports2.IsUnknown(left) ? FromUnknown(left, right) : type_exports2.IsVoid(left) ? FromVoid(left, right) : Throw(`Unknown left type operand '${left[Kind]}'`)
    )
  );
}
function ExtendsCheck(left, right) {
  return Visit4(left, right);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-from-mapped-result.mjs
function FromProperties7(P2, Right, True, False, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P2))
    Acc[K2] = Extends(P2[K2], Right, True, False, Clone(options));
  return Acc;
}
function FromMappedResult6(Left, Right, True, False, options) {
  return FromProperties7(Left.properties, Right, True, False, options);
}
function ExtendsFromMappedResult(Left, Right, True, False, options) {
  const P2 = FromMappedResult6(Left, Right, True, False, options);
  return MappedResult(P2);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends.mjs
function ExtendsResolve(left, right, trueType, falseType) {
  const R = ExtendsCheck(left, right);
  return R === ExtendsResult.Union ? Union([trueType, falseType]) : R === ExtendsResult.True ? trueType : falseType;
}
function Extends(L2, R, T, F, options) {
  return IsMappedResult(L2) ? ExtendsFromMappedResult(L2, R, T, F, options) : IsMappedKey(L2) ? CreateType(ExtendsFromMappedKey(L2, R, T, F, options)) : CreateType(ExtendsResolve(L2, R, T, F), options);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-from-mapped-key.mjs
function FromPropertyKey(K, U, L2, R, options) {
  return {
    [K]: Extends(Literal(K), U, L2, R, Clone(options))
  };
}
function FromPropertyKeys(K, U, L2, R, options) {
  return K.reduce((Acc, LK) => {
    return { ...Acc, ...FromPropertyKey(LK, U, L2, R, options) };
  }, {});
}
function FromMappedKey2(K, U, L2, R, options) {
  return FromPropertyKeys(K.keys, U, L2, R, options);
}
function ExtendsFromMappedKey(T, U, L2, R, options) {
  const P2 = FromMappedKey2(T, U, L2, R, options);
  return MappedResult(P2);
}

// node_modules/@sinclair/typebox/build/esm/value/check/check.mjs
var ValueCheckUnknownTypeError = class extends TypeBoxError {
  constructor(schema) {
    super(`Unknown type`);
    this.schema = schema;
  }
};
function IsAnyOrUnknown(schema) {
  return schema[Kind] === "Any" || schema[Kind] === "Unknown";
}
function IsDefined(value) {
  return value !== void 0;
}
function FromAny2(schema, references, value) {
  return true;
}
function FromArgument(schema, references, value) {
  return true;
}
function FromArray4(schema, references, value) {
  if (!IsArray(value))
    return false;
  if (IsDefined(schema.minItems) && !(value.length >= schema.minItems)) {
    return false;
  }
  if (IsDefined(schema.maxItems) && !(value.length <= schema.maxItems)) {
    return false;
  }
  for (const element of value) {
    if (!Visit5(schema.items, references, element))
      return false;
  }
  if (schema.uniqueItems === true && !(function() {
    const set = /* @__PURE__ */ new Set();
    for (const element of value) {
      const hashed = Hash(element);
      if (set.has(hashed)) {
        return false;
      } else {
        set.add(hashed);
      }
    }
    return true;
  })()) {
    return false;
  }
  if (!(IsDefined(schema.contains) || IsNumber(schema.minContains) || IsNumber(schema.maxContains))) {
    return true;
  }
  const containsSchema = IsDefined(schema.contains) ? schema.contains : Never();
  const containsCount = value.reduce((acc, value2) => Visit5(containsSchema, references, value2) ? acc + 1 : acc, 0);
  if (containsCount === 0) {
    return false;
  }
  if (IsNumber(schema.minContains) && containsCount < schema.minContains) {
    return false;
  }
  if (IsNumber(schema.maxContains) && containsCount > schema.maxContains) {
    return false;
  }
  return true;
}
function FromAsyncIterator2(schema, references, value) {
  return IsAsyncIterator(value);
}
function FromBigInt2(schema, references, value) {
  if (!IsBigInt(value))
    return false;
  if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === BigInt(0))) {
    return false;
  }
  return true;
}
function FromBoolean2(schema, references, value) {
  return IsBoolean(value);
}
function FromConstructor2(schema, references, value) {
  return Visit5(schema.returns, references, value.prototype);
}
function FromDate2(schema, references, value) {
  if (!IsDate(value))
    return false;
  if (IsDefined(schema.exclusiveMaximumTimestamp) && !(value.getTime() < schema.exclusiveMaximumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimumTimestamp) && !(value.getTime() > schema.exclusiveMinimumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.maximumTimestamp) && !(value.getTime() <= schema.maximumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.minimumTimestamp) && !(value.getTime() >= schema.minimumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.multipleOfTimestamp) && !(value.getTime() % schema.multipleOfTimestamp === 0)) {
    return false;
  }
  return true;
}
function FromFunction2(schema, references, value) {
  return IsFunction(value);
}
function FromImport(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit5(target, [...references, ...definitions], value);
}
function FromInteger2(schema, references, value) {
  if (!IsInteger(value)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    return false;
  }
  return true;
}
function FromIntersect4(schema, references, value) {
  const check1 = schema.allOf.every((schema2) => Visit5(schema2, references, value));
  if (schema.unevaluatedProperties === false) {
    const keyPattern = new RegExp(KeyOfPattern(schema));
    const check2 = Object.getOwnPropertyNames(value).every((key) => keyPattern.test(key));
    return check1 && check2;
  } else if (IsSchema(schema.unevaluatedProperties)) {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    const check2 = Object.getOwnPropertyNames(value).every((key) => keyCheck.test(key) || Visit5(schema.unevaluatedProperties, references, value[key]));
    return check1 && check2;
  } else {
    return check1;
  }
}
function FromIterator2(schema, references, value) {
  return IsIterator(value);
}
function FromLiteral3(schema, references, value) {
  return value === schema.const;
}
function FromNever2(schema, references, value) {
  return false;
}
function FromNot2(schema, references, value) {
  return !Visit5(schema.not, references, value);
}
function FromNull2(schema, references, value) {
  return IsNull(value);
}
function FromNumber2(schema, references, value) {
  if (!TypeSystemPolicy.IsNumberLike(value))
    return false;
  if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    return false;
  }
  return true;
}
function FromObject2(schema, references, value) {
  if (!TypeSystemPolicy.IsObjectLike(value))
    return false;
  if (IsDefined(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    return false;
  }
  if (IsDefined(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    return false;
  }
  const knownKeys = Object.getOwnPropertyNames(schema.properties);
  for (const knownKey of knownKeys) {
    const property = schema.properties[knownKey];
    if (schema.required && schema.required.includes(knownKey)) {
      if (!Visit5(property, references, value[knownKey])) {
        return false;
      }
      if ((ExtendsUndefinedCheck(property) || IsAnyOrUnknown(property)) && !(knownKey in value)) {
        return false;
      }
    } else {
      if (TypeSystemPolicy.IsExactOptionalProperty(value, knownKey) && !Visit5(property, references, value[knownKey])) {
        return false;
      }
    }
  }
  if (schema.additionalProperties === false) {
    const valueKeys = Object.getOwnPropertyNames(value);
    if (schema.required && schema.required.length === knownKeys.length && valueKeys.length === knownKeys.length) {
      return true;
    } else {
      return valueKeys.every((valueKey) => knownKeys.includes(valueKey));
    }
  } else if (typeof schema.additionalProperties === "object") {
    const valueKeys = Object.getOwnPropertyNames(value);
    return valueKeys.every((key) => knownKeys.includes(key) || Visit5(schema.additionalProperties, references, value[key]));
  } else {
    return true;
  }
}
function FromPromise2(schema, references, value) {
  return IsPromise(value);
}
function FromRecord2(schema, references, value) {
  if (!TypeSystemPolicy.IsRecordLike(value)) {
    return false;
  }
  if (IsDefined(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    return false;
  }
  if (IsDefined(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    return false;
  }
  const [patternKey, patternSchema] = Object.entries(schema.patternProperties)[0];
  const regex = new RegExp(patternKey);
  const check1 = Object.entries(value).every(([key, value2]) => {
    return regex.test(key) ? Visit5(patternSchema, references, value2) : true;
  });
  const check2 = typeof schema.additionalProperties === "object" ? Object.entries(value).every(([key, value2]) => {
    return !regex.test(key) ? Visit5(schema.additionalProperties, references, value2) : true;
  }) : true;
  const check3 = schema.additionalProperties === false ? Object.getOwnPropertyNames(value).every((key) => {
    return regex.test(key);
  }) : true;
  return check1 && check2 && check3;
}
function FromRef2(schema, references, value) {
  return Visit5(Deref(schema, references), references, value);
}
function FromRegExp2(schema, references, value) {
  const regex = new RegExp(schema.source, schema.flags);
  if (IsDefined(schema.minLength)) {
    if (!(value.length >= schema.minLength))
      return false;
  }
  if (IsDefined(schema.maxLength)) {
    if (!(value.length <= schema.maxLength))
      return false;
  }
  return regex.test(value);
}
function FromString2(schema, references, value) {
  if (!IsString(value)) {
    return false;
  }
  if (IsDefined(schema.minLength)) {
    if (!(value.length >= schema.minLength))
      return false;
  }
  if (IsDefined(schema.maxLength)) {
    if (!(value.length <= schema.maxLength))
      return false;
  }
  if (IsDefined(schema.pattern)) {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(value))
      return false;
  }
  if (IsDefined(schema.format)) {
    if (!format_exports.Has(schema.format))
      return false;
    const func = format_exports.Get(schema.format);
    return func(value);
  }
  return true;
}
function FromSymbol2(schema, references, value) {
  return IsSymbol(value);
}
function FromTemplateLiteral3(schema, references, value) {
  return IsString(value) && new RegExp(schema.pattern).test(value);
}
function FromThis(schema, references, value) {
  return Visit5(Deref(schema, references), references, value);
}
function FromTuple4(schema, references, value) {
  if (!IsArray(value)) {
    return false;
  }
  if (schema.items === void 0 && !(value.length === 0)) {
    return false;
  }
  if (!(value.length === schema.maxItems)) {
    return false;
  }
  if (!schema.items) {
    return true;
  }
  for (let i = 0; i < schema.items.length; i++) {
    if (!Visit5(schema.items[i], references, value[i]))
      return false;
  }
  return true;
}
function FromUndefined2(schema, references, value) {
  return IsUndefined(value);
}
function FromUnion6(schema, references, value) {
  return schema.anyOf.some((inner) => Visit5(inner, references, value));
}
function FromUint8Array2(schema, references, value) {
  if (!IsUint8Array(value)) {
    return false;
  }
  if (IsDefined(schema.maxByteLength) && !(value.length <= schema.maxByteLength)) {
    return false;
  }
  if (IsDefined(schema.minByteLength) && !(value.length >= schema.minByteLength)) {
    return false;
  }
  return true;
}
function FromUnknown2(schema, references, value) {
  return true;
}
function FromVoid2(schema, references, value) {
  return TypeSystemPolicy.IsVoidLike(value);
}
function FromKind(schema, references, value) {
  if (!type_exports.Has(schema[Kind]))
    return false;
  const func = type_exports.Get(schema[Kind]);
  return func(schema, value);
}
function Visit5(schema, references, value) {
  const references_ = IsDefined(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return FromAny2(schema_, references_, value);
    case "Argument":
      return FromArgument(schema_, references_, value);
    case "Array":
      return FromArray4(schema_, references_, value);
    case "AsyncIterator":
      return FromAsyncIterator2(schema_, references_, value);
    case "BigInt":
      return FromBigInt2(schema_, references_, value);
    case "Boolean":
      return FromBoolean2(schema_, references_, value);
    case "Constructor":
      return FromConstructor2(schema_, references_, value);
    case "Date":
      return FromDate2(schema_, references_, value);
    case "Function":
      return FromFunction2(schema_, references_, value);
    case "Import":
      return FromImport(schema_, references_, value);
    case "Integer":
      return FromInteger2(schema_, references_, value);
    case "Intersect":
      return FromIntersect4(schema_, references_, value);
    case "Iterator":
      return FromIterator2(schema_, references_, value);
    case "Literal":
      return FromLiteral3(schema_, references_, value);
    case "Never":
      return FromNever2(schema_, references_, value);
    case "Not":
      return FromNot2(schema_, references_, value);
    case "Null":
      return FromNull2(schema_, references_, value);
    case "Number":
      return FromNumber2(schema_, references_, value);
    case "Object":
      return FromObject2(schema_, references_, value);
    case "Promise":
      return FromPromise2(schema_, references_, value);
    case "Record":
      return FromRecord2(schema_, references_, value);
    case "Ref":
      return FromRef2(schema_, references_, value);
    case "RegExp":
      return FromRegExp2(schema_, references_, value);
    case "String":
      return FromString2(schema_, references_, value);
    case "Symbol":
      return FromSymbol2(schema_, references_, value);
    case "TemplateLiteral":
      return FromTemplateLiteral3(schema_, references_, value);
    case "This":
      return FromThis(schema_, references_, value);
    case "Tuple":
      return FromTuple4(schema_, references_, value);
    case "Undefined":
      return FromUndefined2(schema_, references_, value);
    case "Union":
      return FromUnion6(schema_, references_, value);
    case "Uint8Array":
      return FromUint8Array2(schema_, references_, value);
    case "Unknown":
      return FromUnknown2(schema_, references_, value);
    case "Void":
      return FromVoid2(schema_, references_, value);
    default:
      if (!type_exports.Has(schema_[Kind]))
        throw new ValueCheckUnknownTypeError(schema_);
      return FromKind(schema_, references_, value);
  }
}
function Check(...args) {
  return args.length === 3 ? Visit5(args[0], args[1], args[2]) : Visit5(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/errors/errors.mjs
var ValueErrorType;
(function(ValueErrorType2) {
  ValueErrorType2[ValueErrorType2["ArrayContains"] = 0] = "ArrayContains";
  ValueErrorType2[ValueErrorType2["ArrayMaxContains"] = 1] = "ArrayMaxContains";
  ValueErrorType2[ValueErrorType2["ArrayMaxItems"] = 2] = "ArrayMaxItems";
  ValueErrorType2[ValueErrorType2["ArrayMinContains"] = 3] = "ArrayMinContains";
  ValueErrorType2[ValueErrorType2["ArrayMinItems"] = 4] = "ArrayMinItems";
  ValueErrorType2[ValueErrorType2["ArrayUniqueItems"] = 5] = "ArrayUniqueItems";
  ValueErrorType2[ValueErrorType2["Array"] = 6] = "Array";
  ValueErrorType2[ValueErrorType2["AsyncIterator"] = 7] = "AsyncIterator";
  ValueErrorType2[ValueErrorType2["BigIntExclusiveMaximum"] = 8] = "BigIntExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["BigIntExclusiveMinimum"] = 9] = "BigIntExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["BigIntMaximum"] = 10] = "BigIntMaximum";
  ValueErrorType2[ValueErrorType2["BigIntMinimum"] = 11] = "BigIntMinimum";
  ValueErrorType2[ValueErrorType2["BigIntMultipleOf"] = 12] = "BigIntMultipleOf";
  ValueErrorType2[ValueErrorType2["BigInt"] = 13] = "BigInt";
  ValueErrorType2[ValueErrorType2["Boolean"] = 14] = "Boolean";
  ValueErrorType2[ValueErrorType2["DateExclusiveMaximumTimestamp"] = 15] = "DateExclusiveMaximumTimestamp";
  ValueErrorType2[ValueErrorType2["DateExclusiveMinimumTimestamp"] = 16] = "DateExclusiveMinimumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMaximumTimestamp"] = 17] = "DateMaximumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMinimumTimestamp"] = 18] = "DateMinimumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMultipleOfTimestamp"] = 19] = "DateMultipleOfTimestamp";
  ValueErrorType2[ValueErrorType2["Date"] = 20] = "Date";
  ValueErrorType2[ValueErrorType2["Function"] = 21] = "Function";
  ValueErrorType2[ValueErrorType2["IntegerExclusiveMaximum"] = 22] = "IntegerExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["IntegerExclusiveMinimum"] = 23] = "IntegerExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["IntegerMaximum"] = 24] = "IntegerMaximum";
  ValueErrorType2[ValueErrorType2["IntegerMinimum"] = 25] = "IntegerMinimum";
  ValueErrorType2[ValueErrorType2["IntegerMultipleOf"] = 26] = "IntegerMultipleOf";
  ValueErrorType2[ValueErrorType2["Integer"] = 27] = "Integer";
  ValueErrorType2[ValueErrorType2["IntersectUnevaluatedProperties"] = 28] = "IntersectUnevaluatedProperties";
  ValueErrorType2[ValueErrorType2["Intersect"] = 29] = "Intersect";
  ValueErrorType2[ValueErrorType2["Iterator"] = 30] = "Iterator";
  ValueErrorType2[ValueErrorType2["Kind"] = 31] = "Kind";
  ValueErrorType2[ValueErrorType2["Literal"] = 32] = "Literal";
  ValueErrorType2[ValueErrorType2["Never"] = 33] = "Never";
  ValueErrorType2[ValueErrorType2["Not"] = 34] = "Not";
  ValueErrorType2[ValueErrorType2["Null"] = 35] = "Null";
  ValueErrorType2[ValueErrorType2["NumberExclusiveMaximum"] = 36] = "NumberExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["NumberExclusiveMinimum"] = 37] = "NumberExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["NumberMaximum"] = 38] = "NumberMaximum";
  ValueErrorType2[ValueErrorType2["NumberMinimum"] = 39] = "NumberMinimum";
  ValueErrorType2[ValueErrorType2["NumberMultipleOf"] = 40] = "NumberMultipleOf";
  ValueErrorType2[ValueErrorType2["Number"] = 41] = "Number";
  ValueErrorType2[ValueErrorType2["ObjectAdditionalProperties"] = 42] = "ObjectAdditionalProperties";
  ValueErrorType2[ValueErrorType2["ObjectMaxProperties"] = 43] = "ObjectMaxProperties";
  ValueErrorType2[ValueErrorType2["ObjectMinProperties"] = 44] = "ObjectMinProperties";
  ValueErrorType2[ValueErrorType2["ObjectRequiredProperty"] = 45] = "ObjectRequiredProperty";
  ValueErrorType2[ValueErrorType2["Object"] = 46] = "Object";
  ValueErrorType2[ValueErrorType2["Promise"] = 47] = "Promise";
  ValueErrorType2[ValueErrorType2["RegExp"] = 48] = "RegExp";
  ValueErrorType2[ValueErrorType2["StringFormatUnknown"] = 49] = "StringFormatUnknown";
  ValueErrorType2[ValueErrorType2["StringFormat"] = 50] = "StringFormat";
  ValueErrorType2[ValueErrorType2["StringMaxLength"] = 51] = "StringMaxLength";
  ValueErrorType2[ValueErrorType2["StringMinLength"] = 52] = "StringMinLength";
  ValueErrorType2[ValueErrorType2["StringPattern"] = 53] = "StringPattern";
  ValueErrorType2[ValueErrorType2["String"] = 54] = "String";
  ValueErrorType2[ValueErrorType2["Symbol"] = 55] = "Symbol";
  ValueErrorType2[ValueErrorType2["TupleLength"] = 56] = "TupleLength";
  ValueErrorType2[ValueErrorType2["Tuple"] = 57] = "Tuple";
  ValueErrorType2[ValueErrorType2["Uint8ArrayMaxByteLength"] = 58] = "Uint8ArrayMaxByteLength";
  ValueErrorType2[ValueErrorType2["Uint8ArrayMinByteLength"] = 59] = "Uint8ArrayMinByteLength";
  ValueErrorType2[ValueErrorType2["Uint8Array"] = 60] = "Uint8Array";
  ValueErrorType2[ValueErrorType2["Undefined"] = 61] = "Undefined";
  ValueErrorType2[ValueErrorType2["Union"] = 62] = "Union";
  ValueErrorType2[ValueErrorType2["Void"] = 63] = "Void";
})(ValueErrorType || (ValueErrorType = {}));
var ValueErrorsUnknownTypeError = class extends TypeBoxError {
  constructor(schema) {
    super("Unknown type");
    this.schema = schema;
  }
};
function EscapeKey(key) {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}
function IsDefined2(value) {
  return value !== void 0;
}
var ValueErrorIterator = class {
  constructor(iterator) {
    this.iterator = iterator;
  }
  [Symbol.iterator]() {
    return this.iterator;
  }
  /** Returns the first value error or undefined if no errors */
  First() {
    const next = this.iterator.next();
    return next.done ? void 0 : next.value;
  }
};
function Create(errorType, schema, path3, value, errors = []) {
  return {
    type: errorType,
    schema,
    path: path3,
    value,
    message: GetErrorFunction()({ errorType, path: path3, schema, value, errors }),
    errors
  };
}
function* FromAny3(schema, references, path3, value) {
}
function* FromArgument2(schema, references, path3, value) {
}
function* FromArray5(schema, references, path3, value) {
  if (!IsArray(value)) {
    return yield Create(ValueErrorType.Array, schema, path3, value);
  }
  if (IsDefined2(schema.minItems) && !(value.length >= schema.minItems)) {
    yield Create(ValueErrorType.ArrayMinItems, schema, path3, value);
  }
  if (IsDefined2(schema.maxItems) && !(value.length <= schema.maxItems)) {
    yield Create(ValueErrorType.ArrayMaxItems, schema, path3, value);
  }
  for (let i = 0; i < value.length; i++) {
    yield* Visit6(schema.items, references, `${path3}/${i}`, value[i]);
  }
  if (schema.uniqueItems === true && !(function() {
    const set = /* @__PURE__ */ new Set();
    for (const element of value) {
      const hashed = Hash(element);
      if (set.has(hashed)) {
        return false;
      } else {
        set.add(hashed);
      }
    }
    return true;
  })()) {
    yield Create(ValueErrorType.ArrayUniqueItems, schema, path3, value);
  }
  if (!(IsDefined2(schema.contains) || IsDefined2(schema.minContains) || IsDefined2(schema.maxContains))) {
    return;
  }
  const containsSchema = IsDefined2(schema.contains) ? schema.contains : Never();
  const containsCount = value.reduce((acc, value2, index) => Visit6(containsSchema, references, `${path3}${index}`, value2).next().done === true ? acc + 1 : acc, 0);
  if (containsCount === 0) {
    yield Create(ValueErrorType.ArrayContains, schema, path3, value);
  }
  if (IsNumber(schema.minContains) && containsCount < schema.minContains) {
    yield Create(ValueErrorType.ArrayMinContains, schema, path3, value);
  }
  if (IsNumber(schema.maxContains) && containsCount > schema.maxContains) {
    yield Create(ValueErrorType.ArrayMaxContains, schema, path3, value);
  }
}
function* FromAsyncIterator3(schema, references, path3, value) {
  if (!IsAsyncIterator(value))
    yield Create(ValueErrorType.AsyncIterator, schema, path3, value);
}
function* FromBigInt3(schema, references, path3, value) {
  if (!IsBigInt(value))
    return yield Create(ValueErrorType.BigInt, schema, path3, value);
  if (IsDefined2(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.BigIntExclusiveMaximum, schema, path3, value);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.BigIntExclusiveMinimum, schema, path3, value);
  }
  if (IsDefined2(schema.maximum) && !(value <= schema.maximum)) {
    yield Create(ValueErrorType.BigIntMaximum, schema, path3, value);
  }
  if (IsDefined2(schema.minimum) && !(value >= schema.minimum)) {
    yield Create(ValueErrorType.BigIntMinimum, schema, path3, value);
  }
  if (IsDefined2(schema.multipleOf) && !(value % schema.multipleOf === BigInt(0))) {
    yield Create(ValueErrorType.BigIntMultipleOf, schema, path3, value);
  }
}
function* FromBoolean3(schema, references, path3, value) {
  if (!IsBoolean(value))
    yield Create(ValueErrorType.Boolean, schema, path3, value);
}
function* FromConstructor3(schema, references, path3, value) {
  yield* Visit6(schema.returns, references, path3, value.prototype);
}
function* FromDate3(schema, references, path3, value) {
  if (!IsDate(value))
    return yield Create(ValueErrorType.Date, schema, path3, value);
  if (IsDefined2(schema.exclusiveMaximumTimestamp) && !(value.getTime() < schema.exclusiveMaximumTimestamp)) {
    yield Create(ValueErrorType.DateExclusiveMaximumTimestamp, schema, path3, value);
  }
  if (IsDefined2(schema.exclusiveMinimumTimestamp) && !(value.getTime() > schema.exclusiveMinimumTimestamp)) {
    yield Create(ValueErrorType.DateExclusiveMinimumTimestamp, schema, path3, value);
  }
  if (IsDefined2(schema.maximumTimestamp) && !(value.getTime() <= schema.maximumTimestamp)) {
    yield Create(ValueErrorType.DateMaximumTimestamp, schema, path3, value);
  }
  if (IsDefined2(schema.minimumTimestamp) && !(value.getTime() >= schema.minimumTimestamp)) {
    yield Create(ValueErrorType.DateMinimumTimestamp, schema, path3, value);
  }
  if (IsDefined2(schema.multipleOfTimestamp) && !(value.getTime() % schema.multipleOfTimestamp === 0)) {
    yield Create(ValueErrorType.DateMultipleOfTimestamp, schema, path3, value);
  }
}
function* FromFunction3(schema, references, path3, value) {
  if (!IsFunction(value))
    yield Create(ValueErrorType.Function, schema, path3, value);
}
function* FromImport2(schema, references, path3, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  yield* Visit6(target, [...references, ...definitions], path3, value);
}
function* FromInteger3(schema, references, path3, value) {
  if (!IsInteger(value))
    return yield Create(ValueErrorType.Integer, schema, path3, value);
  if (IsDefined2(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.IntegerExclusiveMaximum, schema, path3, value);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.IntegerExclusiveMinimum, schema, path3, value);
  }
  if (IsDefined2(schema.maximum) && !(value <= schema.maximum)) {
    yield Create(ValueErrorType.IntegerMaximum, schema, path3, value);
  }
  if (IsDefined2(schema.minimum) && !(value >= schema.minimum)) {
    yield Create(ValueErrorType.IntegerMinimum, schema, path3, value);
  }
  if (IsDefined2(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    yield Create(ValueErrorType.IntegerMultipleOf, schema, path3, value);
  }
}
function* FromIntersect5(schema, references, path3, value) {
  let hasError = false;
  for (const inner of schema.allOf) {
    for (const error of Visit6(inner, references, path3, value)) {
      hasError = true;
      yield error;
    }
  }
  if (hasError) {
    return yield Create(ValueErrorType.Intersect, schema, path3, value);
  }
  if (schema.unevaluatedProperties === false) {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    for (const valueKey of Object.getOwnPropertyNames(value)) {
      if (!keyCheck.test(valueKey)) {
        yield Create(ValueErrorType.IntersectUnevaluatedProperties, schema, `${path3}/${valueKey}`, value);
      }
    }
  }
  if (typeof schema.unevaluatedProperties === "object") {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    for (const valueKey of Object.getOwnPropertyNames(value)) {
      if (!keyCheck.test(valueKey)) {
        const next = Visit6(schema.unevaluatedProperties, references, `${path3}/${valueKey}`, value[valueKey]).next();
        if (!next.done)
          yield next.value;
      }
    }
  }
}
function* FromIterator3(schema, references, path3, value) {
  if (!IsIterator(value))
    yield Create(ValueErrorType.Iterator, schema, path3, value);
}
function* FromLiteral4(schema, references, path3, value) {
  if (!(value === schema.const))
    yield Create(ValueErrorType.Literal, schema, path3, value);
}
function* FromNever3(schema, references, path3, value) {
  yield Create(ValueErrorType.Never, schema, path3, value);
}
function* FromNot3(schema, references, path3, value) {
  if (Visit6(schema.not, references, path3, value).next().done === true)
    yield Create(ValueErrorType.Not, schema, path3, value);
}
function* FromNull3(schema, references, path3, value) {
  if (!IsNull(value))
    yield Create(ValueErrorType.Null, schema, path3, value);
}
function* FromNumber3(schema, references, path3, value) {
  if (!TypeSystemPolicy.IsNumberLike(value))
    return yield Create(ValueErrorType.Number, schema, path3, value);
  if (IsDefined2(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.NumberExclusiveMaximum, schema, path3, value);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.NumberExclusiveMinimum, schema, path3, value);
  }
  if (IsDefined2(schema.maximum) && !(value <= schema.maximum)) {
    yield Create(ValueErrorType.NumberMaximum, schema, path3, value);
  }
  if (IsDefined2(schema.minimum) && !(value >= schema.minimum)) {
    yield Create(ValueErrorType.NumberMinimum, schema, path3, value);
  }
  if (IsDefined2(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    yield Create(ValueErrorType.NumberMultipleOf, schema, path3, value);
  }
}
function* FromObject3(schema, references, path3, value) {
  if (!TypeSystemPolicy.IsObjectLike(value))
    return yield Create(ValueErrorType.Object, schema, path3, value);
  if (IsDefined2(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    yield Create(ValueErrorType.ObjectMinProperties, schema, path3, value);
  }
  if (IsDefined2(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    yield Create(ValueErrorType.ObjectMaxProperties, schema, path3, value);
  }
  const requiredKeys = Array.isArray(schema.required) ? schema.required : [];
  const knownKeys = Object.getOwnPropertyNames(schema.properties);
  const unknownKeys = Object.getOwnPropertyNames(value);
  for (const requiredKey of requiredKeys) {
    if (unknownKeys.includes(requiredKey))
      continue;
    yield Create(ValueErrorType.ObjectRequiredProperty, schema.properties[requiredKey], `${path3}/${EscapeKey(requiredKey)}`, void 0);
  }
  if (schema.additionalProperties === false) {
    for (const valueKey of unknownKeys) {
      if (!knownKeys.includes(valueKey)) {
        yield Create(ValueErrorType.ObjectAdditionalProperties, schema, `${path3}/${EscapeKey(valueKey)}`, value[valueKey]);
      }
    }
  }
  if (typeof schema.additionalProperties === "object") {
    for (const valueKey of unknownKeys) {
      if (knownKeys.includes(valueKey))
        continue;
      yield* Visit6(schema.additionalProperties, references, `${path3}/${EscapeKey(valueKey)}`, value[valueKey]);
    }
  }
  for (const knownKey of knownKeys) {
    const property = schema.properties[knownKey];
    if (schema.required && schema.required.includes(knownKey)) {
      yield* Visit6(property, references, `${path3}/${EscapeKey(knownKey)}`, value[knownKey]);
      if (ExtendsUndefinedCheck(schema) && !(knownKey in value)) {
        yield Create(ValueErrorType.ObjectRequiredProperty, property, `${path3}/${EscapeKey(knownKey)}`, void 0);
      }
    } else {
      if (TypeSystemPolicy.IsExactOptionalProperty(value, knownKey)) {
        yield* Visit6(property, references, `${path3}/${EscapeKey(knownKey)}`, value[knownKey]);
      }
    }
  }
}
function* FromPromise3(schema, references, path3, value) {
  if (!IsPromise(value))
    yield Create(ValueErrorType.Promise, schema, path3, value);
}
function* FromRecord3(schema, references, path3, value) {
  if (!TypeSystemPolicy.IsRecordLike(value))
    return yield Create(ValueErrorType.Object, schema, path3, value);
  if (IsDefined2(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    yield Create(ValueErrorType.ObjectMinProperties, schema, path3, value);
  }
  if (IsDefined2(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    yield Create(ValueErrorType.ObjectMaxProperties, schema, path3, value);
  }
  const [patternKey, patternSchema] = Object.entries(schema.patternProperties)[0];
  const regex = new RegExp(patternKey);
  for (const [propertyKey, propertyValue] of Object.entries(value)) {
    if (regex.test(propertyKey))
      yield* Visit6(patternSchema, references, `${path3}/${EscapeKey(propertyKey)}`, propertyValue);
  }
  if (typeof schema.additionalProperties === "object") {
    for (const [propertyKey, propertyValue] of Object.entries(value)) {
      if (!regex.test(propertyKey))
        yield* Visit6(schema.additionalProperties, references, `${path3}/${EscapeKey(propertyKey)}`, propertyValue);
    }
  }
  if (schema.additionalProperties === false) {
    for (const [propertyKey, propertyValue] of Object.entries(value)) {
      if (regex.test(propertyKey))
        continue;
      return yield Create(ValueErrorType.ObjectAdditionalProperties, schema, `${path3}/${EscapeKey(propertyKey)}`, propertyValue);
    }
  }
}
function* FromRef3(schema, references, path3, value) {
  yield* Visit6(Deref(schema, references), references, path3, value);
}
function* FromRegExp3(schema, references, path3, value) {
  if (!IsString(value))
    return yield Create(ValueErrorType.String, schema, path3, value);
  if (IsDefined2(schema.minLength) && !(value.length >= schema.minLength)) {
    yield Create(ValueErrorType.StringMinLength, schema, path3, value);
  }
  if (IsDefined2(schema.maxLength) && !(value.length <= schema.maxLength)) {
    yield Create(ValueErrorType.StringMaxLength, schema, path3, value);
  }
  const regex = new RegExp(schema.source, schema.flags);
  if (!regex.test(value)) {
    return yield Create(ValueErrorType.RegExp, schema, path3, value);
  }
}
function* FromString3(schema, references, path3, value) {
  if (!IsString(value))
    return yield Create(ValueErrorType.String, schema, path3, value);
  if (IsDefined2(schema.minLength) && !(value.length >= schema.minLength)) {
    yield Create(ValueErrorType.StringMinLength, schema, path3, value);
  }
  if (IsDefined2(schema.maxLength) && !(value.length <= schema.maxLength)) {
    yield Create(ValueErrorType.StringMaxLength, schema, path3, value);
  }
  if (IsString(schema.pattern)) {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(value)) {
      yield Create(ValueErrorType.StringPattern, schema, path3, value);
    }
  }
  if (IsString(schema.format)) {
    if (!format_exports.Has(schema.format)) {
      yield Create(ValueErrorType.StringFormatUnknown, schema, path3, value);
    } else {
      const format = format_exports.Get(schema.format);
      if (!format(value)) {
        yield Create(ValueErrorType.StringFormat, schema, path3, value);
      }
    }
  }
}
function* FromSymbol3(schema, references, path3, value) {
  if (!IsSymbol(value))
    yield Create(ValueErrorType.Symbol, schema, path3, value);
}
function* FromTemplateLiteral4(schema, references, path3, value) {
  if (!IsString(value))
    return yield Create(ValueErrorType.String, schema, path3, value);
  const regex = new RegExp(schema.pattern);
  if (!regex.test(value)) {
    yield Create(ValueErrorType.StringPattern, schema, path3, value);
  }
}
function* FromThis2(schema, references, path3, value) {
  yield* Visit6(Deref(schema, references), references, path3, value);
}
function* FromTuple5(schema, references, path3, value) {
  if (!IsArray(value))
    return yield Create(ValueErrorType.Tuple, schema, path3, value);
  if (schema.items === void 0 && !(value.length === 0)) {
    return yield Create(ValueErrorType.TupleLength, schema, path3, value);
  }
  if (!(value.length === schema.maxItems)) {
    return yield Create(ValueErrorType.TupleLength, schema, path3, value);
  }
  if (!schema.items) {
    return;
  }
  for (let i = 0; i < schema.items.length; i++) {
    yield* Visit6(schema.items[i], references, `${path3}/${i}`, value[i]);
  }
}
function* FromUndefined3(schema, references, path3, value) {
  if (!IsUndefined(value))
    yield Create(ValueErrorType.Undefined, schema, path3, value);
}
function* FromUnion7(schema, references, path3, value) {
  if (Check(schema, references, value))
    return;
  const errors = schema.anyOf.map((variant) => new ValueErrorIterator(Visit6(variant, references, path3, value)));
  yield Create(ValueErrorType.Union, schema, path3, value, errors);
}
function* FromUint8Array3(schema, references, path3, value) {
  if (!IsUint8Array(value))
    return yield Create(ValueErrorType.Uint8Array, schema, path3, value);
  if (IsDefined2(schema.maxByteLength) && !(value.length <= schema.maxByteLength)) {
    yield Create(ValueErrorType.Uint8ArrayMaxByteLength, schema, path3, value);
  }
  if (IsDefined2(schema.minByteLength) && !(value.length >= schema.minByteLength)) {
    yield Create(ValueErrorType.Uint8ArrayMinByteLength, schema, path3, value);
  }
}
function* FromUnknown3(schema, references, path3, value) {
}
function* FromVoid3(schema, references, path3, value) {
  if (!TypeSystemPolicy.IsVoidLike(value))
    yield Create(ValueErrorType.Void, schema, path3, value);
}
function* FromKind2(schema, references, path3, value) {
  const check = type_exports.Get(schema[Kind]);
  if (!check(schema, value))
    yield Create(ValueErrorType.Kind, schema, path3, value);
}
function* Visit6(schema, references, path3, value) {
  const references_ = IsDefined2(schema.$id) ? [...references, schema] : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return yield* FromAny3(schema_, references_, path3, value);
    case "Argument":
      return yield* FromArgument2(schema_, references_, path3, value);
    case "Array":
      return yield* FromArray5(schema_, references_, path3, value);
    case "AsyncIterator":
      return yield* FromAsyncIterator3(schema_, references_, path3, value);
    case "BigInt":
      return yield* FromBigInt3(schema_, references_, path3, value);
    case "Boolean":
      return yield* FromBoolean3(schema_, references_, path3, value);
    case "Constructor":
      return yield* FromConstructor3(schema_, references_, path3, value);
    case "Date":
      return yield* FromDate3(schema_, references_, path3, value);
    case "Function":
      return yield* FromFunction3(schema_, references_, path3, value);
    case "Import":
      return yield* FromImport2(schema_, references_, path3, value);
    case "Integer":
      return yield* FromInteger3(schema_, references_, path3, value);
    case "Intersect":
      return yield* FromIntersect5(schema_, references_, path3, value);
    case "Iterator":
      return yield* FromIterator3(schema_, references_, path3, value);
    case "Literal":
      return yield* FromLiteral4(schema_, references_, path3, value);
    case "Never":
      return yield* FromNever3(schema_, references_, path3, value);
    case "Not":
      return yield* FromNot3(schema_, references_, path3, value);
    case "Null":
      return yield* FromNull3(schema_, references_, path3, value);
    case "Number":
      return yield* FromNumber3(schema_, references_, path3, value);
    case "Object":
      return yield* FromObject3(schema_, references_, path3, value);
    case "Promise":
      return yield* FromPromise3(schema_, references_, path3, value);
    case "Record":
      return yield* FromRecord3(schema_, references_, path3, value);
    case "Ref":
      return yield* FromRef3(schema_, references_, path3, value);
    case "RegExp":
      return yield* FromRegExp3(schema_, references_, path3, value);
    case "String":
      return yield* FromString3(schema_, references_, path3, value);
    case "Symbol":
      return yield* FromSymbol3(schema_, references_, path3, value);
    case "TemplateLiteral":
      return yield* FromTemplateLiteral4(schema_, references_, path3, value);
    case "This":
      return yield* FromThis2(schema_, references_, path3, value);
    case "Tuple":
      return yield* FromTuple5(schema_, references_, path3, value);
    case "Undefined":
      return yield* FromUndefined3(schema_, references_, path3, value);
    case "Union":
      return yield* FromUnion7(schema_, references_, path3, value);
    case "Uint8Array":
      return yield* FromUint8Array3(schema_, references_, path3, value);
    case "Unknown":
      return yield* FromUnknown3(schema_, references_, path3, value);
    case "Void":
      return yield* FromVoid3(schema_, references_, path3, value);
    default:
      if (!type_exports.Has(schema_[Kind]))
        throw new ValueErrorsUnknownTypeError(schema);
      return yield* FromKind2(schema_, references_, path3, value);
  }
}
function Errors(...args) {
  const iterator = args.length === 3 ? Visit6(args[0], args[1], "", args[2]) : Visit6(args[0], [], "", args[1]);
  return new ValueErrorIterator(iterator);
}

// node_modules/@sinclair/typebox/build/esm/value/assert/assert.mjs
var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AssertError_instances;
var _AssertError_iterator;
var _AssertError_Iterator;
var AssertError = class extends TypeBoxError {
  constructor(iterator) {
    const error = iterator.First();
    super(error === void 0 ? "Invalid Value" : error.message);
    _AssertError_instances.add(this);
    _AssertError_iterator.set(this, void 0);
    __classPrivateFieldSet(this, _AssertError_iterator, iterator, "f");
    this.error = error;
  }
  /** Returns an iterator for each error in this value. */
  Errors() {
    return new ValueErrorIterator(__classPrivateFieldGet(this, _AssertError_instances, "m", _AssertError_Iterator).call(this));
  }
};
_AssertError_iterator = /* @__PURE__ */ new WeakMap(), _AssertError_instances = /* @__PURE__ */ new WeakSet(), _AssertError_Iterator = function* _AssertError_Iterator2() {
  if (this.error)
    yield this.error;
  yield* __classPrivateFieldGet(this, _AssertError_iterator, "f");
};
function AssertValue(schema, references, value) {
  if (Check(schema, references, value))
    return;
  throw new AssertError(Errors(schema, references, value));
}
function Assert(...args) {
  return args.length === 3 ? AssertValue(args[0], args[1], args[2]) : AssertValue(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/value/clone/clone.mjs
function FromObject4(value) {
  const Acc = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    Acc[key] = Clone2(value[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    Acc[key] = Clone2(value[key]);
  }
  return Acc;
}
function FromArray6(value) {
  return value.map((element) => Clone2(element));
}
function FromTypedArray(value) {
  return value.slice();
}
function FromMap(value) {
  return new Map(Clone2([...value.entries()]));
}
function FromSet(value) {
  return new Set(Clone2([...value.entries()]));
}
function FromDate4(value) {
  return new Date(value.toISOString());
}
function FromValue(value) {
  return value;
}
function Clone2(value) {
  if (IsArray(value))
    return FromArray6(value);
  if (IsDate(value))
    return FromDate4(value);
  if (IsTypedArray(value))
    return FromTypedArray(value);
  if (IsMap(value))
    return FromMap(value);
  if (IsSet(value))
    return FromSet(value);
  if (IsObject(value))
    return FromObject4(value);
  if (IsValueType(value))
    return FromValue(value);
  throw new Error("ValueClone: Unable to clone value");
}

// node_modules/@sinclair/typebox/build/esm/value/create/create.mjs
var ValueCreateError = class extends TypeBoxError {
  constructor(schema, message) {
    super(message);
    this.schema = schema;
  }
};
function FromDefault(value) {
  return IsFunction(value) ? value() : Clone2(value);
}
function FromAny4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromArgument3(schema, references) {
  return {};
}
function FromArray7(schema, references) {
  if (schema.uniqueItems === true && !HasPropertyKey(schema, "default")) {
    throw new ValueCreateError(schema, "Array with the uniqueItems constraint requires a default value");
  } else if ("contains" in schema && !HasPropertyKey(schema, "default")) {
    throw new ValueCreateError(schema, "Array with the contains constraint requires a default value");
  } else if ("default" in schema) {
    return FromDefault(schema.default);
  } else if (schema.minItems !== void 0) {
    return Array.from({ length: schema.minItems }).map((item) => {
      return Visit7(schema.items, references);
    });
  } else {
    return [];
  }
}
function FromAsyncIterator4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return (async function* () {
    })();
  }
}
function FromBigInt4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return BigInt(0);
  }
}
function FromBoolean4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return false;
  }
}
function FromConstructor4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const value = Visit7(schema.returns, references);
    if (typeof value === "object" && !Array.isArray(value)) {
      return class {
        constructor() {
          for (const [key, val] of Object.entries(value)) {
            const self2 = this;
            self2[key] = val;
          }
        }
      };
    } else {
      return class {
      };
    }
  }
}
function FromDate5(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimumTimestamp !== void 0) {
    return new Date(schema.minimumTimestamp);
  } else {
    return /* @__PURE__ */ new Date();
  }
}
function FromFunction4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return () => Visit7(schema.returns, references);
  }
}
function FromImport3(schema, references) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit7(target, [...references, ...definitions]);
}
function FromInteger4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimum !== void 0) {
    return schema.minimum;
  } else {
    return 0;
  }
}
function FromIntersect6(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const value = schema.allOf.reduce((acc, schema2) => {
      const next = Visit7(schema2, references);
      return typeof next === "object" ? { ...acc, ...next } : next;
    }, {});
    if (!Check(schema, references, value))
      throw new ValueCreateError(schema, "Intersect produced invalid value. Consider using a default value.");
    return value;
  }
}
function FromIterator4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return (function* () {
    })();
  }
}
function FromLiteral5(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return schema.const;
  }
}
function FromNever4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "Never types cannot be created. Consider using a default value.");
  }
}
function FromNot4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "Not types must have a default value");
  }
}
function FromNull4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return null;
  }
}
function FromNumber4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimum !== void 0) {
    return schema.minimum;
  } else {
    return 0;
  }
}
function FromObject5(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const required = new Set(schema.required);
    const Acc = {};
    for (const [key, subschema] of Object.entries(schema.properties)) {
      if (!required.has(key))
        continue;
      Acc[key] = Visit7(subschema, references);
    }
    return Acc;
  }
}
function FromPromise4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Promise.resolve(Visit7(schema.item, references));
  }
}
function FromRecord4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromRef4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Visit7(Deref(schema, references), references);
  }
}
function FromRegExp4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "RegExp types cannot be created. Consider using a default value.");
  }
}
function FromString4(schema, references) {
  if (schema.pattern !== void 0) {
    if (!HasPropertyKey(schema, "default")) {
      throw new ValueCreateError(schema, "String types with patterns must specify a default value");
    } else {
      return FromDefault(schema.default);
    }
  } else if (schema.format !== void 0) {
    if (!HasPropertyKey(schema, "default")) {
      throw new ValueCreateError(schema, "String types with formats must specify a default value");
    } else {
      return FromDefault(schema.default);
    }
  } else {
    if (HasPropertyKey(schema, "default")) {
      return FromDefault(schema.default);
    } else if (schema.minLength !== void 0) {
      return Array.from({ length: schema.minLength }).map(() => " ").join("");
    } else {
      return "";
    }
  }
}
function FromSymbol4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if ("value" in schema) {
    return Symbol.for(schema.value);
  } else {
    return Symbol();
  }
}
function FromTemplateLiteral5(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  }
  if (!IsTemplateLiteralFinite(schema))
    throw new ValueCreateError(schema, "Can only create template literals that produce a finite variants. Consider using a default value.");
  const generated = TemplateLiteralGenerate(schema);
  return generated[0];
}
function FromThis3(schema, references) {
  if (recursiveDepth++ > recursiveMaxDepth)
    throw new ValueCreateError(schema, "Cannot create recursive type as it appears possibly infinite. Consider using a default.");
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Visit7(Deref(schema, references), references);
  }
}
function FromTuple6(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  }
  if (schema.items === void 0) {
    return [];
  } else {
    return Array.from({ length: schema.minItems }).map((_, index) => Visit7(schema.items[index], references));
  }
}
function FromUndefined4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return void 0;
  }
}
function FromUnion8(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.anyOf.length === 0) {
    throw new Error("ValueCreate.Union: Cannot create Union with zero variants");
  } else {
    return Visit7(schema.anyOf[0], references);
  }
}
function FromUint8Array4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minByteLength !== void 0) {
    return new Uint8Array(schema.minByteLength);
  } else {
    return new Uint8Array(0);
  }
}
function FromUnknown4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromVoid4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return void 0;
  }
}
function FromKind3(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new Error("User defined types must specify a default value");
  }
}
function Visit7(schema, references) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return FromAny4(schema_, references_);
    case "Argument":
      return FromArgument3(schema_, references_);
    case "Array":
      return FromArray7(schema_, references_);
    case "AsyncIterator":
      return FromAsyncIterator4(schema_, references_);
    case "BigInt":
      return FromBigInt4(schema_, references_);
    case "Boolean":
      return FromBoolean4(schema_, references_);
    case "Constructor":
      return FromConstructor4(schema_, references_);
    case "Date":
      return FromDate5(schema_, references_);
    case "Function":
      return FromFunction4(schema_, references_);
    case "Import":
      return FromImport3(schema_, references_);
    case "Integer":
      return FromInteger4(schema_, references_);
    case "Intersect":
      return FromIntersect6(schema_, references_);
    case "Iterator":
      return FromIterator4(schema_, references_);
    case "Literal":
      return FromLiteral5(schema_, references_);
    case "Never":
      return FromNever4(schema_, references_);
    case "Not":
      return FromNot4(schema_, references_);
    case "Null":
      return FromNull4(schema_, references_);
    case "Number":
      return FromNumber4(schema_, references_);
    case "Object":
      return FromObject5(schema_, references_);
    case "Promise":
      return FromPromise4(schema_, references_);
    case "Record":
      return FromRecord4(schema_, references_);
    case "Ref":
      return FromRef4(schema_, references_);
    case "RegExp":
      return FromRegExp4(schema_, references_);
    case "String":
      return FromString4(schema_, references_);
    case "Symbol":
      return FromSymbol4(schema_, references_);
    case "TemplateLiteral":
      return FromTemplateLiteral5(schema_, references_);
    case "This":
      return FromThis3(schema_, references_);
    case "Tuple":
      return FromTuple6(schema_, references_);
    case "Undefined":
      return FromUndefined4(schema_, references_);
    case "Union":
      return FromUnion8(schema_, references_);
    case "Uint8Array":
      return FromUint8Array4(schema_, references_);
    case "Unknown":
      return FromUnknown4(schema_, references_);
    case "Void":
      return FromVoid4(schema_, references_);
    default:
      if (!type_exports.Has(schema_[Kind]))
        throw new ValueCreateError(schema_, "Unknown type");
      return FromKind3(schema_, references_);
  }
}
var recursiveMaxDepth = 512;
var recursiveDepth = 0;
function Create2(...args) {
  recursiveDepth = 0;
  return args.length === 2 ? Visit7(args[0], args[1]) : Visit7(args[0], []);
}

// node_modules/@sinclair/typebox/build/esm/value/cast/cast.mjs
var ValueCastError = class extends TypeBoxError {
  constructor(schema, message) {
    super(message);
    this.schema = schema;
  }
};
function ScoreUnion(schema, references, value) {
  if (schema[Kind] === "Object" && typeof value === "object" && !IsNull(value)) {
    const object = schema;
    const keys = Object.getOwnPropertyNames(value);
    const entries = Object.entries(object.properties);
    return entries.reduce((acc, [key, schema2]) => {
      const literal = schema2[Kind] === "Literal" && schema2.const === value[key] ? 100 : 0;
      const checks = Check(schema2, references, value[key]) ? 10 : 0;
      const exists = keys.includes(key) ? 1 : 0;
      return acc + (literal + checks + exists);
    }, 0);
  } else if (schema[Kind] === "Union") {
    const schemas = schema.anyOf.map((schema2) => Deref(schema2, references));
    const scores = schemas.map((schema2) => ScoreUnion(schema2, references, value));
    return Math.max(...scores);
  } else {
    return Check(schema, references, value) ? 1 : 0;
  }
}
function SelectUnion(union, references, value) {
  const schemas = union.anyOf.map((schema) => Deref(schema, references));
  let [select, best] = [schemas[0], 0];
  for (const schema of schemas) {
    const score = ScoreUnion(schema, references, value);
    if (score > best) {
      select = schema;
      best = score;
    }
  }
  return select;
}
function CastUnion(union, references, value) {
  if ("default" in union) {
    return typeof value === "function" ? union.default : Clone2(union.default);
  } else {
    const schema = SelectUnion(union, references, value);
    return Cast(schema, references, value);
  }
}
function DefaultClone(schema, references, value) {
  return Check(schema, references, value) ? Clone2(value) : Create2(schema, references);
}
function Default(schema, references, value) {
  return Check(schema, references, value) ? value : Create2(schema, references);
}
function FromArray8(schema, references, value) {
  if (Check(schema, references, value))
    return Clone2(value);
  const created = IsArray(value) ? Clone2(value) : Create2(schema, references);
  const minimum = IsNumber(schema.minItems) && created.length < schema.minItems ? [...created, ...Array.from({ length: schema.minItems - created.length }, () => null)] : created;
  const maximum = IsNumber(schema.maxItems) && minimum.length > schema.maxItems ? minimum.slice(0, schema.maxItems) : minimum;
  const casted = maximum.map((value2) => Visit8(schema.items, references, value2));
  if (schema.uniqueItems !== true)
    return casted;
  const unique = [...new Set(casted)];
  if (!Check(schema, references, unique))
    throw new ValueCastError(schema, "Array cast produced invalid data due to uniqueItems constraint");
  return unique;
}
function FromConstructor5(schema, references, value) {
  if (Check(schema, references, value))
    return Create2(schema, references);
  const required = new Set(schema.returns.required || []);
  const result2 = function() {
  };
  for (const [key, property] of Object.entries(schema.returns.properties)) {
    if (!required.has(key) && value.prototype[key] === void 0)
      continue;
    result2.prototype[key] = Visit8(property, references, value.prototype[key]);
  }
  return result2;
}
function FromImport4(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit8(target, [...references, ...definitions], value);
}
function IntersectAssign(correct, value) {
  if (IsObject(correct) && !IsObject(value) || !IsObject(correct) && IsObject(value))
    return correct;
  if (!IsObject(correct) || !IsObject(value))
    return value;
  return globalThis.Object.getOwnPropertyNames(correct).reduce((result2, key) => {
    const property = key in value ? IntersectAssign(correct[key], value[key]) : correct[key];
    return { ...result2, [key]: property };
  }, {});
}
function FromIntersect7(schema, references, value) {
  if (Check(schema, references, value))
    return value;
  const correct = Create2(schema, references);
  const assigned = IntersectAssign(correct, value);
  return Check(schema, references, assigned) ? assigned : correct;
}
function FromNever5(schema, references, value) {
  throw new ValueCastError(schema, "Never types cannot be cast");
}
function FromObject6(schema, references, value) {
  if (Check(schema, references, value))
    return value;
  if (value === null || typeof value !== "object")
    return Create2(schema, references);
  const required = new Set(schema.required || []);
  const result2 = {};
  for (const [key, property] of Object.entries(schema.properties)) {
    if (!required.has(key) && value[key] === void 0)
      continue;
    result2[key] = Visit8(property, references, value[key]);
  }
  if (typeof schema.additionalProperties === "object") {
    const propertyNames = Object.getOwnPropertyNames(schema.properties);
    for (const propertyName of Object.getOwnPropertyNames(value)) {
      if (propertyNames.includes(propertyName))
        continue;
      result2[propertyName] = Visit8(schema.additionalProperties, references, value[propertyName]);
    }
  }
  return result2;
}
function FromRecord5(schema, references, value) {
  if (Check(schema, references, value))
    return Clone2(value);
  if (value === null || typeof value !== "object" || Array.isArray(value) || value instanceof Date)
    return Create2(schema, references);
  const subschemaPropertyName = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const subschema = schema.patternProperties[subschemaPropertyName];
  const result2 = {};
  for (const [propKey, propValue] of Object.entries(value)) {
    result2[propKey] = Visit8(subschema, references, propValue);
  }
  return result2;
}
function FromRef5(schema, references, value) {
  return Visit8(Deref(schema, references), references, value);
}
function FromThis4(schema, references, value) {
  return Visit8(Deref(schema, references), references, value);
}
function FromTuple7(schema, references, value) {
  if (Check(schema, references, value))
    return Clone2(value);
  if (!IsArray(value))
    return Create2(schema, references);
  if (schema.items === void 0)
    return [];
  return schema.items.map((schema2, index) => Visit8(schema2, references, value[index]));
}
function FromUnion9(schema, references, value) {
  return Check(schema, references, value) ? Clone2(value) : CastUnion(schema, references, value);
}
function Visit8(schema, references, value) {
  const references_ = IsString(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema[Kind]) {
    // --------------------------------------------------------------
    // Structural
    // --------------------------------------------------------------
    case "Array":
      return FromArray8(schema_, references_, value);
    case "Constructor":
      return FromConstructor5(schema_, references_, value);
    case "Import":
      return FromImport4(schema_, references_, value);
    case "Intersect":
      return FromIntersect7(schema_, references_, value);
    case "Never":
      return FromNever5(schema_, references_, value);
    case "Object":
      return FromObject6(schema_, references_, value);
    case "Record":
      return FromRecord5(schema_, references_, value);
    case "Ref":
      return FromRef5(schema_, references_, value);
    case "This":
      return FromThis4(schema_, references_, value);
    case "Tuple":
      return FromTuple7(schema_, references_, value);
    case "Union":
      return FromUnion9(schema_, references_, value);
    // --------------------------------------------------------------
    // DefaultClone
    // --------------------------------------------------------------
    case "Date":
    case "Symbol":
    case "Uint8Array":
      return DefaultClone(schema, references, value);
    // --------------------------------------------------------------
    // Default
    // --------------------------------------------------------------
    default:
      return Default(schema_, references_, value);
  }
}
function Cast(...args) {
  return args.length === 3 ? Visit8(args[0], args[1], args[2]) : Visit8(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/value/clean/clean.mjs
function IsCheckable(schema) {
  return IsKind(schema) && schema[Kind] !== "Unsafe";
}
function FromArray9(schema, references, value) {
  if (!IsArray(value))
    return value;
  return value.map((value2) => Visit9(schema.items, references, value2));
}
function FromImport5(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit9(target, [...references, ...definitions], value);
}
function FromIntersect8(schema, references, value) {
  const unevaluatedProperties = schema.unevaluatedProperties;
  const intersections = schema.allOf.map((schema2) => Visit9(schema2, references, Clone2(value)));
  const composite = intersections.reduce((acc, value2) => IsObject(value2) ? { ...acc, ...value2 } : value2, {});
  if (!IsObject(value) || !IsObject(composite) || !IsKind(unevaluatedProperties))
    return composite;
  const knownkeys = KeyOfPropertyKeys(schema);
  for (const key of Object.getOwnPropertyNames(value)) {
    if (knownkeys.includes(key))
      continue;
    if (Check(unevaluatedProperties, references, value[key])) {
      composite[key] = Visit9(unevaluatedProperties, references, value[key]);
    }
  }
  return composite;
}
function FromObject7(schema, references, value) {
  if (!IsObject(value) || IsArray(value))
    return value;
  const additionalProperties = schema.additionalProperties;
  for (const key of Object.getOwnPropertyNames(value)) {
    if (HasPropertyKey(schema.properties, key)) {
      value[key] = Visit9(schema.properties[key], references, value[key]);
      continue;
    }
    if (IsKind(additionalProperties) && Check(additionalProperties, references, value[key])) {
      value[key] = Visit9(additionalProperties, references, value[key]);
      continue;
    }
    delete value[key];
  }
  return value;
}
function FromRecord6(schema, references, value) {
  if (!IsObject(value))
    return value;
  const additionalProperties = schema.additionalProperties;
  const propertyKeys = Object.getOwnPropertyNames(value);
  const [propertyKey, propertySchema] = Object.entries(schema.patternProperties)[0];
  const propertyKeyTest = new RegExp(propertyKey);
  for (const key of propertyKeys) {
    if (propertyKeyTest.test(key)) {
      value[key] = Visit9(propertySchema, references, value[key]);
      continue;
    }
    if (IsKind(additionalProperties) && Check(additionalProperties, references, value[key])) {
      value[key] = Visit9(additionalProperties, references, value[key]);
      continue;
    }
    delete value[key];
  }
  return value;
}
function FromRef6(schema, references, value) {
  return Visit9(Deref(schema, references), references, value);
}
function FromThis5(schema, references, value) {
  return Visit9(Deref(schema, references), references, value);
}
function FromTuple8(schema, references, value) {
  if (!IsArray(value))
    return value;
  if (IsUndefined(schema.items))
    return [];
  const length = Math.min(value.length, schema.items.length);
  for (let i = 0; i < length; i++) {
    value[i] = Visit9(schema.items[i], references, value[i]);
  }
  return value.length > length ? value.slice(0, length) : value;
}
function FromUnion10(schema, references, value) {
  for (const inner of schema.anyOf) {
    if (IsCheckable(inner) && Check(inner, references, value)) {
      return Visit9(inner, references, value);
    }
  }
  return value;
}
function Visit9(schema, references, value) {
  const references_ = IsString(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Array":
      return FromArray9(schema_, references_, value);
    case "Import":
      return FromImport5(schema_, references_, value);
    case "Intersect":
      return FromIntersect8(schema_, references_, value);
    case "Object":
      return FromObject7(schema_, references_, value);
    case "Record":
      return FromRecord6(schema_, references_, value);
    case "Ref":
      return FromRef6(schema_, references_, value);
    case "This":
      return FromThis5(schema_, references_, value);
    case "Tuple":
      return FromTuple8(schema_, references_, value);
    case "Union":
      return FromUnion10(schema_, references_, value);
    default:
      return value;
  }
}
function Clean(...args) {
  return args.length === 3 ? Visit9(args[0], args[1], args[2]) : Visit9(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/value/convert/convert.mjs
function IsStringNumeric(value) {
  return IsString(value) && !isNaN(value) && !isNaN(parseFloat(value));
}
function IsValueToString(value) {
  return IsBigInt(value) || IsBoolean(value) || IsNumber(value);
}
function IsValueTrue(value) {
  return value === true || IsNumber(value) && value === 1 || IsBigInt(value) && value === BigInt("1") || IsString(value) && (value.toLowerCase() === "true" || value === "1");
}
function IsValueFalse(value) {
  return value === false || IsNumber(value) && (value === 0 || Object.is(value, -0)) || IsBigInt(value) && value === BigInt("0") || IsString(value) && (value.toLowerCase() === "false" || value === "0" || value === "-0");
}
function IsTimeStringWithTimeZone(value) {
  return IsString(value) && /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value);
}
function IsTimeStringWithoutTimeZone(value) {
  return IsString(value) && /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)?$/i.test(value);
}
function IsDateTimeStringWithTimeZone(value) {
  return IsString(value) && /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value);
}
function IsDateTimeStringWithoutTimeZone(value) {
  return IsString(value) && /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)?$/i.test(value);
}
function IsDateString(value) {
  return IsString(value) && /^\d\d\d\d-[0-1]\d-[0-3]\d$/i.test(value);
}
function TryConvertLiteralString(value, target) {
  const conversion = TryConvertString(value);
  return conversion === target ? conversion : value;
}
function TryConvertLiteralNumber(value, target) {
  const conversion = TryConvertNumber(value);
  return conversion === target ? conversion : value;
}
function TryConvertLiteralBoolean(value, target) {
  const conversion = TryConvertBoolean(value);
  return conversion === target ? conversion : value;
}
function TryConvertLiteral(schema, value) {
  return IsString(schema.const) ? TryConvertLiteralString(value, schema.const) : IsNumber(schema.const) ? TryConvertLiteralNumber(value, schema.const) : IsBoolean(schema.const) ? TryConvertLiteralBoolean(value, schema.const) : value;
}
function TryConvertBoolean(value) {
  return IsValueTrue(value) ? true : IsValueFalse(value) ? false : value;
}
function TryConvertBigInt(value) {
  const truncateInteger = (value2) => value2.split(".")[0];
  return IsStringNumeric(value) ? BigInt(truncateInteger(value)) : IsNumber(value) ? BigInt(Math.trunc(value)) : IsValueFalse(value) ? BigInt(0) : IsValueTrue(value) ? BigInt(1) : value;
}
function TryConvertString(value) {
  return IsSymbol(value) && value.description !== void 0 ? value.description.toString() : IsValueToString(value) ? value.toString() : value;
}
function TryConvertNumber(value) {
  return IsStringNumeric(value) ? parseFloat(value) : IsValueTrue(value) ? 1 : IsValueFalse(value) ? 0 : value;
}
function TryConvertInteger(value) {
  return IsStringNumeric(value) ? parseInt(value) : IsNumber(value) ? Math.trunc(value) : IsValueTrue(value) ? 1 : IsValueFalse(value) ? 0 : value;
}
function TryConvertNull(value) {
  return IsString(value) && value.toLowerCase() === "null" ? null : value;
}
function TryConvertUndefined(value) {
  return IsString(value) && value === "undefined" ? void 0 : value;
}
function TryConvertDate(value) {
  return IsDate(value) ? value : IsNumber(value) ? new Date(value) : IsValueTrue(value) ? /* @__PURE__ */ new Date(1) : IsValueFalse(value) ? /* @__PURE__ */ new Date(0) : IsStringNumeric(value) ? new Date(parseInt(value)) : IsTimeStringWithoutTimeZone(value) ? /* @__PURE__ */ new Date(`1970-01-01T${value}.000Z`) : IsTimeStringWithTimeZone(value) ? /* @__PURE__ */ new Date(`1970-01-01T${value}`) : IsDateTimeStringWithoutTimeZone(value) ? /* @__PURE__ */ new Date(`${value}.000Z`) : IsDateTimeStringWithTimeZone(value) ? new Date(value) : IsDateString(value) ? /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`) : value;
}
function Default2(value) {
  return value;
}
function FromArray10(schema, references, value) {
  const elements = IsArray(value) ? value : [value];
  return elements.map((element) => Visit10(schema.items, references, element));
}
function FromBigInt5(schema, references, value) {
  return TryConvertBigInt(value);
}
function FromBoolean5(schema, references, value) {
  return TryConvertBoolean(value);
}
function FromDate6(schema, references, value) {
  return TryConvertDate(value);
}
function FromImport6(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit10(target, [...references, ...definitions], value);
}
function FromInteger5(schema, references, value) {
  return TryConvertInteger(value);
}
function FromIntersect9(schema, references, value) {
  return schema.allOf.reduce((value2, schema2) => Visit10(schema2, references, value2), value);
}
function FromLiteral6(schema, references, value) {
  return TryConvertLiteral(schema, value);
}
function FromNull5(schema, references, value) {
  return TryConvertNull(value);
}
function FromNumber5(schema, references, value) {
  return TryConvertNumber(value);
}
function FromObject8(schema, references, value) {
  if (!IsObject(value) || IsArray(value))
    return value;
  for (const propertyKey of Object.getOwnPropertyNames(schema.properties)) {
    if (!HasPropertyKey(value, propertyKey))
      continue;
    value[propertyKey] = Visit10(schema.properties[propertyKey], references, value[propertyKey]);
  }
  return value;
}
function FromRecord7(schema, references, value) {
  const isConvertable = IsObject(value) && !IsArray(value);
  if (!isConvertable)
    return value;
  const propertyKey = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const property = schema.patternProperties[propertyKey];
  for (const [propKey, propValue] of Object.entries(value)) {
    value[propKey] = Visit10(property, references, propValue);
  }
  return value;
}
function FromRef7(schema, references, value) {
  return Visit10(Deref(schema, references), references, value);
}
function FromString5(schema, references, value) {
  return TryConvertString(value);
}
function FromSymbol5(schema, references, value) {
  return IsString(value) || IsNumber(value) ? Symbol(value) : value;
}
function FromThis6(schema, references, value) {
  return Visit10(Deref(schema, references), references, value);
}
function FromTuple9(schema, references, value) {
  const isConvertable = IsArray(value) && !IsUndefined(schema.items);
  if (!isConvertable)
    return value;
  return value.map((value2, index) => {
    return index < schema.items.length ? Visit10(schema.items[index], references, value2) : value2;
  });
}
function FromUndefined5(schema, references, value) {
  return TryConvertUndefined(value);
}
function FromUnion11(schema, references, value) {
  for (const subschema of schema.anyOf) {
    if (Check(subschema, references, value)) {
      return value;
    }
  }
  for (const subschema of schema.anyOf) {
    const converted = Visit10(subschema, references, Clone2(value));
    if (!Check(subschema, references, converted))
      continue;
    return converted;
  }
  return value;
}
function Visit10(schema, references, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray10(schema_, references_, value);
    case "BigInt":
      return FromBigInt5(schema_, references_, value);
    case "Boolean":
      return FromBoolean5(schema_, references_, value);
    case "Date":
      return FromDate6(schema_, references_, value);
    case "Import":
      return FromImport6(schema_, references_, value);
    case "Integer":
      return FromInteger5(schema_, references_, value);
    case "Intersect":
      return FromIntersect9(schema_, references_, value);
    case "Literal":
      return FromLiteral6(schema_, references_, value);
    case "Null":
      return FromNull5(schema_, references_, value);
    case "Number":
      return FromNumber5(schema_, references_, value);
    case "Object":
      return FromObject8(schema_, references_, value);
    case "Record":
      return FromRecord7(schema_, references_, value);
    case "Ref":
      return FromRef7(schema_, references_, value);
    case "String":
      return FromString5(schema_, references_, value);
    case "Symbol":
      return FromSymbol5(schema_, references_, value);
    case "This":
      return FromThis6(schema_, references_, value);
    case "Tuple":
      return FromTuple9(schema_, references_, value);
    case "Undefined":
      return FromUndefined5(schema_, references_, value);
    case "Union":
      return FromUnion11(schema_, references_, value);
    default:
      return Default2(value);
  }
}
function Convert(...args) {
  return args.length === 3 ? Visit10(args[0], args[1], args[2]) : Visit10(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/value/transform/decode.mjs
var TransformDecodeCheckError = class extends TypeBoxError {
  constructor(schema, value, error) {
    super(`Unable to decode value as it does not match the expected schema`);
    this.schema = schema;
    this.value = value;
    this.error = error;
  }
};
var TransformDecodeError = class extends TypeBoxError {
  constructor(schema, path3, value, error) {
    super(error instanceof Error ? error.message : "Unknown error");
    this.schema = schema;
    this.path = path3;
    this.value = value;
    this.error = error;
  }
};
function Default3(schema, path3, value) {
  try {
    return IsTransform(schema) ? schema[TransformKind].Decode(value) : value;
  } catch (error) {
    throw new TransformDecodeError(schema, path3, value, error);
  }
}
function FromArray11(schema, references, path3, value) {
  return IsArray(value) ? Default3(schema, path3, value.map((value2, index) => Visit11(schema.items, references, `${path3}/${index}`, value2))) : Default3(schema, path3, value);
}
function FromIntersect10(schema, references, path3, value) {
  if (!IsObject(value) || IsValueType(value))
    return Default3(schema, path3, value);
  const knownEntries = KeyOfPropertyEntries(schema);
  const knownKeys = knownEntries.map((entry) => entry[0]);
  const knownProperties = { ...value };
  for (const [knownKey, knownSchema] of knownEntries)
    if (knownKey in knownProperties) {
      knownProperties[knownKey] = Visit11(knownSchema, references, `${path3}/${knownKey}`, knownProperties[knownKey]);
    }
  if (!IsTransform(schema.unevaluatedProperties)) {
    return Default3(schema, path3, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const unevaluatedProperties = schema.unevaluatedProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      unknownProperties[key] = Default3(unevaluatedProperties, `${path3}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path3, unknownProperties);
}
function FromImport7(schema, references, path3, value) {
  const additional = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  const result2 = Visit11(target, [...references, ...additional], path3, value);
  return Default3(schema, path3, result2);
}
function FromNot5(schema, references, path3, value) {
  return Default3(schema, path3, Visit11(schema.not, references, path3, value));
}
function FromObject9(schema, references, path3, value) {
  if (!IsObject(value))
    return Default3(schema, path3, value);
  const knownKeys = KeyOfPropertyKeys(schema);
  const knownProperties = { ...value };
  for (const key of knownKeys) {
    if (!HasPropertyKey(knownProperties, key))
      continue;
    if (IsUndefined(knownProperties[key]) && (!IsUndefined3(schema.properties[key]) || TypeSystemPolicy.IsExactOptionalProperty(knownProperties, key)))
      continue;
    knownProperties[key] = Visit11(schema.properties[key], references, `${path3}/${key}`, knownProperties[key]);
  }
  if (!IsSchema(schema.additionalProperties)) {
    return Default3(schema, path3, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      unknownProperties[key] = Default3(additionalProperties, `${path3}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path3, unknownProperties);
}
function FromRecord8(schema, references, path3, value) {
  if (!IsObject(value))
    return Default3(schema, path3, value);
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const knownKeys = new RegExp(pattern);
  const knownProperties = { ...value };
  for (const key of Object.getOwnPropertyNames(value))
    if (knownKeys.test(key)) {
      knownProperties[key] = Visit11(schema.patternProperties[pattern], references, `${path3}/${key}`, knownProperties[key]);
    }
  if (!IsSchema(schema.additionalProperties)) {
    return Default3(schema, path3, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.test(key)) {
      unknownProperties[key] = Default3(additionalProperties, `${path3}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path3, unknownProperties);
}
function FromRef8(schema, references, path3, value) {
  const target = Deref(schema, references);
  return Default3(schema, path3, Visit11(target, references, path3, value));
}
function FromThis7(schema, references, path3, value) {
  const target = Deref(schema, references);
  return Default3(schema, path3, Visit11(target, references, path3, value));
}
function FromTuple10(schema, references, path3, value) {
  return IsArray(value) && IsArray(schema.items) ? Default3(schema, path3, schema.items.map((schema2, index) => Visit11(schema2, references, `${path3}/${index}`, value[index]))) : Default3(schema, path3, value);
}
function FromUnion12(schema, references, path3, value) {
  for (const subschema of schema.anyOf) {
    if (!Check(subschema, references, value))
      continue;
    const decoded = Visit11(subschema, references, path3, value);
    return Default3(schema, path3, decoded);
  }
  return Default3(schema, path3, value);
}
function Visit11(schema, references, path3, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray11(schema_, references_, path3, value);
    case "Import":
      return FromImport7(schema_, references_, path3, value);
    case "Intersect":
      return FromIntersect10(schema_, references_, path3, value);
    case "Not":
      return FromNot5(schema_, references_, path3, value);
    case "Object":
      return FromObject9(schema_, references_, path3, value);
    case "Record":
      return FromRecord8(schema_, references_, path3, value);
    case "Ref":
      return FromRef8(schema_, references_, path3, value);
    case "Symbol":
      return Default3(schema_, path3, value);
    case "This":
      return FromThis7(schema_, references_, path3, value);
    case "Tuple":
      return FromTuple10(schema_, references_, path3, value);
    case "Union":
      return FromUnion12(schema_, references_, path3, value);
    default:
      return Default3(schema_, path3, value);
  }
}
function TransformDecode(schema, references, value) {
  return Visit11(schema, references, "", value);
}

// node_modules/@sinclair/typebox/build/esm/value/transform/encode.mjs
var TransformEncodeCheckError = class extends TypeBoxError {
  constructor(schema, value, error) {
    super(`The encoded value does not match the expected schema`);
    this.schema = schema;
    this.value = value;
    this.error = error;
  }
};
var TransformEncodeError = class extends TypeBoxError {
  constructor(schema, path3, value, error) {
    super(`${error instanceof Error ? error.message : "Unknown error"}`);
    this.schema = schema;
    this.path = path3;
    this.value = value;
    this.error = error;
  }
};
function Default4(schema, path3, value) {
  try {
    return IsTransform(schema) ? schema[TransformKind].Encode(value) : value;
  } catch (error) {
    throw new TransformEncodeError(schema, path3, value, error);
  }
}
function FromArray12(schema, references, path3, value) {
  const defaulted = Default4(schema, path3, value);
  return IsArray(defaulted) ? defaulted.map((value2, index) => Visit12(schema.items, references, `${path3}/${index}`, value2)) : defaulted;
}
function FromImport8(schema, references, path3, value) {
  const additional = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  const result2 = Default4(schema, path3, value);
  return Visit12(target, [...references, ...additional], path3, result2);
}
function FromIntersect11(schema, references, path3, value) {
  const defaulted = Default4(schema, path3, value);
  if (!IsObject(value) || IsValueType(value))
    return defaulted;
  const knownEntries = KeyOfPropertyEntries(schema);
  const knownKeys = knownEntries.map((entry) => entry[0]);
  const knownProperties = { ...defaulted };
  for (const [knownKey, knownSchema] of knownEntries)
    if (knownKey in knownProperties) {
      knownProperties[knownKey] = Visit12(knownSchema, references, `${path3}/${knownKey}`, knownProperties[knownKey]);
    }
  if (!IsTransform(schema.unevaluatedProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const unevaluatedProperties = schema.unevaluatedProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      properties[key] = Default4(unevaluatedProperties, `${path3}/${key}`, properties[key]);
    }
  return properties;
}
function FromNot6(schema, references, path3, value) {
  return Default4(schema.not, path3, Default4(schema, path3, value));
}
function FromObject10(schema, references, path3, value) {
  const defaulted = Default4(schema, path3, value);
  if (!IsObject(defaulted))
    return defaulted;
  const knownKeys = KeyOfPropertyKeys(schema);
  const knownProperties = { ...defaulted };
  for (const key of knownKeys) {
    if (!HasPropertyKey(knownProperties, key))
      continue;
    if (IsUndefined(knownProperties[key]) && (!IsUndefined3(schema.properties[key]) || TypeSystemPolicy.IsExactOptionalProperty(knownProperties, key)))
      continue;
    knownProperties[key] = Visit12(schema.properties[key], references, `${path3}/${key}`, knownProperties[key]);
  }
  if (!IsSchema(schema.additionalProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      properties[key] = Default4(additionalProperties, `${path3}/${key}`, properties[key]);
    }
  return properties;
}
function FromRecord9(schema, references, path3, value) {
  const defaulted = Default4(schema, path3, value);
  if (!IsObject(value))
    return defaulted;
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const knownKeys = new RegExp(pattern);
  const knownProperties = { ...defaulted };
  for (const key of Object.getOwnPropertyNames(value))
    if (knownKeys.test(key)) {
      knownProperties[key] = Visit12(schema.patternProperties[pattern], references, `${path3}/${key}`, knownProperties[key]);
    }
  if (!IsSchema(schema.additionalProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.test(key)) {
      properties[key] = Default4(additionalProperties, `${path3}/${key}`, properties[key]);
    }
  return properties;
}
function FromRef9(schema, references, path3, value) {
  const target = Deref(schema, references);
  const resolved = Visit12(target, references, path3, value);
  return Default4(schema, path3, resolved);
}
function FromThis8(schema, references, path3, value) {
  const target = Deref(schema, references);
  const resolved = Visit12(target, references, path3, value);
  return Default4(schema, path3, resolved);
}
function FromTuple11(schema, references, path3, value) {
  const value1 = Default4(schema, path3, value);
  return IsArray(schema.items) ? schema.items.map((schema2, index) => Visit12(schema2, references, `${path3}/${index}`, value1[index])) : [];
}
function FromUnion13(schema, references, path3, value) {
  for (const subschema of schema.anyOf) {
    if (!Check(subschema, references, value))
      continue;
    const value1 = Visit12(subschema, references, path3, value);
    return Default4(schema, path3, value1);
  }
  for (const subschema of schema.anyOf) {
    const value1 = Visit12(subschema, references, path3, value);
    if (!Check(schema, references, value1))
      continue;
    return Default4(schema, path3, value1);
  }
  return Default4(schema, path3, value);
}
function Visit12(schema, references, path3, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray12(schema_, references_, path3, value);
    case "Import":
      return FromImport8(schema_, references_, path3, value);
    case "Intersect":
      return FromIntersect11(schema_, references_, path3, value);
    case "Not":
      return FromNot6(schema_, references_, path3, value);
    case "Object":
      return FromObject10(schema_, references_, path3, value);
    case "Record":
      return FromRecord9(schema_, references_, path3, value);
    case "Ref":
      return FromRef9(schema_, references_, path3, value);
    case "This":
      return FromThis8(schema_, references_, path3, value);
    case "Tuple":
      return FromTuple11(schema_, references_, path3, value);
    case "Union":
      return FromUnion13(schema_, references_, path3, value);
    default:
      return Default4(schema_, path3, value);
  }
}
function TransformEncode(schema, references, value) {
  return Visit12(schema, references, "", value);
}

// node_modules/@sinclair/typebox/build/esm/value/transform/has.mjs
function FromArray13(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromAsyncIterator5(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromConstructor6(schema, references) {
  return IsTransform(schema) || Visit13(schema.returns, references) || schema.parameters.some((schema2) => Visit13(schema2, references));
}
function FromFunction5(schema, references) {
  return IsTransform(schema) || Visit13(schema.returns, references) || schema.parameters.some((schema2) => Visit13(schema2, references));
}
function FromIntersect12(schema, references) {
  return IsTransform(schema) || IsTransform(schema.unevaluatedProperties) || schema.allOf.some((schema2) => Visit13(schema2, references));
}
function FromImport9(schema, references) {
  const additional = globalThis.Object.getOwnPropertyNames(schema.$defs).reduce((result2, key) => [...result2, schema.$defs[key]], []);
  const target = schema.$defs[schema.$ref];
  return IsTransform(schema) || Visit13(target, [...additional, ...references]);
}
function FromIterator5(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromNot7(schema, references) {
  return IsTransform(schema) || Visit13(schema.not, references);
}
function FromObject11(schema, references) {
  return IsTransform(schema) || Object.values(schema.properties).some((schema2) => Visit13(schema2, references)) || IsSchema(schema.additionalProperties) && Visit13(schema.additionalProperties, references);
}
function FromPromise5(schema, references) {
  return IsTransform(schema) || Visit13(schema.item, references);
}
function FromRecord10(schema, references) {
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const property = schema.patternProperties[pattern];
  return IsTransform(schema) || Visit13(property, references) || IsSchema(schema.additionalProperties) && IsTransform(schema.additionalProperties);
}
function FromRef10(schema, references) {
  if (IsTransform(schema))
    return true;
  return Visit13(Deref(schema, references), references);
}
function FromThis9(schema, references) {
  if (IsTransform(schema))
    return true;
  return Visit13(Deref(schema, references), references);
}
function FromTuple12(schema, references) {
  return IsTransform(schema) || !IsUndefined(schema.items) && schema.items.some((schema2) => Visit13(schema2, references));
}
function FromUnion14(schema, references) {
  return IsTransform(schema) || schema.anyOf.some((schema2) => Visit13(schema2, references));
}
function Visit13(schema, references) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  if (schema.$id && visited.has(schema.$id))
    return false;
  if (schema.$id)
    visited.add(schema.$id);
  switch (schema[Kind]) {
    case "Array":
      return FromArray13(schema_, references_);
    case "AsyncIterator":
      return FromAsyncIterator5(schema_, references_);
    case "Constructor":
      return FromConstructor6(schema_, references_);
    case "Function":
      return FromFunction5(schema_, references_);
    case "Import":
      return FromImport9(schema_, references_);
    case "Intersect":
      return FromIntersect12(schema_, references_);
    case "Iterator":
      return FromIterator5(schema_, references_);
    case "Not":
      return FromNot7(schema_, references_);
    case "Object":
      return FromObject11(schema_, references_);
    case "Promise":
      return FromPromise5(schema_, references_);
    case "Record":
      return FromRecord10(schema_, references_);
    case "Ref":
      return FromRef10(schema_, references_);
    case "This":
      return FromThis9(schema_, references_);
    case "Tuple":
      return FromTuple12(schema_, references_);
    case "Union":
      return FromUnion14(schema_, references_);
    default:
      return IsTransform(schema);
  }
}
var visited = /* @__PURE__ */ new Set();
function HasTransform(schema, references) {
  visited.clear();
  return Visit13(schema, references);
}

// node_modules/@sinclair/typebox/build/esm/value/decode/decode.mjs
function Decode(...args) {
  const [schema, references, value] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
  if (!Check(schema, references, value))
    throw new TransformDecodeCheckError(schema, value, Errors(schema, references, value).First());
  return HasTransform(schema, references) ? TransformDecode(schema, references, value) : value;
}

// node_modules/@sinclair/typebox/build/esm/value/default/default.mjs
function ValueOrDefault(schema, value) {
  const defaultValue = HasPropertyKey(schema, "default") ? schema.default : void 0;
  const clone = IsFunction(defaultValue) ? defaultValue() : Clone2(defaultValue);
  return IsUndefined(value) ? clone : IsObject(value) && IsObject(clone) ? Object.assign(clone, value) : value;
}
function HasDefaultProperty(schema) {
  return IsKind(schema) && "default" in schema;
}
function FromArray14(schema, references, value) {
  if (IsArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = Visit14(schema.items, references, value[i]);
    }
    return value;
  }
  const defaulted = ValueOrDefault(schema, value);
  if (!IsArray(defaulted))
    return defaulted;
  for (let i = 0; i < defaulted.length; i++) {
    defaulted[i] = Visit14(schema.items, references, defaulted[i]);
  }
  return defaulted;
}
function FromDate7(schema, references, value) {
  return IsDate(value) ? value : ValueOrDefault(schema, value);
}
function FromImport10(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit14(target, [...references, ...definitions], value);
}
function FromIntersect13(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  return schema.allOf.reduce((acc, schema2) => {
    const next = Visit14(schema2, references, defaulted);
    return IsObject(next) ? { ...acc, ...next } : next;
  }, {});
}
function FromObject12(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  if (!IsObject(defaulted))
    return defaulted;
  const knownPropertyKeys = Object.getOwnPropertyNames(schema.properties);
  for (const key of knownPropertyKeys) {
    const propertyValue = Visit14(schema.properties[key], references, defaulted[key]);
    if (IsUndefined(propertyValue))
      continue;
    defaulted[key] = Visit14(schema.properties[key], references, defaulted[key]);
  }
  if (!HasDefaultProperty(schema.additionalProperties))
    return defaulted;
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (knownPropertyKeys.includes(key))
      continue;
    defaulted[key] = Visit14(schema.additionalProperties, references, defaulted[key]);
  }
  return defaulted;
}
function FromRecord11(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  if (!IsObject(defaulted))
    return defaulted;
  const additionalPropertiesSchema = schema.additionalProperties;
  const [propertyKeyPattern, propertySchema] = Object.entries(schema.patternProperties)[0];
  const knownPropertyKey = new RegExp(propertyKeyPattern);
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (!(knownPropertyKey.test(key) && HasDefaultProperty(propertySchema)))
      continue;
    defaulted[key] = Visit14(propertySchema, references, defaulted[key]);
  }
  if (!HasDefaultProperty(additionalPropertiesSchema))
    return defaulted;
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (knownPropertyKey.test(key))
      continue;
    defaulted[key] = Visit14(additionalPropertiesSchema, references, defaulted[key]);
  }
  return defaulted;
}
function FromRef11(schema, references, value) {
  return Visit14(Deref(schema, references), references, ValueOrDefault(schema, value));
}
function FromThis10(schema, references, value) {
  return Visit14(Deref(schema, references), references, value);
}
function FromTuple13(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  if (!IsArray(defaulted) || IsUndefined(schema.items))
    return defaulted;
  const [items, max] = [schema.items, Math.max(schema.items.length, defaulted.length)];
  for (let i = 0; i < max; i++) {
    if (i < items.length)
      defaulted[i] = Visit14(items[i], references, defaulted[i]);
  }
  return defaulted;
}
function FromUnion15(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  for (const inner of schema.anyOf) {
    const result2 = Visit14(inner, references, Clone2(defaulted));
    if (Check(inner, references, result2)) {
      return result2;
    }
  }
  return defaulted;
}
function Visit14(schema, references, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Array":
      return FromArray14(schema_, references_, value);
    case "Date":
      return FromDate7(schema_, references_, value);
    case "Import":
      return FromImport10(schema_, references_, value);
    case "Intersect":
      return FromIntersect13(schema_, references_, value);
    case "Object":
      return FromObject12(schema_, references_, value);
    case "Record":
      return FromRecord11(schema_, references_, value);
    case "Ref":
      return FromRef11(schema_, references_, value);
    case "This":
      return FromThis10(schema_, references_, value);
    case "Tuple":
      return FromTuple13(schema_, references_, value);
    case "Union":
      return FromUnion15(schema_, references_, value);
    default:
      return ValueOrDefault(schema_, value);
  }
}
function Default5(...args) {
  return args.length === 3 ? Visit14(args[0], args[1], args[2]) : Visit14(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/value/pointer/pointer.mjs
var pointer_exports = {};
__export(pointer_exports, {
  Delete: () => Delete3,
  Format: () => Format,
  Get: () => Get3,
  Has: () => Has3,
  Set: () => Set4,
  ValuePointerRootDeleteError: () => ValuePointerRootDeleteError,
  ValuePointerRootSetError: () => ValuePointerRootSetError
});
var ValuePointerRootSetError = class extends TypeBoxError {
  constructor(value, path3, update) {
    super("Cannot set root value");
    this.value = value;
    this.path = path3;
    this.update = update;
  }
};
var ValuePointerRootDeleteError = class extends TypeBoxError {
  constructor(value, path3) {
    super("Cannot delete root value");
    this.value = value;
    this.path = path3;
  }
};
function Escape2(component) {
  return component.indexOf("~") === -1 ? component : component.replace(/~1/g, "/").replace(/~0/g, "~");
}
function* Format(pointer) {
  if (pointer === "")
    return;
  let [start, end] = [0, 0];
  for (let i = 0; i < pointer.length; i++) {
    const char = pointer.charAt(i);
    if (char === "/") {
      if (i === 0) {
        start = i + 1;
      } else {
        end = i;
        yield Escape2(pointer.slice(start, end));
        start = i + 1;
      }
    } else {
      end = i;
    }
  }
  yield Escape2(pointer.slice(start));
}
function Set4(value, pointer, update) {
  if (pointer === "")
    throw new ValuePointerRootSetError(value, pointer, update);
  let [owner, next, key] = [null, value, ""];
  for (const component of Format(pointer)) {
    if (next[component] === void 0)
      next[component] = {};
    owner = next;
    next = next[component];
    key = component;
  }
  owner[key] = update;
}
function Delete3(value, pointer) {
  if (pointer === "")
    throw new ValuePointerRootDeleteError(value, pointer);
  let [owner, next, key] = [null, value, ""];
  for (const component of Format(pointer)) {
    if (next[component] === void 0 || next[component] === null)
      return;
    owner = next;
    next = next[component];
    key = component;
  }
  if (Array.isArray(owner)) {
    const index = parseInt(key);
    owner.splice(index, 1);
  } else {
    delete owner[key];
  }
}
function Has3(value, pointer) {
  if (pointer === "")
    return true;
  let [owner, next, key] = [null, value, ""];
  for (const component of Format(pointer)) {
    if (next[component] === void 0)
      return false;
    owner = next;
    next = next[component];
    key = component;
  }
  return Object.getOwnPropertyNames(owner).includes(key);
}
function Get3(value, pointer) {
  if (pointer === "")
    return value;
  let current = value;
  for (const component of Format(pointer)) {
    if (current[component] === void 0)
      return void 0;
    current = current[component];
  }
  return current;
}

// node_modules/@sinclair/typebox/build/esm/value/equal/equal.mjs
function ObjectType3(left, right) {
  if (!IsObject(right))
    return false;
  const leftKeys = [...Object.keys(left), ...Object.getOwnPropertySymbols(left)];
  const rightKeys = [...Object.keys(right), ...Object.getOwnPropertySymbols(right)];
  if (leftKeys.length !== rightKeys.length)
    return false;
  return leftKeys.every((key) => Equal(left[key], right[key]));
}
function DateType3(left, right) {
  return IsDate(right) && left.getTime() === right.getTime();
}
function ArrayType3(left, right) {
  if (!IsArray(right) || left.length !== right.length)
    return false;
  return left.every((value, index) => Equal(value, right[index]));
}
function TypedArrayType(left, right) {
  if (!IsTypedArray(right) || left.length !== right.length || Object.getPrototypeOf(left).constructor.name !== Object.getPrototypeOf(right).constructor.name)
    return false;
  return left.every((value, index) => Equal(value, right[index]));
}
function ValueType(left, right) {
  return left === right;
}
function Equal(left, right) {
  if (IsDate(left))
    return DateType3(left, right);
  if (IsTypedArray(left))
    return TypedArrayType(left, right);
  if (IsArray(left))
    return ArrayType3(left, right);
  if (IsObject(left))
    return ObjectType3(left, right);
  if (IsValueType(left))
    return ValueType(left, right);
  throw new Error("ValueEquals: Unable to compare value");
}

// node_modules/@sinclair/typebox/build/esm/value/delta/delta.mjs
var Insert = Object2({
  type: Literal("insert"),
  path: String2(),
  value: Unknown()
});
var Update = Object2({
  type: Literal("update"),
  path: String2(),
  value: Unknown()
});
var Delete4 = Object2({
  type: Literal("delete"),
  path: String2()
});
var Edit = Union([Insert, Update, Delete4]);
var ValueDiffError = class extends TypeBoxError {
  constructor(value, message) {
    super(message);
    this.value = value;
  }
};
function CreateUpdate(path3, value) {
  return { type: "update", path: path3, value };
}
function CreateInsert(path3, value) {
  return { type: "insert", path: path3, value };
}
function CreateDelete(path3) {
  return { type: "delete", path: path3 };
}
function AssertDiffable(value) {
  if (globalThis.Object.getOwnPropertySymbols(value).length > 0)
    throw new ValueDiffError(value, "Cannot diff objects with symbols");
}
function* ObjectType4(path3, current, next) {
  AssertDiffable(current);
  AssertDiffable(next);
  if (!IsStandardObject(next))
    return yield CreateUpdate(path3, next);
  const currentKeys = globalThis.Object.getOwnPropertyNames(current);
  const nextKeys = globalThis.Object.getOwnPropertyNames(next);
  for (const key of nextKeys) {
    if (HasPropertyKey(current, key))
      continue;
    yield CreateInsert(`${path3}/${key}`, next[key]);
  }
  for (const key of currentKeys) {
    if (!HasPropertyKey(next, key))
      continue;
    if (Equal(current, next))
      continue;
    yield* Visit15(`${path3}/${key}`, current[key], next[key]);
  }
  for (const key of currentKeys) {
    if (HasPropertyKey(next, key))
      continue;
    yield CreateDelete(`${path3}/${key}`);
  }
}
function* ArrayType4(path3, current, next) {
  if (!IsArray(next))
    return yield CreateUpdate(path3, next);
  for (let i = 0; i < Math.min(current.length, next.length); i++) {
    yield* Visit15(`${path3}/${i}`, current[i], next[i]);
  }
  for (let i = 0; i < next.length; i++) {
    if (i < current.length)
      continue;
    yield CreateInsert(`${path3}/${i}`, next[i]);
  }
  for (let i = current.length - 1; i >= 0; i--) {
    if (i < next.length)
      continue;
    yield CreateDelete(`${path3}/${i}`);
  }
}
function* TypedArrayType2(path3, current, next) {
  if (!IsTypedArray(next) || current.length !== next.length || globalThis.Object.getPrototypeOf(current).constructor.name !== globalThis.Object.getPrototypeOf(next).constructor.name)
    return yield CreateUpdate(path3, next);
  for (let i = 0; i < Math.min(current.length, next.length); i++) {
    yield* Visit15(`${path3}/${i}`, current[i], next[i]);
  }
}
function* ValueType2(path3, current, next) {
  if (current === next)
    return;
  yield CreateUpdate(path3, next);
}
function* Visit15(path3, current, next) {
  if (IsStandardObject(current))
    return yield* ObjectType4(path3, current, next);
  if (IsArray(current))
    return yield* ArrayType4(path3, current, next);
  if (IsTypedArray(current))
    return yield* TypedArrayType2(path3, current, next);
  if (IsValueType(current))
    return yield* ValueType2(path3, current, next);
  throw new ValueDiffError(current, "Unable to diff value");
}
function Diff(current, next) {
  return [...Visit15("", current, next)];
}
function IsRootUpdate(edits) {
  return edits.length > 0 && edits[0].path === "" && edits[0].type === "update";
}
function IsIdentity(edits) {
  return edits.length === 0;
}
function Patch(current, edits) {
  if (IsRootUpdate(edits)) {
    return Clone2(edits[0].value);
  }
  if (IsIdentity(edits)) {
    return Clone2(current);
  }
  const clone = Clone2(current);
  for (const edit of edits) {
    switch (edit.type) {
      case "insert": {
        pointer_exports.Set(clone, edit.path, edit.value);
        break;
      }
      case "update": {
        pointer_exports.Set(clone, edit.path, edit.value);
        break;
      }
      case "delete": {
        pointer_exports.Delete(clone, edit.path);
        break;
      }
    }
  }
  return clone;
}

// node_modules/@sinclair/typebox/build/esm/value/encode/encode.mjs
function Encode(...args) {
  const [schema, references, value] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
  const encoded = HasTransform(schema, references) ? TransformEncode(schema, references, value) : value;
  if (!Check(schema, references, encoded))
    throw new TransformEncodeCheckError(schema, encoded, Errors(schema, references, encoded).First());
  return encoded;
}

// node_modules/@sinclair/typebox/build/esm/value/mutate/mutate.mjs
function IsStandardObject2(value) {
  return IsObject(value) && !IsArray(value);
}
var ValueMutateError = class extends TypeBoxError {
  constructor(message) {
    super(message);
  }
};
function ObjectType5(root, path3, current, next) {
  if (!IsStandardObject2(current)) {
    pointer_exports.Set(root, path3, Clone2(next));
  } else {
    const currentKeys = Object.getOwnPropertyNames(current);
    const nextKeys = Object.getOwnPropertyNames(next);
    for (const currentKey of currentKeys) {
      if (!nextKeys.includes(currentKey)) {
        delete current[currentKey];
      }
    }
    for (const nextKey of nextKeys) {
      if (!currentKeys.includes(nextKey)) {
        current[nextKey] = null;
      }
    }
    for (const nextKey of nextKeys) {
      Visit16(root, `${path3}/${nextKey}`, current[nextKey], next[nextKey]);
    }
  }
}
function ArrayType5(root, path3, current, next) {
  if (!IsArray(current)) {
    pointer_exports.Set(root, path3, Clone2(next));
  } else {
    for (let index = 0; index < next.length; index++) {
      Visit16(root, `${path3}/${index}`, current[index], next[index]);
    }
    current.splice(next.length);
  }
}
function TypedArrayType3(root, path3, current, next) {
  if (IsTypedArray(current) && current.length === next.length) {
    for (let i = 0; i < current.length; i++) {
      current[i] = next[i];
    }
  } else {
    pointer_exports.Set(root, path3, Clone2(next));
  }
}
function ValueType3(root, path3, current, next) {
  if (current === next)
    return;
  pointer_exports.Set(root, path3, next);
}
function Visit16(root, path3, current, next) {
  if (IsArray(next))
    return ArrayType5(root, path3, current, next);
  if (IsTypedArray(next))
    return TypedArrayType3(root, path3, current, next);
  if (IsStandardObject2(next))
    return ObjectType5(root, path3, current, next);
  if (IsValueType(next))
    return ValueType3(root, path3, current, next);
}
function IsNonMutableValue(value) {
  return IsTypedArray(value) || IsValueType(value);
}
function IsMismatchedValue(current, next) {
  return IsStandardObject2(current) && IsArray(next) || IsArray(current) && IsStandardObject2(next);
}
function Mutate(current, next) {
  if (IsNonMutableValue(current) || IsNonMutableValue(next))
    throw new ValueMutateError("Only object and array types can be mutated at the root level");
  if (IsMismatchedValue(current, next))
    throw new ValueMutateError("Cannot assign due type mismatch of assignable values");
  Visit16(current, "", current, next);
}

// node_modules/@sinclair/typebox/build/esm/value/parse/parse.mjs
var ParseError = class extends TypeBoxError {
  constructor(message) {
    super(message);
  }
};
var ParseRegistry;
(function(ParseRegistry2) {
  const registry = /* @__PURE__ */ new Map([
    ["Assert", (type, references, value) => {
      Assert(type, references, value);
      return value;
    }],
    ["Cast", (type, references, value) => Cast(type, references, value)],
    ["Clean", (type, references, value) => Clean(type, references, value)],
    ["Clone", (_type, _references, value) => Clone2(value)],
    ["Convert", (type, references, value) => Convert(type, references, value)],
    ["Decode", (type, references, value) => HasTransform(type, references) ? TransformDecode(type, references, value) : value],
    ["Default", (type, references, value) => Default5(type, references, value)],
    ["Encode", (type, references, value) => HasTransform(type, references) ? TransformEncode(type, references, value) : value]
  ]);
  function Delete5(key) {
    registry.delete(key);
  }
  ParseRegistry2.Delete = Delete5;
  function Set5(key, callback) {
    registry.set(key, callback);
  }
  ParseRegistry2.Set = Set5;
  function Get4(key) {
    return registry.get(key);
  }
  ParseRegistry2.Get = Get4;
})(ParseRegistry || (ParseRegistry = {}));
var ParseDefault = [
  "Clone",
  "Clean",
  "Default",
  "Convert",
  "Assert",
  "Decode"
];
function ParseValue(operations, type, references, value) {
  return operations.reduce((value2, operationKey) => {
    const operation = ParseRegistry.Get(operationKey);
    if (IsUndefined(operation))
      throw new ParseError(`Unable to find Parse operation '${operationKey}'`);
    return operation(type, references, value2);
  }, value);
}
function Parse(...args) {
  const [operations, schema, references, value] = args.length === 4 ? [args[0], args[1], args[2], args[3]] : args.length === 3 ? IsArray(args[0]) ? [args[0], args[1], [], args[2]] : [ParseDefault, args[0], args[1], args[2]] : args.length === 2 ? [ParseDefault, args[0], [], args[1]] : (() => {
    throw new ParseError("Invalid Arguments");
  })();
  return ParseValue(operations, schema, references, value);
}

// node_modules/@sinclair/typebox/build/esm/value/value/value.mjs
var value_exports2 = {};
__export(value_exports2, {
  Assert: () => Assert,
  Cast: () => Cast,
  Check: () => Check,
  Clean: () => Clean,
  Clone: () => Clone2,
  Convert: () => Convert,
  Create: () => Create2,
  Decode: () => Decode,
  Default: () => Default5,
  Diff: () => Diff,
  Edit: () => Edit,
  Encode: () => Encode,
  Equal: () => Equal,
  Errors: () => Errors,
  Hash: () => Hash,
  Mutate: () => Mutate,
  Parse: () => Parse,
  Patch: () => Patch,
  ValueErrorIterator: () => ValueErrorIterator
});

// node_modules/@sinclair/typebox/build/esm/type/clone/type.mjs
function CloneType(schema, options) {
  return options === void 0 ? Clone(schema) : Clone({ ...options, ...schema });
}

// node_modules/@sinclair/typebox/build/esm/type/argument/argument.mjs
function Argument(index) {
  return CreateType({ [Kind]: "Argument", index });
}

// node_modules/@sinclair/typebox/build/esm/type/awaited/awaited.mjs
function FromComputed2(target, parameters) {
  return Computed("Awaited", [Computed(target, parameters)]);
}
function FromRef12($ref) {
  return Computed("Awaited", [Ref($ref)]);
}
function FromIntersect14(types) {
  return Intersect(FromRest4(types));
}
function FromUnion16(types) {
  return Union(FromRest4(types));
}
function FromPromise6(type) {
  return Awaited(type);
}
function FromRest4(types) {
  return types.map((type) => Awaited(type));
}
function Awaited(type, options) {
  return CreateType(IsComputed(type) ? FromComputed2(type.target, type.parameters) : IsIntersect(type) ? FromIntersect14(type.allOf) : IsUnion(type) ? FromUnion16(type.anyOf) : IsPromise2(type) ? FromPromise6(type.item) : IsRef(type) ? FromRef12(type.$ref) : type, options);
}

// node_modules/@sinclair/typebox/build/esm/type/composite/composite.mjs
function CompositeKeys(T) {
  const Acc = [];
  for (const L2 of T)
    Acc.push(...KeyOfPropertyKeys(L2));
  return SetDistinct(Acc);
}
function FilterNever(T) {
  return T.filter((L2) => !IsNever(L2));
}
function CompositeProperty(T, K) {
  const Acc = [];
  for (const L2 of T)
    Acc.push(...IndexFromPropertyKeys(L2, [K]));
  return FilterNever(Acc);
}
function CompositeProperties(T, K) {
  const Acc = {};
  for (const L2 of K) {
    Acc[L2] = IntersectEvaluated(CompositeProperty(T, L2));
  }
  return Acc;
}
function Composite(T, options) {
  const K = CompositeKeys(T);
  const P2 = CompositeProperties(T, K);
  const R = Object2(P2, options);
  return R;
}

// node_modules/@sinclair/typebox/build/esm/type/date/date.mjs
function Date2(options) {
  return CreateType({ [Kind]: "Date", type: "Date" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/null/null.mjs
function Null(options) {
  return CreateType({ [Kind]: "Null", type: "null" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/symbol/symbol.mjs
function Symbol2(options) {
  return CreateType({ [Kind]: "Symbol", type: "symbol" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/undefined/undefined.mjs
function Undefined(options) {
  return CreateType({ [Kind]: "Undefined", type: "undefined" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/uint8array/uint8array.mjs
function Uint8Array2(options) {
  return CreateType({ [Kind]: "Uint8Array", type: "Uint8Array" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/const/const.mjs
function FromArray15(T) {
  return T.map((L2) => FromValue2(L2, false));
}
function FromProperties8(value) {
  const Acc = {};
  for (const K of globalThis.Object.getOwnPropertyNames(value))
    Acc[K] = Readonly(FromValue2(value[K], false));
  return Acc;
}
function ConditionalReadonly(T, root) {
  return root === true ? T : Readonly(T);
}
function FromValue2(value, root) {
  return IsAsyncIterator2(value) ? ConditionalReadonly(Any(), root) : IsIterator2(value) ? ConditionalReadonly(Any(), root) : IsArray2(value) ? Readonly(Tuple(FromArray15(value))) : IsUint8Array2(value) ? Uint8Array2() : IsDate2(value) ? Date2() : IsObject2(value) ? ConditionalReadonly(Object2(FromProperties8(value)), root) : IsFunction2(value) ? ConditionalReadonly(Function([], Unknown()), root) : IsUndefined2(value) ? Undefined() : IsNull2(value) ? Null() : IsSymbol2(value) ? Symbol2() : IsBigInt2(value) ? BigInt2() : IsNumber2(value) ? Literal(value) : IsBoolean2(value) ? Literal(value) : IsString2(value) ? Literal(value) : Object2({});
}
function Const(T, options) {
  return CreateType(FromValue2(T, true), options);
}

// node_modules/@sinclair/typebox/build/esm/type/constructor-parameters/constructor-parameters.mjs
function ConstructorParameters(schema, options) {
  return IsConstructor(schema) ? Tuple(schema.parameters, options) : Never(options);
}

// node_modules/@sinclair/typebox/build/esm/type/enum/enum.mjs
function Enum(item, options) {
  if (IsUndefined2(item))
    throw new Error("Enum undefined or empty");
  const values1 = globalThis.Object.getOwnPropertyNames(item).filter((key) => isNaN(key)).map((key) => item[key]);
  const values2 = [...new Set(values1)];
  const anyOf = values2.map((value) => Literal(value));
  return Union(anyOf, { ...options, [Hint]: "Enum" });
}

// node_modules/@sinclair/typebox/build/esm/type/exclude/exclude-from-template-literal.mjs
function ExcludeFromTemplateLiteral(L2, R) {
  return Exclude(TemplateLiteralToUnion(L2), R);
}

// node_modules/@sinclair/typebox/build/esm/type/exclude/exclude.mjs
function ExcludeRest(L2, R) {
  const excluded = L2.filter((inner) => ExtendsCheck(inner, R) === ExtendsResult.False);
  return excluded.length === 1 ? excluded[0] : Union(excluded);
}
function Exclude(L2, R, options = {}) {
  if (IsTemplateLiteral(L2))
    return CreateType(ExcludeFromTemplateLiteral(L2, R), options);
  if (IsMappedResult(L2))
    return CreateType(ExcludeFromMappedResult(L2, R), options);
  return CreateType(IsUnion(L2) ? ExcludeRest(L2.anyOf, R) : ExtendsCheck(L2, R) !== ExtendsResult.False ? Never() : L2, options);
}

// node_modules/@sinclair/typebox/build/esm/type/exclude/exclude-from-mapped-result.mjs
function FromProperties9(P2, U) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P2))
    Acc[K2] = Exclude(P2[K2], U);
  return Acc;
}
function FromMappedResult7(R, T) {
  return FromProperties9(R.properties, T);
}
function ExcludeFromMappedResult(R, T) {
  const P2 = FromMappedResult7(R, T);
  return MappedResult(P2);
}

// node_modules/@sinclair/typebox/build/esm/type/extract/extract-from-template-literal.mjs
function ExtractFromTemplateLiteral(L2, R) {
  return Extract(TemplateLiteralToUnion(L2), R);
}

// node_modules/@sinclair/typebox/build/esm/type/extract/extract.mjs
function ExtractRest(L2, R) {
  const extracted = L2.filter((inner) => ExtendsCheck(inner, R) !== ExtendsResult.False);
  return extracted.length === 1 ? extracted[0] : Union(extracted);
}
function Extract(L2, R, options) {
  if (IsTemplateLiteral(L2))
    return CreateType(ExtractFromTemplateLiteral(L2, R), options);
  if (IsMappedResult(L2))
    return CreateType(ExtractFromMappedResult(L2, R), options);
  return CreateType(IsUnion(L2) ? ExtractRest(L2.anyOf, R) : ExtendsCheck(L2, R) !== ExtendsResult.False ? L2 : Never(), options);
}

// node_modules/@sinclair/typebox/build/esm/type/extract/extract-from-mapped-result.mjs
function FromProperties10(P2, T) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P2))
    Acc[K2] = Extract(P2[K2], T);
  return Acc;
}
function FromMappedResult8(R, T) {
  return FromProperties10(R.properties, T);
}
function ExtractFromMappedResult(R, T) {
  const P2 = FromMappedResult8(R, T);
  return MappedResult(P2);
}

// node_modules/@sinclair/typebox/build/esm/type/instance-type/instance-type.mjs
function InstanceType(schema, options) {
  return IsConstructor(schema) ? CreateType(schema.returns, options) : Never(options);
}

// node_modules/@sinclair/typebox/build/esm/type/readonly-optional/readonly-optional.mjs
function ReadonlyOptional(schema) {
  return Readonly(Optional(schema));
}

// node_modules/@sinclair/typebox/build/esm/type/record/record.mjs
function RecordCreateFromPattern(pattern, T, options) {
  return CreateType({ [Kind]: "Record", type: "object", patternProperties: { [pattern]: T } }, options);
}
function RecordCreateFromKeys(K, T, options) {
  const result2 = {};
  for (const K2 of K)
    result2[K2] = T;
  return Object2(result2, { ...options, [Hint]: "Record" });
}
function FromTemplateLiteralKey(K, T, options) {
  return IsTemplateLiteralFinite(K) ? RecordCreateFromKeys(IndexPropertyKeys(K), T, options) : RecordCreateFromPattern(K.pattern, T, options);
}
function FromUnionKey(key, type, options) {
  return RecordCreateFromKeys(IndexPropertyKeys(Union(key)), type, options);
}
function FromLiteralKey(key, type, options) {
  return RecordCreateFromKeys([key.toString()], type, options);
}
function FromRegExpKey(key, type, options) {
  return RecordCreateFromPattern(key.source, type, options);
}
function FromStringKey(key, type, options) {
  const pattern = IsUndefined2(key.pattern) ? PatternStringExact : key.pattern;
  return RecordCreateFromPattern(pattern, type, options);
}
function FromAnyKey(_, type, options) {
  return RecordCreateFromPattern(PatternStringExact, type, options);
}
function FromNeverKey(_key, type, options) {
  return RecordCreateFromPattern(PatternNeverExact, type, options);
}
function FromBooleanKey(_key, type, options) {
  return Object2({ true: type, false: type }, options);
}
function FromIntegerKey(_key, type, options) {
  return RecordCreateFromPattern(PatternNumberExact, type, options);
}
function FromNumberKey(_, type, options) {
  return RecordCreateFromPattern(PatternNumberExact, type, options);
}
function Record(key, type, options = {}) {
  return IsUnion(key) ? FromUnionKey(key.anyOf, type, options) : IsTemplateLiteral(key) ? FromTemplateLiteralKey(key, type, options) : IsLiteral(key) ? FromLiteralKey(key.const, type, options) : IsBoolean3(key) ? FromBooleanKey(key, type, options) : IsInteger2(key) ? FromIntegerKey(key, type, options) : IsNumber3(key) ? FromNumberKey(key, type, options) : IsRegExp2(key) ? FromRegExpKey(key, type, options) : IsString3(key) ? FromStringKey(key, type, options) : IsAny(key) ? FromAnyKey(key, type, options) : IsNever(key) ? FromNeverKey(key, type, options) : Never(options);
}
function RecordPattern(record) {
  return globalThis.Object.getOwnPropertyNames(record.patternProperties)[0];
}
function RecordKey2(type) {
  const pattern = RecordPattern(type);
  return pattern === PatternStringExact ? String2() : pattern === PatternNumberExact ? Number2() : String2({ pattern });
}
function RecordValue2(type) {
  return type.patternProperties[RecordPattern(type)];
}

// node_modules/@sinclair/typebox/build/esm/type/instantiate/instantiate.mjs
function FromConstructor7(args, type) {
  type.parameters = FromTypes(args, type.parameters);
  type.returns = FromType(args, type.returns);
  return type;
}
function FromFunction6(args, type) {
  type.parameters = FromTypes(args, type.parameters);
  type.returns = FromType(args, type.returns);
  return type;
}
function FromIntersect15(args, type) {
  type.allOf = FromTypes(args, type.allOf);
  return type;
}
function FromUnion17(args, type) {
  type.anyOf = FromTypes(args, type.anyOf);
  return type;
}
function FromTuple14(args, type) {
  if (IsUndefined2(type.items))
    return type;
  type.items = FromTypes(args, type.items);
  return type;
}
function FromArray16(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromAsyncIterator6(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromIterator6(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromPromise7(args, type) {
  type.item = FromType(args, type.item);
  return type;
}
function FromObject13(args, type) {
  const mappedProperties = FromProperties11(args, type.properties);
  return { ...type, ...Object2(mappedProperties) };
}
function FromRecord12(args, type) {
  const mappedKey = FromType(args, RecordKey2(type));
  const mappedValue = FromType(args, RecordValue2(type));
  const result2 = Record(mappedKey, mappedValue);
  return { ...type, ...result2 };
}
function FromArgument4(args, argument) {
  return argument.index in args ? args[argument.index] : Unknown();
}
function FromProperty2(args, type) {
  const isReadonly = IsReadonly(type);
  const isOptional = IsOptional(type);
  const mapped = FromType(args, type);
  return isReadonly && isOptional ? ReadonlyOptional(mapped) : isReadonly && !isOptional ? Readonly(mapped) : !isReadonly && isOptional ? Optional(mapped) : mapped;
}
function FromProperties11(args, properties) {
  return globalThis.Object.getOwnPropertyNames(properties).reduce((result2, key) => {
    return { ...result2, [key]: FromProperty2(args, properties[key]) };
  }, {});
}
function FromTypes(args, types) {
  return types.map((type) => FromType(args, type));
}
function FromType(args, type) {
  return IsConstructor(type) ? FromConstructor7(args, type) : IsFunction3(type) ? FromFunction6(args, type) : IsIntersect(type) ? FromIntersect15(args, type) : IsUnion(type) ? FromUnion17(args, type) : IsTuple(type) ? FromTuple14(args, type) : IsArray3(type) ? FromArray16(args, type) : IsAsyncIterator3(type) ? FromAsyncIterator6(args, type) : IsIterator3(type) ? FromIterator6(args, type) : IsPromise2(type) ? FromPromise7(args, type) : IsObject3(type) ? FromObject13(args, type) : IsRecord(type) ? FromRecord12(args, type) : IsArgument(type) ? FromArgument4(args, type) : type;
}
function Instantiate(type, args) {
  return FromType(args, CloneType(type));
}

// node_modules/@sinclair/typebox/build/esm/type/integer/integer.mjs
function Integer(options) {
  return CreateType({ [Kind]: "Integer", type: "integer" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/intrinsic-from-mapped-key.mjs
function MappedIntrinsicPropertyKey(K, M2, options) {
  return {
    [K]: Intrinsic(Literal(K), M2, Clone(options))
  };
}
function MappedIntrinsicPropertyKeys(K, M2, options) {
  const result2 = K.reduce((Acc, L2) => {
    return { ...Acc, ...MappedIntrinsicPropertyKey(L2, M2, options) };
  }, {});
  return result2;
}
function MappedIntrinsicProperties(T, M2, options) {
  return MappedIntrinsicPropertyKeys(T["keys"], M2, options);
}
function IntrinsicFromMappedKey(T, M2, options) {
  const P2 = MappedIntrinsicProperties(T, M2, options);
  return MappedResult(P2);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/intrinsic.mjs
function ApplyUncapitalize(value) {
  const [first, rest] = [value.slice(0, 1), value.slice(1)];
  return [first.toLowerCase(), rest].join("");
}
function ApplyCapitalize(value) {
  const [first, rest] = [value.slice(0, 1), value.slice(1)];
  return [first.toUpperCase(), rest].join("");
}
function ApplyUppercase(value) {
  return value.toUpperCase();
}
function ApplyLowercase(value) {
  return value.toLowerCase();
}
function FromTemplateLiteral6(schema, mode, options) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  const finite = IsTemplateLiteralExpressionFinite(expression);
  if (!finite)
    return { ...schema, pattern: FromLiteralValue(schema.pattern, mode) };
  const strings = [...TemplateLiteralExpressionGenerate(expression)];
  const literals = strings.map((value) => Literal(value));
  const mapped = FromRest5(literals, mode);
  const union = Union(mapped);
  return TemplateLiteral([union], options);
}
function FromLiteralValue(value, mode) {
  return typeof value === "string" ? mode === "Uncapitalize" ? ApplyUncapitalize(value) : mode === "Capitalize" ? ApplyCapitalize(value) : mode === "Uppercase" ? ApplyUppercase(value) : mode === "Lowercase" ? ApplyLowercase(value) : value : value.toString();
}
function FromRest5(T, M2) {
  return T.map((L2) => Intrinsic(L2, M2));
}
function Intrinsic(schema, mode, options = {}) {
  return (
    // Intrinsic-Mapped-Inference
    IsMappedKey(schema) ? IntrinsicFromMappedKey(schema, mode, options) : (
      // Standard-Inference
      IsTemplateLiteral(schema) ? FromTemplateLiteral6(schema, mode, options) : IsUnion(schema) ? Union(FromRest5(schema.anyOf, mode), options) : IsLiteral(schema) ? Literal(FromLiteralValue(schema.const, mode), options) : (
        // Default Type
        CreateType(schema, options)
      )
    )
  );
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/capitalize.mjs
function Capitalize(T, options = {}) {
  return Intrinsic(T, "Capitalize", options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/lowercase.mjs
function Lowercase(T, options = {}) {
  return Intrinsic(T, "Lowercase", options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/uncapitalize.mjs
function Uncapitalize(T, options = {}) {
  return Intrinsic(T, "Uncapitalize", options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/uppercase.mjs
function Uppercase(T, options = {}) {
  return Intrinsic(T, "Uppercase", options);
}

// node_modules/@sinclair/typebox/build/esm/type/omit/omit-from-mapped-result.mjs
function FromProperties12(properties, propertyKeys, options) {
  const result2 = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result2[K2] = Omit(properties[K2], propertyKeys, Clone(options));
  return result2;
}
function FromMappedResult9(mappedResult, propertyKeys, options) {
  return FromProperties12(mappedResult.properties, propertyKeys, options);
}
function OmitFromMappedResult(mappedResult, propertyKeys, options) {
  const properties = FromMappedResult9(mappedResult, propertyKeys, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/omit/omit.mjs
function FromIntersect16(types, propertyKeys) {
  return types.map((type) => OmitResolve(type, propertyKeys));
}
function FromUnion18(types, propertyKeys) {
  return types.map((type) => OmitResolve(type, propertyKeys));
}
function FromProperty3(properties, key) {
  const { [key]: _, ...R } = properties;
  return R;
}
function FromProperties13(properties, propertyKeys) {
  return propertyKeys.reduce((T, K2) => FromProperty3(T, K2), properties);
}
function FromObject14(type, propertyKeys, properties) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties13(properties, propertyKeys);
  return Object2(mappedProperties, options);
}
function UnionFromPropertyKeys(propertyKeys) {
  const result2 = propertyKeys.reduce((result3, key) => IsLiteralValue(key) ? [...result3, Literal(key)] : result3, []);
  return Union(result2);
}
function OmitResolve(type, propertyKeys) {
  return IsIntersect(type) ? Intersect(FromIntersect16(type.allOf, propertyKeys)) : IsUnion(type) ? Union(FromUnion18(type.anyOf, propertyKeys)) : IsObject3(type) ? FromObject14(type, propertyKeys, type.properties) : Object2({});
}
function Omit(type, key, options) {
  const typeKey = IsArray2(key) ? UnionFromPropertyKeys(key) : key;
  const propertyKeys = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const isTypeRef = IsRef(type);
  const isKeyRef = IsRef(key);
  return IsMappedResult(type) ? OmitFromMappedResult(type, propertyKeys, options) : IsMappedKey(key) ? OmitFromMappedKey(type, key, options) : isTypeRef && isKeyRef ? Computed("Omit", [type, typeKey], options) : !isTypeRef && isKeyRef ? Computed("Omit", [type, typeKey], options) : isTypeRef && !isKeyRef ? Computed("Omit", [type, typeKey], options) : CreateType({ ...OmitResolve(type, propertyKeys), ...options });
}

// node_modules/@sinclair/typebox/build/esm/type/omit/omit-from-mapped-key.mjs
function FromPropertyKey2(type, key, options) {
  return { [key]: Omit(type, [key], Clone(options)) };
}
function FromPropertyKeys2(type, propertyKeys, options) {
  return propertyKeys.reduce((Acc, LK) => {
    return { ...Acc, ...FromPropertyKey2(type, LK, options) };
  }, {});
}
function FromMappedKey3(type, mappedKey, options) {
  return FromPropertyKeys2(type, mappedKey.keys, options);
}
function OmitFromMappedKey(type, mappedKey, options) {
  const properties = FromMappedKey3(type, mappedKey, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/pick/pick-from-mapped-result.mjs
function FromProperties14(properties, propertyKeys, options) {
  const result2 = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result2[K2] = Pick(properties[K2], propertyKeys, Clone(options));
  return result2;
}
function FromMappedResult10(mappedResult, propertyKeys, options) {
  return FromProperties14(mappedResult.properties, propertyKeys, options);
}
function PickFromMappedResult(mappedResult, propertyKeys, options) {
  const properties = FromMappedResult10(mappedResult, propertyKeys, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/pick/pick.mjs
function FromIntersect17(types, propertyKeys) {
  return types.map((type) => PickResolve(type, propertyKeys));
}
function FromUnion19(types, propertyKeys) {
  return types.map((type) => PickResolve(type, propertyKeys));
}
function FromProperties15(properties, propertyKeys) {
  const result2 = {};
  for (const K2 of propertyKeys)
    if (K2 in properties)
      result2[K2] = properties[K2];
  return result2;
}
function FromObject15(Type2, keys, properties) {
  const options = Discard(Type2, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties15(properties, keys);
  return Object2(mappedProperties, options);
}
function UnionFromPropertyKeys2(propertyKeys) {
  const result2 = propertyKeys.reduce((result3, key) => IsLiteralValue(key) ? [...result3, Literal(key)] : result3, []);
  return Union(result2);
}
function PickResolve(type, propertyKeys) {
  return IsIntersect(type) ? Intersect(FromIntersect17(type.allOf, propertyKeys)) : IsUnion(type) ? Union(FromUnion19(type.anyOf, propertyKeys)) : IsObject3(type) ? FromObject15(type, propertyKeys, type.properties) : Object2({});
}
function Pick(type, key, options) {
  const typeKey = IsArray2(key) ? UnionFromPropertyKeys2(key) : key;
  const propertyKeys = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const isTypeRef = IsRef(type);
  const isKeyRef = IsRef(key);
  return IsMappedResult(type) ? PickFromMappedResult(type, propertyKeys, options) : IsMappedKey(key) ? PickFromMappedKey(type, key, options) : isTypeRef && isKeyRef ? Computed("Pick", [type, typeKey], options) : !isTypeRef && isKeyRef ? Computed("Pick", [type, typeKey], options) : isTypeRef && !isKeyRef ? Computed("Pick", [type, typeKey], options) : CreateType({ ...PickResolve(type, propertyKeys), ...options });
}

// node_modules/@sinclair/typebox/build/esm/type/pick/pick-from-mapped-key.mjs
function FromPropertyKey3(type, key, options) {
  return {
    [key]: Pick(type, [key], Clone(options))
  };
}
function FromPropertyKeys3(type, propertyKeys, options) {
  return propertyKeys.reduce((result2, leftKey) => {
    return { ...result2, ...FromPropertyKey3(type, leftKey, options) };
  }, {});
}
function FromMappedKey4(type, mappedKey, options) {
  return FromPropertyKeys3(type, mappedKey.keys, options);
}
function PickFromMappedKey(type, mappedKey, options) {
  const properties = FromMappedKey4(type, mappedKey, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/partial/partial.mjs
function FromComputed3(target, parameters) {
  return Computed("Partial", [Computed(target, parameters)]);
}
function FromRef13($ref) {
  return Computed("Partial", [Ref($ref)]);
}
function FromProperties16(properties) {
  const partialProperties = {};
  for (const K of globalThis.Object.getOwnPropertyNames(properties))
    partialProperties[K] = Optional(properties[K]);
  return partialProperties;
}
function FromObject16(type, properties) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties16(properties);
  return Object2(mappedProperties, options);
}
function FromRest6(types) {
  return types.map((type) => PartialResolve(type));
}
function PartialResolve(type) {
  return (
    // Mappable
    IsComputed(type) ? FromComputed3(type.target, type.parameters) : IsRef(type) ? FromRef13(type.$ref) : IsIntersect(type) ? Intersect(FromRest6(type.allOf)) : IsUnion(type) ? Union(FromRest6(type.anyOf)) : IsObject3(type) ? FromObject16(type, type.properties) : (
      // Intrinsic
      IsBigInt3(type) ? type : IsBoolean3(type) ? type : IsInteger2(type) ? type : IsLiteral(type) ? type : IsNull3(type) ? type : IsNumber3(type) ? type : IsString3(type) ? type : IsSymbol3(type) ? type : IsUndefined3(type) ? type : (
        // Passthrough
        Object2({})
      )
    )
  );
}
function Partial(type, options) {
  if (IsMappedResult(type)) {
    return PartialFromMappedResult(type, options);
  } else {
    return CreateType({ ...PartialResolve(type), ...options });
  }
}

// node_modules/@sinclair/typebox/build/esm/type/partial/partial-from-mapped-result.mjs
function FromProperties17(K, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(K))
    Acc[K2] = Partial(K[K2], Clone(options));
  return Acc;
}
function FromMappedResult11(R, options) {
  return FromProperties17(R.properties, options);
}
function PartialFromMappedResult(R, options) {
  const P2 = FromMappedResult11(R, options);
  return MappedResult(P2);
}

// node_modules/@sinclair/typebox/build/esm/type/required/required.mjs
function FromComputed4(target, parameters) {
  return Computed("Required", [Computed(target, parameters)]);
}
function FromRef14($ref) {
  return Computed("Required", [Ref($ref)]);
}
function FromProperties18(properties) {
  const requiredProperties = {};
  for (const K of globalThis.Object.getOwnPropertyNames(properties))
    requiredProperties[K] = Discard(properties[K], [OptionalKind]);
  return requiredProperties;
}
function FromObject17(type, properties) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties18(properties);
  return Object2(mappedProperties, options);
}
function FromRest7(types) {
  return types.map((type) => RequiredResolve(type));
}
function RequiredResolve(type) {
  return (
    // Mappable
    IsComputed(type) ? FromComputed4(type.target, type.parameters) : IsRef(type) ? FromRef14(type.$ref) : IsIntersect(type) ? Intersect(FromRest7(type.allOf)) : IsUnion(type) ? Union(FromRest7(type.anyOf)) : IsObject3(type) ? FromObject17(type, type.properties) : (
      // Intrinsic
      IsBigInt3(type) ? type : IsBoolean3(type) ? type : IsInteger2(type) ? type : IsLiteral(type) ? type : IsNull3(type) ? type : IsNumber3(type) ? type : IsString3(type) ? type : IsSymbol3(type) ? type : IsUndefined3(type) ? type : (
        // Passthrough
        Object2({})
      )
    )
  );
}
function Required(type, options) {
  if (IsMappedResult(type)) {
    return RequiredFromMappedResult(type, options);
  } else {
    return CreateType({ ...RequiredResolve(type), ...options });
  }
}

// node_modules/@sinclair/typebox/build/esm/type/required/required-from-mapped-result.mjs
function FromProperties19(P2, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P2))
    Acc[K2] = Required(P2[K2], options);
  return Acc;
}
function FromMappedResult12(R, options) {
  return FromProperties19(R.properties, options);
}
function RequiredFromMappedResult(R, options) {
  const P2 = FromMappedResult12(R, options);
  return MappedResult(P2);
}

// node_modules/@sinclair/typebox/build/esm/type/module/compute.mjs
function DereferenceParameters(moduleProperties, types) {
  return types.map((type) => {
    return IsRef(type) ? Dereference(moduleProperties, type.$ref) : FromType2(moduleProperties, type);
  });
}
function Dereference(moduleProperties, ref) {
  return ref in moduleProperties ? IsRef(moduleProperties[ref]) ? Dereference(moduleProperties, moduleProperties[ref].$ref) : FromType2(moduleProperties, moduleProperties[ref]) : Never();
}
function FromAwaited(parameters) {
  return Awaited(parameters[0]);
}
function FromIndex(parameters) {
  return Index(parameters[0], parameters[1]);
}
function FromKeyOf(parameters) {
  return KeyOf(parameters[0]);
}
function FromPartial(parameters) {
  return Partial(parameters[0]);
}
function FromOmit(parameters) {
  return Omit(parameters[0], parameters[1]);
}
function FromPick(parameters) {
  return Pick(parameters[0], parameters[1]);
}
function FromRequired(parameters) {
  return Required(parameters[0]);
}
function FromComputed5(moduleProperties, target, parameters) {
  const dereferenced = DereferenceParameters(moduleProperties, parameters);
  return target === "Awaited" ? FromAwaited(dereferenced) : target === "Index" ? FromIndex(dereferenced) : target === "KeyOf" ? FromKeyOf(dereferenced) : target === "Partial" ? FromPartial(dereferenced) : target === "Omit" ? FromOmit(dereferenced) : target === "Pick" ? FromPick(dereferenced) : target === "Required" ? FromRequired(dereferenced) : Never();
}
function FromArray17(moduleProperties, type) {
  return Array2(FromType2(moduleProperties, type));
}
function FromAsyncIterator7(moduleProperties, type) {
  return AsyncIterator(FromType2(moduleProperties, type));
}
function FromConstructor8(moduleProperties, parameters, instanceType) {
  return Constructor(FromTypes2(moduleProperties, parameters), FromType2(moduleProperties, instanceType));
}
function FromFunction7(moduleProperties, parameters, returnType) {
  return Function(FromTypes2(moduleProperties, parameters), FromType2(moduleProperties, returnType));
}
function FromIntersect18(moduleProperties, types) {
  return Intersect(FromTypes2(moduleProperties, types));
}
function FromIterator7(moduleProperties, type) {
  return Iterator(FromType2(moduleProperties, type));
}
function FromObject18(moduleProperties, properties) {
  return Object2(globalThis.Object.keys(properties).reduce((result2, key) => {
    return { ...result2, [key]: FromType2(moduleProperties, properties[key]) };
  }, {}));
}
function FromRecord13(moduleProperties, type) {
  const [value, pattern] = [FromType2(moduleProperties, RecordValue2(type)), RecordPattern(type)];
  const result2 = CloneType(type);
  result2.patternProperties[pattern] = value;
  return result2;
}
function FromTransform(moduleProperties, transform) {
  return IsRef(transform) ? { ...Dereference(moduleProperties, transform.$ref), [TransformKind]: transform[TransformKind] } : transform;
}
function FromTuple15(moduleProperties, types) {
  return Tuple(FromTypes2(moduleProperties, types));
}
function FromUnion20(moduleProperties, types) {
  return Union(FromTypes2(moduleProperties, types));
}
function FromTypes2(moduleProperties, types) {
  return types.map((type) => FromType2(moduleProperties, type));
}
function FromType2(moduleProperties, type) {
  return (
    // Modifiers
    IsOptional(type) ? CreateType(FromType2(moduleProperties, Discard(type, [OptionalKind])), type) : IsReadonly(type) ? CreateType(FromType2(moduleProperties, Discard(type, [ReadonlyKind])), type) : (
      // Transform
      IsTransform(type) ? CreateType(FromTransform(moduleProperties, type), type) : (
        // Types
        IsArray3(type) ? CreateType(FromArray17(moduleProperties, type.items), type) : IsAsyncIterator3(type) ? CreateType(FromAsyncIterator7(moduleProperties, type.items), type) : IsComputed(type) ? CreateType(FromComputed5(moduleProperties, type.target, type.parameters)) : IsConstructor(type) ? CreateType(FromConstructor8(moduleProperties, type.parameters, type.returns), type) : IsFunction3(type) ? CreateType(FromFunction7(moduleProperties, type.parameters, type.returns), type) : IsIntersect(type) ? CreateType(FromIntersect18(moduleProperties, type.allOf), type) : IsIterator3(type) ? CreateType(FromIterator7(moduleProperties, type.items), type) : IsObject3(type) ? CreateType(FromObject18(moduleProperties, type.properties), type) : IsRecord(type) ? CreateType(FromRecord13(moduleProperties, type)) : IsTuple(type) ? CreateType(FromTuple15(moduleProperties, type.items || []), type) : IsUnion(type) ? CreateType(FromUnion20(moduleProperties, type.anyOf), type) : type
      )
    )
  );
}
function ComputeType(moduleProperties, key) {
  return key in moduleProperties ? FromType2(moduleProperties, moduleProperties[key]) : Never();
}
function ComputeModuleProperties(moduleProperties) {
  return globalThis.Object.getOwnPropertyNames(moduleProperties).reduce((result2, key) => {
    return { ...result2, [key]: ComputeType(moduleProperties, key) };
  }, {});
}

// node_modules/@sinclair/typebox/build/esm/type/module/module.mjs
var TModule = class {
  constructor($defs) {
    const computed = ComputeModuleProperties($defs);
    const identified = this.WithIdentifiers(computed);
    this.$defs = identified;
  }
  /** `[Json]` Imports a Type by Key. */
  Import(key, options) {
    const $defs = { ...this.$defs, [key]: CreateType(this.$defs[key], options) };
    return CreateType({ [Kind]: "Import", $defs, $ref: key });
  }
  // prettier-ignore
  WithIdentifiers($defs) {
    return globalThis.Object.getOwnPropertyNames($defs).reduce((result2, key) => {
      return { ...result2, [key]: { ...$defs[key], $id: key } };
    }, {});
  }
};
function Module(properties) {
  return new TModule(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/not/not.mjs
function Not2(type, options) {
  return CreateType({ [Kind]: "Not", not: type }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/parameters/parameters.mjs
function Parameters(schema, options) {
  return IsFunction3(schema) ? Tuple(schema.parameters, options) : Never();
}

// node_modules/@sinclair/typebox/build/esm/type/recursive/recursive.mjs
var Ordinal = 0;
function Recursive(callback, options = {}) {
  if (IsUndefined2(options.$id))
    options.$id = `T${Ordinal++}`;
  const thisType = CloneType(callback({ [Kind]: "This", $ref: `${options.$id}` }));
  thisType.$id = options.$id;
  return CreateType({ [Hint]: "Recursive", ...thisType }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/regexp/regexp.mjs
function RegExp2(unresolved, options) {
  const expr = IsString2(unresolved) ? new globalThis.RegExp(unresolved) : unresolved;
  return CreateType({ [Kind]: "RegExp", type: "RegExp", source: expr.source, flags: expr.flags }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/rest/rest.mjs
function RestResolve(T) {
  return IsIntersect(T) ? T.allOf : IsUnion(T) ? T.anyOf : IsTuple(T) ? T.items ?? [] : [];
}
function Rest(T) {
  return RestResolve(T);
}

// node_modules/@sinclair/typebox/build/esm/type/return-type/return-type.mjs
function ReturnType(schema, options) {
  return IsFunction3(schema) ? CreateType(schema.returns, options) : Never(options);
}

// node_modules/@sinclair/typebox/build/esm/type/transform/transform.mjs
var TransformDecodeBuilder = class {
  constructor(schema) {
    this.schema = schema;
  }
  Decode(decode) {
    return new TransformEncodeBuilder(this.schema, decode);
  }
};
var TransformEncodeBuilder = class {
  constructor(schema, decode) {
    this.schema = schema;
    this.decode = decode;
  }
  EncodeTransform(encode, schema) {
    const Encode2 = (value) => schema[TransformKind].Encode(encode(value));
    const Decode2 = (value) => this.decode(schema[TransformKind].Decode(value));
    const Codec = { Encode: Encode2, Decode: Decode2 };
    return { ...schema, [TransformKind]: Codec };
  }
  EncodeSchema(encode, schema) {
    const Codec = { Decode: this.decode, Encode: encode };
    return { ...schema, [TransformKind]: Codec };
  }
  Encode(encode) {
    return IsTransform(this.schema) ? this.EncodeTransform(encode, this.schema) : this.EncodeSchema(encode, this.schema);
  }
};
function Transform(schema) {
  return new TransformDecodeBuilder(schema);
}

// node_modules/@sinclair/typebox/build/esm/type/void/void.mjs
function Void(options) {
  return CreateType({ [Kind]: "Void", type: "void" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/type/type.mjs
var type_exports3 = {};
__export(type_exports3, {
  Any: () => Any,
  Argument: () => Argument,
  Array: () => Array2,
  AsyncIterator: () => AsyncIterator,
  Awaited: () => Awaited,
  BigInt: () => BigInt2,
  Boolean: () => Boolean2,
  Capitalize: () => Capitalize,
  Composite: () => Composite,
  Const: () => Const,
  Constructor: () => Constructor,
  ConstructorParameters: () => ConstructorParameters,
  Date: () => Date2,
  Enum: () => Enum,
  Exclude: () => Exclude,
  Extends: () => Extends,
  Extract: () => Extract,
  Function: () => Function,
  Index: () => Index,
  InstanceType: () => InstanceType,
  Instantiate: () => Instantiate,
  Integer: () => Integer,
  Intersect: () => Intersect,
  Iterator: () => Iterator,
  KeyOf: () => KeyOf,
  Literal: () => Literal,
  Lowercase: () => Lowercase,
  Mapped: () => Mapped,
  Module: () => Module,
  Never: () => Never,
  Not: () => Not2,
  Null: () => Null,
  Number: () => Number2,
  Object: () => Object2,
  Omit: () => Omit,
  Optional: () => Optional,
  Parameters: () => Parameters,
  Partial: () => Partial,
  Pick: () => Pick,
  Promise: () => Promise2,
  Readonly: () => Readonly,
  ReadonlyOptional: () => ReadonlyOptional,
  Record: () => Record,
  Recursive: () => Recursive,
  Ref: () => Ref,
  RegExp: () => RegExp2,
  Required: () => Required,
  Rest: () => Rest,
  ReturnType: () => ReturnType,
  String: () => String2,
  Symbol: () => Symbol2,
  TemplateLiteral: () => TemplateLiteral,
  Transform: () => Transform,
  Tuple: () => Tuple,
  Uint8Array: () => Uint8Array2,
  Uncapitalize: () => Uncapitalize,
  Undefined: () => Undefined,
  Union: () => Union,
  Unknown: () => Unknown,
  Unsafe: () => Unsafe,
  Uppercase: () => Uppercase,
  Void: () => Void
});

// node_modules/@sinclair/typebox/build/esm/type/type/index.mjs
var Type = type_exports3;

// src/contracts/contracts.ts
var import_nats_core = __toESM(require_mod4(), 1);
import { randomUUID } from "node:crypto";
format_exports?.Set?.("date-time", (value) => !isNaN(Date.parse(value)));
var DEFAULT_TENANT = "default";
var TENANT = DEFAULT_TENANT;
var SUBJECT_ROOT = `tenant.${DEFAULT_TENANT}`;
function setTenantSegment(segment) {
  const seg = segment.trim().replace(/[^\w.-]/g, "").replace(/[.]{2,}/g, ".");
  SUBJECT_ROOT = `tenant.${seg || DEFAULT_TENANT}`;
}
var V2PendingSubjectParams = Type.Object({
  tenant: Type.String({ default: TENANT }),
  nkey: Type.String({ minLength: 1 })
});
var V2PendingSubject = {
  pattern: "tenant.<tenant>.pending.<nkey>",
  params: V2PendingSubjectParams,
  // Pre-claim subjects ALWAYS live on the base tenant ("default"): vgate
  // publishes and grants them per its CONFIGURED tenant, and an unclaimed
  // agent has no segment yet — setTenantSegment must not re-scope them
  // (vmaker claim-wait PermissionViolation fix, 2026-08-18).
  build: (p) => `tenant.${p.tenant}.pending.${p.nkey}`,
  wildcard: `tenant.${DEFAULT_TENANT}.pending.>`,
  description: "Unclaimed agent metadata heartbeat \u2014 published by unclaimed agents"
};
var V2ClaimSubjectParams = Type.Object({
  tenant: Type.String({ default: TENANT }),
  nkey: Type.String({ minLength: 1 })
});
var V2ClaimSubject = {
  pattern: "tenant.<tenant>.claim.<nkey>",
  params: V2ClaimSubjectParams,
  // Pre-claim subject: base tenant always (see V2PendingSubject note) —
  // honors the tenant param instead of the segment-mutated SUBJECT_ROOT.
  build: (p) => `tenant.${p.tenant}.claim.${p.nkey}`,
  wildcard: `tenant.${DEFAULT_TENANT}.claim.>`,
  description: "Ownership assignment (auto-approve) \u2014 published by vgate to agent on claim"
};
var V2HbSubjectParams = Type.Object({
  tenant: Type.String({ default: TENANT }),
  nkey: Type.String({ minLength: 1 })
});
var V2HbSubject = {
  pattern: "tenant.<tenant>.user.<nkey>.agent.<nkey>.hb",
  params: V2HbSubjectParams,
  build: (p) => `${SUBJECT_ROOT}.user.${p.nkey}.agent.${p.nkey}.hb`,
  wildcard: `${SUBJECT_ROOT}.user.>.agent.>.hb`,
  description: "Liveness heartbeat for claimed agents (30s interval)"
};
var V2PromptSubjectParams = Type.Object({
  tenant: Type.String({ default: TENANT }),
  nkey: Type.String({ minLength: 1 })
});
var V2PromptSubject = {
  pattern: "tenant.<tenant>.user.<nkey>.agent.<nkey>.prompt.req",
  params: V2PromptSubjectParams,
  build: (p) => `${SUBJECT_ROOT}.user.${p.nkey}.agent.${p.nkey}.prompt.req`,
  wildcard: `${SUBJECT_ROOT}.user.>.agent.>.prompt.>`,
  description: "H2A prompt endpoint \u2014 human-to-agent prompt delivery. `.req` suffix is MANDATORY: NATS `>` matches one-or-more tokens, so a bare ...prompt publish is never received by the agent's ...prompt.> subscription (vgate publishes prompt.req \u2014 see vgate/cmd/vgate/main.go)"
};
var V2SessionSubjectParams = Type.Object({
  tenant: Type.String({ default: TENANT }),
  nkey: Type.String({ minLength: 1 }),
  op: Type.Union([
    Type.Literal("new"),
    Type.Literal("append"),
    Type.Literal("stream"),
    Type.Literal("get"),
    Type.Literal("branch"),
    Type.Literal("compact")
  ])
});
var V2SessionSubject = {
  pattern: "tenant.<tenant>.user.<nkey>.agent.<nkey>.session.<op>.req",
  params: V2SessionSubjectParams,
  build: (p) => `${SUBJECT_ROOT}.user.${p.nkey}.agent.${p.nkey}.session.${p.op}.req`,
  wildcard: `${SUBJECT_ROOT}.user.>.agent.>.session.>`,
  description: "Chatto session protocol endpoint \u2014 create/append/stream/get/branch/compact a pi-JSONL session for a bound room"
};
var FamilySubjectParams = Type.Object({
  tenant: Type.String({ default: TENANT }),
  nkey: Type.String({ minLength: 1 }),
  familyId: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  verb: Type.String({ minLength: 1 })
});
var FamilySubject = {
  pattern: "tenant.<tenant>.user.<nkey>.agent.<nkey>.family.<family_id>.<name>.<verb>",
  params: FamilySubjectParams,
  // familyId (UUIDv4) and name are sanitized to single subject tokens; the
  // verb is emitted AS GIVEN — it must come from FAMILY_STATIC_VERBS or
  // familyReplyVerb() (verbs carry dots by design: prompt.req / reply.<conv>).
  build: (p) => `${SUBJECT_ROOT}.user.${p.nkey}.agent.${p.nkey}.family.${sanitizeToken(p.familyId)}.${sanitizeToken(p.name)}.${p.verb}`,
  wildcard: `${SUBJECT_ROOT}.user.>.agent.>.family.>`,
  description: "v9 family lane (Tier W, same-owner): lead \u21C4 worker prompt/hb/events/reply under one family_id. Same NKey in user+agent slots (G4 shared JWT). Grant reach gated on G1 (perm-probe)."
};
var V2A2aSubjectParams = Type.Object({
  tenant: Type.String({ default: TENANT }),
  nkey: Type.String({ minLength: 1 })
});
var V2A2aSubject = {
  pattern: "tenant.<tenant>.a2a.<nkey>",
  params: V2A2aSubjectParams,
  build: (p) => `${SUBJECT_ROOT}.a2a.${p.nkey}`,
  wildcard: `${SUBJECT_ROOT}.a2a.>`,
  description: "A2A mailbox \u2014 agent-to-agent message delivery (per-agent wildcard for sub)"
};
var V3DiscoverySubjectParams = Type.Object({
  segment: Type.String({ minLength: 1 }),
  nkey: Type.String({ minLength: 1 })
});
var V3DiscoverySubject = {
  pattern: "$SRV.INFO.agents.<segment>.<nkey>",
  params: V3DiscoverySubjectParams,
  build: (p) => `$SRV.INFO.agents.${p.segment}.${p.nkey}`,
  // Parameterized wildcard (segment is dynamic; discovery is NOT under
  // SUBJECT_ROOT). Use discoverySubWildcard() for a concrete NATS sub subject.
  wildcard: "$SRV.INFO.agents.<segment>.>",
  description: "Signed agent announcement (discovery). pub pinned to own <segment>.<nkey>; sub wildcard $SRV.INFO.agents.<segment>.> for segment-wide directory watch. NOT under SUBJECT_ROOT \u2014 segment is explicit."
};
function discoverySubWildcard(segment) {
  return `$SRV.INFO.agents.${segment}.>`;
}
var V3TradeSubjectParams = Type.Object({
  tenant: Type.String({ default: TENANT }),
  verb: Type.Union([Type.Literal("offer"), Type.Literal("commit"), Type.Literal("settle")]),
  conv: Type.String({ minLength: 1 })
  // conversation_id
});
var V3TradeSubject = {
  pattern: "tenant.<tenant>.trade.<verb>.<conv>.req",
  params: V3TradeSubjectParams,
  build: (p) => `${SUBJECT_ROOT}.trade.${p.verb}.${p.conv}.req`,
  wildcard: `${SUBJECT_ROOT}.trade.>`,
  description: "Trade protocol (offer/commit/settle) \u2014 req-reply per conversation_id. offer=terms negotiation, commit=signed commitment + escrow intent, settle=budget-capped transfer. Policy \xA76/\xA79."
};
var V3AuditTradeSubjectParams = Type.Object({
  tenant: Type.String({ default: TENANT })
});
var V3AuditTradeSubject = {
  pattern: "tenant.<tenant>.audit.trade.>",
  params: V3AuditTradeSubjectParams,
  build: () => `${SUBJECT_ROOT}.audit.trade.>`,
  wildcard: `${SUBJECT_ROOT}.audit.trade.>`,
  description: "Trade audit stream \u2014 fleet-service appends trade/commit/settle + receipt records under this prefix (attributable per agent NKey). Agents/fleet-service sub the wildcard."
};
var KV_BUCKETS = {
  /** Agent→human ownership binding. Key: agent NKey, Value: { steward, name } */
  VCHAT_OWNERSHIP: {
    bucket: "vchat_ownership",
    description: "Agent-to-human ownership binding (hot path \u2014 read by auth callout)"
  },
  /** A2A follow relationships. Key: email, Value: { follower, following[] } */
  VCHAT_A2A_FOLLOWS: {
    bucket: "vchat_a2a_follows",
    description: "Per-user A2A follow relationships for permission scoping"
  },
  /** Human device NKeys. Key: nkey, Value: { human_uuid, email } */
  VCHAT_HUMANS: {
    bucket: "vchat_humans",
    description: "Human device NKey registry \u2014 maps device NKeys to human identities"
  },
  /** Agent roster. Key: nkey, Value: agent metadata */
  VCHAT_ROSTER: {
    bucket: "vchat_roster",
    description: "Agent roster \u2014 admission-derived (vgate writes at approve; agents NEVER write it \u2014 J4a/J4b KV-write retirement). Read by peers + the fleet directory via $KV.vchat_roster.> sub / $JS.API.*.GET.KV_vchat_roster pub"
  },
  /** Agent capability/online state. Key: nkey, Value: { capabilities, model, online }.
   * Written by vgate approve + POST /v1/agent/{nkey}/configure (the On Rack →
   * On Line switch); read by the agent's prompt gate + heartbeat. */
  VCHAT_CAPABILITIES: {
    bucket: "vchat_capabilities",
    description: "Agent capability advertisement + online state (On Rack/On Line switch)"
  },
  /** Segment/tenant registry. Key: tenant name, Value: { name, display_name,
   * created_at, agent_count, segment } — the segment HOME (segments ARE
   * tenants or tenant-scoped groups). Ratified 2026-08-04.
   *
   * J7: SUPERSEDED as the canonical registry by VCHAT_SEGMENT_POLICY below.
   * Kept as a legacy alias (migrated key-for-key); new admissions + the
   * multi-grant JWT read vchat_segment_policy. */
  VCHAT_TENANTS: {
    bucket: "vchat_tenants",
    description: "Segment/tenant registry \u2014 LEGACY alias (J7: superseded by vchat_segment_policy); the segment home"
  },
  /**
   * J7 RULING: the CANONICAL segment registry. Supersedes + merges
   * vchat_tenants (migrated key-for-key; vchat_tenants stays as a legacy
   * alias). Key: segment name → SegmentPolicy { jobs, budget_cap, ... }.
   * Admission (--segment) upserts; token.go derives the multi-grant JWT's
   * per-segment grants from it (Q-F: base_grants + segment_grants[N]).
   */
  VCHAT_SEGMENT_POLICY: {
    bucket: "vchat_segment_policy",
    description: "Canonical segment registry (J7 \u2014 supersedes/merges vchat_tenants); key: segment \u2192 {jobs, budget_cap}; multi-grant JWT source (Q-F)",
    max_value_bytes: 2048
  },
  /** A2A delegation records (policy §6 — future-ready tier). Key: delegation_id. */
  VCHAT_DELEGATIONS: {
    bucket: "vchat_delegations",
    description: "A2A delegation records (delegation_id \u2192 {task, initiator, peers, room_id, supervisors, budget_cap, state}) \u2014 policy \xA76",
    max_value_bytes: 4096,
    ttl_nanos: 0
  },
  /** Agent ED25519 public key storage. Key: nkey, Value: public_key bytes.
   * Signature-verification key source (discovery announce sigs verify here). */
  VCHAT_AGENT_PUBKEYS: {
    bucket: "vchat_agent_pubkeys",
    description: "Agent ED25519 public key storage (nkey \u2192 public_key bytes)",
    max_value_bytes: 128
  },
  /** Unclaimed agent pending approval. Key: nkey, Value: {name, capabilities, introduced_at}. 24h TTL. */
  VCHAT_PENDING: {
    bucket: "vchat_pending",
    description: "Unclaimed agent pending approval (nkey \u2192 {name, capabilities, introduced_at})",
    max_value_bytes: 4096,
    ttl_nanos: 24 * 60 * 60 * 1e9
    // 24h
  },
  /** Hash→nkey lookup for claim URLs. Key: hash, Value: nkey. 24h TTL. */
  VCHAT_PENDING_HASHES: {
    bucket: "vchat_pending_hashes",
    description: "Hash\u2192nkey lookup for claim URLs (hash \u2192 nkey)",
    max_value_bytes: 256,
    ttl_nanos: 24 * 60 * 60 * 1e9
    // 24h
  },
  /** Agent liveness records. Key: nkey, Value: {status, last_seen}. 120s TTL. */
  VCHAT_HEARTBEAT: {
    bucket: "vchat_heartbeat",
    description: "Agent liveness records (nkey \u2192 {status, last_seen}) \u2014 read by fleet-status derivation",
    max_value_bytes: 512,
    ttl_nanos: 120 * 1e9
    // 120s
  },
  /** Derived fleet status. Key: nkey, Value: FleetStatus. 60s TTL (offline on expiry).
   * Sidecar-mirrored from the roster/hb subjects — agents do NOT write this KV
   * directly (corrects the doc's wrong 'agent writes fleet_status' direction). */
  VCHAT_FLEET_STATUS: {
    bucket: "vchat_fleet_status",
    description: "Derived fleet status (nkey \u2192 FleetStatus; 60s TTL = offline on expiry) \u2014 sidecar-mirrored from roster/hb subjects, NOT agent-written",
    max_value_bytes: 4096,
    ttl_nanos: 60 * 1e9
    // 60s
  },
  /** Agent token budgets + spend for metering. Key: agent_nkey, Value: {budget_monthly_tokens, spent_tokens, window_start, fabric}. */
  VCHAT_BUDGETS: {
    bucket: "vchat_budgets",
    description: "Agent token budgets + spend for metering (agent_nkey \u2192 {budget_monthly_tokens, spent_tokens, window_start, fabric}) \u2014 the single ledger trade budget_cap reserves against",
    max_value_bytes: 1024
  },
  /** MyAgents fleet directory room. Key: room, Value: {room_id, group_id, url, updated_at}. Sidecar-written, vgate-read. */
  VCHAT_MYAGENTS_ROOM: {
    bucket: "vchat_myagents_room",
    description: "MyAgents fleet directory room \u2014 sidecar-written, vgate-read (key: room \u2192 {room_id, group_id, url, updated_at})",
    max_value_bytes: 1024
  },
  /** Accelerated-onboarding invite codes. Key: INVITE-XXXXXXXX, Value: {code, created_by, ...}. Persistent until used (logical expiry via expires_at). */
  VCHAT_INVITES: {
    bucket: "vchat_invites",
    description: "Accelerated-onboarding invite codes (INVITE-XXXXXXXX \u2192 {code, created_by, agent_name_hint?, created_at, used_at?, used_by?, expires_at}) \u2014 consumed once by introduce",
    max_value_bytes: 1024
  },
  /** Retired/compromised agent nkey tombstones. Key: nkey, Value: {retired_at, reason}. 30d TTL (blocks re-onboarding for the window). */
  VCHAT_RETIRED: {
    bucket: "vchat_retired",
    description: "Retired/compromised agent nkey tombstones (nkey \u2192 {retired_at, reason}) \u2014 blocks re-onboarding for the TTL window",
    max_value_bytes: 1024,
    ttl_nanos: 30 * 24 * 60 * 60 * 1e9
    // 30d
  },
  /** Chatto room → agent session bindings (D1: vchat_room_sessions) */
  VCHAT_ROOM_SESSIONS: {
    bucket: "vchat_room_sessions",
    description: "Chatto room \u2192 agent session bindings (room_id \u2192 {agent_nkey, session_id, mode, thread_map}) \u2014 sidecar writes, Chatto/sidecar read; routing table for the bridge (direct-call by agent_nkey)",
    max_value_bytes: 2048,
    ttl_nanos: 0
    // persistent until unbind
  },
  /** vgate (nats-init) provisions this; SDK declares it for the census. HUMAN enrollment invite codes (claim lane) — NOT vchat_invites (agent onboarding). 30d bucket TTL on purpose. */
  VCHAT_INVITE_CODES: {
    bucket: "vchat_invite_codes",
    description: "HUMAN enrollment invite codes for POST /api/invites/claim (key = base32 code \u2192 Invite{code, principal, rooms, community, host, role, created_at, expires_at, used_at, used_by}) \u2014 minted by cmd/invite-mint, consumed once by the claim, which writes vchat_npub_bindings. Created by vgate/cmd/nats-init (30d TTL); gateway opens createIfMissing=false",
    max_value_bytes: 1024
  },
  /** npub ↔ agent-key bindings. Written by the invite claim, read by the gateway (createIfMissing=false) — hence provisioned by nats-init, not the writer. No bucket TTL (a binding is durable). */
  VCHAT_NPUB_BINDINGS: {
    bucket: "vchat_npub_bindings",
    description: "Nostr npub \u2194 agent key bindings (written by POST /api/invites/claim, read by buzz-gateway) \u2014 created by vgate/cmd/nats-init; persistent (no TTL)"
  },
  /** Segment membership (J7). Key: segment → members; the multi-grant JWT path reads it. Created by nats-init. */
  VCHAT_SEGMENT_MEMBERS: {
    bucket: "vchat_segment_members",
    description: "Segment membership records (J7) \u2014 key: segment name \u2192 member set; complements vchat_segment_policy. Created by vgate/cmd/nats-init"
  },
  /** Revoked-session tombstones, 24h TTL (nats-init-verified). Writers: the session-revoke path; readers: validators. */
  VCHAT_SESSION_REVOKED: {
    bucket: "vchat_session_revoked",
    description: "Revoked session tombstones (24h TTL, declared+verified by vgate/cmd/nats-init TTL audit) \u2014 session ids are refused while a tombstone lives"
  },
  /** VizShow records (vcc). API is the only writer; created by nats-init createKVMissing (history=5, 64KiB values). */
  VCHAT_VIZSHOW: {
    bucket: "vchat_vizshow",
    description: "VizShow records (vcc) \u2014 API is the only writer. Created by vgate/cmd/nats-init createKVMissing (history=5, max_value 65536)"
  },
  /** VizShow recommendations; curator-only writer (nats-init createKVMissing, history=1, 4KiB values). */
  VCHAT_VIZSHOW_QUEUE: {
    bucket: "vchat_vizshow_queue",
    description: "VizShow recommendations \u2014 curator-only writer. Created by vgate/cmd/nats-init createKVMissing (history=1, max_value 4096)"
  }
};
var OwnershipEntry = Type.Object({
  steward: Type.String(),
  /** Human-readable agent name (from .pi/agent_id or env var) */
  name: Type.Optional(Type.String()),
  /** ISO timestamp of when the agent was claimed */
  ensouled_at: Type.Optional(Type.String({ format: "date-time" })),
  /**
   * The agent's Chatto user id (sidecar-written at provisioning). LIVE WIRE:
   * deployed vgate writes {"human_uuid": ...} for the steward field while the
   * schema declares {"steward": ...} — consumers MUST accept both (sidecar
   * dual-field UnmarshalJSON).
   */
  chatto_user_id: Type.Optional(Type.String()),
  /**
   * Effective agent segment (policy decision 4: derived-with-admin-override,
   * snapshot in ownership). BARE segment id (EA-6: dotted
   * "vchat.tenant.<name>" ids retired).
   */
  segment: Type.Optional(Type.String()),
  /**
   * J7 (Q-F): the segments this agent is admitted to (multi-grant). The JWT =
   * base_grants + segment_grants[N]. `segment` (above) is the PRIMARY/first
   * segment (back-compat); segment_grants is the full admitted set. Empty or
   * [segment] = single-segment agent (today's behavior).
   */
  segment_grants: Type.Optional(Type.Array(Type.String()))
});
var SegmentPolicy = Type.Object({
  name: Type.String({ minLength: 1 }),
  display_name: Type.Optional(Type.String()),
  /** Policy-asserted job capabilities (Q-E: authoritative for routing — the
   * JWT wire grant is the gate; agent-asserted caps are a discovery filter).
   * Trade is P2 (J6). */
  jobs: Type.Optional(Type.Array(Type.String())),
  /** Per-segment budget ceiling (mirrors the announcement; the metering
   * ledger reserves against it — J6 cap check sums chat + escrow). */
  budget_cap: Type.Optional(Type.Integer({ minimum: 0 })),
  created_at: Type.String({ format: "date-time" })
});
var CapabilitiesEntry = Type.Object({
  capabilities: Type.Optional(Type.Array(Type.String())),
  model: Type.Optional(Type.String()),
  online: Type.Optional(Type.Boolean())
});
var HeartbeatPayload = Type.Object({
  agent: Type.String(),
  nkey: Type.Optional(Type.String()),
  instance_id: Type.Optional(Type.String()),
  status: Type.Optional(Type.Union([Type.Literal("online"), Type.Literal("busy"), Type.Literal("idle"), Type.Literal("away"), Type.Literal("offline")])),
  model: Type.Optional(Type.String()),
  // On Rack (OR) vs On Line (OL): online=false means the agent is racked but
  // not LLM-configured (status replies only). Mirrors vchat_capabilities.online.
  online: Type.Optional(Type.Boolean()),
  capabilities: Type.Optional(Type.Array(Type.String())),
  // Agent SDK version that published this heartbeat (for fleet inventory).
  sdk_version: Type.Optional(Type.String()),
  session: Type.Optional(Type.String()),
  fabric: Type.Optional(Type.String()),
  lm: Type.Optional(Type.Union([Type.Literal("connected"), Type.Literal("disconnected"), Type.Literal("partial")])),
  models: Type.Optional(Type.Array(Type.String())),
  lmCount: Type.Optional(Type.Integer()),
  ts: Type.String({ format: "date-time" }),
  interval_s: Type.Number()
});
var AgentAnnouncement = Type.Object({
  ts: Type.String({ format: "date-time" }),
  name: Type.String({ minLength: 1 }),
  nkey: Type.String({ minLength: 1 }),
  segment: Type.String({ minLength: 1 }),
  capabilities: Type.Array(Type.String()),
  online: Type.Boolean(),
  model: Type.String(),
  sdk_version: Type.String()
}, { additionalProperties: false });
var ANNOUNCEMENT_FIELD_ORDER = [
  "ts",
  "name",
  "nkey",
  "segment",
  "capabilities",
  "online",
  "model",
  "sdk_version"
];
function canonicalAnnouncementBytes(ann) {
  const ordered = {};
  for (const key of ANNOUNCEMENT_FIELD_ORDER) {
    const v = ann[key];
    if (v !== void 0) ordered[key] = v;
  }
  return new TextEncoder().encode(JSON.stringify(ordered));
}
async function signAnnouncement(ann, seed) {
  const kp = import_nats_core.nkeys.fromSeed(new TextEncoder().encode(seed));
  return kp.sign(canonicalAnnouncementBytes(ann));
}
var FamilyChildEntry = Type.Object({
  name: Type.String({ minLength: 1 }),
  role: Type.String(),
  caps: Type.Array(Type.String()),
  state: Type.String()
});
var AgentAnnouncementV2 = Type.Object({
  v: Type.Literal(2),
  ts: Type.String({ format: "date-time" }),
  name: Type.String({ minLength: 1 }),
  nkey: Type.String({ minLength: 1 }),
  segment: Type.String({ minLength: 1 }),
  capabilities: Type.Array(Type.String()),
  online: Type.Boolean(),
  model: Type.String(),
  sdk_version: Type.String(),
  children: Type.Optional(Type.Array(FamilyChildEntry))
}, { additionalProperties: false });
var ANNOUNCEMENT_V2_FIELD_ORDER = [
  "v",
  "ts",
  "name",
  "nkey",
  "segment",
  "capabilities",
  "online",
  "model",
  "sdk_version",
  "children"
];
function canonicalAnnouncementV2Bytes(ann) {
  const ordered = {};
  for (const key of ANNOUNCEMENT_V2_FIELD_ORDER) {
    const v = ann[key];
    if (v !== void 0) ordered[key] = v;
  }
  return new TextEncoder().encode(JSON.stringify(ordered));
}
async function signAnnouncementV2(ann, seed) {
  const kp = import_nats_core.nkeys.fromSeed(new TextEncoder().encode(seed));
  return kp.sign(canonicalAnnouncementV2Bytes(ann));
}
var TradeReceipt = Type.Object({
  receipt_id: Type.String({ minLength: 1 }),
  // idempotency key (JetStream Nats-Msg-Id dedup)
  conversation_id: Type.String({ minLength: 1 }),
  kind: Type.Union([
    Type.Literal("offer"),
    Type.Literal("commit"),
    Type.Literal("settle"),
    Type.Literal("settle_fail")
  ]),
  offerer_nkey: Type.String({ minLength: 1 }),
  // offer_sig verifier (attribution → owner)
  amount: Type.String({ minLength: 1 }),
  // canonical DECIMAL STRING (e.g. "10.00")
  budget_cap_ref: Type.String(),
  // the policy cap this settles against
  offer_sig: Type.String({ minLength: 1 }),
  // offerer NKey sig over canonicalTradeBytes
  fleet_sig: Type.String({ minLength: 1 })
  // fleet-service sig over canonicalTradeBytes (append authority)
}, { additionalProperties: false });
var TradeOfferRequest = Type.Object({
  verb: Type.Literal("offer"),
  conversation_id: Type.String({ minLength: 1 }),
  offerer_nkey: Type.String({ minLength: 1 }),
  amount: Type.String({ minLength: 1 }),
  // canonical DECIMAL STRING
  budget_cap_ref: Type.String(),
  // policy cap this offer is bounded by
  offer_sig: Type.String({ minLength: 1 }),
  // offerer NKey sig over canonicalTradeBytes(offer)
  terms: Type.Optional(Type.String()),
  expires_at: Type.Optional(Type.String({ format: "date-time" })),
  ts: Type.String({ format: "date-time" })
}, { additionalProperties: false });
var TradeCommitRequest = Type.Object({
  verb: Type.Literal("commit"),
  conversation_id: Type.String({ minLength: 1 }),
  offerer_nkey: Type.String({ minLength: 1 }),
  committer_nkey: Type.String({ minLength: 1 }),
  offer_sig: Type.String({ minLength: 1 }),
  // re-stated offer being committed to
  commit_sig: Type.String({ minLength: 1 }),
  // committer NKey sig (dual-sig)
  amount: Type.String({ minLength: 1 }),
  budget_cap_ref: Type.String(),
  escrow_id: Type.String({ minLength: 1 }),
  // vchat_escrow.<conversation_id> intent
  ts: Type.String({ format: "date-time" })
}, { additionalProperties: false });
var TradeSettleRequest = Type.Object({
  verb: Type.Literal("settle"),
  conversation_id: Type.String({ minLength: 1 }),
  offerer_nkey: Type.String({ minLength: 1 }),
  committer_nkey: Type.String({ minLength: 1 }),
  offer_sig: Type.String({ minLength: 1 }),
  // dual-sig (both verified at settle)
  commit_sig: Type.String({ minLength: 1 }),
  amount: Type.String({ minLength: 1 }),
  budget_cap_ref: Type.String(),
  escrow_id: Type.String({ minLength: 1 }),
  ts: Type.String({ format: "date-time" })
}, { additionalProperties: false });
var TradeRequest = Type.Union([
  TradeOfferRequest,
  TradeCommitRequest,
  TradeSettleRequest
]);
var TradeOfferResponse = Type.Object({
  verb: Type.Literal("offer"),
  ok: Type.Literal(true),
  escrow_id: Type.String({ minLength: 1 }),
  state: Type.Literal("offered"),
  receipt_id: Type.String({ minLength: 1 }),
  ts: Type.String({ format: "date-time" })
}, { additionalProperties: false });
var TradeCommitResponse = Type.Object({
  verb: Type.Literal("commit"),
  ok: Type.Literal(true),
  escrow_id: Type.String({ minLength: 1 }),
  state: Type.Literal("committed"),
  receipt_id: Type.String({ minLength: 1 }),
  ts: Type.String({ format: "date-time" })
}, { additionalProperties: false });
var TradeSettleResponse = Type.Object({
  verb: Type.Literal("settle"),
  ok: Type.Literal(true),
  escrow_id: Type.String({ minLength: 1 }),
  state: Type.Literal("settled"),
  tx_id: Type.String({ minLength: 1 }),
  // wallet transfer ledger id
  receipt_id: Type.String({ minLength: 1 }),
  ts: Type.String({ format: "date-time" })
}, { additionalProperties: false });
var TradeResponse = Type.Union([
  TradeOfferResponse,
  TradeCommitResponse,
  TradeSettleResponse
]);
var TradeError = Type.Object({
  verb: Type.Union([Type.Literal("offer"), Type.Literal("commit"), Type.Literal("settle")]),
  ok: Type.Literal(false),
  error: Type.String({ minLength: 1 }),
  code: Type.Optional(Type.Union([
    Type.Literal("bad_state"),
    Type.Literal("cap_exceeded"),
    Type.Literal("insufficient_balance"),
    Type.Literal("sig_invalid"),
    Type.Literal("already_committed")
  ])),
  escrow_id: Type.Optional(Type.String()),
  state: Type.Optional(Type.String()),
  ts: Type.String({ format: "date-time" })
}, { additionalProperties: false });
var EscrowState = Type.Union([
  Type.Literal("offered"),
  Type.Literal("committed"),
  Type.Literal("settled"),
  Type.Literal("released"),
  Type.Literal("disputed"),
  Type.Literal("frozen")
]);
var EscrowContract = Type.Object({
  escrow_id: Type.String({ minLength: 1 }),
  // = conversation_id-derived key
  conversation_id: Type.String({ minLength: 1 }),
  state: EscrowState,
  offerer_nkey: Type.String({ minLength: 1 }),
  /** Set at committed (absent in the offered state). */
  committer_nkey: Type.Optional(Type.String({ minLength: 1 })),
  amount: Type.String({ minLength: 1 }),
  // canonical DECIMAL STRING
  budget_cap_ref: Type.String(),
  // policy cap this escrow reserves against
  offer_sig: Type.String({ minLength: 1 }),
  // offerer NKey sig over canonicalTradeBytes (immutable)
  /** Committer NKey sig — set at committed (dual-sig root). */
  commit_sig: Type.Optional(Type.String({ minLength: 1 })),
  /** CAS optimistic-concurrency version (single-writer guard). */
  revision: Type.Integer({ minimum: 0 }),
  /** Wallet ledger tx_id once settled. */
  settled_tx_id: Type.Optional(Type.String({ minLength: 1 })),
  /** Reason text when state==disputed. */
  dispute_reason: Type.Optional(Type.String()),
  created_at: Type.String({ format: "date-time" }),
  updated_at: Type.String({ format: "date-time" })
}, { additionalProperties: false });
var RoomSessionBinding = Type.Object({
  room_id: Type.String(),
  agent_nkey: Type.String(),
  session_id: Type.String(),
  mode: Type.Union([Type.Literal("main"), Type.Literal("per-room"), Type.Literal("per-thread")]),
  /**
   * Participation level (policy §1.3/§4.1, ratified 2026-08-04): none →
   * mention-only → ambient-only → full. Room owners set up to ambient-only;
   * full = segment-admin audited action + REQUIRED budget_cap.
   * NAMING: "ambient-only" deliberately differs from the shipped
   * capabilities:["ambient"] quiet-context FLAG.
   */
  participation: Type.Optional(Type.Union([
    Type.Literal("none"),
    Type.Literal("mention-only"),
    Type.Literal("ambient-only"),
    Type.Literal("full")
  ])),
  /**
   * Budget cap — REQUIRED when participation == "full". Ratified 2026-08-04:
   * a RESERVATION against the agent's vchat_budgets ledger (no second
   * ledger); soft-limit via CheckBudgetAt (remaining%) → degrade-notify.
   */
  budget_cap: Type.Optional(Type.Object({
    per_cycle_tokens: Type.Integer({ minimum: 1 })
  })),
  thread_map: Type.Optional(Type.Record(Type.String(), Type.String())),
  capabilities: Type.Optional(Type.Array(Type.Union([Type.Literal("image"), Type.Literal("ambient")]))),
  bound_at: Type.String({ format: "date-time" }),
  bound_by: Type.Optional(Type.String({ format: "email" }))
});
var DelegationState = Type.Union([
  Type.Literal("pending"),
  Type.Literal("active"),
  Type.Literal("degraded"),
  Type.Literal("completed"),
  Type.Literal("failed"),
  Type.Literal("cancelled")
]);
var DelegationRecord = Type.Object({
  task: Type.String(),
  initiator: Type.String(),
  // the delegating agent nkey
  peers: Type.Array(Type.String()),
  // v1 pairwise; N-agent = v2
  room_id: Type.String(),
  // the delegation console room
  supervisors: Type.Array(Type.String({ format: "email" })),
  budget_cap: Type.Object({ per_cycle_tokens: Type.Integer({ minimum: 1 }) }),
  state: DelegationState,
  created_by: Type.String({ format: "email" }),
  // HUMAN — v1 invariant
  created_at: Type.String({ format: "date-time" }),
  audit_ref: Type.Optional(Type.String()),
  /** Reason a terminal state was entered (lane F: "agent_retired" on retire-chain cancel). */
  reason: Type.Optional(Type.String())
});
var ChattoMessageEnvelope = Type.Object({
  text: Type.String(),
  chatto_msg_id: Type.String(),
  chatto_room: Type.String(),
  chatto_actor: Type.String(),
  thread_id: Type.Optional(Type.String()),
  /** Sidecar classification (S1): "ambient" = unmentioned chatter → quiet context; "mention" = @NKEY addressed. C2 schema field — UI renders only. */
  kind: Type.Optional(Type.Union([Type.Literal("user"), Type.Literal("ambient"), Type.Literal("mention")])),
  /** True when the message mentions the agent's @NKEY (sidecar-set, S1). */
  mentioned: Type.Optional(Type.Boolean()),
  attachments: Type.Optional(Type.Array(Type.Object({
    mime: Type.String(),
    asset_ref: Type.String(),
    url: Type.Optional(Type.String())
  }))),
  ts: Type.String({ format: "date-time" })
});
var SessionAppendReply = Type.Object({
  ok: Type.Literal(true),
  /**
   * Globally-unique id of the appended head entry (Phase 1: WIDENED).
   * It used to be the JSONL entry's 8-hex id — unique only within one file
   * (DEBATE-BRIEF T3) — which leaked a file-local coordinate onto the wire.
   * It is now the entry's `uid` (UUIDv7, minted at append = where the fact
   * becomes durable). The 8-hex `id` stays inside the file.
   */
  head_id: Type.String(),
  session_id: Type.String(),
  /** Per-session monotonic seq of the appended head entry (also on the entry). */
  seq: Type.Optional(Type.Integer({ minimum: 1 }))
});
var FamilyBlock = Type.Object({
  role: Type.Optional(Type.String()),
  steer: Type.Optional(Type.String()),
  receipt: Type.Optional(Type.Boolean())
});
var A2aRequestPayload = Type.Object({
  type: Type.Literal("a2a_request"),
  id: Type.String(),
  prompt: Type.String(),
  from: Type.Object({
    nkey: Type.String(),
    name: Type.Optional(Type.String()),
    /** Phase 1: the sender's SESSION id (was not carried at all). */
    sessionId: Type.Optional(Type.String())
  }),
  attachments: Type.Optional(Type.Array(Type.Object({ filename: Type.String(), content: Type.String() }))),
  a2a: Type.Optional(Type.Object({
    intent: Type.Union([
      Type.Literal("question"),
      Type.Literal("request"),
      Type.Literal("handoff"),
      Type.Literal("reply"),
      Type.Literal("sync"),
      Type.Literal("buddy_request"),
      Type.Literal("buddy_accept"),
      Type.Literal("buddy_reject")
    ]),
    conversationId: Type.Optional(Type.String()),
    /**
     * Phase 1: `inReplyTo` existed since v2 with ZERO writers (DEBATE-BRIEF
     * T5). a2aSend now writes it whenever the send answers a known message.
     */
    inReplyTo: Type.Optional(Type.String()),
    /** Per-conversation monotonic counter (net/conversation.ts). */
    seq: Type.Optional(Type.Integer({ minimum: 1 })),
    /** Alias of inReplyTo under the uniform identity name. */
    parentMessageId: Type.Optional(Type.String({ minLength: 1 })),
    replySubject: Type.Optional(Type.String()),
    sensitivity: Type.Optional(Type.Union([Type.Literal("normal"), Type.Literal("silent")]))
  })),
  /**
   * v9 family lane (UPGRADE.md §4.1) — optional, §5.6-tolerated. Absent on
   * every pre-v9 envelope; consumers MUST NOT require it.
   */
  family: Type.Optional(FamilyBlock),
  ts: Type.String({ format: "date-time" }),
  ttlS: Type.Optional(Type.Integer({ minimum: 1 }))
});
var A2aResponsePayload = Type.Object({
  type: Type.Literal("a2a_response"),
  id: Type.String(),
  from: Type.Object({
    nkey: Type.String(),
    name: Type.Optional(Type.String()),
    /** Phase 1: the sender's SESSION id. */
    sessionId: Type.Optional(Type.String())
  }),
  text: Type.String(),
  error: Type.Optional(Type.Boolean()),
  errorCode: Type.Optional(Type.Integer()),
  /** Phase 1 conversation identity on the response leg (all optional on the wire). */
  conversationId: Type.Optional(Type.String({ minLength: 1 })),
  /** messageId of the request this response answers. */
  inReplyTo: Type.Optional(Type.String({ minLength: 1 })),
  parentMessageId: Type.Optional(Type.String({ minLength: 1 })),
  seq: Type.Optional(Type.Integer({ minimum: 1 })),
  /**
   * v9 delivery receipt (UPGRADE.md §4.1) — present ONLY when the request asked
   * (request `family.receipt: true`). "delivered" = the receiving daemon handed
   * the prompt to its worker session; "queued" = held for a busy/loading worker.
   * Best-effort on Tier W (no store-and-forward, G5); REAL acks stay Tier L
   * socket-level.
   */
  receipt: Type.Optional(Type.Union([Type.Literal("delivered"), Type.Literal("queued")])),
  ts: Type.String({ format: "date-time" })
});
var ChunkPayload = Type.Object({
  type: Type.Union([
    Type.Literal("response"),
    Type.Literal("status"),
    Type.Literal("query"),
    Type.Literal("error"),
    Type.Literal("task_ack"),
    Type.Literal("task_progress"),
    Type.Literal("task_complete")
  ]),
  data: Type.Union([
    Type.String(),
    Type.Object({
      id: Type.String(),
      prompt: Type.String(),
      attachments: Type.Optional(Type.Array(Type.Object({ filename: Type.String(), content: Type.String() })))
    })
  ]),
  truncated: Type.Optional(Type.Object({ full: Type.Integer() })),
  /**
   * Phase 1 conversation identity (ruling 2026-10-03). `conversationId` fixes a
   * schema DRIFT: net/types.ts:117 already declared it while this schema — the
   * decoder's contract — omitted it. All four fields are OPTIONAL on the wire
   * (§5.6 tolerance: an older frame still validates), but every producer in
   * this SDK sets them (see net/h2a.ts, net/reply.ts, net/session.ts).
   */
  conversationId: Type.Optional(Type.String({ minLength: 1 })),
  /** UUIDv7 — this chunk's own identity. */
  messageId: Type.Optional(Type.String({ minLength: 1 })),
  /** messageId of the frame this chunk answers. */
  parentMessageId: Type.Optional(Type.String({ minLength: 1 })),
  /** Per-conversation monotonic counter (net/conversation.ts). */
  seq: Type.Optional(Type.Integer({ minimum: 1 }))
});
var H2aPromptPayload = Type.Object({
  messages: Type.Array(Type.Object({
    role: Type.String(),
    content: Type.String()
  })),
  reply_to: Type.String({ minLength: 1 }),
  model: Type.Optional(Type.String()),
  stream: Type.Optional(Type.Boolean()),
  /** This prompt's own identity — UUIDv7 (lib/uuidv7.ts). */
  messageId: Type.Optional(Type.String({ minLength: 1 })),
  /** Stable across the exchange; echoed on every reply chunk. */
  conversationId: Type.Optional(Type.String({ minLength: 1 })),
  parentMessageId: Type.Optional(Type.String({ minLength: 1 })),
  seq: Type.Optional(Type.Integer({ minimum: 1 }))
});
var ClaimPayload = Type.Object({
  nkey: Type.String(),
  nonce: Type.String(),
  session: Type.String(),
  claimed_at: Type.String({ format: "date-time" })
});
var PERMISSIONS = {
  /** Unclaimed agent — can only announce pending + listen for claim */
  UNCLAIMED_AGENT: {
    pub: [`${SUBJECT_ROOT}.pending.<nkey>`],
    sub: [`${SUBJECT_ROOT}.claim.<nkey>`],
    deny: ["$SYS.>", "_INBOX.>"]
  },
  /** Claimed agent — V3 deny-by-default grant set.
   *
   *  TRUTH SOURCE: vgate/internal/agentidp/token.go `DeriveClaimedPermissions`
   *  (the shared grant set BOTH emit paths call — mint + callout; see the
   *  S0/R2 collapse note in token.go). This object is its TS mirror; the
   *  conformance test test/unit/v3-grants-conformance.test.ts asserts set
   *  equality against the Go output (read from token.go, not ported).
   *
   *  V3 Sprint corrections vs the pre-Sprint form:
   *   • Segment is a LITERAL `tenant.<segment>.*` placeholder (NOT the
   *     `${SUBJECT_ROOT}`-baked `tenant.default` — the segment is ownership-
   *     derived per token.go.resolveSegment, NEVER hardcoded). `<segment>`
   *     and `<nkey>` are callout/mint-substituted at CONNECT.
   *   • NO wallet / trade / app / audit grants — the entire P2 commerce plane
   *     is deny-by-default (token.go explicit deny, lines 332-333).
   *   • `_INBOX.>` is ALLOWED (pub+sub) — request-reply works; moved OUT of
   *     `deny` (pre-Sprint wrongly listed it as denied).
   *   • KV is READ-ONLY: `$KV.*` sub watches + `$JS.API.{STREAM.MSG,DIRECT}.GET.*`
   *     pub (J4b KV-write retirement — agents NEVER write roster/capabilities;
   *     vgate writes roster at approve, capabilities at the On/Off switch).
   *   • Agent path grant is the `.>` wildcard (covers hb + prompt-reply +
   *     session ops), not the narrow pre-Sprint `.hb` / `.prompt` forms. */
  CLAIMED_AGENT: {
    pub: [
      // V3 announcement plane — own-nkey EXACT template (path-pinned spoof
      // guard: a `.>` grant here would let an agent announce under another's nkey).
      "$SRV.INFO.agents.<segment>.<nkey>",
      // V2 tenant surface (preserved): heartbeat, prompt reply, session ops.
      "tenant.<segment>.user.<nkey>.agent.<nkey>.>",
      "tenant.<segment>.a2a.>",
      // Tikoly policy signal (operator sign-off, wave-0): segment-scoped pub
      // for policy-change bumps. Per-segment only; multi-grant shape guarded
      // by vgate approve_test.go. (Re-synced from token.go — F1 truth-sync.)
      "tenant.<segment>.policy.>",
      // J4b KV-WRITE RETIREMENT: NO `$KV.<bucket>.>` publish. Agents READ the
      // two presence streams via JetStream direct/stream GET (request/reply).
      // NOTE the exact-vs-`.>` trap: `>` needs >=1 token, so a `.>` grant alone
      // does NOT match the exact get subject — BOTH forms are granted.
      "$JS.API.STREAM.MSG.GET.KV_vchat_roster",
      "$JS.API.STREAM.MSG.GET.KV_vchat_roster.>",
      "$JS.API.STREAM.MSG.GET.KV_vchat_capabilities",
      "$JS.API.STREAM.MSG.GET.KV_vchat_capabilities.>",
      "$JS.API.DIRECT.GET.KV_vchat_roster",
      "$JS.API.DIRECT.GET.KV_vchat_roster.>",
      "$JS.API.DIRECT.GET.KV_vchat_capabilities",
      "$JS.API.DIRECT.GET.KV_vchat_capabilities.>",
      "$JS.API.INFO.>",
      // Request-reply: responses to vgate's chat inbox + KV acks.
      "_INBOX.>"
    ],
    sub: [
      // V3 segment-scoped discovery (Q-D): read peer announcements directly.
      "$SRV.INFO.agents.<segment>.>",
      // V2 tenant surface (preserved).
      "tenant.<segment>.user.<nkey>.agent.<nkey>.>",
      "tenant.<segment>.a2a.<nkey>.>",
      // Lane B-vgate (doc 19 B.2): the retire control subject — EXACT own-nkey
      // so the agent receives its own retirement notification (retire.go
      // publishes tenant.<seg>.agent.retired.<canonical> after the KV deletes).
      // (Re-synced from token.go — F1 truth-sync.)
      "tenant.<segment>.agent.retired.<nkey>",
      // J4b: READ-ONLY KV watches (subscribe = read). Writes retired (see pub).
      "$KV.vchat_roster.>",
      "$KV.vchat_capabilities.>",
      "$JS.API.INFO.>",
      "_INBOX.>"
    ],
    deny: ["$SYS.>"]
  },
  /** Human dashboard — can prompt agents and see pending */
  HUMAN_DASHBOARD: {
    pub: [
      `${SUBJECT_ROOT}.user.*.agent.*.prompt`,
      `${SUBJECT_ROOT}.rpc.wallet.*`,
      "$SRV.INFO.agents"
    ],
    sub: [
      `${SUBJECT_ROOT}.user.*.agent.*.prompt`,
      `${SUBJECT_ROOT}.user.*.agent.*.hb`,
      `${SUBJECT_ROOT}.pending.*`,
      "$SRV.INFO"
    ],
    deny: ["$SYS.>", "_INBOX.>"]
  },
  /** SITE (V3.1) — customer-intranet leaf principal running the Synadia
   *  v0.3 agent mesh. TRUTH SOURCE: vgate/internal/agentidp/token.go
   *  `DeriveSiteMeshPermissions`; this object is its TS mirror; the SITE_MESH
   *  conformance test asserts set equality + the three invariants (exact
   *  3-token Micro literals never `>` — non-collision with the V3
   *  announcement plane; agent-verb subjects pinned to the site-id owner
   *  token on pub; zero tenant-dot or KV grants — sites never touch the IDP
   *  planes). See docs/UNIFIED_A2A_FABRIC.md §3. */
  SITE_MESH: {
    pub: [
      // SEND verbs (ruling Q8): mesh-wide — address ANY site's endpoints,
      // bounded by admission/policy. Trade-off documented in token.go.
      "agents.prompt.*.>",
      "agents.a2a.*.>",
      // IDENTITY verbs — pinned to THIS site's namespace (`*` = agent-kind;
      // the old literal <agent> placeholder matched nothing real — F1).
      "agents.hb.*.<site-id>.>",
      "agents.status.*.<site-id>.>",
      "agents.reply.*.<site-id>.>",
      "agents.events.*.<site-id>.>",
      // Buddy protocol verbs (pi-a2a extension verbs, site-scoped).
      "agents.buddy_request.*.<site-id>.>",
      "agents.buddy_accept.*.<site-id>.>",
      "agents.buddy_reject.*.<site-id>.>",
      // Micro discovery — EXACT literals, never `>` (non-collision proof).
      "$SRV.INFO.agents",
      "$SRV.PING.agents",
      // Request-reply routing.
      "_INBOX.>"
    ],
    sub: [
      // Mesh-wide PRESENCE only (hb = protocol-fixed visibility verb).
      "agents.hb.>",
      // Everything else: own-namespace inbound only (F3 — no cross-site
      // eavesdrop on mailboxes/events/buddy).
      "agents.prompt.*.<site-id>.>",
      "agents.a2a.*.<site-id>.>",
      "agents.status.*.<site-id>.>",
      "agents.reply.*.<site-id>.>",
      "agents.events.*.<site-id>.>",
      "agents.buddy_request.*.<site-id>.>",
      "agents.buddy_accept.*.<site-id>.>",
      "agents.buddy_reject.*.<site-id>.>",
      // Micro discovery — EXACT literals, never `>`.
      "$SRV.INFO.agents",
      "$SRV.PING.agents",
      "_INBOX.>"
    ],
    deny: ["$SYS.>"]
  }
};
var STREAMS = {
  A2A_MESSAGES: {
    name: "A2A_MESSAGES",
    subjects: [`${SUBJECT_ROOT}.a2a.>`],
    retention: "limits",
    max_msgs: 1e4,
    max_age: 864e11,
    // 24h in nanos
    max_bytes: 536870912,
    // 512 MiB
    max_msgs_per_subject: -1,
    storage: "file"
  },
  A2A_BUDDIES: {
    name: "A2A_BUDDIES",
    subjects: [`${SUBJECT_ROOT}.buddy.>`],
    retention: "limits",
    max_msgs: 100,
    max_age: 864e11,
    // 24h in nanos
    storage: "file"
  }
};
function sanitizeToken(s) {
  let result2 = "";
  for (const c of s) {
    if (c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c >= "0" && c <= "9" || c === "-" || c === "_" || c === ".") {
      result2 += c;
    } else {
      result2 += "_";
    }
  }
  return result2;
}

// src/version.ts
import { readFileSync as readFileSync4 } from "node:fs";
function sdkVersion() {
  const stamped = "1.5.0";
  if (stamped) return stamped;
  try {
    const pkg = JSON.parse(
      readFileSync4(new URL("../package.json", import.meta.url), "utf-8")
    );
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
var SDK_VERSION = sdkVersion();

// src/net/heartbeat.ts
var DEFAULT_INTERVAL_MS = 3e4;
function hbSubjectV2(nkey) {
  return `${SUBJECT_ROOT}.user.${nkey}.agent.${nkey}.hb`;
}
async function buildHeartbeatPayload(identity, options, intervalMs) {
  const online = typeof options.online === "function" ? await options.online() : options.online === true;
  const effectiveOnline = options.status === "offline" ? false : online;
  const model = typeof options.model === "function" ? options.model() ?? void 0 : options.model;
  const hb = {
    agent: identity.nkey,
    owner: identity.nkey,
    // single-NKey convention
    name: identity.nonce,
    instance_id: identity.nkey,
    status: options.status ?? (online ? "online" : "idle"),
    // Both `lm` and `online` follow effectiveOnline so an explicit `offline`
    // cannot be contradicted by a connected LM in the same payload.
    lm: options.lm ?? (effectiveOnline ? "connected" : "disconnected"),
    ...model ? { model } : {},
    online: effectiveOnline,
    sdk_version: SDK_VERSION,
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    interval_s: Math.round(intervalMs / 1e3)
  };
  return hb;
}
function startHeartbeat(nc, identity, options = {}) {
  const subject = hbSubjectV2(identity.nkey);
  const intervalMs = options.intervalMs || DEFAULT_INTERVAL_MS;
  const enc2 = new TextEncoder();
  async function publish() {
    const hb = await buildHeartbeatPayload(identity, options, intervalMs);
    const enc3 = new TextEncoder();
    try {
      const validated = Decode(HeartbeatPayload, hb);
      nc.publish(subject, enc3.encode(JSON.stringify(validated)));
    } catch (e) {
      console.warn("[heartbeat] validation error:", e.message);
    }
  }
  let ticking = false;
  void publish();
  const timer = setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try {
      await publish();
    } finally {
      ticking = false;
    }
  }, intervalMs);
  timer.unref?.();
  return () => {
    clearInterval(timer);
  };
}

// src/net/presence.ts
var DEFAULT_INTERVAL_MS2 = 3e4;
function toBase64Std(bytes) {
  return Buffer.from(bytes).toString("base64");
}
async function resolveProvider(p, fallback) {
  if (p === void 0 || p === null) return fallback;
  if (typeof p === "function") {
    const v = await p();
    return v ?? fallback;
  }
  return p;
}
async function publishAnnouncement(nc, identity, opts, overrides = {}) {
  const segment = overrides.segment ?? opts.segment ?? "default";
  const base = {
    ts: overrides.ts ?? (/* @__PURE__ */ new Date()).toISOString(),
    name: overrides.name ?? opts.name ?? identity.nonce,
    nkey: overrides.nkey ?? identity.nkey,
    segment,
    capabilities: overrides.capabilities ?? await resolveProvider(opts.capabilities, []),
    online: overrides.online ?? await resolveProvider(opts.online, false),
    model: overrides.model ?? await resolveProvider(opts.model, ""),
    sdk_version: SDK_VERSION
  };
  const subject = V3DiscoverySubject.build({ segment, nkey: base.nkey });
  const hasChildrenProvider = opts.children !== void 0 && opts.children !== null;
  if (!hasChildrenProvider) {
    const ann2 = base;
    const sig2 = await signAnnouncement(ann2, opts.seed);
    const wire2 = { ...ann2, sig: toBase64Std(sig2) };
    nc.publish(subject, new TextEncoder().encode(JSON.stringify(wire2)));
    opts.onAnnounce?.(ann2);
    return ann2;
  }
  const children = await resolveProvider(opts.children, void 0) ?? void 0;
  const ann = {
    v: 2,
    ...base,
    ...children && children.length > 0 ? { children } : {}
  };
  const sig = await signAnnouncementV2(ann, opts.seed);
  const wire = { ...ann, sig: toBase64Std(sig) };
  nc.publish(subject, new TextEncoder().encode(JSON.stringify(wire)));
  opts.onAnnounceV2?.(ann);
  return ann;
}
function startPresence(nc, identity, options) {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS2;
  const segment = options.segment ?? "default";
  const stopHb = options.heartbeat === false ? void 0 : startHeartbeat(nc, identity, {
    intervalMs,
    online: options.online,
    model: options.model,
    ...options.heartbeat ?? {}
  });
  let stopped = false;
  let ticking = false;
  let announcedOnline = false;
  const tick = async () => {
    if (stopped || ticking) return;
    ticking = true;
    try {
      await publishAnnouncement(nc, identity, options);
      if (!announcedOnline) {
        announcedOnline = true;
        options.onOnline?.();
      }
    } catch (e) {
      console.warn("[presence] announce failed:", e.message);
      options.onError?.(e);
    } finally {
      ticking = false;
    }
  };
  void tick();
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  timer.unref?.();
  return {
    async reannounce() {
      await tick();
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      try {
        await publishAnnouncement(nc, identity, options, { online: false });
        options.onOffline?.();
      } catch {
      }
      stopHb?.();
    }
  };
}

// src/net/directory.ts
var import_nkeys3 = __toESM(require_mod(), 1);
var DEFAULT_TTL_MS = 9e4;
var DEFAULT_MAX_FUTURE_MS = 5e3;
var DEFAULT_SWEEP_MS = 3e4;
var SUBJECT_PREFIX = "$SRV.INFO.agents.";
function parseDiscoverySubject(subject) {
  if (!subject.startsWith(SUBJECT_PREFIX)) return null;
  const tail = subject.slice(SUBJECT_PREFIX.length);
  const parts = tail.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { segment: parts[0], nkey: parts[1] };
}
function verifyAnnouncement(subject, data, now, ttlMs = DEFAULT_TTL_MS, maxFutureMs = DEFAULT_MAX_FUTURE_MS) {
  const parsed = parseDiscoverySubject(subject);
  if (!parsed) return { ok: false, reason: "malformed_subject" };
  let wire;
  try {
    wire = JSON.parse(new TextDecoder().decode(data));
  } catch {
    return { ok: false, reason: "undecodable" };
  }
  const sig = typeof wire.sig === "string" ? wire.sig : "";
  const annCandidate = { ...wire };
  delete annCandidate.sig;
  let ann;
  let version;
  if (value_exports2.Check(AgentAnnouncement, annCandidate)) {
    ann = annCandidate;
    version = 1;
  } else if (value_exports2.Check(AgentAnnouncementV2, annCandidate)) {
    ann = annCandidate;
    version = 2;
  } else {
    return { ok: false, reason: "schema" };
  }
  if (ann.nkey !== parsed.nkey) return { ok: false, reason: "subject_nkey_mismatch" };
  if (ann.segment !== parsed.segment) return { ok: false, reason: "subject_segment_mismatch" };
  const tsMs = Date.parse(ann.ts);
  if (Number.isNaN(tsMs)) return { ok: false, reason: "bad_timestamp" };
  if (now - tsMs > ttlMs) return { ok: false, reason: "stale_ts" };
  if (tsMs - now > maxFutureMs) return { ok: false, reason: "future_ts" };
  if (!sig) return { ok: false, reason: "bad_signature" };
  let sigBytes;
  try {
    sigBytes = new Uint8Array(Buffer.from(sig, "base64"));
  } catch {
    return { ok: false, reason: "bad_sig_encoding" };
  }
  let kp;
  try {
    kp = (0, import_nkeys3.fromPublic)(ann.nkey);
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
  const canon = version === 1 ? canonicalAnnouncementBytes(ann) : canonicalAnnouncementV2Bytes(ann);
  let valid = false;
  try {
    valid = kp.verify(canon, sigBytes);
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
  if (!valid) return { ok: false, reason: "bad_signature" };
  return {
    ok: true,
    entry: { ...ann, v: version, tsMs, receivedMs: now }
  };
}
var Directory = class {
  agents = /* @__PURE__ */ new Map();
  // nkey → entry
  accepted = 0;
  rejected = 0;
  rejectCounts = /* @__PURE__ */ new Map();
  ingest(subject, data, now = Date.now()) {
    const res = verifyAnnouncement(subject, data, now);
    if (!res.ok || !res.entry) {
      this.rejected++;
      if (res.reason) {
        this.rejectCounts.set(res.reason, (this.rejectCounts.get(res.reason) ?? 0) + 1);
      }
      return { entry: null, reason: res.reason };
    }
    const prev = this.agents.get(res.entry.nkey);
    if (prev && res.entry.tsMs < prev.tsMs) {
      return { entry: null, reason: "stale_ts" };
    }
    this.agents.set(res.entry.nkey, res.entry);
    this.accepted++;
    return { entry: res.entry };
  }
  evictExpired(now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
    const evicted = [];
    for (const [nkey, e] of this.agents) {
      if (now - e.tsMs > ttlMs) {
        this.agents.delete(nkey);
        evicted.push(e);
      }
    }
    return evicted;
  }
  snapshot() {
    return [...this.agents.values()];
  }
  get(nkey) {
    return this.agents.get(nkey);
  }
  stats() {
    return {
      accepted: this.accepted,
      rejected: this.rejected,
      live: this.agents.size,
      rejectCounts: Object.fromEntries(this.rejectCounts)
    };
  }
};
function watchDirectory(nc, segment, options = {}) {
  const dir = new Directory();
  const subject = discoverySubWildcard(segment);
  const sub = nc.subscribe(subject, {
    callback: (err2, msg) => {
      if (err2) {
        console.error("[directory] subscription error:", err2?.message ?? err2);
        return;
      }
      if (!msg || !msg.subject) return;
      const r = dir.ingest(msg.subject, msg.data);
      if (r.entry) options.onEntry?.(r.entry);
      else if (r.reason) options.onReject?.(r.reason);
    }
  });
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const sweepMs = options.sweepMs ?? DEFAULT_SWEEP_MS;
  const sweep = setInterval(() => {
    const evicted = dir.evictExpired(Date.now(), ttlMs);
    if (options.onEvict) for (const e of evicted) options.onEvict(e);
  }, sweepMs);
  sweep.unref?.();
  return {
    directory: dir,
    stop: () => {
      clearInterval(sweep);
      sub.unsubscribe();
    }
  };
}

// src/lib/uuidv7.ts
import { randomBytes } from "node:crypto";
var HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
var lastMs = 0;
var intraMs = 0;
function encodeTime(bytes, ms) {
  bytes[0] = Math.floor(ms / 2 ** 40) & 255;
  bytes[1] = Math.floor(ms / 2 ** 32) & 255;
  bytes[2] = Math.floor(ms / 2 ** 24) & 255;
  bytes[3] = Math.floor(ms / 2 ** 16) & 255;
  bytes[4] = Math.floor(ms / 2 ** 8) & 255;
  bytes[5] = ms & 255;
}
function uuidv7(nowMs = Date.now()) {
  const ms = Math.max(Math.floor(nowMs), lastMs);
  if (ms === lastMs) {
    intraMs = intraMs + 1 & 4095;
  } else {
    lastMs = ms;
    intraMs = 0;
  }
  const bytes = new Uint8Array(16);
  encodeTime(bytes, ms);
  bytes.set(randomBytes(10), 6);
  bytes[6] = 112 | intraMs >> 8 & 15;
  bytes[7] = intraMs & 255;
  bytes[8] = bytes[8] & 63 | 128;
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += HEX[bytes[i]];
    if (i === 3 || i === 5 || i === 7 || i === 9) out += "-";
  }
  return out;
}

// src/net/conversation.ts
var counters = /* @__PURE__ */ new Map();
function nonEmptyString(v) {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}
function pickConversationId(...candidates) {
  for (const c of candidates) {
    const s = nonEmptyString(c);
    if (s) return s;
  }
  return uuidv7();
}
function observeSeq(conversationId, seq2) {
  if (typeof seq2 !== "number" || !Number.isFinite(seq2) || seq2 <= 0) return;
  const cur = counters.get(conversationId) ?? 0;
  if (seq2 > cur) counters.set(conversationId, Math.floor(seq2));
}
function nextSeq(conversationId) {
  const n = (counters.get(conversationId) ?? 0) + 1;
  counters.set(conversationId, n);
  return n;
}
function inboundIdentity(frame) {
  const conversationId = pickConversationId(frame.conversationId);
  const messageId = nonEmptyString(frame.messageId) ?? uuidv7();
  observeSeq(conversationId, frame.seq);
  const seq2 = typeof frame.seq === "number" && Number.isFinite(frame.seq) && frame.seq > 0 ? Math.floor(frame.seq) : nextSeq(conversationId);
  return { conversationId, messageId, seq: seq2 };
}
function replyIdentity(parent) {
  return {
    conversationId: parent.conversationId,
    messageId: uuidv7(),
    parentMessageId: parent.messageId,
    seq: nextSeq(parent.conversationId)
  };
}

// src/net/transport.ts
function natsTransport(nc) {
  return {
    publish: (subject, data) => nc.publish(subject, data),
    subscribe: (subject, opts) => nc.subscribe(subject, {
      // Type-level bridge, zero runtime coercion: nats-core DECLARES
      // `Msg.reply?: string`, but its MsgImpl normalizes an absent reply to
      // "" before any callback runs (parser leaves reply undefined;
      // MsgImpl.reply decodes it). TransportMessage pins that runtime shape
      // because the falsy `if (msg.reply)` ack branch depends on it.
      callback: opts.callback
    })
  };
}

// src/net/a2a.ts
function a2aSubjectV2(nkey) {
  return `${SUBJECT_ROOT}.a2a.${nkey}`;
}
function subA2A(nc, identity, handler) {
  const subject = `${a2aSubjectV2(identity.nkey)}.>`;
  const enc2 = new TextEncoder();
  const t = natsTransport(nc);
  return t.subscribe(subject, {
    callback: (err2, msg) => {
      if (err2) {
        console.error("[a2a] subscription error:", err2?.message ?? err2);
        return;
      }
      if (!msg || !msg.subject) return;
      if (!msg) return;
      const raw = new TextDecoder().decode(msg.data);
      let envelope;
      try {
        envelope = JSON.parse(raw);
      } catch {
      }
      if (handler) {
        Promise.resolve(handler({ raw, envelope, reply: msg.reply })).catch(() => {
        });
        return;
      }
      if (envelope && envelope.type === "a2a_request") {
        const req = envelope;
        const replySubject = req.a2a?.replySubject;
        const conversation = inboundIdentity({
          conversationId: req.a2a?.conversationId,
          messageId: req.id,
          seq: req.a2a?.seq
        });
        if (msg.reply) {
          const ack2 = { type: "status", data: "ack", ...replyIdentity(conversation) };
          t.publish(msg.reply, enc2.encode(JSON.stringify(ack2)));
        }
        console.log(`[a2a] from ${req.from?.nkey || "?"}: ${req.prompt?.slice(0, 120)}`);
        if (replySubject) {
          const replyId = replyIdentity(conversation);
          const resp = {
            type: "a2a_response",
            // Echo the request id when known (correlation convention).
            id: req.id || replyId.messageId,
            from: { nkey: identity.nkey, name: identity.nonce, sessionId: identity.nonce },
            text: `received (auto-reply from ${identity.nonce})`,
            conversationId: conversation.conversationId,
            // Phase 1: inReplyTo finally has a writer.
            inReplyTo: req.id,
            parentMessageId: req.id,
            seq: replyId.seq,
            ts: (/* @__PURE__ */ new Date()).toISOString()
          };
          t.publish(replySubject, enc2.encode(JSON.stringify(resp)));
        }
      }
    }
  });
}

// src/net/roster.ts
var import_kv = __toESM(require_mod5(), 1);
var decoder = new TextDecoder();

// src/agent/lifecycle.ts
async function connectViaNKey(natsUrl, rawSeed, name) {
  const opts = {
    servers: [natsUrl],
    authenticator: (0, import_transport_node2.nkeyAuthenticator)(rawSeed),
    timeout: 1e4,
    // Never give up on reconnect (library default is 10): a network flap must
    // not strand a running agent. A revoked credential still error-closes the
    // connection — reconnection cannot fix auth.
    maxReconnectAttempts: -1,
    // Detect dead links in seconds (library default is 2 minutes).
    pingInterval: 1e4
  };
  if (name) opts.name = name;
  const conn = await (0, import_transport_node2.connect)(opts);
  void conn.closed().then((err2) => {
    if (err2) {
      console.error(
        `[${name ?? "nats"}] NATS connection closed unexpectedly: ${err2.message}`
      );
    }
  });
  return conn;
}
async function withRetry(op, attempts = 3, baseDelayMs = 500) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await op();
    } catch (err2) {
      lastErr = err2;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
      }
    }
  }
  throw lastErr;
}
async function fetchNatsUserJWT(vgateUrl, nkeyPublic, seed) {
  return withRetry(() => fetchNatsUserJWTOnce(vgateUrl, nkeyPublic, seed));
}
async function fetchNatsUserJWTOnce(vgateUrl, nkeyPublic, seed) {
  const header = b64url(JSON.stringify({ alg: "ed25519-nkey", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1e3);
  const payload = b64url(JSON.stringify({
    iss: nkeyPublic,
    sub: nkeyPublic,
    aud: vgateUrl,
    iat: now,
    exp: now + 300,
    jti: crypto.randomUUID?.() ?? `jti-${now}-${Math.random().toString(36).slice(2)}`
  }));
  const signingInput = `${header}.${payload}`;
  const kp = import_nats_core2.nkeys.fromSeed(new TextEncoder().encode(seed));
  const sig = kp.sign(new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${b64url(sig)}`;
  const resp = await fetch(`${vgateUrl}/v1/agent/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_assertion: assertion,
      grant_type: "client_credentials"
    })
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`token endpoint ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = await resp.json();
  if (!data.access_token) throw new Error("token endpoint returned no access_token");
  return data.access_token;
}
async function connectViaJWT(natsUrl, tokenProvider, seed, name) {
  const { jwtAuthenticator } = await Promise.resolve().then(() => __toESM(require_mod4(), 1));
  const opts = {
    servers: [natsUrl],
    // jwtAuthenticator's function form is synchronous: `ajwt()` on every
    // auth. The provider closure reads the latest value of currentJWT.
    authenticator: jwtAuthenticator(
      typeof tokenProvider === "function" ? tokenProvider : () => tokenProvider,
      new TextEncoder().encode(seed)
    ),
    timeout: 1e4,
    // Never give up on reconnect (library default is 10): a network flap must
    // not strand a running agent. A refresh that still fails auth (revoked
    // token) error-closes the connection — reconnecting cannot fix it.
    maxReconnectAttempts: -1,
    // Detect dead links in seconds (library default is 2 minutes).
    pingInterval: 1e4
  };
  if (name) opts.name = name;
  const conn = await (0, import_transport_node2.connect)(opts);
  void conn.closed().then((err2) => {
    if (err2) {
      console.error(
        `[${name ?? "nats"}] NATS connection closed unexpectedly \u2014 exiting: ${err2.message}`
      );
      process.exit(1);
    }
  });
  return conn;
}
function b64url(data) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// src/vclaw/verbs/who.ts
function whoRowOf(raw, fallbackTs) {
  if (raw === null || typeof raw !== "object") return null;
  const a = raw;
  const nkey = typeof a.nkey === "string" ? a.nkey : void 0;
  if (!nkey) return null;
  const name = typeof a.name === "string" ? a.name : typeof a.nonce === "string" ? a.nonce : void 0;
  const state = typeof a.state === "string" ? a.state : typeof a.status === "string" ? a.status : void 0;
  const segment = typeof a.segment === "string" ? a.segment : void 0;
  const ts = typeof a.ts === "string" ? a.ts : fallbackTs;
  return { nkey, ...name ? { name } : {}, ...state ? { state } : {}, ...segment ? { segment } : {}, ...ts ? { seen: ts } : {} };
}
async function whoVerb(ctx) {
  const segment = typeof ctx.flags.segment === "string" ? ctx.flags.segment : "default";
  const waitMs = Number(ctx.flags.wait ?? 4e3) || 4e3;
  const creds = await loadCredentials().catch(() => null);
  if (!creds) {
    return {
      state: "unavailable",
      data: { segment, reason: "no identity" },
      text: "no identity on this host \u2014 run `vclaw-agent vclaw signup` first",
      exit: 4
    };
  }
  const cfg = readConfigSync();
  const vgate = cfg?.vgateUrl ?? process.env.VCLAW_API_URL ?? "https://api.vclawhub.com";
  const server = cfg?.server ?? process.env.VCLAW_NATS_URL ?? "nats://vchat3:4223";
  let nc;
  try {
    const jwt = await fetchNatsUserJWT(vgate, creds.public_key, creds.seed);
    nc = await connectViaJWT(server, () => jwt, creds.seed, "vclaw-who");
  } catch (e) {
    return {
      state: "unavailable",
      data: { segment, server, reason: e instanceof Error ? e.message : String(e) },
      text: `cannot reach the fabric (${server}) \u2014 ${e instanceof Error ? e.message : String(e)}`,
      exit: 3
    };
  }
  const decoder2 = new TextDecoder();
  const seen = /* @__PURE__ */ new Map();
  const sub = nc.subscribe(`$SRV.INFO.agents.${segment}.>`);
  const drain = (async () => {
    for await (const m of sub) {
      try {
        const row = whoRowOf(JSON.parse(decoder2.decode(m.data)));
        if (row) seen.set(row.nkey, row);
      } catch {
      }
    }
  })();
  await nc.flush();
  await new Promise((r) => setTimeout(r, Math.max(500, waitMs)));
  sub.unsubscribe();
  await nc.close().catch(() => void 0);
  void drain;
  const self2 = creds.public_key;
  const rows = [...seen.values()].sort((a, b) => (a.name ?? a.nkey).localeCompare(b.name ?? b.nkey));
  const others = rows.filter((r) => r.nkey !== self2);
  const data = { segment, server, windowMs: waitMs, self: self2, peers: rows, others: others.length };
  const text = [
    `vclaw who  (segment ${segment}, ${Math.round(waitMs / 1e3)}s window, read-only)`,
    table(
      ["peer", "name", "state", "seen"],
      rows.map((r) => [r.nkey === self2 ? `${r.nkey.slice(0, 12)}\u2026 (you)` : `${r.nkey.slice(0, 12)}\u2026`, r.name ?? null, r.state ?? null, r.seen ?? null])
    ),
    rows.length === 0 ? "\nno announcements in this window \u2014 nobody on this segment is online, or they announce less often than the window" : `
${others.length} other agent(s) around`
  ].join("\n");
  return { state: rows.length > 0 ? "ok" : "degraded", data, text, exit: 0 };
}

// src/lib/approve-proof.ts
var import_nkeys4 = __toESM(require_mod(), 1);
var APPROVE_PROOF_AUDIENCE = "vchat-claim-approve";
var PROOF_HEADER = { alg: "ed25519-nkey", typ: "JWT" };
function b64url2(data) {
  return (typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data)).toString(
    "base64url"
  );
}
function buildApproveProof(input) {
  const { seed, publicKey, challenge, now, expiresInSeconds } = input;
  if (!challenge) {
    throw new Error(
      "buildApproveProof: empty approve_challenge \u2014 the pending record has no challenge, so it is UNPROVABLE (fail closed; re-run onboarding so a challenge is minted on the resume)"
    );
  }
  if (!publicKey.startsWith("U")) {
    throw new Error(
      `buildApproveProof: publicKey must be the NKey-pub U-form (got "${publicKey.slice(0, 4)}\u2026") \u2014 the server verifies the signature against nkeys.FromPublicKey(iss)`
    );
  }
  const payload = {
    aud: APPROVE_PROOF_AUDIENCE,
    iss: publicKey,
    jti: challenge,
    sub: publicKey
  };
  if (expiresInSeconds !== void 0) {
    const iat = now ?? Math.floor(Date.now() / 1e3);
    payload.iat = iat;
    payload.exp = iat + expiresInSeconds;
  } else if (now !== void 0) {
    payload.iat = now;
  }
  const signingInput = `${b64url2(JSON.stringify(PROOF_HEADER))}.${b64url2(JSON.stringify(payload))}`;
  const kp = (0, import_nkeys4.fromSeed)(new TextEncoder().encode(seed));
  const sig = kp.sign(new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64url2(sig)}`;
}
function buildApproveProofForKeypair(keypair, challenge, opts = {}) {
  return buildApproveProof({ seed: keypair.seed, publicKey: keypair.publicKey, challenge, ...opts });
}
function claimUrlWithProof(claimBase, sessionId, proof) {
  const url = `${claimBase}/a/${encodeURIComponent(sessionId)}`;
  return proof ? `${url}?proof=${encodeURIComponent(proof)}` : url;
}
function decodeApproveProof(proof) {
  const parts = proof.split(".");
  if (parts.length !== 3) throw new Error("malformed proof: expected 3 segments");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}
function checkApproveProofLocally(proof, keyForms, expectedNonce, nowSec = Math.floor(Date.now() / 1e3)) {
  const forms = (Array.isArray(keyForms) ? keyForms : [keyForms]).filter(Boolean);
  if (!expectedNonce) return "no approve challenge on the pending record";
  if (!proof) return "proof is required";
  const parts = proof.split(".");
  if (parts.length !== 3) return "malformed proof";
  let payload;
  try {
    payload = decodeApproveProof(proof);
  } catch (e) {
    return `malformed proof payload: ${e.message}`;
  }
  if (!payload.iss || payload.iss !== payload.sub) {
    return "proof iss/sub must both name the agent key";
  }
  if (payload.aud !== APPROVE_PROOF_AUDIENCE) {
    return `proof audience must be ${JSON.stringify(APPROVE_PROOF_AUDIENCE)}`;
  }
  if (!payload.jti || payload.jti !== expectedNonce) {
    return "proof challenge does not match this pending record";
  }
  if (forms.length > 0 && !forms.includes(payload.iss)) {
    return "proof is for a different key than the pending record";
  }
  if (payload.exp) {
    if (payload.iat && payload.exp <= payload.iat) return "proof expiry precedes its issue time";
    if (payload.exp < nowSec) return "proof expired";
  }
  if (payload.iat && payload.iat > nowSec + 60) return "proof issue time is in the future";
  let kp;
  try {
    kp = (0, import_nkeys4.fromPublic)(payload.iss);
  } catch (e) {
    return `invalid proof issuer NKey: ${e.message}`;
  }
  let ok;
  try {
    ok = kp.verify(
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
      Buffer.from(parts[2], "base64url")
    );
  } catch (e) {
    return `proof signature verification failed: ${e.message}`;
  }
  return ok ? null : "proof signature verification failed";
}

// src/lib/vgate.ts
var DEFAULT_API_URL = env("API_URL") || env("VGATE_URL") || "https://api.vclawhub.com";
var VgateClient = class {
  apiUrl;
  constructor(apiUrl) {
    this.apiUrl = apiUrl || DEFAULT_API_URL;
  }
  /* ── Introduction (splash-screen flow) ───────────────────── */
  /**
   * Introduce an unclaimed agent to vgate.
   * POST /v1/agent/introduce
   */
  async introduceAgent(params) {
    const resp = await fetch(`${this.apiUrl}/v1/agent/introduce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`introduce failed (${resp.status}): ${text}`);
    }
    return resp.json();
  }
  /* ── Register (dashboard-side approval) ──────────────────── */
  /**
   * Register an agent with vgate — called by dashboard on approve.
   * POST /v1/agent/register
   */
  async registerAgent(params) {
    const resp = await fetch(`${this.apiUrl}/v1/agent/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`register failed (${resp.status}): ${text}`);
    }
    return resp.json();
  }
  /* ── Status (check if claimed) ───────────────────────────── */
  /**
   * Check if an agent is claimed (approved).
   * GET /v1/agent/status?nkey=<nkey_public>
   */
  async getClaimStatus(nkeyPublic) {
    const resp = await fetch(`${this.apiUrl}/v1/agent/status?nkey=${encodeURIComponent(nkeyPublic)}`);
    if (resp.status === 404) {
      return { claimed: false };
    }
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`status check failed (${resp.status}): ${text}`);
    }
    return resp.json();
  }
  /* ── Retire (J16a — lifecycle close, steward path) ───────── */
  /**
   * Retire an agent — POST /v1/agent/{nkey}/retire.
   *
   * Unlike the methods above (which throw and lose the HTTP status), this
   * returns a STRUCTURED result — the CLI maps status → CI-assertable exit
   * codes (agent-sdk docs/AGENT_RETIRE.md §2): 200→0 (fresh OR idempotent
   * retry — the server cannot be told apart and the CLI does not need to),
   * 404 not_claimed→2, 403 forbidden→3, network failure→4.
   *
   * Wire contract read from vgate/internal/agentidp/retire.go:
   *   - nkey goes in the PATH in EITHER form (base64url or U-form); the
   *     server canonicalizes (E1) and answers `retired` in canonical U-form.
   *   - body {reason, confirm:true} — the server rejects confirm:false with
   *     400 confirm_required; the CLI mirrors the destructiveness.
   *   - auth: Authorization: Bearer <Authelia id_token> (the steward path).
   *     The token is a bearer credential: never logged, never in argv
   *     (O37/O44 class) — the caller passes it in, sourced from env.
   */
  async retireAgent(params) {
    let resp;
    try {
      resp = await fetch(
        `${this.apiUrl}/v1/agent/${encodeURIComponent(params.nkey)}/retire`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${params.idToken}`
          },
          body: JSON.stringify({
            reason: params.reason ?? "",
            confirm: params.confirm
          })
        }
      );
    } catch (e) {
      return { ok: false, status: 0, error: "unreachable", message: e.message };
    }
    const text = await resp.text().catch(() => "");
    let body = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
      }
    }
    if (resp.ok) {
      return {
        ok: true,
        // retired = canonical U-form (server-normalized, what every
        // tombstone/ownership row keys by). Fall back to the input only if
        // the body is missing the field (defensive; retire.go always sets it).
        retired: body.retired ?? params.nkey,
        audit_id: body.audit_id ?? ""
      };
    }
    return {
      ok: false,
      status: resp.status,
      // apierr envelope: {error: <registry code>, message} (+legacy fields).
      error: body.error ?? `http_${resp.status}`,
      message: body.message ?? text.slice(0, 200)
    };
  }
  /* ── Health & status ─────────────────────────────────────── */
  /**
   * Health check — GET /health
   */
  async health() {
    const resp = await fetch(`${this.apiUrl}/health`);
    if (!resp.ok) throw new Error(`health check failed (${resp.status})`);
    return resp.json();
  }
  /**
   * Check vgate is in claim-ready state.
   */
  async getVgateStatus() {
    const healthResult = await this.health();
    return {
      status: healthResult.status,
      version: healthResult.version
    };
  }
};

// src/lib/signup.ts
var CLAIM_BASE = () => process.env.CLAIM_BASE_URL || "https://login.vclawhub.com";
async function beginSignup(opts = {}) {
  const existing = await loadCredentials().catch(() => null);
  const pending = hasPendingFlag();
  if (pending && !opts.force) {
    return { kind: "pending_claim", nkey: existing?.public_key ?? "" };
  }
  if (existing && !opts.force) {
    return {
      kind: "existing_credentials",
      ...existing.name ? { name: existing.name } : {},
      ...existing.agent_nkey ? { agent_nkey: existing.agent_nkey } : {}
    };
  }
  let backupPath;
  if (existing && opts.force) {
    try {
      backupPath = await backupCredentials() ?? void 0;
    } catch {
    }
  }
  if (pending && opts.forceDiscard) await clearPendingFlag();
  const resume = pending && opts.force && !opts.forceDiscard;
  const keypair = resume && existing?.seed ? await keypairFromSeed(existing.seed) : await generateNkeyPair();
  const base64urlPub = Buffer.from(keypair.rawPublicKey).toString("base64url");
  const name = opts.name || existing?.name || `agent-${keypair.hexPublicKey.slice(0, 8)}`;
  const client = new VgateClient();
  const intro = await client.introduceAgent({ nkey_public: base64urlPub, name });
  const sessionId = intro.session_id || intro.agent_id || "";
  await saveCredentials({
    seed: keypair.seed,
    public_key: keypair.publicKey,
    agent_nkey: base64urlPub,
    name,
    steward: existing?.steward ?? "unknown",
    created_at: existing?.created_at ?? (/* @__PURE__ */ new Date()).toISOString()
  });
  await writePendingFlag(keypair.publicKey);
  const challenge = intro.approve_challenge ?? "";
  let proofMinted = false;
  let proof = "";
  if (challenge) {
    try {
      const p = buildApproveProofForKeypair(keypair, challenge);
      checkApproveProofLocally(p, [keypair.publicKey, base64urlPub], challenge);
      proof = p;
      proofMinted = true;
    } catch {
    }
  }
  return {
    claimUrl: claimUrlWithProof(CLAIM_BASE(), sessionId, proof || void 0),
    sessionId,
    nkey: keypair.publicKey,
    base64urlPub,
    name,
    proofMinted,
    resumed: intro.resumed === true,
    ...backupPath ? { backupPath } : {}
  };
}
async function pollClaimOnce(client, base64urlPub) {
  try {
    const s = await client.getClaimStatus(base64urlPub);
    return { claimed: Boolean(s.claimed), ...s.steward ? { steward: s.steward } : {} };
  } catch {
    return { claimed: false };
  }
}
async function completeSignup(claim) {
  const creds = await loadCredentials();
  if (!creds) throw new Error("credentials disappeared between begin and complete");
  const steward = claim.steward ?? creds.steward ?? "unknown";
  await saveCredentials({ ...creds, steward });
  await clearPendingFlag();
  return { steward };
}

// src/vclaw/verbs/signup.ts
async function signupVerb(ctx) {
  const force = ctx.flags.force === true;
  const forceDiscard = ctx.flags["force-discard"] === true;
  const waitSec = Number(ctx.flags.wait ?? 0) || 0;
  const started = await beginSignup({ force, forceDiscard });
  if ("kind" in started) {
    if (started.kind === "pending_claim") {
      return {
        state: "degraded",
        data: started,
        text: [
          "vclaw signup \u2014 a claim is ALREADY pending",
          kv([["nkey", started.nkey || "(unknown)"]]),
          "",
          "approve the earlier link in a browser, or re-run with `--force` to resume the same identity."
        ].join("\n"),
        exit: 0
      };
    }
    return {
      state: "ok",
      data: started,
      text: [
        `vclaw signup \u2014 already signed up${started.name ? ` as ${started.name}` : ""}`,
        "nothing to do. Use `--force` to start over (the previous credentials are backed up)."
      ].join("\n"),
      exit: 0
    };
  }
  const words = [
    `vclaw signup \u2014 claim link for ${started.name}`,
    kv([
      ["nkey", started.nkey],
      ["session", started.sessionId],
      ["proof", started.proofMinted ? "minted (approval will be verified)" : "not minted (link works; approval unverified)"],
      ["resumed", started.resumed ? "yes (same identity)" : "new identity"],
      ...started.backupPath ? [["backup", started.backupPath]] : []
    ]),
    "",
    "open this link in a browser to approve this agent:",
    `  ${started.claimUrl}`
  ];
  let claimed = false;
  let steward;
  if (waitSec > 0) {
    const client = new VgateClient();
    const deadline = Date.now() + waitSec * 1e3;
    while (Date.now() < deadline) {
      const tick = await pollClaimOnce(client, started.base64urlPub);
      if (tick.claimed) {
        const done = await completeSignup(tick);
        claimed = true;
        steward = done.steward;
        break;
      }
      await new Promise((r) => setTimeout(r, 2e3));
    }
    words.push(claimed ? `
approved \u2713 (steward ${steward})` : `
still waiting after ${waitSec}s \u2014 re-run \`vclaw signup --wait 60\``);
  } else {
    words.push("", "after approving, run `vclaw signup --wait 60` (or `vclaw status`) to pick it up.");
  }
  return {
    state: claimed ? "ok" : "degraded",
    data: { ...started, claimed, steward: steward ?? null },
    text: words.join("\n"),
    exit: 0
  };
}

// src/vclaw/run.ts
var VclawError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "VclawError";
  }
};
var BOOL_FLAGS = { json: true, deep: true, help: true, all: true };
var VERBS = {
  status: {
    name: "status",
    summary: "identity, both planes, peers and unread \u2014 the dashboard",
    usage: "status [--deep] [--json]",
    flags: ["--deep", "--json"],
    run: statusVerb
  },
  doctor: {
    name: "doctor",
    summary: "every check with pass/fail and the command that fixes it",
    usage: "doctor [--json]",
    flags: ["--json"],
    run: doctorVerb
  },
  signup: {
    name: "signup",
    summary: "start (or resume) signup \u2014 prints the vclaw auth link to approve in a browser",
    usage: "signup [--wait <s>] [--force] [--force-discard] [--json]",
    flags: ["--wait", "--force", "--force-discard", "--json"],
    run: signupVerb
  },
  who: {
    name: "who",
    summary: "who is around on the vclaw fabric (read-only, no LLM required)",
    usage: "who [--wait <ms>] [--segment <s>] [--json]",
    flags: ["--wait", "--segment", "--json"],
    run: whoVerb
  },
  peers: {
    name: "peers",
    summary: "known peers from local rosters, with the tier each was seen on",
    usage: "peers [--tier cloud|site|all] [--json]",
    flags: ["--tier", "--json"],
    run: peersVerb
  }
};
function parseArgs(argv) {
  const [verb = "", ...rest] = argv;
  const flags = {};
  const args = [];
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (!token.startsWith("--")) {
      args.push(token);
      continue;
    }
    const eq = token.indexOf("=");
    if (eq > 2) {
      flags[token.slice(2, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(2);
    const next = rest[i + 1];
    if (BOOL_FLAGS[key] !== true && next !== void 0 && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return { verb, args, flags };
}
function usageText() {
  const lines = Object.values(VERBS).map((v) => `  /vclaw ${v.usage}`);
  return ["vclaw \u2014 one command, no model required", "", ...lines].join("\n");
}
function completions(prefix) {
  const p = prefix.trim();
  const out = [];
  for (const v of Object.values(VERBS)) {
    if (v.name.startsWith(p)) out.push({ label: v.name, value: v.name, description: v.summary });
  }
  return out;
}
async function runVclaw(argv) {
  const { verb, args, flags } = parseArgs(argv);
  if (!verb || flags.help === true) {
    return { result: { ok: true, verb: verb || "help", state: "ok" }, exit: 0, text: usageText() };
  }
  const spec = VERBS[verb];
  if (!spec) {
    const message = `unknown verb "${verb}"`;
    return { result: { ok: false, verb, state: "unavailable", error: message, code: 2 }, exit: 2, text: `${message}

${usageText()}` };
  }
  try {
    const r = await spec.run({ args, flags });
    const exit = r.exit ?? 0;
    return {
      result: { ok: exit === 0, verb, state: r.state, data: r.data, ...exit !== 0 ? { code: exit } : {} },
      exit,
      text: r.text
    };
  } catch (e) {
    const code = e instanceof VclawError ? e.code : 1;
    const message = redactError(e instanceof Error ? e.message : String(e));
    return { result: { ok: false, verb, state: "unavailable", error: message, code }, exit: code, text: `error: ${message}` };
  }
}

// src/agent/runtime.ts
var import_nats_core3 = __toESM(require_mod4(), 1);

// src/net/capabilities.ts
var import_kv2 = __toESM(require_mod5(), 1);
var DEFAULT_CACHE_MS = 3e4;
var BUCKET = "vchat_capabilities";
var OnlineGate = class {
  nc;
  nkey;
  cacheMs;
  /** env fallback when the KV record is absent (VCLAW_AGENT_LLM). */
  envFallback;
  cached = null;
  cachedAt = 0;
  constructor(nc, nkey, options = {}) {
    this.nc = nc;
    this.nkey = nkey;
    this.cacheMs = options.cacheMs ?? DEFAULT_CACHE_MS;
    this.envFallback = options.envFallback ?? (() => false);
  }
  /** Read the capabilities KV record (uncached). Best-effort: null on error. */
  async read() {
    try {
      const kvm = new import_kv2.Kvm(this.nc);
      const bucket = await kvm.open(BUCKET);
      const entry = await bucket.get(this.nkey);
      if (!entry) return null;
      const parsed = JSON.parse(
        new TextDecoder().decode(entry.value)
      );
      if (parsed && typeof parsed === "object" && "online" in parsed) {
        return parsed;
      }
      return null;
    } catch (e) {
      console.warn(`[capabilities] read failed for ${this.nkey}:`, e.message);
      return null;
    }
  }
  /** Force a KV re-read and update the cache. */
  async refresh() {
    const rec = await this.read();
    if (rec !== null) {
      this.cached = rec;
      this.cachedAt = Date.now();
    }
  }
  /**
   * Online state honoring the cache TTL. Falls back to the env gate when
   * no KV record exists (or the last refresh failed).
   */
  async isOnline() {
    if (this.cached === null || Date.now() - this.cachedAt > this.cacheMs) {
      await this.refresh();
    }
    if (this.cached !== null && typeof this.cached.online === "boolean") {
      return this.cached.online;
    }
    return this.envFallback();
  }
  /** Force a fresh read and return the online state (prompt path). */
  async isOnlineNow() {
    await this.refresh();
    if (this.cached !== null && typeof this.cached.online === "boolean") {
      return this.cached.online;
    }
    return this.envFallback();
  }
};

// src/agent/runtime.ts
function identityFromCreds(creds) {
  const nkey = creds.public_key || creds.agent_nkey || "";
  return { nkey, nonce: creds.name || nkey, owner: creds.steward || "" };
}
function devEphemeralIdentity() {
  const kp = import_nats_core3.nkeys.createUser();
  const seed = new TextDecoder().decode(kp.getSeed());
  const nkey = kp.getPublicKey();
  return { identity: { nkey, nonce: "dev-agent", owner: "" }, seed };
}
var FALLBACK_SEGMENT = "vchat";
function normalizeSegment(s) {
  const t = (s ?? "").trim();
  return t ? t : void 0;
}
function base64UrlToUtf8(b64url3) {
  const b64 = b64url3.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
  if (typeof Buffer !== "undefined") return Buffer.from(padded, "base64").toString("utf8");
  return atob(padded);
}
function decodeJwtPayload(jwt) {
  if (typeof jwt !== "string") return null;
  const parts = jwt.trim().split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const parsed = JSON.parse(base64UrlToUtf8(parts[1]));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function collectSubjects(node, out) {
  if (typeof node === "string") {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectSubjects(v, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) out.push(k);
    for (const v of Object.values(node)) collectSubjects(v, out);
  }
}
function serverSegmentFromJWT(jwt) {
  const payload = decodeJwtPayload(jwt);
  if (!payload) return "";
  const nats = payload["nats"];
  const containers = [
    nats?.["pub"],
    nats?.["sub"],
    nats?.["permissions"],
    nats?.["perms"],
    payload["permissions"],
    payload["perms"],
    nats
  ];
  const subjects = [];
  for (const c of containers) collectSubjects(c, subjects);
  for (const s of subjects) {
    const m = s.match(/^tenant\.([a-z][a-z0-9_-]*)\./);
    if (m) return m[1];
  }
  return "";
}
function resolveTenantSegment(input) {
  const explicit = normalizeSegment(input.explicit);
  const server = normalizeSegment(input.serverSegment) ?? "";
  if (explicit && server && explicit !== server) {
    return { segment: explicit, source: "explicit", explicit, serverSegment: server, mismatch: { explicit, server } };
  }
  if (explicit) return { segment: explicit, source: "explicit", explicit, serverSegment: server };
  if (server) return { segment: server, source: "server", serverSegment: server };
  return { segment: FALLBACK_SEGMENT, source: "fallback", serverSegment: server };
}
async function startAgentRuntime(opts) {
  if (!opts.dev && (!opts.server || !opts.jwtProvider)) {
    throw new Error("startAgentRuntime: server + jwtProvider required (or pass dev)");
  }
  const explicit = normalizeSegment(opts.segment ?? env("SEGMENT"));
  const preConnectJWT = opts.dev ? null : opts.jwtProvider?.() ?? null;
  const resolution = resolveTenantSegment({ explicit, serverSegment: serverSegmentFromJWT(preConnectJWT) });
  if (resolution.mismatch) {
    const { explicit: exp, server } = resolution.mismatch;
    console.error(
      `[segment] MISMATCH: explicit segment "${exp}" != the server's granted segment "${server}". Subscriptions under tenant.${exp}.* will be DENIED by the server's grant. Drop the explicit choice (unset VCLAW_SEGMENT / omit opts.segment) to ADOPT the server's segment, or set it to "${server}" if that really is the intended tenant.`
    );
    throw new Error(
      `Segment mismatch: explicit "${exp}" contradicts the server's JWT grant "tenant.${server}.*". No subscription would succeed. Set VCLAW_SEGMENT=${server} (or unset it to adopt the server's segment) and re-connect.`
    );
  }
  const segment = resolution.segment;
  if (resolution.source === "server") {
    console.error(`[segment] adopted: tenant.${segment} (from the issued JWT's grants)`);
  }
  setTenantSegment(segment);
  let nc;
  if (opts.dev) {
    if (opts.dev.auth === "nkey") {
      const kp = import_nats_core3.nkeys.fromSeed(new TextEncoder().encode(opts.seed));
      nc = await connectViaNKey(opts.dev.server, kp.getSeed(), opts.connName);
    } else {
      const { connect: connect3 } = await Promise.resolve().then(() => __toESM(require_transport_node(), 1));
      nc = await connect3({ servers: [opts.dev.server] });
    }
  } else {
    nc = await connectViaJWT(opts.server, opts.jwtProvider, opts.seed, opts.connName);
  }
  const gate = opts.skipGate ? null : new OnlineGate(nc, opts.identity.nkey, {
    envFallback: () => !!env("AGENT_LLM")
  });
  const presenceRaw = opts.presence ? typeof opts.presence === "function" ? opts.presence(gate, segment) : opts.presence : null;
  const presenceOpts = presenceRaw ? { ...presenceRaw, segment: presenceRaw.segment ?? segment } : null;
  const presence = presenceOpts ? startPresence(nc, opts.identity, presenceOpts) : null;
  return {
    nc,
    identity: opts.identity,
    seed: opts.seed,
    segment,
    segmentSource: resolution.source,
    gate,
    presence,
    close: async () => {
      try {
        await presence?.stop();
      } catch {
      }
      try {
        await nc.drain();
      } catch {
      }
      try {
        await nc.close();
      } catch {
      }
    }
  };
}

// src/agent/subjects.ts
var SubjectTree = {
  /** Pending — unclaimed agents awaiting approval: tenant.default.pending.<nkey> */
  PENDING: (nkey) => V2PendingSubject.build({ tenant: TENANT, nkey }),
  /** Claim — agent claimed by human: tenant.default.claim.<nkey> */
  CLAIM: (nkey) => V2ClaimSubject.build({ tenant: TENANT, nkey }),
  /** Heartbeat: tenant.default.user.{nkey}.agent.{nkey}.hb */
  HEARTBEAT: (nkey) => V2HbSubject.build({ tenant: TENANT, nkey }),
  /** Prompt: tenant.default.user.{nkey}.agent.{nkey}.prompt */
  PROMPT: (nkey) => V2PromptSubject.build({ tenant: TENANT, nkey }),
  /** A2A: tenant.default.a2a.{nkey} */
  A2A: (nkey) => V2A2aSubject.build({ tenant: TENANT, nkey }),
  /**
   * Retired control: tenant.<seg>.agent.retired.{nkey} (W4 lane B, doc 19 B.2).
   * vgate publishes post-retire (after the KV sweep + audit record); receipt is
   * TERMINAL for the identity. Segment-scoped via SUBJECT_ROOT (the LIVE
   * switched segment — setTenantSegment), NOT the static TENANT: the vgate
   * grant + publish use the agent's effective segment (DeriveClaimedPermissions).
   */
  RETIRED: (nkey) => `${SUBJECT_ROOT}.agent.retired.${nkey}`,
  /** Discovery — V3 signed announcement (segment-scoped). pub is pinned to
   *  the agent's OWN `$SRV.INFO.agents.<segment>.<nkey>` (path-pinned spoof
   *  guard); sub is the segment wildcard via `discoverySubWildcard(segment)`.
   *  The bare `$SRV.INFO.agents` Micro form is RETIRED under V3 — agents run
   *  NO NATS Micro (token.go grants `$SRV.INFO.agents.<seg>.>` only). */
  DISCOVERY: (segment, nkey) => V3DiscoverySubject.build({ segment, nkey })
};

// src/daemon/client.ts
import net from "node:net";

// src/daemon/protocol.ts
var PROTOCOL_VERSION = 1;
function makeLineSplitter(onLine) {
  const decoder2 = new TextDecoder();
  let buf = "";
  return (chunk) => {
    buf += typeof chunk === "string" ? chunk : decoder2.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      const trimmed = line.trim();
      if (trimmed.length > 0) onLine(trimmed);
    }
  };
}
function encodeLine(obj) {
  return JSON.stringify(obj) + "\n";
}

// src/daemon/client.ts
var DaemonClient = class _DaemonClient {
  sock;
  pending = /* @__PURE__ */ new Map();
  replyBuffer = [];
  replyWaiters = [];
  /** cp3: inbound tasks for an ATTACHED worker session (server-initiated). */
  taskBuffer = [];
  taskWaiters = [];
  constructor() {
  }
  static async connect(target) {
    const c = new _DaemonClient();
    await c.dial(target);
    return c;
  }
  dial(target) {
    const path3 = target.socketPath ?? (target.familyDir ? `${target.familyDir}/daemon.sock` : void 0);
    return new Promise((resolve, reject) => {
      this.sock = net.connect(
        target.port !== void 0 ? { port: target.port, host: "127.0.0.1" } : { path: path3 }
      );
      this.sock.once("error", reject);
      this.sock.once("connect", () => resolve());
      const split = makeLineSplitter((line) => this.onLine(line));
      this.sock.on("data", (chunk) => split(chunk));
    });
  }
  onLine(line) {
    let ev;
    try {
      ev = JSON.parse(line);
    } catch {
      return;
    }
    if (ev.type === "reply") {
      this.deliverReply(ev);
      return;
    }
    if (ev.type === "task") {
      this.deliverTask(ev);
      return;
    }
    const ref = ev.ref;
    if (ref && this.pending.has(ref)) {
      const resolve = this.pending.get(ref);
      this.pending.delete(ref);
      resolve(ev);
    }
  }
  /** cp3 task delivery: FIFO to the attached worker's task waiter/buffer. */
  deliverTask(ev) {
    const w = this.taskWaiters.shift();
    if (w) {
      clearTimeout(w.timer);
      w.resolve(ev);
      return;
    }
    this.taskBuffer.push(ev);
  }
  /**
   * G3 delivery: exact conversation match. A waiter with a filter never
   * consumes a non-matching reply (that reply stays buffered for its owner).
   */
  deliverReply(ev) {
    const idx = this.replyWaiters.findIndex(
      (w) => w.conversationId === void 0 || w.conversationId === ev.conversationId
    );
    if (idx >= 0) {
      const [w] = this.replyWaiters.splice(idx, 1);
      clearTimeout(w.timer);
      w.resolve(ev);
      return;
    }
    this.replyBuffer.push(ev);
  }
  request(req) {
    const ref = `c${++seq}`;
    return new Promise((resolve, reject) => {
      this.pending.set(ref, resolve);
      this.sock.write(encodeLine({ v: PROTOCOL_VERSION, ...req, ref }));
      const t = setTimeout(() => {
        if (this.pending.has(ref)) {
          this.pending.delete(ref);
          reject(new Error("daemon did not answer in time"));
        }
      }, 15e3);
      void t.unref?.();
    });
  }
  async spawn(opts) {
    return ack(await this.request({ type: "spawn", ...opts }), "spawn");
  }
  /** cp3: register THIS connection as live worker <name> (family-worker mode). */
  async attach(opts) {
    return ack(await this.request({ type: "attach", ...opts }), "attach");
  }
  /** cp3: submit the answer for a conversation steered to this attached session. */
  async answer(conversationId, text, opts) {
    const ev = await this.request({
      type: "answer",
      conversationId,
      text,
      ...opts?.error ? { error: true } : {}
    });
    return ack(ev, "answer");
  }
  async steer(opts) {
    return ack(await this.request({ type: "steer", ...opts }), "steer");
  }
  async stop(name) {
    return ack(await this.request({ type: "stop", name }), "stop");
  }
  async kill(name) {
    return ack(await this.request({ type: "kill", name }), "kill");
  }
  /** Idle unload: drop the worker's process; history retained, reload on next address. */
  async unload(name) {
    return ack(await this.request({ type: "unload", name }), "unload");
  }
  /** Receipt pickup: drain queued receipts (optionally one conversation). */
  async pickupReceipts(conversationId) {
    const ev = await this.request({ type: "receipts", ...conversationId ? { conversationId } : {} });
    if (ev.type !== "receipts") throw new Error(`unexpected receipts answer: ${JSON.stringify(ev)}`);
    return ev.receipts;
  }
  async panel() {
    const ev = await this.request({ type: "panel" });
    if (ev.type !== "panel") throw new Error(`unexpected panel answer: ${JSON.stringify(ev)}`);
    return ev.family;
  }
  async ping() {
    const ev = await this.request({ type: "ping" });
    if (ev.type !== "pong") throw new Error(`unexpected ping answer: ${JSON.stringify(ev)}`);
  }
  /** Await the next reply (optionally only for one conversation). */
  nextReply(conversationId, timeoutMs = 1e4) {
    const bidx = this.replyBuffer.findIndex(
      (r) => conversationId === void 0 || r.conversationId === conversationId
    );
    if (bidx >= 0) {
      const [hit] = this.replyBuffer.splice(bidx, 1);
      return Promise.resolve(hit);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.replyWaiters.findIndex((w) => w.resolve === resolve);
        if (i >= 0) this.replyWaiters.splice(i, 1);
        reject(new Error(`no reply within ${timeoutMs}ms${conversationId ? ` (conversation ${conversationId})` : ""}`));
      }, timeoutMs);
      void timer.unref?.();
      this.replyWaiters.push({ conversationId, resolve, timer });
    });
  }
  /** cp3: await the next inbound TASK (steer) routed to this attached session. */
  nextTask(timeoutMs = 1e4) {
    const hit = this.taskBuffer.shift();
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.taskWaiters.findIndex((w) => w.resolve === resolve);
        if (i >= 0) this.taskWaiters.splice(i, 1);
        reject(new Error(`no task within ${timeoutMs}ms`));
      }, timeoutMs);
      void timer.unref?.();
      this.taskWaiters.push({ resolve, timer });
    });
  }
  /** Close the socket; resolves once fully closed. */
  close() {
    return new Promise((resolve) => {
      if (!this.sock || this.sock.destroyed) return resolve();
      this.sock.once("close", () => resolve());
      this.sock.end();
      this.sock.destroy();
    });
  }
};
var seq = 0;
function ack(ev, verb) {
  if (ev.type === "ack") {
    return { receipt: ev.receipt, verb: ev.verb, worker: ev.worker, message: ev.message };
  }
  if (ev.type === "error") {
    throw new Error(`${ev.code}: ${ev.message}`);
  }
  throw new Error(`unexpected ${verb} answer: ${JSON.stringify(ev)}`);
}

// src/daemon/paths.ts
import { mkdir as mkdir2, readFile as readFile2, readdir, rename, writeFile as writeFile2 } from "node:fs/promises";
import { existsSync as existsSync4 } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { dirname, join as join3 } from "node:path";
function xdgConfigHome() {
  return process.env.XDG_CONFIG_HOME?.trim() || join3(homedir3(), ".config");
}
function familyRoot() {
  const override = env("FAMILY_DIR");
  if (override) return override;
  return join3(xdgConfigHome(), "vclaw", "family");
}
function familyDir(lead) {
  return join3(familyRoot(), lead);
}

// src/daemon/panel.ts
function renderPanel(family) {
  const rows = [
    ["NAME", "ROLE", "DRIVER", "STATE", "PID", "QUEUED", "LAST_REPLY", "NOTE"],
    ...family.workers.map((w) => [
      w.name,
      w.role ?? "-",
      w.driver ?? "stub",
      w.state,
      w.pid ? String(w.pid) : "-",
      String(w.queuedReplies ?? 0),
      w.lastReplyAt ?? "-",
      w.note ?? "-"
    ])
  ];
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  const line = (r) => r.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd();
  const head = [
    `family ${family.familyId} \xB7 lead ${family.lead} \xB7 dir ${family.familyDir}`,
    `daemon pid ${family.daemon.pid} since ${family.daemon.startedAt}`,
    ""
  ];
  return [...head, line(rows[0]), ...rows.slice(1).map(line), ""].join("\n");
}

// src/pi-extension/index.ts
var NATS_URL = env("NATS_URL") || "nats://vchat3:4223";
var VGATE_URL = env("VGATE_URL") || "https://api.vclawhub.com";
var DEV_MODE = env("DEV") === "1" || env("DEV") === "true";
var SEGMENT = env("SEGMENT");
var dbg = (m) => {
  if (env("DEBUG")) console.error(`[vclaw-ext] ${m}`);
};
function parseArgs2(raw) {
  const a = { force: false };
  const t = raw.split(/\s+/).filter(Boolean);
  for (let i = 0; i < t.length; i++) {
    const flag = t[i];
    if (flag === "--force") {
      a.force = true;
      continue;
    }
    const val = t[i + 1];
    if (val && !val.startsWith("--")) {
      i++;
      if (flag === "--name") a.name = val;
      else if (flag === "--email") a.email = val;
      else if (flag === "--segment") a.segment = val;
      else if (flag === "--server") a.server = val;
      else if (flag === "--vgate-url") a.vgateUrl = val;
      else if (flag === "--request-id") a.requestId = val;
    }
  }
  return a;
}
function emitResult(ctx, r) {
  ctx.ui.notify(JSON.stringify({ __vchat: true, kind: "command_result", ...r }), "info");
}
var sessionCtx = null;
function emitEvent(e) {
  sessionCtx?.ui.notify(JSON.stringify({ __vchat: true, ...e }), "info");
}
var sessionPi = null;
var sessionNc = null;
var sessionFrom = null;
var pendingReplies = [];
var pendingH2aReplies = [];
var enc = new TextEncoder();
function replyText(msg) {
  const c = msg.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.filter((b) => b?.type === "text").map((b) => b.text ?? "").join("");
  return c ? JSON.stringify(c) : "";
}
async function gateStateLabel(gate) {
  if (!gate) return "on-line (dev bypass)";
  const rec = await gate.read();
  if (rec === null || typeof rec.online !== "boolean") return "unknown";
  return rec.online ? "on-line" : "on-rack";
}
var JWT_REFRESH_MS = 50 * 60 * 1e3;
function startJwtRefreshTimer(refresh) {
  let timer = null;
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      await refresh();
      dbg("jwt refreshed (50min cycle)");
      timer = setTimeout(tick, JWT_REFRESH_MS);
    } catch (e) {
      dbg(`jwt refresh failed \u2014 ${e.message}`);
      emitEvent({ kind: "jwt_refresh_error", error: e.message });
      timer = setTimeout(() => {
        void refresh().then(() => {
          timer = setTimeout(tick, JWT_REFRESH_MS);
        }).catch(async () => {
          if (stopped || !sessionNc) return;
          try {
            await sessionNc.drain();
            await sessionNc.close();
          } catch {
          }
          emitEvent({ kind: "jwt_refresh_reconnect", at: (/* @__PURE__ */ new Date()).toISOString() });
        });
      }, 5 * 60 * 1e3);
    }
  };
  timer = setTimeout(tick, JWT_REFRESH_MS);
  return {
    stopRefresh() {
      stopped = true;
      if (timer) clearTimeout(timer);
    }
  };
}
var runtime = null;
var closing = false;
var retiredIdentity = false;
var RETIRED_BANNER = "identity retired \u2014 contact your steward to re-onboard";
function isRetiredStatus(s) {
  return s !== null && s.claimed === false && s.status === void 0;
}
async function probeAgentStatus(vgateUrl, nkey) {
  try {
    const resp = await fetch(`${vgateUrl}/v1/agent/status?nkey=${encodeURIComponent(nkey)}`);
    if (!resp.ok) return null;
    const body = await resp.json();
    return body && typeof body.claimed === "boolean" ? body : null;
  } catch {
    return null;
  }
}
function isAgentNotClaimed403(err2) {
  const m = err2?.message ?? "";
  return /token endpoint 403:.*agent_not_claimed/s.test(m);
}
async function retireLocal(nkey, reason, steward) {
  if (retiredIdentity) return;
  retiredIdentity = true;
  const rt = runtime;
  runtime = null;
  if (rt) {
    try {
      await rt.close();
    } catch {
    }
  }
  emitEvent({ kind: "identity_retired", nkey, reason, steward });
  sessionCtx?.ui.notify(`vchat: ${RETIRED_BANNER}${reason ? ` (${reason})` : ""}`, "warn");
}
async function fetchJWTOrRetired(vgateUrl, nkey, seed) {
  try {
    return await fetchNatsUserJWT(vgateUrl, nkey, seed);
  } catch (err2) {
    if (!isAgentNotClaimed403(err2)) throw err2;
    const status = await probeAgentStatus(vgateUrl, nkey);
    if (!isRetiredStatus(status)) throw err2;
    await retireLocal(nkey, void 0, void 0);
    throw new Error(RETIRED_BANNER);
  }
}
async function startRuntime(opts = {}) {
  const explicitSegment = opts.segment || SEGMENT;
  const vgateUrl = opts.vgateUrl || VGATE_URL;
  const natsUrl = opts.server || NATS_URL;
  const creds = await loadCredentials();
  if (!creds && !DEV_MODE) throw new Error("not onboarded \u2014 run /vchat-onboard");
  let nkey;
  let seed;
  let name;
  let identity;
  if (creds) {
    identity = identityFromCreds(creds);
    nkey = identity.nkey;
    seed = creds.seed;
    name = creds.name || nkey;
  } else {
    ({ identity, seed } = devEphemeralIdentity());
    nkey = identity.nkey;
    name = "dev-agent";
  }
  let refreshApi = null;
  let currentJWT = "";
  if (!DEV_MODE && creds?.jwt) {
    currentJWT = creds.jwt;
    refreshApi = null;
  } else if (!DEV_MODE) {
    currentJWT = await fetchJWTOrRetired(vgateUrl, nkey, seed);
    refreshApi = startJwtRefreshTimer(async () => {
      currentJWT = await fetchJWTOrRetired(vgateUrl, nkey, seed);
      return currentJWT;
    });
  }
  const rt = await startAgentRuntime({
    connName: `pi-${name}`,
    identity,
    seed,
    ...explicitSegment ? { segment: explicitSegment } : {},
    ...DEV_MODE ? { dev: { auth: "plain", server: env("DEV_NATS_URL") || "127.0.0.1:4222" } } : { server: natsUrl, jwtProvider: () => currentJWT },
    // static mode: session-scoped JWT (loaded at start); re-mint = file swap + session restart — hot-swap re-read is a named follow-up
    skipGate: DEV_MODE,
    presence: (gate2, segment2) => ({
      seed,
      segment: segment2,
      intervalMs: 3e4,
      online: gate2 ? async () => gate2.isOnline() : async () => true,
      // VCLAW_DEV hermetic mode
      model: () => "",
      capabilities: () => ["collaborate"],
      onOnline: () => emitEvent({ kind: "presence_update", nkey: identity.nkey, online: true }),
      onOffline: () => emitEvent({ kind: "presence_update", nkey: identity.nkey, online: false }),
      onError: (e) => emitEvent({ kind: "announce_error", error: e.message })
    })
  });
  const nc = rt.nc;
  const gate = rt.gate;
  const segment = rt.segment;
  sessionNc = nc;
  sessionFrom = { nkey, name };
  subA2A(nc, identity, (msg) => {
    const env2 = msg.envelope;
    const replyTo = env2?.a2a?.replySubject || msg.reply;
    if (replyTo) {
      pendingReplies.push({
        subject: replyTo,
        identity: inboundIdentity({
          conversationId: env2?.a2a?.conversationId,
          messageId: env2?.id,
          seq: env2?.a2a?.seq
        })
      });
      void sessionPi?.sendUserMessage(env2?.prompt ?? msg.raw);
    } else {
      console.error(`[vchat] A2A (no-reply): ${msg.raw.slice(0, 160)}`);
    }
  });
  const h2aSub = nc.subscribe(SubjectTree.PROMPT(nkey), {
    queue: "agents",
    // load-balance when multiple sessions share the nkey
    callback: (err2, msg) => {
      if (err2) {
        console.error("[pi-ext] subscription error:", err2?.message ?? err2);
        return;
      }
      if (!msg || !msg.subject) return;
      if (!msg) return;
      try {
        const raw = new TextDecoder().decode(msg.data);
        const promptMsg = JSON.parse(raw);
        const replyTo = promptMsg.reply_to;
        if (!replyTo) {
          console.warn("[vchat] H2A prompt without reply_to \u2014 can't respond");
          return;
        }
        if (Array.isArray(promptMsg.messages) && !value_exports2.Check(H2aPromptPayload, promptMsg)) {
          console.error(
            `[vchat] H2A REJECTED malformed prompt frame (no injection): ${raw.slice(0, 160)}`
          );
          nc.publish(
            replyTo,
            enc.encode(
              JSON.stringify({
                type: "error",
                data: "invalid h2a prompt frame",
                ...inboundIdentity({ conversationId: promptMsg.conversationId })
              })
            )
          );
          nc.publish(replyTo, new Uint8Array(0));
          return;
        }
        const conversation = inboundIdentity({
          conversationId: promptMsg.conversationId,
          messageId: promptMsg.messageId,
          seq: promptMsg.seq
        });
        nc.publish(
          replyTo,
          enc.encode(JSON.stringify({ type: "status", data: "ack", ...replyIdentity(conversation) }))
        );
        const msgs = promptMsg.messages ?? [];
        const lastUser = [...msgs].reverse().find((m) => m.role === "user");
        const text = lastUser && (typeof lastUser.content === "string" ? lastUser.content : JSON.stringify(lastUser.content)) || promptMsg.prompt || raw.slice(0, 2e3);
        pendingH2aReplies.push({ subject: replyTo, identity: conversation });
        void sessionPi?.sendUserMessage(`[H2A]: ${text}`);
      } catch (e) {
        console.error(`[vchat] H2A parse failed: ${e.message}`);
      }
    }
  });
  const dirHandle = watchDirectory(nc, segment, {
    onEntry: (e) => emitEvent({ kind: "peer_discovered", peer: { nkey: e.nkey, name: e.name, segment: e.segment, online: e.online } }),
    onEvict: (e) => emitEvent({ kind: "peer_evicted", peer: { nkey: e.nkey, name: e.name, segment: e.segment } })
  });
  let claimSub = null;
  if (!creds?.steward) {
    try {
      claimSub = nc.subscribe(SubjectTree.CLAIM(nkey));
      const subRef = claimSub;
      (async () => {
        for await (const _msg of subRef) {
          emitEvent({ kind: "claim_received", nkey, name, steward: creds?.steward || void 0 });
        }
      })().catch(() => {
      });
    } catch (e) {
      console.warn(`[vchat] claim notification unavailable: ${e.message}`);
    }
  }
  let retiredSub = null;
  try {
    retiredSub = nc.subscribe(SubjectTree.RETIRED(nkey), {
      callback: (err2, msg) => {
        if (err2) {
          console.error("[pi-ext] subscription error:", err2?.message ?? err2);
          return;
        }
        if (!msg || !msg.subject) return;
        if (!msg || retiredIdentity) return;
        let reason;
        let steward;
        try {
          const p = JSON.parse(new TextDecoder().decode(msg.data));
          reason = p.reason;
          steward = p.steward;
        } catch {
        }
        void retireLocal(nkey, reason, steward);
      }
    });
  } catch (e) {
    console.warn(`[vchat] retire notification unavailable: ${e.message}`);
  }
  return {
    nc,
    presence: rt.presence,
    directory: dirHandle.directory,
    stopRefresh: () => refreshApi?.stopRefresh(),
    gate,
    close: async () => {
      refreshApi?.stopRefresh();
      try {
        h2aSub.unsubscribe();
      } catch {
      }
      try {
        claimSub?.unsubscribe();
      } catch {
      }
      try {
        retiredSub?.unsubscribe();
      } catch {
      }
      try {
        dirHandle.stop();
      } catch {
      }
      await rt.close();
    }
  };
}
var familyWorker = null;
async function startFamilyWorkerMode(ctx) {
  if (familyWorker) return;
  const name = (env("WORKER_NAME") || "").trim();
  if (!name) {
    if (ctx.hasUI) ctx.ui.notify("vchat-family: VCLAW_FAMILY_WORKER=1 requires VCLAW_WORKER_NAME", "warning");
    return;
  }
  const lead = env("LEAD")?.trim() || "lead";
  const familyDir2 = familyDir(lead);
  const socketPath = env("DAEMON_SOCKET") || void 0;
  const port = env("DAEMON_PORT") ? Number(env("DAEMON_PORT")) : void 0;
  const role = env("WORKER_ROLE")?.trim() || void 0;
  const client = await DaemonClient.connect({ familyDir: familyDir2, socketPath, port });
  await client.attach({ name, role });
  familyWorker = { name, client, tasks: [] };
  if (ctx.hasUI) ctx.ui.notify(`vchat-family: attached to ${lead}'s daemon as ${name}`, "info");
  void pumpFamilyTasks(ctx);
}
async function pumpFamilyTasks(ctx) {
  while (familyWorker) {
    try {
      const task = await familyWorker.client.nextTask(3e4);
      if (!familyWorker) break;
      familyWorker.tasks.push({ conversationId: task.conversationId, prompt: task.prompt, steer: task.steer });
      const label = task.steer ? "family steer" : "family task";
      if (ctx.hasUI) ctx.ui.notify(`vchat-family: ${label} ${task.prompt.slice(0, 140)}`, "info");
      void sessionPi?.sendUserMessage(`[${label}:${task.conversationId}] ${task.prompt}`);
    } catch (e) {
      if (!familyWorker) break;
      const msg = e.message;
      if (/no task within/.test(msg)) continue;
      console.warn(`[vchat-family] worker pump ended: ${msg}`);
      break;
    }
  }
}
function index_default(pi) {
  dbg("factory loaded \u2014 registering commands + session hooks");
  sessionPi = pi;
  pi.on("turn_end", (event) => {
    const text = replyText(event.message);
    const h2aReply = pendingH2aReplies.shift();
    if (h2aReply && sessionNc) {
      try {
        const chunk = { type: "response", data: text, ...replyIdentity(h2aReply.identity) };
        sessionNc.publish(h2aReply.subject, enc.encode(JSON.stringify(chunk)));
        sessionNc.publish(h2aReply.subject, new Uint8Array(0));
      } catch {
      }
    }
    const reply = pendingReplies.shift();
    if (reply && sessionNc && sessionFrom) {
      const id = replyIdentity(reply.identity);
      const resp = JSON.stringify({
        type: "a2a_response",
        id: reply.identity.messageId || id.messageId,
        from: { nkey: sessionFrom.nkey, name: sessionFrom.name, sessionId: sessionFrom.name },
        conversationId: reply.identity.conversationId,
        inReplyTo: reply.identity.messageId,
        parentMessageId: reply.identity.messageId,
        seq: id.seq,
        text,
        ts: (/* @__PURE__ */ new Date()).toISOString()
      });
      try {
        void sessionNc.publish(reply.subject, enc.encode(resp));
      } catch {
      }
    }
    if (familyWorker && familyWorker.tasks.length > 0) {
      const task = familyWorker.tasks.shift();
      void familyWorker.client.answer(task.conversationId, text).catch((e) => {
        console.warn(`[vchat-family] answer for ${task.conversationId} failed: ${e.message}`);
      });
    }
  });
  function openInBrowser(url) {
    try {
      const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
      const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
      const child = spawn2(cmd, args, { detached: true, stdio: "ignore" });
      child.on("error", () => void 0);
      child.unref();
    } catch {
    }
  }
  pi.registerCommand("vclaw", {
    description: "VClaw operator surface \u2014 status \xB7 doctor \xB7 peers (no LLM required)",
    getArgumentCompletions(argumentPrefix) {
      const items = completions(argumentPrefix);
      return items.length > 0 ? items : null;
    },
    handler: async (args, ctx) => {
      const argv = args.trim().length > 0 ? args.trim().split(/\s+/) : [];
      const { exit, text } = await runVclaw(argv);
      const notify = ctx.ui?.notify;
      const claimUrl = result.data?.claimUrl;
      const hostManagesOpen = process.env.VCLAW_MANAGES_OPEN_URL === "1";
      if (claimUrl && argv[0] === "signup" && !hostManagesOpen && ctx.hasUI !== false) {
        openInBrowser(claimUrl);
      }
      if (typeof notify === "function") {
        notify(text, exit === 0 ? "info" : "warning");
      } else {
        process.stderr.write(text + "\n");
        if (exit !== 0) process.exitCode = exit;
      }
    }
  });
  pi.registerCommand("vchat-onboard", {
    description: "Onboard this machine as a vclawhub.com agent (introduce \u2192 claim URL)",
    handler: async (args, ctx) => {
      const a = parseArgs2(args);
      const creds = await loadCredentials();
      if (creds && !a.force) {
        emitResult(ctx, { command: "onboard", success: true, requestId: a.requestId, data: { alreadyOnboarded: true, name: creds.name || creds.public_key?.slice(0, 12) } });
        return;
      }
      const cli = `npx @vclawhub/agent onboard${a.name ? ` --name ${a.name}` : ""}${a.email ? ` --email ${a.email}` : ""}${a.force ? " --force" : ""}`;
      emitResult(ctx, { command: "onboard", success: false, code: "E_CLI", error: `inline introduce not yet wired \u2014 run: ${cli}`, requestId: a.requestId });
    }
  });
  pi.registerCommand("vchat-status", {
    description: "Show the vchat agent connection status",
    handler: async (args, ctx) => {
      const a = parseArgs2(args);
      const creds = await loadCredentials();
      if (!creds) {
        emitResult(ctx, { command: "status", success: false, code: "E_NO_CREDS", error: `not onboarded (no ${credentialDisplayPath()})`, requestId: a.requestId });
        return;
      }
      emitResult(ctx, {
        command: "status",
        success: true,
        requestId: a.requestId,
        data: {
          online: !!runtime,
          retired: retiredIdentity,
          gate: runtime ? await gateStateLabel(runtime.gate) : "unknown",
          name: creds.name || creds.public_key?.slice(0, 12)
        }
      });
    }
  });
  pi.registerCommand("vchat-connect", {
    description: "Connect to the vchat NATS fabric + start presence (manual connect / reconnect)",
    handler: async (args, ctx) => {
      const a = parseArgs2(args);
      const creds = await loadCredentials();
      if (!creds && !DEV_MODE) {
        emitResult(ctx, { command: "connect", success: false, code: "E_NO_CREDS", error: "not onboarded \u2014 run /vchat-onboard", requestId: a.requestId });
        return;
      }
      if (retiredIdentity) {
        emitResult(ctx, { command: "connect", success: false, code: "E_RETIRED", error: RETIRED_BANNER, requestId: a.requestId });
        return;
      }
      if (runtime) {
        emitResult(ctx, { command: "connect", success: true, requestId: a.requestId, data: { alreadyConnected: true, name: creds.name || creds.public_key?.slice(0, 12) } });
        return;
      }
      sessionCtx = ctx;
      try {
        runtime = await startRuntime({ segment: a.segment, server: a.server, vgateUrl: a.vgateUrl });
        await saveConfig({ segment: a.segment, server: a.server, vgateUrl: a.vgateUrl });
        emitResult(ctx, { command: "connect", success: true, requestId: a.requestId, data: { connected: true, name: creds?.name || creds?.public_key?.slice(0, 12) || "dev-agent" } });
      } catch (e) {
        emitResult(ctx, { command: "connect", success: false, code: "E_CONNECT", error: e.message, requestId: a.requestId });
      }
    }
  });
  pi.registerCommand("vchat-claim-status", {
    description: "Show the agent claim/approval state (pending / approved / not onboarded)",
    handler: async (args, ctx) => {
      const a = parseArgs2(args);
      const creds = await loadCredentials();
      if (hasPendingFlag()) {
        emitResult(ctx, { command: "claim_status", success: true, requestId: a.requestId, data: { state: "pending" }, error: "claim pending \u2014 awaiting approval" });
      } else if (creds) {
        emitResult(ctx, { command: "claim_status", success: true, requestId: a.requestId, data: { state: "approved", name: creds.name || creds.public_key?.slice(0, 12) } });
      } else {
        emitResult(ctx, { command: "claim_status", success: false, code: "E_NO_CREDS", error: "not onboarded \u2014 run /vchat-onboard", requestId: a.requestId });
      }
    }
  });
  pi.registerCommand("vchat-directory", {
    description: "Show the verified-peer directory snapshot (requires /vchat-connect)",
    handler: async (args, ctx) => {
      const a = parseArgs2(args);
      if (!runtime) {
        emitResult(ctx, { command: "directory", success: false, code: "E_NOT_CONNECTED", error: "not connected \u2014 run /vchat-connect first", requestId: a.requestId });
        return;
      }
      const peers = runtime.directory.snapshot().map((p) => ({ nkey: p.nkey, name: p.name, segment: p.segment, online: p.online }));
      emitResult(ctx, { command: "directory", success: true, requestId: a.requestId, data: { peers, count: peers.length } });
    }
  });
  pi.registerCommand("vchat-family", {
    description: "Tier L family: list/spawn/steer/stop/kill/unload/receipts on the local daemon socket",
    handler: async (args, ctx) => {
      const a = parseArgs2(args);
      const tokens = args.trim().split(/\s+/).filter(Boolean);
      const verb = (tokens[0] ?? "list").toLowerCase();
      const rest = tokens.slice(1);
      const lead = env("LEAD")?.trim() || "lead";
      const familyDir2 = familyDir(lead);
      const socketPath = env("DAEMON_SOCKET") || void 0;
      const port = env("DAEMON_PORT") ? Number(env("DAEMON_PORT")) : void 0;
      const targetLabel = port ? `tcp://127.0.0.1:${port}` : socketPath ?? `${familyDir2}/daemon.sock`;
      let client;
      try {
        client = await DaemonClient.connect({ familyDir: familyDir2, socketPath, port });
      } catch (e) {
        emitResult(ctx, {
          command: "family",
          success: false,
          code: "E_NO_DAEMON",
          error: `no reachable daemon at ${targetLabel} \u2014 start 'vclaw-agent serve' first: ${e.message}`,
          requestId: a.requestId
        });
        return;
      }
      try {
        const flag = (f) => {
          const i = rest.indexOf(f);
          return i >= 0 && i + 1 < rest.length ? rest[i + 1] : void 0;
        };
        const after = (f) => {
          const i = rest.indexOf(f);
          return i >= 0 ? rest.slice(i + 1).join(" ") : void 0;
        };
        if (verb === "list" || verb === "panel") {
          const family = await client.panel();
          const workers = family.workers.map((w) => ({
            name: w.name,
            role: w.role,
            state: w.state,
            driver: w.driver,
            pid: w.pid,
            queuedReplies: w.queuedReplies,
            note: w.note
          }));
          emitResult(ctx, {
            command: "family",
            success: true,
            requestId: a.requestId,
            data: { verb: "list", lead, familyDir: familyDir2, socket: targetLabel, familyId: family.familyId, workers, rendered: renderPanel(family) }
          });
          return;
        }
        if (verb === "spawn") {
          const name = rest[0];
          if (!name) throw new Error("usage: /vchat-family spawn <name> [--role <r>] [--prompt <text\u2026>]");
          const res = await client.spawn({ name, role: flag("--role"), prompt: after("--prompt") });
          emitResult(ctx, {
            command: "family",
            success: true,
            requestId: a.requestId,
            data: { verb: "spawn", name, receipt: res.receipt, worker: res.worker, message: res.message }
          });
          return;
        }
        if (verb === "steer") {
          const name = rest[0];
          const prompt = rest.slice(1).join(" ");
          if (!name || !prompt) throw new Error("usage: /vchat-family steer <name> <prompt\u2026>");
          const res = await client.steer({ name, prompt });
          emitResult(ctx, {
            command: "family",
            success: true,
            requestId: a.requestId,
            data: { verb: "steer", name, receipt: res.receipt, worker: res.worker, message: res.message }
          });
          return;
        }
        if (verb === "stop" || verb === "kill" || verb === "unload") {
          const name = rest[0];
          if (!name) throw new Error(`usage: /vchat-family ${verb} <name>`);
          const res = verb === "stop" ? await client.stop(name) : verb === "kill" ? await client.kill(name) : await client.unload(name);
          emitResult(ctx, {
            command: "family",
            success: true,
            requestId: a.requestId,
            data: { verb, name, receipt: res.receipt, message: res.message }
          });
          return;
        }
        if (verb === "receipts") {
          const conv = flag("--conversation");
          const receipts = await client.pickupReceipts(conv);
          emitResult(ctx, {
            command: "family",
            success: true,
            requestId: a.requestId,
            data: { verb: "receipts", receipts, count: receipts.length }
          });
          return;
        }
        emitResult(ctx, {
          command: "family",
          success: false,
          code: "E_USAGE",
          requestId: a.requestId,
          error: "unknown verb '" + verb + "' \u2014 list | spawn <name> [--role r] [--prompt \u2026] | steer <name> <prompt\u2026> | stop|kill|unload <name> | receipts"
        });
      } catch (e) {
        emitResult(ctx, {
          command: "family",
          success: false,
          code: "E_DAEMON",
          error: `${verb} failed: ${e.message}`,
          requestId: a.requestId
        });
      } finally {
        await client.close();
      }
    }
  });
  pi.on("session_start", async (_event, ctx) => {
    dbg("session_start handler entered");
    if (env("FAMILY_WORKER") === "1") {
      try {
        await startFamilyWorkerMode(ctx);
      } catch (e) {
        if (ctx.hasUI) ctx.ui.notify(`vchat-family: attach failed \u2014 ${e.message}`, "error");
      }
    }
    if (env("AGENT_AUTOSTART") === "0") return;
    if (runtime || closing) return;
    if (retiredIdentity) {
      if (ctx.hasUI) ctx.ui.notify(`vchat: ${RETIRED_BANNER}`, "warn");
      return;
    }
    sessionCtx = ctx;
    const creds = await loadCredentials();
    dbg(`session_start: creds=${creds ? "found(" + (creds.name || creds.public_key?.slice(0, 8)) + ")" : "NULL"}`);
    if (!creds) {
      if (ctx.hasUI) ctx.ui.notify("vchat: not onboarded \u2014 run /vchat-onboard", "warn");
      return;
    }
    try {
      const cfg = await readConfig();
      runtime = await startRuntime({ segment: cfg?.segment, server: cfg?.server, vgateUrl: cfg?.vgateUrl });
      dbg(`session_start: online as ${creds.name || creds.public_key?.slice(0, 12)}`);
      if (ctx.hasUI) {
        ctx.ui.notify(`vchat: online as ${creds.name || creds.public_key?.slice(0, 12)}`, "info");
      }
    } catch (e) {
      dbg(`session_start: connect failed \u2014 ${e.message}`);
      if (ctx.hasUI) ctx.ui.notify(`vchat: connect failed \u2014 ${e.message}`, "error");
    }
  });
  pi.on("session_shutdown", async () => {
    dbg(`session_shutdown (runtime=${runtime ? "open" : "null"})`);
    if (familyWorker) {
      const fw = familyWorker;
      familyWorker = null;
      try {
        await fw.client.close();
      } catch {
      }
    }
    if (closing || !runtime) return;
    closing = true;
    const rt = runtime;
    runtime = null;
    try {
      await rt.close();
    } catch {
    }
    closing = false;
  });
}
export {
  index_default as default
};
/*! Bundled license information:

@noble/ed25519/index.js:
  (*! noble-ed25519 - MIT License (c) 2019 Paul Miller (paulmillr.com) *)
*/
