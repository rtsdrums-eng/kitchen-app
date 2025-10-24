#!/bin/bash

# Script to update remaining pages with shared navbar

FILES="inventory.html recipes.html household.html planner.html help.html"

for file in $FILES; do
    echo "Updating $file..."

    # Add navbar-styles.css and navbar-loader.js links after Google Fonts
    sed -i '' '/<link href="https:\/\/fonts.googleapis.com\/css2?family=Montserrat/a\
    <link rel="stylesheet" href="navbar-styles.css">\
    <script src="navbar-loader.js"><\/script>' "$file"

    echo "  - Added CSS and JS includes"
    echo "  - Manual steps still needed: remove navbar CSS, replace navbar HTML, update JS"
done

echo "Done! Please manually complete the remaining steps for each file."
