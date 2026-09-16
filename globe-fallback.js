// Canvas renderer used when WebGL is unavailable. The Earth image and route
// are projected onto a sphere, so the reveal still works without 3D support.
const DEG = Math.PI / 180;
const textureCache = new WeakMap();

function worldVector(coordinates) {
    const lat = coordinates.lat * DEG;
    const lon = coordinates.lon * DEG;
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}

function viewBasis(center) {
    const lat = center.lat * DEG;
    const lon = (center.lng ?? center.lon) * DEG;
    return {
        east: [-Math.sin(lon), Math.cos(lon), 0],
        north: [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)],
        front: [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]
    };
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function projected(vector, basis, cx, cy, radius) {
    const depth = dot(vector, basis.front);
    if (depth < -0.001) return null;
    return { x: cx + radius * dot(vector, basis.east), y: cy - radius * dot(vector, basis.north) };
}

function texturePixels(image) {
    if (!image) return null;
    if (textureCache.has(image)) return textureCache.get(image);
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        textureCache.set(image, pixels);
        return pixels;
    } catch {
        return null;
    }
}

function drawSphere(context, cx, cy, radius, basis, texture, scale) {
    const diameter = Math.ceil(radius * 2 * scale);
    const canvas = document.createElement('canvas');
    canvas.width = diameter;
    canvas.height = diameter;
    const pixelsContext = canvas.getContext('2d');
    const target = pixelsContext.createImageData(diameter, diameter);
    const source = texture?.data;

    for (let y = 0; y < diameter; y++) {
        const north = 1 - 2 * (y + 0.5) / diameter;
        for (let x = 0; x < diameter; x++) {
            const east = 2 * (x + 0.5) / diameter - 1;
            const radial = east * east + north * north;
            if (radial >= 1) continue;
            const front = Math.sqrt(1 - radial);
            const wx = east * basis.east[0] + north * basis.north[0] + front * basis.front[0];
            const wy = east * basis.east[1] + north * basis.north[1] + front * basis.front[1];
            const wz = east * basis.east[2] + north * basis.north[2] + front * basis.front[2];
            const targetIndex = (y * diameter + x) * 4;
            const shade = 0.53 + 0.47 * front;
            if (source) {
                const longitude = Math.atan2(wy, wx);
                const latitude = Math.asin(Math.max(-1, Math.min(1, wz)));
                const sourceX = Math.min(texture.width - 1, Math.floor((longitude / Math.PI + 1) * texture.width / 2));
                const sourceY = Math.min(texture.height - 1, Math.floor((0.5 - latitude / Math.PI) * texture.height));
                const sourceIndex = (sourceY * texture.width + sourceX) * 4;
                target.data[targetIndex] = source[sourceIndex] * shade;
                target.data[targetIndex + 1] = source[sourceIndex + 1] * shade;
                target.data[targetIndex + 2] = source[sourceIndex + 2] * shade;
            } else {
                target.data[targetIndex] = 28 * shade;
                target.data[targetIndex + 1] = 79 * shade;
                target.data[targetIndex + 2] = 108 * shade;
            }
            target.data[targetIndex + 3] = Math.min(255, (1 - radial) * diameter);
        }
    }
    pixelsContext.putImageData(target, 0, 0);
    context.drawImage(canvas, cx - radius, cy - radius, radius * 2, radius * 2);
}

function drawLine(context, vectors, basis, cx, cy, radius) {
    let started = false;
    context.beginPath();
    for (const vector of vectors) {
        const point = projected(vector, basis, cx, cy, radius);
        if (!point) {
            started = false;
        } else if (started) {
            context.lineTo(point.x, point.y);
        } else {
            context.moveTo(point.x, point.y);
            started = true;
        }
    }
    context.stroke();
}

function greatCircle(from, to) {
    const start = worldVector(from);
    const end = worldVector(to);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot(start, end))));
    if (angle < 0.0001) return [start, end];
    const sine = Math.sin(angle);
    return Array.from({ length: 101 }, (_, index) => {
        const position = index / 100;
        const a = Math.sin((1 - position) * angle) / sine;
        const b = Math.sin(position * angle) / sine;
        return [a * start[0] + b * end[0], a * start[1] + b * end[1], a * start[2] + b * end[2]];
    });
}

export class GlobeFallback {
    constructor(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('aria-hidden', 'true');
        this.canvas.style.cssText = 'display:block;width:100%;height:100%';
        this.container.replaceChildren(this.canvas);
    }

    draw(cityA, cityB, center, image) {
        const width = this.container.clientWidth || 320;
        const height = this.container.clientHeight || 320;
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(width * scale);
        this.canvas.height = Math.round(height * scale);
        const context = this.canvas.getContext('2d');
        if (!context) return false;
        context.scale(scale, scale);
        context.fillStyle = '#071f25';
        context.fillRect(0, 0, width, height);
        const radius = Math.min(width * 0.43, height * 0.42);
        const cx = width / 2;
        const cy = height / 2;
        const basis = viewBasis(center);
        drawSphere(context, cx, cy, radius, basis, texturePixels(image), scale);

        context.strokeStyle = 'rgba(231,247,247,.23)';
        context.lineWidth = 0.7;
        for (let lon = -180; lon < 180; lon += 30) {
            drawLine(context, Array.from({ length: 91 }, (_, i) => worldVector({ lat: -90 + i * 2, lon })), basis, cx, cy, radius);
        }
        for (let lat = -60; lat <= 60; lat += 30) {
            drawLine(context, Array.from({ length: 181 }, (_, i) => worldVector({ lat, lon: -180 + i * 2 })), basis, cx, cy, radius);
        }

        context.strokeStyle = '#e7c4ff';
        context.lineWidth = 3;
        context.setLineDash([7, 5]);
        drawLine(context, greatCircle(cityA.coordinates, cityB.coordinates), basis, cx, cy, radius);
        context.setLineDash([]);
        for (const [city, color] of [[cityA, '#81aaff'], [cityB, '#f1bc7a']]) {
            const point = projected(worldVector(city.coordinates), basis, cx, cy, radius);
            if (!point) continue;
            context.beginPath();
            context.arc(point.x, point.y, 5, 0, Math.PI * 2);
            context.fillStyle = color;
            context.fill();
            context.lineWidth = 1.5;
            context.strokeStyle = 'white';
            context.stroke();
        }
        return true;
    }
}
