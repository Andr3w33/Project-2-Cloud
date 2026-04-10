const { app } = require('@azure/functions');
const { recipesContainer } = require('../helpers/cosmosClient');
const { CORS_HEADERS, verifyToken } = require('../helpers/authHelper');

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

app.http('getRecipes', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'getRecipes',
    handler: async (request, context) => {
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: CORS_HEADERS };
        }

        const user = verifyToken(request);
        if (!user) {
            return { status: 401, headers: CORS_HEADERS, jsonBody: { error: 'Unauthorized' } };
        }

        const params = request.query;
        const search = (params.get('search') || '').toLowerCase().trim();
        const dietFilter = (params.get('dietFilter') || 'all').toLowerCase().trim();
        const page = Math.max(1, parseInt(params.get('page') || '1', 10));
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(params.get('pageSize') || DEFAULT_PAGE_SIZE, 10)));
        const offset = (page - 1) * pageSize;

        try {
            // Build WHERE clause dynamically to avoid cross-partition fan-out cost
            const conditions = [];
            const queryParams = [];

            if (search) {
                conditions.push('CONTAINS(LOWER(c.recipe), @search)');
                queryParams.push({ name: '@search', value: search });
            }
            if (dietFilter !== 'all') {
                conditions.push('c.diet = @diet');
                queryParams.push({ name: '@diet', value: dietFilter });
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            // Count query
            const countSpec = {
                query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
                parameters: queryParams
            };
            const { resources: [totalCount] } = await recipesContainer.items
                .query(countSpec, { enableCrossPartitionQuery: true })
                .fetchAll();

            // Data query with pagination
            const dataSpec = {
                query: `SELECT * FROM c ${whereClause} ORDER BY c.recipe OFFSET @offset LIMIT @pageSize`,
                parameters: [
                    ...queryParams,
                    { name: '@offset', value: offset },
                    { name: '@pageSize', value: pageSize }
                ]
            };
            const { resources: recipes } = await recipesContainer.items
                .query(dataSpec, { enableCrossPartitionQuery: true })
                .fetchAll();

            return {
                status: 200,
                headers: CORS_HEADERS,
                jsonBody: {
                    recipes,
                    pagination: {
                        page,
                        pageSize,
                        totalCount,
                        totalPages: Math.ceil(totalCount / pageSize)
                    }
                }
            };
        } catch (error) {
            context.log.error('getRecipes error:', error.message);
            return { status: 500, headers: CORS_HEADERS, jsonBody: { error: error.message } };
        }
    }
});
