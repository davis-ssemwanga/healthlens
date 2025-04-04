import os
import numpy as np
from tensorflow.keras.saving import load_model
from tensorflow.keras.preprocessing import image
from io import BytesIO
from PIL import Image

# Load the trained model once when the app starts
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'skin_condition_model.keras')
model = load_model(MODEL_PATH)

# Manually define the class mapping (Ensure order matches training set)
class_mapping = {
    0: "Cellulitis (Bacterial)",
    1: "Athlete's Foot (Fungal)",
    2: "Ringworm (Fungal)",
    3: "Nail Fungus (Fungal)",
    4: "Shingles (Viral)",
    5: "Impetigo (Bacterial)",
    6: "chicken pox ",
    7: "Cutaneous Larva Migrans (Parasitic)"
}

def predict_skin_condition(image_file):
    """Processes an uploaded image file and predicts the skin condition."""
    try:
        # Check if image_file is provided and valid
        if not image_file:
            return {"error": "No image file provided"}

        # Read the uploaded file into memory
        img_data = image_file.read()
        
        # Open the image from bytes using PIL
        img = Image.open(BytesIO(img_data))
        
        # Resize the image to match model input size
        img = img.resize((150, 150))
        
        # Convert to array and preprocess
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) / 255.0  # Normalize

        # Make prediction
        prediction = model.predict(img_array)

        # Get the predicted class index
        predicted_class_index = np.argmax(prediction)
        
        # Get the corresponding disease name
        predicted_disease = class_mapping.get(predicted_class_index, "Unknown Condition")

        # Optionally, include probability for more detail
        probability = float(prediction[0][predicted_class_index])

        print(predicted_disease)
        return {
            "disease": predicted_disease,
            "probability": probability
        }
    except Exception as e:
        return {"error": f"Failed to process image: {str(e)}"}