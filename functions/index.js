const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const OpenAI = require('openai');
const {defineSecret} = require('firebase-functions/params');

admin.initializeApp();

const db = admin.firestore();

// Define secret for OpenAI API key
const openaiKey = defineSecret('OPENAI_API_KEY');

// Generate quick recipe list (names and descriptions only)
exports.generateRecipeList = onRequest({
  secrets: [openaiKey],
  cors: true
}, async (req, res) => {
  // Initialize OpenAI client with secret
  const openai = new OpenAI({
    apiKey: openaiKey.value()
  });

    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({error: 'Method not allowed'});
    }

    try {
      const {inventory} = req.body;

      if (!inventory || typeof inventory !== 'object') {
        return res.status(400).json({error: 'Invalid inventory data'});
      }

      // Flatten inventory into a single list
      const allItems = [
        ...(inventory.fridge || []),
        ...(inventory.freezer || []),
        ...(inventory.pantry || []),
        ...(inventory.spices || [])
      ].filter(item => item && item.trim());

      if (allItems.length === 0) {
        return res.status(400).json({error: 'Inventory is empty'});
      }

      // Call OpenAI API for quick list
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [{
          role: 'user',
          content: `I have the following ingredients: ${allItems.join(', ')}

Generate 10-15 recipe suggestions. For each recipe, ONLY include:
- name
- brief description (one sentence)
- match percentage (how well it matches my ingredients)

Format as JSON:
{
  "recipes": [
    {
      "id": "unique-recipe-id",
      "name": "Recipe Name",
      "description": "One sentence description",
      "matchPercentage": 85
    }
  ]
}

Return ONLY valid JSON.`
        }]
      });

      const responseText = completion.choices[0].message.content;
      const data = JSON.parse(responseText);

      if (!data.recipes || !Array.isArray(data.recipes)) {
        throw new Error('Invalid recipe format');
      }

      return res.status(200).json({
        success: true,
        recipes: data.recipes
      });

    } catch (error) {
    console.error('Error generating recipe list:', error);
    return res.status(500).json({
      error: 'Failed to generate recipe list',
      message: error.message
    });
  }
});

// Generate full recipe details for a specific recipe
exports.generateRecipeDetails = onRequest({
  secrets: [openaiKey],
  cors: true
}, async (req, res) => {
  // Initialize OpenAI client with secret
  const openai = new OpenAI({
    apiKey: openaiKey.value()
  });

    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({error: 'Method not allowed'});
    }

    try {
      const {recipeName, inventory} = req.body;

      if (!recipeName || !inventory) {
        return res.status(400).json({error: 'Missing recipe name or inventory'});
      }

      // Flatten inventory into a single list
      const allItems = [
        ...(inventory.fridge || []),
        ...(inventory.freezer || []),
        ...(inventory.pantry || []),
        ...(inventory.spices || [])
      ].filter(item => item && item.trim());

      // Call OpenAI API for full recipe
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [{
          role: 'user',
          content: `I want to make: ${recipeName}

I have these ingredients: ${allItems.join(', ')}

Provide the COMPLETE recipe with:
- Full ingredients list with measurements
- Step-by-step directions
- Cook time, servings, difficulty

Format as JSON:
{
  "recipe": {
    "name": "${recipeName}",
    "description": "Brief description",
    "cookTime": "30 minutes",
    "servings": "4 servings",
    "difficulty": "Easy",
    "ingredients": ["2 cups rice", "1 lb chicken"],
    "directions": ["Step 1", "Step 2"],
    "matchedIngredients": ["rice", "chicken"],
    "missingIngredients": ["salt", "pepper"]
  }
}

Return ONLY valid JSON.`
        }]
      });

      const responseText = completion.choices[0].message.content;
      const data = JSON.parse(responseText);

      if (!data.recipe) {
        throw new Error('Invalid recipe format');
      }

      return res.status(200).json({
        success: true,
        recipe: data.recipe
      });

    } catch (error) {
    console.error('Error generating recipe details:', error);
    return res.status(500).json({
      error: 'Failed to generate recipe details',
      message: error.message
    });
  }
});

// Keep old function for backwards compatibility
exports.generateRecipes = onRequest({
  secrets: [openaiKey],
  cors: true
}, async (req, res) => {
  // Initialize OpenAI client with secret
  const openai = new OpenAI({
    apiKey: openaiKey.value()
  });
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({error: 'Method not allowed'});
    }

    try {
      const {inventory} = req.body;

      if (!inventory || typeof inventory !== 'object') {
        return res.status(400).json({error: 'Invalid inventory data'});
      }

      // Flatten inventory into a single list
      const allItems = [
        ...(inventory.fridge || []),
        ...(inventory.freezer || []),
        ...(inventory.pantry || []),
        ...(inventory.spices || [])
      ].filter(item => item && item.trim());

      if (allItems.length === 0) {
        return res.status(400).json({error: 'Inventory is empty'});
      }

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [{
          role: 'user',
          content: `I have the following ingredients in my kitchen:

${allItems.join(', ')}

Please suggest 3-5 recipes I can make with these ingredients. For each recipe:
1. Only suggest recipes where I have the ESSENTIAL ingredients (don't suggest "Chicken Parmesan" if I don't have chicken)
2. Calculate a realistic match percentage based on how many of the recipe's ingredients I have
3. It's okay if I'm missing minor ingredients like salt, pepper, oil - focus on main ingredients
4. Include complete recipe details with specific amounts and step-by-step directions

Format your response as a JSON object with a "recipes" array like this:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Brief description",
      "matchPercentage": 85,
      "matchedIngredients": ["ingredient1", "ingredient2", "ingredient3"],
      "missingIngredients": ["optional ingredient"],
      "cookTime": "30 minutes",
      "difficulty": "Easy",
      "servings": "4 servings",
      "ingredients": [
        "2 cups rice",
        "1 lb chicken breast",
        "1 tbsp olive oil"
      ],
      "directions": [
        "Heat olive oil in a large pan over medium heat",
        "Season and cook chicken until golden brown, about 6-8 minutes per side",
        "Cook rice according to package directions",
        "Slice chicken and serve over rice"
      ]
    }
  ]
}

Return ONLY valid JSON, no other text.`
        }]
      });

      // Parse the response
      const responseText = completion.choices[0].message.content;
      const data = JSON.parse(responseText);

      if (!data.recipes || !Array.isArray(data.recipes)) {
        throw new Error('Invalid recipe format from AI response');
      }

      const recipes = data.recipes;

      // Return the recipes
      return res.status(200).json({
        success: true,
        recipes: recipes
      });

    } catch (error) {
    console.error('Error generating recipes:', error);
    return res.status(500).json({
      error: 'Failed to generate recipes',
      message: error.message
    });
  }
});

// Accept invitation - handles Firestore writes with admin privileges
exports.acceptInvitation = onRequest({
  cors: true
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    const {invitationId, userId} = req.body;

    if (!invitationId || !userId) {
      return res.status(400).json({error: 'Missing invitation ID or user ID'});
    }

    // Get invitation data
    const inviteDoc = await db.collection('invitations').doc(invitationId).get();

    if (!inviteDoc.exists) {
      return res.status(404).json({error: 'Invitation not found'});
    }

    const invitationData = inviteDoc.data();

    if (invitationData.status !== 'pending') {
      return res.status(400).json({error: 'Invitation has already been ' + invitationData.status});
    }

    // Get user document to check if they have a current household
    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
      // User already has a document, update their household
      const currentHouseholdId = userDoc.data().householdId;

      if (currentHouseholdId) {
        // Remove from current household
        await db.collection('households').doc(currentHouseholdId).update({
          members: admin.firestore.FieldValue.arrayRemove(userId)
        });
      }

      // Update user document with new household
      await db.collection('users').doc(userId).update({
        householdId: invitationData.householdId
      });
    } else {
      // Create new user document
      await db.collection('users').doc(userId).set({
        email: invitationData.inviteeEmail,
        householdId: invitationData.householdId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Add user to new household
    await db.collection('households').doc(invitationData.householdId).update({
      members: admin.firestore.FieldValue.arrayUnion(userId)
    });

    // Update invitation status
    await db.collection('invitations').doc(invitationId).update({
      inviteeId: userId,
      status: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully'
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return res.status(500).json({
      error: 'Failed to accept invitation',
      message: error.message
    });
  }
});
