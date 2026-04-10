const { app } = require('@azure/functions');
const { v4: uuidv4 } = require('uuid');
const { usersContainer } = require('../helpers/cosmosClient');
const { CORS_HEADERS, signToken } = require('../helpers/authHelper');

app.http('authOAuthCallback', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'auth-oauth-callback',
    handler: async (request, context) => {
        const code = request.query.get('code');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (!code) {
            return {
                status: 302,
                headers: { ...CORS_HEADERS, Location: `${frontendUrl}/#error=oauth_missing_code` }
            };
        }

        try {
            // Exchange code for GitHub access token
            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code
                })
            });
            const tokenData = await tokenRes.json();

            if (tokenData.error || !tokenData.access_token) {
                context.log.error('GitHub token exchange failed:', tokenData);
                return {
                    status: 302,
                    headers: { ...CORS_HEADERS, Location: `${frontendUrl}/#error=oauth_token_exchange_failed` }
                };
            }

            // Fetch GitHub user profile
            const profileRes = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                    'User-Agent': 'DietDashboard'
                }
            });
            const profile = await profileRes.json();

            // Fetch GitHub user emails to get primary verified email
            const emailsRes = await fetch('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                    'User-Agent': 'DietDashboard'
                }
            });
            const emails = await emailsRes.json();
            const primaryEmail = Array.isArray(emails)
                ? (emails.find(e => e.primary && e.verified)?.email || emails[0]?.email)
                : profile.email;

            if (!primaryEmail) {
                return {
                    status: 302,
                    headers: { ...CORS_HEADERS, Location: `${frontendUrl}/#error=oauth_no_email` }
                };
            }

            const githubId = String(profile.id);
            const displayName = profile.name || profile.login || 'GitHub User';

            // Upsert user: find by oauthId or email
            const { resources: existing } = await usersContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.oauthId = @oauthId OR c.email = @email',
                    parameters: [
                        { name: '@oauthId', value: githubId },
                        { name: '@email', value: primaryEmail.toLowerCase() }
                    ]
                }, { enableCrossPartitionQuery: true })
                .fetchAll();

            let user = existing[0];

            if (user) {
                // Update OAuth fields if this user registered via email before
                if (!user.oauthProvider) {
                    user.oauthProvider = 'github';
                    user.oauthId = githubId;
                    await usersContainer.items.upsert(user);
                }
            } else {
                user = {
                    id: uuidv4(),
                    name: displayName,
                    email: primaryEmail.toLowerCase(),
                    passwordHash: null,
                    oauthProvider: 'github',
                    oauthId: githubId,
                    createdAt: new Date().toISOString()
                };
                await usersContainer.items.create(user);
            }

            const jwt = signToken(user);

            // Redirect back to frontend with token in URL hash
            const redirectUrl = `${frontendUrl}/#token=${encodeURIComponent(jwt)}&name=${encodeURIComponent(user.name)}`;
            return {
                status: 302,
                headers: { ...CORS_HEADERS, Location: redirectUrl }
            };
        } catch (error) {
            context.log.error('OAuth callback error:', error.message);
            return {
                status: 302,
                headers: { ...CORS_HEADERS, Location: `${frontendUrl}/#error=oauth_server_error` }
            };
        }
    }
});
