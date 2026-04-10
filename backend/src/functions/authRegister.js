const { app } = require('@azure/functions');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { usersContainer } = require('../helpers/cosmosClient');
const { CORS_HEADERS, signToken } = require('../helpers/authHelper');

app.http('authRegister', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'auth-register',
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

        const { name, email, password } = body || {};

        if (!name || !email || !password) {
            return { status: 400, headers: CORS_HEADERS, jsonBody: { error: 'name, email, and password are required' } };
        }
        if (password.length < 6) {
            return { status: 400, headers: CORS_HEADERS, jsonBody: { error: 'Password must be at least 6 characters' } };
        }

        try {
            // Check if email already registered
            const { resources: existing } = await usersContainer.items
                .query({
                    query: 'SELECT c.id FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: email.toLowerCase() }]
                }, { enableCrossPartitionQuery: true })
                .fetchAll();

            if (existing.length > 0) {
                return { status: 409, headers: CORS_HEADERS, jsonBody: { error: 'Email already registered' } };
            }

            // Hash password — never store plaintext
            const passwordHash = await bcrypt.hash(password, 12);

            const newUser = {
                id: uuidv4(),
                name: name.trim(),
                email: email.toLowerCase().trim(),
                passwordHash,
                oauthProvider: null,
                oauthId: null,
                createdAt: new Date().toISOString()
            };

            await usersContainer.items.create(newUser);

            const token = signToken(newUser);
            return {
                status: 201,
                headers: CORS_HEADERS,
                jsonBody: { token, user: { name: newUser.name, email: newUser.email } }
            };
        } catch (error) {
            context.log.error('authRegister error:', error.message);
            return { status: 500, headers: CORS_HEADERS, jsonBody: { error: 'Registration failed' } };
        }
    }
});
