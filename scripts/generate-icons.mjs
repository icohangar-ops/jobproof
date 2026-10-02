import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

function crc32(buffer) {
  let crc = ~0;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length));
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return Math.hypot(px - x, py - y);
}

function onCheck(x, y, size) {
  const nx = (x + 0.5) / size;
  const ny = (y + 0.5) / size;
  const width = 0.045;
  return (
    distanceToSegment(nx, ny, 0.36, 0.53, 0.46, 0.64) < width ||
    distanceToSegment(nx, ny, 0.46, 0.64, 0.66, 0.38) < width
  );
}

function roundedDistance(x, y, size, inset) {
  const radius = size * 0.22;
  const center = size / 2;
  const half = size / 2 - inset - radius;
  const qx = Math.abs(x + 0.5 - center) - half;
  const qy = Math.abs(y + 0.5 - center) - half;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

function png(size, paint) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x += 1) {
      const [red, green, blue, alpha] = paint(x, y, size);
      const offset = y * stride + 1 + x * 4;
      raw[offset] = red;
      raw[offset + 1] = green;
      raw[offset + 2] = blue;
      raw[offset + 3] = alpha;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function stamp(x, y, size, fullBleed) {
  const inside = fullBleed || roundedDistance(x, y, size, size * 0.04) < 0.6;
  if (!inside) return [0, 0, 0, 0];
  const dx = x + 0.5 - size / 2;
  const dy = y + 0.5 - size / 2;
  if (onCheck(x, y, size)) return [28, 22, 18, 255];
  if (Math.hypot(dx, dy) < size * 0.3) return [217, 140, 42, 255];
  return [28, 22, 18, 255];
}

mkdirSync("public", { recursive: true });
mkdirSync("e2e/fixtures", { recursive: true });

writeFileSync("public/icon-192.png", png(192, (x, y, size) => stamp(x, y, size, false)));
writeFileSync("public/icon-512.png", png(512, (x, y, size) => stamp(x, y, size, false)));
writeFileSync("public/icon-maskable.png", png(512, (x, y, size) => stamp(x, y, size, true)));
writeFileSync("public/apple-touch-icon.png", png(180, (x, y, size) => stamp(x, y, size, true)));

const faviconPng = png(32, (x, y, size) => stamp(x, y, size, true));
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
const icoEntry = Buffer.alloc(16);
icoEntry[0] = 32;
icoEntry[1] = 32;
icoEntry.writeUInt16LE(1, 4);
icoEntry.writeUInt16LE(32, 6);
icoEntry.writeUInt32LE(faviconPng.length, 8);
icoEntry.writeUInt32LE(22, 12);
writeFileSync("app/favicon.ico", Buffer.concat([icoHeader, icoEntry, faviconPng]));
writeFileSync(
  "e2e/fixtures/tile.png",
  png(64, (x, y) => {
    const tile = 16;
    const light = Math.floor(x / tile) % 2 === Math.floor(y / tile) % 2;
    return light ? [246, 242, 234, 255] : [201, 187, 170, 255];
  }),
);

console.log("wrote icons and e2e fixture");
