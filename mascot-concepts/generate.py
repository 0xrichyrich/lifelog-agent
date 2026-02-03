#!/usr/bin/env python3
import google.generativeai as genai
import os
import sys

# Configure API
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"))

prompt = sys.argv[1] if len(sys.argv) > 1 else "Cute mascot character"
output = sys.argv[2] if len(sys.argv) > 2 else "output.png"

# Use Gemini image model
model = genai.GenerativeModel("gemini-2.0-flash-exp")

response = model.generate_content([
    prompt,
], generation_config=genai.GenerationConfig(
    response_mime_type="image/png"
))

# Save the image
if response.candidates and response.candidates[0].content.parts:
    for part in response.candidates[0].content.parts:
        if hasattr(part, 'inline_data') and part.inline_data:
            with open(output, 'wb') as f:
                f.write(part.inline_data.data)
            print(f"Saved to {output}")
            break
else:
    print("No image generated")
    print(response)
