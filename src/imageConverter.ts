export function convertImageToSquares(imageData: Uint8ClampedArray, width: number, height: number, squareSize: number, allowedDifferentColors: number, bleedAmount: number) {
    const squares: { x: number, y: number, color: { r: number, g: number, b: number } }[] = [];
    // first pass get averages
    for (let y = 0; y < height; y += squareSize) {
        for (let x = 0; x < width; x += squareSize) {
            const color: {r: number, g: number, b: number} | null = getAverageColor(imageData, x, y, squareSize, width);
            if (color) squares.push({ x: Math.floor(x / squareSize) * 100, y: Math.floor(y / squareSize) * 100, color });
        }
    }
    // second pass get most different colors
    const mostDifferentColors = getMostDifferentColors(squares.map(s => [s.color.r, s.color.g, s.color.b]), allowedDifferentColors);
    // third pass normalize colors to their closest color
    for (const square of squares) {
        const closestColor = getClosestColor(mostDifferentColors, [square.color.r, square.color.g, square.color.b]);
        if (closestColor) {
            square.color = { r: closestColor[0], g: closestColor[1], b: closestColor[2] };
        }
    }
    
    if (bleedAmount > 0) {
        return addBleedEffect(squares, width, height, squareSize, bleedAmount);
    }

    return squares;
}

function addBleedEffect(squares: { x: number, y: number, color: { r: number, g: number, b: number } }[], width: number, height: number, squareSize: number, bleedAmount: number) {
    const gridWidth = Math.ceil(width / squareSize);
    const gridHeight = Math.ceil(height / squareSize);
    const allSquares = [...squares];

    const squareMap = new Map<string, { r: number, g: number, b: number }>();
    for (const square of squares) {
        const gridX = square.x / 100;
        const gridY = square.y / 100;
        squareMap.set(`${gridX},${gridY}`, square.color);
    }

    for (let y = -bleedAmount; y < gridHeight + bleedAmount; y++) {
        for (let x = -bleedAmount; x < gridWidth + bleedAmount; x++) {
            // if square already exists, continue
            if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                continue;
            }

            // Find the color of the nearest edge square
            const clampedX = Math.max(0, Math.min(x, gridWidth - 1));
            const clampedY = Math.max(0, Math.min(y, gridHeight - 1));
            
            const color = squareMap.get(`${clampedX},${clampedY}`);

            if (color) {
                allSquares.push({ x: x * 100, y: y * 100, color: color });
            }
        }
    }

    return allSquares;
}

function getMostDifferentColors(list: [number, number, number][], allowedDifferentColors: number) {
    if (list.length === 0) {
        return [];
    }

    // Create a set of unique colors to avoid redundant calculations and work on a smaller set.
    const uniqueColors = Array.from(new Set(list.map(c => JSON.stringify(c)))).map(s => JSON.parse(s) as [number, number, number]);

    if (uniqueColors.length <= allowedDifferentColors) {
        return uniqueColors;
    }

    const mostDifferentColors: [number, number, number][] = [];
    
    // Start with the first color from the unique list.
    mostDifferentColors.push(uniqueColors[0]);

    while (mostDifferentColors.length < allowedDifferentColors) {
        let bestNextColor: [number, number, number] | null = null;
        let maxMinDistance = -1;

        for (const candidateColor of uniqueColors) {
            // Skip if the color is already selected.
            if (mostDifferentColors.some(c => c[0] === candidateColor[0] && c[1] === candidateColor[1] && c[2] === candidateColor[2])) {
                continue;
            }

            // Find the minimum distance from this candidate to any of the already selected colors.
            let minDistance = Number.MAX_VALUE;
            for (const selectedColor of mostDifferentColors) {
                const distance = getColorDistance(candidateColor, selectedColor);
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }

            // If this minimum distance is the largest we've seen so far, this is our new best candidate.
            if (minDistance > maxMinDistance) {
                maxMinDistance = minDistance;
                bestNextColor = candidateColor;
            }
        }

        if (bestNextColor) {
            mostDifferentColors.push(bestNextColor);
        } else {
            // This should not happen if uniqueColors.length > allowedDifferentColors
            break;
        }
    }

    return mostDifferentColors;
}
function getClosestColor(allowedColors: [number, number, number][], color: [number, number, number]): [number, number, number] | null {
    let closestColor = null;
    let closestDistance = Number.MAX_VALUE;

    for (const allowedColor of allowedColors) {
        const distance = getColorDistance(color, allowedColor);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestColor = allowedColor;
        }
    }
    return closestColor;
}
function getColorDistance(color1: [number, number, number], color2: [number, number, number]): number {
    return Math.sqrt(
        Math.pow(color1[0] - color2[0], 2) +
        Math.pow(color1[1] - color2[1], 2) +
        Math.pow(color1[2] - color2[2], 2)
    );
}

function getAverageColor(imageData: Uint8ClampedArray, startX: number, startY: number, squareSize: number, width): { r: number, g: number, b: number } | null {
    const endX = startX + squareSize;
    const endY = startY + squareSize;
    let r = 0, g = 0, b = 0, count = 0;
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            if (x >= 0 && x < width && y >= 0 && (y * width + x) * 4 + 2 < imageData.length) {
                const pixelIndex = (y * width + x) * 4;
                let sR = imageData[pixelIndex];
                let sG = imageData[pixelIndex + 1];
                let sB = imageData[pixelIndex + 2];
                if (typeof sR !== 'number' || typeof sG !== 'number' || typeof sB !== 'number') {
                    console.log('Invalid pixel color detected', { x, y, sR, sG, sB });
                } else {
                    r += sR;
                    g += sG;
                    b += sB;
                    count++;
                }
            }
        }
    }
    const d = {
        r: Math.floor(r / count),
        g: Math.floor(g / count),
        b: Math.floor(b / count)
    };
    if (count > 0) {
        return d;
    }
    return null; // No valid color found
}