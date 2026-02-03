#!/usr/bin/env python3
import os
import sys
import base64
import requests
import json

API_KEY = os.environ.get("GEMINI_API_KEY")
prompt = sys.argv[1] if len(sys.argv) > 1 else "Cute mascot character"
output = sys.argv[2] if len(sys.argv) > 2 else "output.png"

# Use Imagen 3 via Gemini API
url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key={API_KEY}"

payload = {
    "instances": [{"prompt": prompt}],
    "parameters": {
        "sampleCount": 1,
        "aspectRatio": "1:1",
        "outputOptions": {"mimeType": "image/png"}
    }
}

response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})

if response.status_code == 200:
    data = response.json()
    if "predictions" in data and len(data["predictions"]) > 0:
        img_data = base64.b64decode(data["predictions"][0]["bytesBase64Encoded"])
        with open(output, "wb") as f:
            f.write(img_data)
        print(f"Saved to {output}")
    else:
        print("No image in response")
        print(data)
else:
    print(f"Error: {response.status_code}")
    print(response.text)
