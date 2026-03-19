const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('getNutritionalData', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const startTime = performance.now();
        try {
            const connectionString = process.env.STORAGE_CONNECTION_STRING;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient('dataset');
            const blobClient = containerClient.getBlobClient('diets-dataset.json');

            const downloadResponse = await blobClient.download(0);
            const content = await streamToString(downloadResponse.readableStreamBody);
            const rawData = JSON.parse(content);

            // 1. Bar Chart Data (Averages per Diet)
            const dietTotals = {};
            rawData.forEach(item => {
                const type = item.Diet_type;
                if (!dietTotals[type]) dietTotals[type] = { count: 0, p: 0, c: 0, f: 0 };
                dietTotals[type].count++;
                dietTotals[type].p += item["Protein(g)"] || 0;
                dietTotals[type].c += item["Carbs(g)"] || 0;
                dietTotals[type].f += item["Fat(g)"] || 0;
            });

            const dietAverages = Object.keys(dietTotals).map(type => ({
                diet_type: type,
                protein: (dietTotals[type].p / dietTotals[type].count).toFixed(1),
                carbs: (dietTotals[type].c / dietTotals[type].count).toFixed(1),
                fat: (dietTotals[type].f / dietTotals[type].count).toFixed(1)
            }));

            // 2. Correlation Matrix (Heatmap Data)
            const correlations = calculateCorrelations(rawData);

            const endTime = performance.now();
            return {
                status: 200,
                jsonBody: {
                    dietAverages,
                    correlations,
                    rawData: rawData.map(d => ({
                        recipe: d.Recipe_name,
                        diet: d.Diet_type,
                        protein: d["Protein(g)"],
                        carbs: d["Carbs(g)"],
                        fat: d["Fat(g)"]
                    })),
                    metadata: { executionTimeMs: (endTime - startTime).toFixed(2) + " ms" }
                }
            };
        } catch (error) {
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});

function calculateCorrelations(data) {
    const keys = ["Protein(g)", "Carbs(g)", "Fat(g)"];
    const labels = ["Protein", "Carbs", "Fat"];
    let matrix = [];

    labels.forEach((yLabel, yIdx) => {
        labels.forEach((xLabel, xIdx) => {
            const val = getPearson(data, keys[yIdx], keys[xIdx]);
            matrix.push({ x: xLabel, y: yLabel, value: val.toFixed(2) });
        });
    });
    return matrix;
}

function getPearson(data, key1, key2) {
    const n = data.length;
    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
    for (let d of data) {
        sum1 += d[key1]; sum2 += d[key2];
        sum1Sq += Math.pow(d[key1], 2); sum2Sq += Math.pow(d[key2], 2);
        pSum += d[key1] * d[key2];
    }
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - Math.pow(sum1, 2) / n) * (sum2Sq - Math.pow(sum2, 2) / n));
    return den === 0 ? 0 : num / den;
}

async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => chunks.push(data.toString()));
        readableStream.on("end", () => resolve(chunks.join("")));
        readableStream.on("error", reject);
    });
}