const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
});

const database = client.database('diet-dashboard');

module.exports = {
    usersContainer: database.container('users'),
    analyticsContainer: database.container('analytics'),
    recipesContainer: database.container('recipes')
};
