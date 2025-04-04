import pandas as pd
import os

project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'datasets')

# Load the CSV files
disease_symptoms_df = pd.read_csv(os.path.join(project_dir, 'training/DiseaseAndSymptoms.csv'))
symptom_severity_df = pd.read_csv(os.path.join(project_dir, 'training/Symptom-severity.csv'))
disease_description_df = pd.read_csv(os.path.join(project_dir, 'description/Disease_Description.csv'))
disease_precaution_df = pd.read_csv(os.path.join(project_dir, 'precautions/Disease_precaution.csv'))

# List of diseases to keep
valid_diseases = {
    "Malaria", "Typhoid", "Hepatitis A", "Hepatitis E", 
    "Tuberculosis", "Pneumonia", "AIDS", "chicken pox", "Ringworm"
}

# Filter datasets to only include relevant diseases
disease_symptoms_df = disease_symptoms_df[disease_symptoms_df['Disease'].isin(valid_diseases)]
disease_description_df = disease_description_df[disease_description_df['Disease'].isin(valid_diseases)]
disease_precaution_df = disease_precaution_df[disease_precaution_df['Disease'].isin(valid_diseases)]

# Ensure all symptom data is cleaned and lowercase for consistency
def clean_symptoms(symptoms):
    if isinstance(symptoms, str):
        symptoms = symptoms.split(",")
    return [s.strip().lower() for s in symptoms if pd.notna(s) and s]

# Convert symptoms into a list format for training data
def symptoms_to_list(row):
    return clean_symptoms(row[1:].tolist())

# Create a dictionary mapping symptoms to their weights
symptom_weights = dict(zip(symptom_severity_df['Symptom'].str.lower(), symptom_severity_df['weight']))

# Add a new column with symptoms as a list
disease_symptoms_df['Symptoms'] = disease_symptoms_df.apply(lambda row: symptoms_to_list(row), axis=1)

# Function to calculate a more nuanced score based on symptom overlap
def calculate_score(symptoms, symptom_weights):
    return sum(symptom_weights.get(symptom, 0) for symptom in symptoms if symptom in symptom_weights)

def results(user_symptoms, disease_symptoms, symptom_weights):
    user_symptoms_set = set(user_symptoms)
    disease_symptoms_set = set(disease_symptoms)
    user_weight = calculate_score(user_symptoms, symptom_weights)
    disease_weight = calculate_score(disease_symptoms, symptom_weights)
    matching_symptoms =user_symptoms_set.intersection(disease_symptoms_set) 
    matching_weight = calculate_score(matching_symptoms, symptom_weights)
    if disease_weight == 0 or user_weight == 0:
        return 0, matching_symptoms
    weight_match = matching_weight / disease_weight
    
    combined_score = weight_match * 100
    return combined_score, matching_symptoms

# Function to predict disease based on symptoms
def predict_disease(symptoms_list):
    user_symptoms = clean_symptoms(symptoms_list)
    print("User symptoms after cleaning:", user_symptoms)

    disease_scores = {}
    disease_symptom_matches = {}  # Store matching symptoms for printing

    for _, disease in disease_symptoms_df.iterrows():
        disease_name = disease['Disease']
        disease_symptoms = disease['Symptoms']
        score, matching_symptoms = results(user_symptoms, disease_symptoms, symptom_weights)

        if score >= 60:
            # Store only the highest score for each disease
            if disease_name not in disease_scores or score > disease_scores[disease_name]:
                disease_scores[disease_name] = score  # Store only the score
                disease_symptom_matches[disease_name] = matching_symptoms  # Store matching symptoms separately

    # Sort diseases by highest score
    sorted_results = sorted(disease_scores.items(), key=lambda x: x[1], reverse=True)

    for disease, score in sorted_results:
        print(f"Disease: {disease}, Score: {score:.2f}%, Matching symptoms: {disease_symptom_matches[disease]}")

    return sorted_results  # Ensure frontend compatibility


# Function to get final prediction results
def get_prediction_results(user_symptoms):
    try:
        prediction = predict_disease(user_symptoms)
        if not prediction:
            return {"error": "No disease matches the given symptoms with sufficient overlap."}

        results = []
        printed_diseases = set()
        for disease, percentage in prediction[:5]:
            if disease not in printed_diseases and percentage > 0:
                printed_diseases.add(disease)

                description_series = disease_description_df[disease_description_df['Disease'] == disease]['Description']
                description = description_series.values[0] if len(description_series) > 0 else "No detailed information available."

                precaution_df = disease_precaution_df[disease_precaution_df['Disease'] == disease].iloc[:, 1:]
                precautions = precaution_df.values.flatten() if not precaution_df.empty else []
                precautions = [prec for prec in precautions if pd.notna(prec)]

                results.append({
                    "disease": disease,
                    "probability": percentage,
                    "description": description,
                    "precautions": precautions if precautions else []
                })

        return results

    except Exception as e:
        return {"error": f"An error occurred: {str(e)}"}

def image_analyzer(input_image):
    try:
        if not input_image or not isinstance(input_image, dict):
            return {"error": "Invalid or empty input"}

        disease = input_image.get('disease', '').strip()
        probability = input_image.get('probability', 0)

        if not disease:
            return {"error": "No disease specified"}

        if disease not in valid_diseases:
            return {"error": f" Image not recognised"}

        description_series = disease_description_df[disease_description_df['Disease'] == disease]['Description']
        description = description_series.values[0] if len(description_series) > 0 else "No detailed information available yet."

        precaution_df = disease_precaution_df[disease_precaution_df['Disease'] == disease].iloc[:, 1:]
        precautions = precaution_df.values.flatten() if not precaution_df.empty else ["No precaution available yet."]
        precautions = [prec for prec in precautions if pd.notna(prec)]

        probability_percent = float(probability) *100  # Store as float for database
        return {
            "disease": disease,
            "probability": probability_percent,
            "description": description,
            "precautions": precautions
        }
    except Exception as e:
        return {"error": f"Error: {str(e)}"}