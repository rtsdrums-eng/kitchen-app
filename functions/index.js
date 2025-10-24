const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const OpenAI = require('openai');
const {defineSecret} = require('firebase-functions/params');

admin.initializeApp();

// Define secret for OpenAI API key
const openaiKey = defineSecret('OPENAI_API_KEY');

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
