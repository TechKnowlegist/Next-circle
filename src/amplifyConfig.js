// Next Circle has no Cognito pool of its own — it deliberately points
// at Nextlayer3D's existing user pool so a Nextlayer3D account works here
// too, same "shared backend" pattern Nextplayer already uses (see
// amplifyConfig.js in the Nextplayer repo, and amplify/auth/resource.ts +
// the ChatServer/ChatChannel/ChatMessage/ChatDMThread models in
// amplify/data/resource.ts over in the Tasker/Nextlayer3D repo).
//
// These values aren't secrets (the same ones ship in Nextlayer3D's own
// committed amplify_outputs.json) — just the public pool/client IDs a
// browser needs to talk to Cognito and AppSync.
//
// This is a *shared account*, not shared-session SSO: being signed in on
// nextlayer3d.app won't automatically sign you in here too, since each
// subdomain keeps its own browser-local auth session. Same credentials
// work on both, you just sign in once per site.
//
// Chat requires a real account for everything (no guest/identityPool
// reads, unlike the arcade's public leaderboards) — see the "deliberately
// permissive but signed-in-only" note on the Chat models in
// amplify/data/resource.ts for what that does and doesn't protect.
//
// If Nextlayer3D's backend is ever fully torn down and recreated (not
// just redeployed), these IDs will change and need updating here too.
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_0FhWeYtH3',
      userPoolClientId: '23stslhjc75cfe8fnv9kbeknd5',
      identityPoolId: 'us-east-1:a5730522-b148-44a0-bce9-3c8c00485426',
      loginWith: {
        email: true,
      },
    },
  },
  API: {
    GraphQL: {
      endpoint: 'https://3e3ahgblh5gonpgqt5t24tmjfy.appsync-api.us-east-1.amazonaws.com/graphql',
      region: 'us-east-1',
      defaultAuthMode: 'userPool',
    },
  },
  // Same shared bucket Nextlayer3D's storage.js uses — needed for profile
  // avatar/banner uploads (see profileApi.js). Without this block,
  // uploadData/getUrl/remove from aws-amplify/storage have no bucket to
  // target at all and throw "Missing bucket name while accessing object."
  Storage: {
    S3: {
      bucket: 'amplify-tasker-gavin-sand-nextlayerbuildplatemodel-2blnfxpm7rog',
      region: 'us-east-1',
    },
  },
}
