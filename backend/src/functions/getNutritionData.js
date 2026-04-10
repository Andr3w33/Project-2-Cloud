const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { analyticsContainer } = require('../helpers/cosmosClient');
const { CORS_HEADERS, verifyToken } = require('../helpers/authHelper');

app.http('getNutritionalData', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: CORS_HEADERS };
        }

        // JWT auth check
        const user = verifyToken(request);
        if (!user) {
            return { status: 401, headers: CORS_HEADERS, jsonBody: { error: 'Unauthorized' } };
        }

        const startTime = performance.now();

        try {
            // Try reading pre-computed analytics from Cosmos DB first
            const { resource: analyticsDoc } = await analyticsContainer.item('current', 'current').read();

            if (analyticsDoc) {
                const endTime = performance.now();
                return {
                    status: 200,
                    headers: CORS_HEADERS,
                    jsonBody: {
                        dietAverages: analyticsDoc.dietAverages,
                        dietDistribution: analyticsDoc.dietDistribution,
                        correlations: analyticsDoc.correlations,
                        clusters: analyticsDoc.clusters,
                        metadata: {
                            executionTimeMs: (endTime - startTime).toFixed(2) + ' ms',
                            source: 'cosmos-cache',
                            cacheUpdatedAt: analyticsDoc.updatedAt
                        }
                    }
                };
            }
        } catch (cosmosErr) {
            // Cosmos not configured or analytics not yet seeded — fall through to blob
            context.log('Cosmos read failed, falling back to blob:', cosmosErr.message);
        }

        // Fallback: compute from blob (first-run before blob trigger fires)
        try {
            const connectionString = process.env.STORAGE_CONNECTION_STRING;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient('dataset');
            const blobClient = containerClient.getBlobClient('diets-dataset.json');

            const downloadResponse = await blobClient.download(0);
            const content = await streamToString(downloadResponse.readableStreamBody);
            const rawData = JSON.parse(content);

            const dietTotals = {};
            rawData.forEach(item => {
                const type = item.Diet_type;
                if (!dietTotals[type]) dietTotals[type] = { count: 0, p: 0, c: 0, f: 0 };
                dietTotals[type].count++;
                dietTotals[type].p += item['Protein(g)'] || 0;
                dietTotals[type].c += item['Carbs(g)'] || 0;
                dietTotals[type].f += item['Fat(g)'] || 0;
            });

            const dietAverages = Object.keys(dietTotals).map(type => ({
                diet_type: type,
                protein: (dietTotals[type].p / dietTotals[type].count).toFixed(1),
                carbs: (dietTotals[type].c / dietTotals[type].count).toFixed(1),
                fat: (dietTotals[type].f / dietTotals[type].count).toFixed(1)
            }));

            const dietDistribution = rawData.reduce((acc, curr) => {
                acc[curr.Diet_type] = (acc[curr.Diet_type] || 0) + 1;
                return acc;
            }, {});

            const endTime = performance.now();
            return {
                status: 200,
                headers: CORS_HEADERS,
                jsonBody: {
                    dietAverages,
                    dietDistribution,
                    correlations: calculateCorrelations(rawData),
                    clusters: calculateKMeans(rawData),
                    metadata: {
                        executionTimeMs: (endTime - startTime).toFixed(2) + ' ms',
                        source: 'blob-fallback'
                    }
                }
            };
        } catch (error) {
            return { status: 500, headers: CORS_HEADERS, jsonBody: { error: error.message } };
        }
    }
});

async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', data => chunks.push(data.toString()));
        readableStream.on('end', () => resolve(chunks.join('')));
        readableStream.on('error', reject);
    });
}

function calculateCorrelations(data) {
    const keys = ['Protein(g)', 'Carbs(g)', 'Fat(g)'];
    const labels = ['Protein', 'Carbs', 'Fat'];
    const matrix = [];
    labels.forEach((yLabel, yIdx) => {
        labels.forEach((xLabel, xIdx) => {
            matrix.push({ x: xLabel, y: yLabel, value: getPearson(data, keys[yIdx], keys[xIdx]).toFixed(2) });
        });
    });
    return matrix;
}

function getPearson(data, key1, key2) {
    const n = data.length;
    if (n === 0) return 0;
    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
    for (const d of data) {
        sum1 += d[key1] || 0; sum2 += d[key2] || 0;
        sum1Sq += Math.pow(d[key1] || 0, 2); sum2Sq += Math.pow(d[key2] || 0, 2);
        pSum += (d[key1] || 0) * (d[key2] || 0);
    }
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - Math.pow(sum1, 2) / n) * (sum2Sq - Math.pow(sum2, 2) / n));
    return den === 0 ? 0 : num / den;
}

function calculateKMeans(data) {
    if (!data || data.length === 0) return [];
    const points = data.map(d => [d['Protein(g)'] || 0, d['Carbs(g)'] || 0, d['Fat(g)'] || 0]);
    const maxs = [0, 0, 0];
    points.forEach(p => {
        if (p[0] > maxs[0]) maxs[0] = p[0];
        if (p[1] > maxs[1]) maxs[1] = p[1];
        if (p[2] > maxs[2]) maxs[2] = p[2];
    });
    const k = 3;
    let centroids = [
        [maxs[0] * 0.2, maxs[1] * 0.8, maxs[2] * 0.2],
        [maxs[0] * 0.8, maxs[1] * 0.2, maxs[2] * 0.2],
        [maxs[0] * 0.2, maxs[1] * 0.2, maxs[2] * 0.8]
    ];
    let assignments = new Array(points.length).fill(-1);
    for (let iter = 0; iter < 10; iter++) {
        let changed = false;
        for (let i = 0; i < points.length; i++) {
            let minDist = Infinity, best = 0;
            for (let c = 0; c < k; c++) {
                const d0 = (points[i][0] - centroids[c][0]) / (maxs[0] || 1);
                const d1 = (points[i][1] - centroids[c][1]) / (maxs[1] || 1);
                const d2 = (points[i][2] - centroids[c][2]) / (maxs[2] || 1);
                const dist = d0 * d0 + d1 * d1 + d2 * d2;
                if (dist < minDist) { minDist = dist; best = c; }
            }
            if (assignments[i] !== best) { assignments[i] = best; changed = true; }
        }
        if (!changed) break;
        const newC = [[0,0,0],[0,0,0],[0,0,0]];
        const counts = [0, 0, 0];
        for (let i = 0; i < points.length; i++) {
            const c = assignments[i];
            counts[c]++;
            newC[c][0] += points[i][0];
            newC[c][1] += points[i][1];
            newC[c][2] += points[i][2];
        }
        for (let c = 0; c < k; c++) {
            if (counts[c] > 0) {
                centroids[c] = [newC[c][0] / counts[c], newC[c][1] / counts[c], newC[c][2] / counts[c]];
            }
        }
    }
    const clusters = [
        { name: 'Cluster 1 (High Carb)', count: 0, p: 0, c: 0, f: 0 },
        { name: 'Cluster 2 (High Protein)', count: 0, p: 0, c: 0, f: 0 },
        { name: 'Cluster 3 (High Fat)', count: 0, p: 0, c: 0, f: 0 }
    ];
    for (let i = 0; i < points.length; i++) {
        const c = assignments[i];
        clusters[c].count++;
        clusters[c].p += points[i][0];
        clusters[c].c += points[i][1];
        clusters[c].f += points[i][2];
    }
    return clusters.map(c => ({
        name: c.name,
        count: c.count,
        protein: c.count ? (c.p / c.count).toFixed(1) : 0,
        carbs: c.count ? (c.c / c.count).toFixed(1) : 0,
        fat: c.count ? (c.f / c.count).toFixed(1) : 0
    }));
}
