# Firebase Cloud Functions Setup for AI Recipe Suggestions

## Prerequisites

1. **Anthropic API Key**
   - Go to https://console.anthropic.com/
   - Sign up or log in
   - Navigate to API Keys section
   - Create a new API key and copy it

2. **Firebase Blaze Plan**
   - Go to https://console.firebase.google.com/
   - Select your project: `kitchen-app-48dfd`
   - Upgrade to Blaze (pay-as-you-go) plan
   - Don't worry - you get generous free tier and usage will be minimal

## Installation Steps

### 1. Install Firebase CLI (if not already done)

Run this command in your terminal (you'll need to enter your password):
```bash
sudo chown -R 501:20 "/Users/ryanstansky/.npm"
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

This will open a browser window for you to authenticate with Google.

### 3. Initialize Firebase (if needed)

```bash
cd /Users/ryanstansky/Documents/GitHub/kitchen-app
firebase init
```

- When asked about features, make sure **Functions** is selected
- Choose **Use an existing project** → select `kitchen-app-48dfd`
- Choose **JavaScript** (not TypeScript)
- Say **No** to ESLint
- Say **Yes** to install dependencies now

### 4. Install Function Dependencies

```bash
cd functions
npm install
```

### 5. Set Your Anthropic API Key

```bash
firebase functions:config:set anthropic.key="YOUR_ANTHROPIC_API_KEY_HERE"
```

Replace `YOUR_ANTHROPIC_API_KEY_HERE` with your actual API key from step 1.

### 6. Deploy the Functions

```bash
cd ..
firebase deploy --only functions
```

This will deploy your Cloud Function to:
`https://us-central1-kitchen-app-48dfd.cloudfunctions.net/generateRecipes`

### 7. Test It!

Go to your app and navigate to the Recipe Suggestions page. Add some items to your inventory and watch the AI generate personalized recipes!

## Cost Estimate

- **Firebase Functions**: ~2 million free invocations/month, then $0.40 per million
- **Claude API (Haiku model)**: ~$0.01-0.05 per recipe generation
- **Expected monthly cost for family use**: Less than $1-2/month

## Troubleshooting

### Error: "CORS policy"
Make sure the CORS middleware is properly configured in `functions/index.js`

### Error: "Anthropic API key not found"
Run: `firebase functions:config:get` to verify your API key is set

### Function not deploying
- Make sure you're on Firebase Blaze plan
- Check that Node.js 18 is installed: `node --version`

### Recipe generation fails
- Check function logs: `firebase functions:log`
- Verify your Anthropic API key is valid at console.anthropic.com

## Local Testing (Optional)

To test functions locally before deploying:

```bash
# Set environment variable for local testing
export ANTHROPIC_API_KEY="your-api-key-here"

# Start emulators
firebase emulators:start --only functions
```

Then update the fetch URL in `recipes.html` temporarily to:
`http://localhost:5001/kitchen-app-48dfd/us-central1/generateRecipes`
