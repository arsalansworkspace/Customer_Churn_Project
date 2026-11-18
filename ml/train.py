
import pandas as pd
import numpy as np
import joblib
import os

from sklearn.model_selection import cross_val_predict
from sklearn.metrics import precision_recall_curve
from sklearn.metrics import precision_score, recall_score, f1_score

from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import ExtraTreesClassifier, GradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate


from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score
)

from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    roc_auc_score
)


# ==========================================
# 1. PROJECT CONFIGURATION
# ==========================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_PATH = os.path.join(
    BASE_DIR,
    "Telco-Customer-Churn.csv"
)

MODEL_DIR = os.path.join(BASE_DIR, "models")


# ==========================================
# 2. LOAD DATASET
# ==========================================

print("\n========== LOADING DATASET ==========")

df = pd.read_csv(DATA_PATH)

print("Dataset loaded successfully!")

print("Total Rows:", df.shape[0])
print("Total Columns:", df.shape[1])

print("\nFirst Five Records:")
print(df.head())

print("\nDataset Information:")
print(df.info())

print("\nMissing Values:")
print(df.isnull().sum())

print("\nTarget Variable Distribution:")
print(df["Churn"].value_counts())



# ==========================================
# 3. DATA CLEANING
# ==========================================

print("\n========== DATA CLEANING ==========")

# Convert TotalCharges into numeric format
df["TotalCharges"] = pd.to_numeric(
    df["TotalCharges"],
    errors="coerce"
)

# Check missing values after conversion
print(
    "Missing TotalCharges:",
    df["TotalCharges"].isnull().sum()
)

# Check duplicate records
print("Duplicate Records:", df.duplicated().sum())

# Remove customerID because it is not useful
# for predicting customer churn
df.drop(columns=["customerID"], inplace=True)

print("CustomerID column removed.")

print("\nUpdated Dataset Shape:", df.shape)


# ==========================================
# 4. SEPARATE FEATURES AND TARGET
# ==========================================

print("\n========== FEATURE SEPARATION ==========")

# Input features
X = df.drop(columns=["Churn"])

# Target variable
y = df["Churn"].map({
    "No": 0,
    "Yes": 1
})

print("Features Shape:", X.shape)
print("Target Shape:", y.shape)

print("\nTarget Distribution:")
print(y.value_counts())


# ==========================================
# 5. IDENTIFY NUMERICAL AND CATEGORICAL FEATURES
# ==========================================

numerical_features = X.select_dtypes(
    include=["int64", "float64"]
).columns.tolist()

categorical_features = X.select_dtypes(
    include=["object", "str", "category"]
).columns.tolist()

print("\nNumerical Features:")
print(numerical_features)

print("\nCategorical Features:")
print(categorical_features)



# ==========================================
# 6. PREPROCESSING PIPELINES
# ==========================================

print("\n========== BUILDING PREPROCESSING PIPELINE ==========")

# Numerical preprocessing
numerical_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ]
)

# Categorical preprocessing
categorical_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore"))
    ]
)

# Combine numerical and categorical pipelines
preprocessor = ColumnTransformer(
    transformers=[
        ("num", numerical_pipeline, numerical_features),
        ("cat", categorical_pipeline, categorical_features)
    ]
)

print("Numerical preprocessing pipeline created.")
print("Categorical preprocessing pipeline created.")
print("ColumnTransformer created successfully.")


# ==========================================
# 7. TRAIN-TEST SPLIT
# ==========================================

print("\n========== SPLITTING DATASET ==========")

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("Training samples:", X_train.shape[0])
print("Testing samples:", X_test.shape[0])

print("Training target distribution:")
print(y_train.value_counts())

print("\nTesting target distribution:")
print(y_test.value_counts())



# ==========================================
# 8. RANDOM FOREST MODEL
# ==========================================

print("\n========== INITIALIZING MODEL ==========")

random_forest = RandomForestClassifier(
    n_estimators=300,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)

# Complete machine learning pipeline
model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", random_forest)
    ]
)

print("Random Forest model initialized.")
print("Complete ML pipeline created.")


# ==========================================
# 9. MODEL TRAINING
# ==========================================

print("\n========== TRAINING MODEL ==========")

model.fit(X_train, y_train)

print("Model training completed successfully!")


# ==========================================
# 10. MODEL PREDICTION
# ==========================================

print("\n========== MODEL PREDICTION ==========")

y_pred = model.predict(X_test)

y_probability = model.predict_proba(X_test)[:, 1]

print("Predictions generated successfully.")


# ==========================================
# 11. MODEL EVALUATION
# ==========================================

print("\n========== MODEL EVALUATION ==========")

accuracy = accuracy_score(y_test, y_pred)

roc_auc = roc_auc_score(
    y_test,
    y_probability
)

print(f"\nAccuracy: {accuracy:.4f}")
print(f"ROC-AUC Score: {roc_auc:.4f}")

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=["No Churn", "Churn"]
    )
)

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))


# ==========================================
# 12. SAVE TRAINED MODEL
# ==========================================

print("\n========== SAVING TRAINED MODEL ==========")

# Create models directory if it doesn't exist
os.makedirs(MODEL_DIR, exist_ok=True)

# Model file path
MODEL_PATH = os.path.join(
    MODEL_DIR,
    "churn_model.pkl"
)

# Save complete pipeline
joblib.dump(model, MODEL_PATH)

print("Model saved successfully!")
print("Model location:", MODEL_PATH)




# ==========================================
# 13. MODEL COMPARISON
# ==========================================

print("\n========== MODEL COMPARISON ==========")

models = {
    "Random Forest": RandomForestClassifier(
        n_estimators=300,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=1
    ),

    "Logistic Regression": LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        random_state=42
    ),

    "Decision Tree": DecisionTreeClassifier(
        max_depth=10,
        class_weight="balanced",
        random_state=42
    ),

    "Extra Trees": ExtraTreesClassifier(
        n_estimators=300,
        class_weight="balanced",
        random_state=42,
        n_jobs=1
    ),

    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=3,
        random_state=42
    )
}

# Five-fold stratified cross-validation
cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)

scoring = {
    "accuracy": "accuracy",
    "precision": "precision",
    "recall": "recall",
    "f1": "f1",
    "roc_auc": "roc_auc"
}

comparison_results = []

for name, classifier in models.items():

    print(f"\nEvaluating: {name}")

    # Create independent preprocessing pipeline
    model_preprocessor = clone(preprocessor)

    # Gradient Boosting requires dense input
    if name == "Gradient Boosting":
        model_preprocessor.set_params(sparse_threshold=0)

    comparison_pipeline = Pipeline(
        steps=[
            ("preprocessor", model_preprocessor),
            ("classifier", classifier)
        ]
    )

    scores = cross_validate(
        comparison_pipeline,
        X_train,
        y_train,
        cv=cv,
        scoring=scoring,
        n_jobs=-1
    )

    result = {
        "Model": name,
        "Accuracy": scores["test_accuracy"].mean(),
        "Precision": scores["test_precision"].mean(),
        "Recall": scores["test_recall"].mean(),
        "F1 Score": scores["test_f1"].mean(),
        "ROC-AUC": scores["test_roc_auc"].mean()
    }

    comparison_results.append(result)

    print("Accuracy:", round(result["Accuracy"], 4))
    print("Precision:", round(result["Precision"], 4))
    print("Recall:", round(result["Recall"], 4))
    print("F1 Score:", round(result["F1 Score"], 4))
    print("ROC-AUC:", round(result["ROC-AUC"], 4))


# Display comparison table
results_df = pd.DataFrame(comparison_results)

results_df = results_df.sort_values(
    by="ROC-AUC",
    ascending=False
)

print("\n========== FINAL MODEL COMPARISON ==========")
print(results_df.to_string(index=False))



# ==========================================
# 14. FINALIST MODEL TESTING
# ==========================================

print("\n========== FINALIST MODEL TESTING ==========")

finalists = {
    "Logistic Regression": LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        random_state=42
    ),

    "Random Forest": RandomForestClassifier(
        n_estimators=300,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    ),

    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=3,
        random_state=42
    )
}

finalist_results = []

for name, classifier in finalists.items():

    print(f"\nTesting {name}...")

    finalist_preprocessor = clone(preprocessor)

    if name == "Gradient Boosting":
        finalist_preprocessor.set_params(sparse_threshold=0)

    finalist_model = Pipeline(
        steps=[
            ("preprocessor", finalist_preprocessor),
            ("classifier", classifier)
        ]
    )

    finalist_model.fit(X_train, y_train)

    predictions = finalist_model.predict(X_test)

    probabilities = finalist_model.predict_proba(X_test)[:, 1]

    result = {
        "Model": name,
        "Accuracy": accuracy_score(y_test, predictions),
        "Precision": precision_score(y_test, predictions),
        "Recall": recall_score(y_test, predictions),
        "F1 Score": f1_score(y_test, predictions),
        "ROC-AUC": roc_auc_score(y_test, probabilities)
    }

    finalist_results.append(result)

    print("Accuracy:", round(result["Accuracy"], 4))
    print("Precision:", round(result["Precision"], 4))
    print("Recall:", round(result["Recall"], 4))
    print("F1 Score:", round(result["F1 Score"], 4))
    print("ROC-AUC:", round(result["ROC-AUC"], 4))


print("\n========== FINALIST RESULTS ==========")

finalist_df = pd.DataFrame(finalist_results)

print(finalist_df.to_string(index=False))


# ==========================================
# THRESHOLD OPTIMIZATION
# ==========================================

print("\n========== THRESHOLD OPTIMIZATION ==========")

# Create Logistic Regression pipeline
threshold_preprocessor = clone(preprocessor)

threshold_model = Pipeline(steps=[
    ("preprocessor", threshold_preprocessor),
    ("classifier", LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        random_state=42
    ))
])

# Generate out-of-fold probabilities using training data
print("\nGenerating cross-validation predictions...")

oof_probabilities = cross_val_predict(
    threshold_model,
    X_train,
    y_train,
    cv=StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=42
    ),
    method="predict_proba",
    n_jobs=-1
)[:, 1]

print("Cross-validation predictions generated!")

# Calculate precision and recall for different thresholds
precision_values, recall_values, thresholds = precision_recall_curve(
    y_train,
    oof_probabilities
)

# Calculate F1 score for every threshold
f1_values = (
    2 * precision_values[:-1] * recall_values[:-1]
    / (precision_values[:-1] + recall_values[:-1] + 1e-10)
)

# Find threshold with the highest F1 score
best_index = np.argmax(f1_values)

best_threshold = thresholds[best_index]
best_precision = precision_values[best_index]
best_recall = recall_values[best_index]
best_f1 = f1_values[best_index]

print("\n========== OPTIMAL THRESHOLD RESULTS ==========")

print(f"Best Threshold: {best_threshold:.4f}")
print(f"Precision: {best_precision:.4f}")
print(f"Recall: {best_recall:.4f}")
print(f"F1 Score: {best_f1:.4f}")

print("\nThreshold optimization completed!")

# ==========================================
# FINAL MODEL TRAINING AND EVALUATION
# ==========================================

print("\n========== FINAL MODEL TRAINING ==========")

# Train Logistic Regression on the complete training dataset
final_model = clone(threshold_model)

final_model.fit(X_train, y_train)

print("Final Logistic Regression model trained successfully!")

# Generate probabilities for test data
final_probabilities = final_model.predict_proba(X_test)[:, 1]

# Apply optimized threshold
final_predictions = (
    final_probabilities >= best_threshold
).astype(int)

# Evaluate final model
final_accuracy = accuracy_score(y_test, final_predictions)
final_precision = precision_score(y_test, final_predictions)
final_recall = recall_score(y_test, final_predictions)
final_f1 = f1_score(y_test, final_predictions)
final_roc_auc = roc_auc_score(y_test, final_probabilities)

print("\n========== FINAL MODEL TEST RESULTS ==========")

print(f"Threshold: {best_threshold:.4f}")
print(f"Accuracy:  {final_accuracy:.4f}")
print(f"Precision: {final_precision:.4f}")
print(f"Recall:    {final_recall:.4f}")
print(f"F1 Score:  {final_f1:.4f}")
print(f"ROC-AUC:   {final_roc_auc:.4f}")

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        final_predictions,
        target_names=["No Churn", "Churn"]
    )
)

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, final_predictions))


# ==========================================
# SAVE FINAL MODEL
# ==========================================

print("\n========== SAVING FINAL MODEL ==========")

final_model_path = os.path.join(
    MODEL_DIR,
    "churn_model.pkl"
)

model_bundle = {
    "model": final_model,
    "threshold": float(best_threshold),
    "model_name": "Logistic Regression"
}

joblib.dump(model_bundle, final_model_path)

print("Final model saved successfully!")
print("Model location:", final_model_path)
print("Selected threshold:", best_threshold)


# ==========================================
# FEATURE IMPORTANCE ANALYSIS
# ==========================================

print("\n========== FEATURE IMPORTANCE ANALYSIS ==========")

# Get trained preprocessing pipeline
trained_preprocessor = final_model.named_steps["preprocessor"]

# Get transformed feature names
feature_names = trained_preprocessor.get_feature_names_out()

# Get Logistic Regression coefficients
coefficients = final_model.named_steps["classifier"].coef_[0]

# Create feature importance DataFrame
feature_importance = pd.DataFrame({
    "Feature": feature_names,
    "Coefficient": coefficients
})

# Sort by coefficient
feature_importance = feature_importance.sort_values(
    by="Coefficient",
    ascending=False
)

print("\n========== TOP 10 CHURN-RELATED FEATURES ==========")

print(
    feature_importance.head(10).to_string(index=False)
)

print("\n========== TOP 10 FEATURES ASSOCIATED WITH LOWER CHURN ==========")

print(
    feature_importance.tail(10)
    .sort_values(by="Coefficient")
    .to_string(index=False)
)

print("\nFeature importance analysis completed!")

