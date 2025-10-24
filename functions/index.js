const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors')({origin: true});

admin.initializeApp();

// Initialize Anthropic client
// You'll need to set your API key in Firebase config:
// firebase functions:config:set anthropic.key="YOUR_API_KEY"
const anthropic = new Anthropic({
  apiKey: functions.config().anthropic?.key || process.env.ANTHROPIC_API_KEY
});

exports.generateRecipes = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
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

      // Call Claude API
      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2048,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: `I have the following ingredients in my kitchen:

${allItems.join(', ')}

Please suggest 3-5 recipes I can make with these ingredients. For each recipe:
1. Only suggest recipes where I have the ESSENTIAL ingredients (don't suggest "Chicken Parmesan" if I don't have chicken)
2. Calculate a realistic match percentage based on how many of the recipe's ingredients I have
3. It's okay if I'm missing minor ingredients like salt, pepper, oil - focus on main ingredients
4. Include the recipe name, description, match percentage, and list of matched ingredients

Format your response as a JSON array like this:
[
  {
    "name": "Recipe Name",
    "description": "Brief description",
    "matchPercentage": 85,
    "matchedIngredients": ["ingredient1", "ingredient2", "ingredient3"],
    "missingIngredients": ["optional ingredient"],
    "cookTime": "30 minutes",
    "difficulty": "Easy"
  }
]

Return ONLY the JSON array, no other text.`
        }]
      });

      // Parse the response
      const responseText = message.content[0].text;

      // Extract JSON from the response (in case Claude adds any extra text)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not parse recipe suggestions from AI response');
      }

      const recipes = JSON.parse(jsonMatch[0]);

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
});
