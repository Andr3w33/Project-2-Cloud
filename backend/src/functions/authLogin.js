const { app } = require('@azure/functions');
const bcrypt = require('bcryptjs');
const { usersContainer } = require('../helpers/cosmosClient');
const { CORS_HEADERS, signToken } = require('../helpers/authHelper');

app.http('authLogin', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'auth-login',
    handler: async (request, context) => {
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: CORS_HEADERS };
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return { status: 400, headers: CORS_HEADERS, jsonBody: { error: 'Invalid JSON body' } };
        }

        const { email, password } = body || {};

        if (!email || !password) {
            return { status: 400, headers: CORS_HEADERS, jsonBody: { error: 'email and password are required' } };
        }

        try {
            const { resources: users } = await usersContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: email.toLowerCase().trim() }]
                }, { enableCrossPartitionQuery: true })
                .fetchAll();

            const user = users[0];

            // Use a consistent error message to avoid user enumeration
            if (!user || !user.passwordHash) {
                return { status: 401, headers: CORS_HEADERS, jsonBody: { error: 'Invalid email or password' } };
            }

            const valid = await bcrypt.compare(password, user.passwordHash);
            if (!valid) {
                return { status: 401, headers: CORS_HEADERS, jsonBody: { error: 'Invalid email or password' } };
            }

            const token = signToken(user);
            return {
                status: 200,
                headers: CORS_HEADERS,
                jsonBody: { token, user: { name: user.name, email: user.email } }
            };
        } catch (error) {
            context.log.error('authLogin error:', error.message);
            return { status: 500, headers: CORS_HEADERS, jsonBody: { error: 'Login failed' } };
        }
    }
});
