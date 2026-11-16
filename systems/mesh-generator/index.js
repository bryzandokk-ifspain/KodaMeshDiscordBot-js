'use strict';

const fs = require('node:fs');
const Buffer = require('node:buffer').Buffer;
const sharp = require('sharp');

const ALPHA_THRESHOLD = 20;
const PLANE_SIZE = 2.0;
const DEFAULT_THICKNESS = 0.10;
const MAX_FACES = 150000;

function rotatePoint(point, rotation) {
    const [rx, ry, rz] = rotation.map(v => v * Math.PI / 180);
    const [x0, y0, z0] = point;

    // Blender XYZ Euler: Rz * Ry * Rx.
    const x1 = x0;
    const y1 = y0 * Math.cos(rx) - z0 * Math.sin(rx);
    const z1 = y0 * Math.sin(rx) + z0 * Math.cos(rx);

    const x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
    const y2 = y1;
    const z2 = -x1 * Math.sin(ry) + z1 * Math.cos(ry);

    // First reproduce Blender's XYZ Euler rotation exactly. The source
    // create_image_mesh.py works in Blender coordinates (Z-up), while GLB/
    // glTF is Y-up. Blender's FBX exporter performs this axis conversion for
    // us; our direct GLB writer must do it explicitly to match the old FBX.
    const blenderX = x2 * Math.cos(rz) - y2 * Math.sin(rz);
    const blenderY = x2 * Math.sin(rz) + y2 * Math.cos(rz);
    const blenderZ = z2;

    // Blender Z-up -> glTF Y-up: (X, Y, Z) => (X, Z, -Y).
    return [blenderX, blenderZ, -blenderY];
}

function normalOf(points) {
    const a = points[0], b = points[1], c = points[2];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    return [nx / length, ny / length, nz / length];
}

function fbxNumber(value) {
    if (!Number.isFinite(value)) throw new Error('Non-finite geometry value');
    return Number(value.toFixed(7)).toString();
}

function fbxArray(values) {
    return values.map(fbxNumber).join(',');
}

function quoteFbx(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Generate a closed, UV-mapped, extruded pixel silhouette as binary glTF (GLB).
 * Sharp reads PNG rows top-down; the source Blender script reads Blender
 * image pixels bottom-up, so rows are inverted to retain its UV orientation.
 * Geometry rotations follow create_image_mesh.py, then receive Blender's
 * Z-up to glTF Y-up axis conversion (the equivalent of the old FBX exporter).
 */
async function generatePixelMeshGlb({
    imagePath,
    outputPath,
    originalSize,
    rotationX = 90,
    rotationY = -45,
    rotationZ = 0,
    thickness = DEFAULT_THICKNESS,
    alphaThreshold = ALPHA_THRESHOLD,
    logger = console
}) {
    if (!imagePath || !outputPath) throw new Error('imagePath and outputPath are required');

    const { data, info } = await sharp(imagePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    if (!width || width !== height) throw new Error('Mesh source image must be square');
    if (originalSize && width !== Number(originalSize)) {
        throw new Error(`Mesh source is ${width}x${height}, expected ${originalSize}x${originalSize}`);
    }
    if (!Number.isFinite(thickness) || thickness <= 0) throw new Error('Mesh thickness must be greater than zero');

    const mask = new Uint8Array(width * height);
    let visibleCount = 0;

    for (let y = 0; y < height; y++) {
        const sourceY = height - 1 - y;
        for (let x = 0; x < width; x++) {
            const alpha = data[(sourceY * width + x) * 4 + 3];
            if (alpha > alphaThreshold) {
                mask[y * width + x] = 1;
                visibleCount++;
            }
        }
    }

    if (!visibleCount) throw new Error('The image has no visible pixels above the alpha threshold');

    const half = thickness / 2;
    const vertices = [];
    const polygonVertexIndices = [];
    const normals = [];
    const uvs = [];
    const uvIndices = [];
    let faceCount = 0;

    const isVisible = (x, y) =>
        x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;

    const point = (x, y, z) => [
        (x / width - 0.5) * PLANE_SIZE,
        (y / height - 0.5) * PLANE_SIZE,
        z
    ];

    function addFace(rawPoints, rawUvs) {
        if (faceCount >= MAX_FACES) {
            throw new Error(
                `The pixel shape is too complex (${MAX_FACES.toLocaleString()} face limit). ` +
                'Use a simpler transparent image or reduce its detail.'
            );
        }
        const transformed = rawPoints.map(p => rotatePoint(p, [rotationX, rotationY, rotationZ]));
        const normal = normalOf(transformed);
        for (const p of transformed) vertices.push(...p);
        for (let i = 0; i < 4; i++) {
            const vertexIndex = (vertices.length / 3) - 4 + i;
            polygonVertexIndices.push(i === 3 ? -vertexIndex - 1 : vertexIndex);
            normals.push(...normal);
            // Blender UVs use a bottom-left image origin, while glTF 2.0
            // texture coordinates use a top-left image origin. Keep U and
            // invert V so the uploaded 1024x1024 texture lines up with the
            // pixel silhouette exactly as it did in create_image_mesh.py.
            uvs.push(rawUvs[i][0], 1 - rawUvs[i][1]);
            uvIndices.push(uvIndices.length);
        }
        faceCount++;
    }

    // Merge horizontal runs on each row for front/back caps.
    for (let y = 0; y < height; y++) {
        let x = 0;
        while (x < width) {
            if (!isVisible(x, y)) { x++; continue; }
            const start = x;
            while (x + 1 < width && isVisible(x + 1, y)) x++;
            const end = x + 1;

            const u0 = start / width, u1 = end / width;
            const v0 = y / height, v1 = (y + 1) / height;

            addFace(
                [point(start, y, half), point(end, y, half), point(end, y + 1, half), point(start, y + 1, half)],
                [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
            );
            addFace(
                [point(start, y + 1, -half), point(end, y + 1, -half), point(end, y, -half), point(start, y, -half)],
                [[u0, v1], [u1, v1], [u1, v0], [u0, v0]]
            );
            x++;
        }
    }

    // Exposed boundary edges only: no internal walls between adjacent pixels
    // Each edge is a quad connecting the front and back caps.
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!isVisible(x, y)) continue;

            const u0 = x / width, u1 = (x + 1) / width;
            const v0 = y / height, v1 = (y + 1) / height;

            // Bottom edge (neighbor y-1).
            if (!isVisible(x, y - 1)) {
                addFace(
                    [point(x, y, -half), point(x + 1, y, -half), point(x + 1, y, half), point(x, y, half)],
                    [[u0, v0], [u1, v0], [u1, v0], [u0, v0]]
                );
            }
            // Right edge.
            if (!isVisible(x + 1, y)) {
                addFace(
                    [point(x + 1, y, -half), point(x + 1, y + 1, -half), point(x + 1, y + 1, half), point(x + 1, y, half)],
                    [[u1, v0], [u1, v1], [u1, v1], [u1, v0]]
                );
            }
            // Top edge.
            if (!isVisible(x, y + 1)) {
                addFace(
                    [point(x + 1, y + 1, -half), point(x, y + 1, -half), point(x, y + 1, half), point(x + 1, y + 1, half)],
                    [[u1, v1], [u0, v1], [u0, v1], [u1, v1]]
                );
            }
            // Left edge.
            if (!isVisible(x - 1, y)) {
                addFace(
                    [point(x, y + 1, -half), point(x, y, -half), point(x, y, half), point(x, y + 1, half)],
                    [[u0, v1], [u0, v0], [u0, v0], [u0, v1]]
                );
            }
        }
    }

    if (!faceCount) throw new Error('Mesh generation produced no faces');


    const vertexCount = vertices.length / 3;

    // Roblox Open Cloud accepts binary glTF (.glb). ASCII FBX generated by the
    // previous patch could be parsed by generic viewers but rejected by Roblox.
    const positionBuffer = Buffer.from(new Float32Array(vertices).buffer);
    const normalBuffer = Buffer.from(new Float32Array(normals).buffer);
    const uvBuffer = Buffer.from(new Float32Array(uvs).buffer);

    const indices = [];
    for (let face = 0; face < faceCount; face++) {
        const base = face * 4;
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const indexBuffer = Buffer.from(new Uint32Array(indices).buffer);

    const align4 = buffer => {
        const padding = (4 - (buffer.length % 4)) % 4;
        return padding ? Buffer.concat([buffer, Buffer.alloc(padding)]) : buffer;
    };

    const posBin = align4(positionBuffer);
    const normBin = align4(normalBuffer);
    const uvBin = align4(uvBuffer);
    const idxBin = align4(indexBuffer);

    const chunks = [posBin, normBin, uvBin, idxBin];
    let byteOffset = 0;
    const bufferViews = chunks.map((chunk, index) => {
        const view = {
            buffer: 0,
            byteOffset,
            byteLength: chunk.length,
            target: index === 3 ? 34963 : 34962
        };
        byteOffset += chunk.length;
        return view;
    });
    const binary = Buffer.concat(chunks);

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < vertices.length; i += 3) {
        for (let axis = 0; axis < 3; axis++) {
            min[axis] = Math.min(min[axis], vertices[i + axis]);
            max[axis] = Math.max(max[axis], vertices[i + axis]);
        }
    }

    const json = {
        asset: { version: '2.0', generator: 'KodaMesh RobloxImageBot' },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0, name: 'MinecraftPixelMesh' }],
        meshes: [{
            name: 'MinecraftPixelMesh',
            primitives: [{
                attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
                indices: 3,
                material: 0,
                mode: 4
            }]
        }],
        materials: [{
            name: 'MinecraftTexture',
            pbrMetallicRoughness: {
                baseColorFactor: [1, 1, 1, 1],
                metallicFactor: 0,
                roughnessFactor: 1
            },
            doubleSided: true
        }],
        buffers: [{ byteLength: binary.length }],
        bufferViews,
        accessors: [
            { bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min, max },
            { bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3' },
            { bufferView: 2, componentType: 5126, count: vertexCount, type: 'VEC2' },
            { bufferView: 3, componentType: 5125, count: indices.length, type: 'SCALAR' }
        ]
    };

    let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    jsonBuffer = align4(jsonBuffer);
    const totalLength = 12 + 8 + jsonBuffer.length + 8 + binary.length;
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546C67, 0); // glTF
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(totalLength, 8);

    const jsonHeader = Buffer.alloc(8);
    jsonHeader.writeUInt32LE(jsonBuffer.length, 0);
    jsonHeader.writeUInt32LE(0x4E4F534A, 4); // JSON

    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(binary.length, 0);
    binHeader.writeUInt32LE(0x004E4942, 4); // BIN

    const glb = Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, binary]);
    fs.mkdirSync(require('node:path').dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, glb);

    const stats = fs.statSync(outputPath);
    logger.log?.(`[MESH] GLB generated: ${stats.size} bytes; ${visibleCount} visible pixels; ${faceCount} faces`);

    return {
        outputPath,
        fileSize: stats.size,
        width,
        height,
        visiblePixels: visibleCount,
        faces: faceCount,
        vertices: vertexCount,
        format: 'glTF 2.0 binary (GLB)'
    };
}

module.exports = {
    generatePixelMeshGlb,
    ALPHA_THRESHOLD,
    PLANE_SIZE,
    DEFAULT_THICKNESS,
    MAX_FACES
};