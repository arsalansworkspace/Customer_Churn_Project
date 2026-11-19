# ChurnGuard AI – Customer Intelligence & Churn Prediction Platform

**ChurnGuard AI** is a machine-learning-powered web application designed to help businesses identify customers who are likely to stop using their services. It analyzes customer information, predicts churn probability, classifies customers according to their risk levels, and provides analytics to support better business decisions.

The platform combines an **XGBoost machine learning model**, a **FastAPI backend**, a **MySQL database**, and an interactive web-based dashboard to help businesses understand customer behavior and improve customer retention.

---

## Project Overview

Customer churn is one of the major challenges businesses face, particularly in industries that depend on long-term customer relationships.

ChurnGuard AI addresses this challenge by analyzing customer data and predicting which customers are more likely to leave a company. This allows businesses to identify potential customer loss earlier and plan appropriate retention strategies.

The application uses the Telco Customer Churn dataset to train its machine learning model.

## Key Features

### 1. Dashboard
- Displays total customers and churned customers.
- Shows the overall customer churn rate.
- Visualizes customer risk distribution.
- Displays recent churn predictions.

### 2. Customer Management
- View all customer records.
- Search and filter customers.
- Add new customer records.
- Update existing customer information.
- Delete customer records.
- View detailed customer profiles.

### 3. Churn Prediction
- Predicts the probability of customer churn.
- Classifies customers into risk categories.
- Identifies customers who are more likely to leave.
- Uses the trained XGBoost model for predictions.

### 4. Customer Analytics
- Visualizes customer churn patterns.
- Analyzes customer behavior.
- Displays customer risk distribution.
- Helps understand important customer trends.

### 5. Retention Management
- Identifies customers who may be at risk.
- Records customer retention actions.
- Tracks customer interactions.
- Helps businesses organize retention activities.

### 6. Reports and Exports
- Export customer records in CSV format.
- Export prediction records in CSV format.
- Generate Excel reports.
- Generate PDF analytics reports.

### 7. Authentication
- User registration and login.
- JWT-based authentication.
- Protected API endpoints.
- User-specific access to application features.

---

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Frontend page structure |
| CSS3 | Styling and responsive design |
| JavaScript | Frontend functionality and API integration |
| Chart.js | Data visualization and charts |
| Python | Backend development and machine learning |
| FastAPI | REST API development |
| MySQL | Database management |
| SQLAlchemy | Database ORM |
| XGBoost | Churn prediction model |
| Pandas | Dataset manipulation and preprocessing |
| Scikit-learn | Machine learning preprocessing and evaluation |
| JWT | User authentication |
| XAMPP | Local MySQL database environment |

---

## Machine Learning Model

ChurnGuard AI uses the **XGBoost Classifier** to predict customer churn.

### Dataset Information

The model is trained using the Telco Customer Churn dataset.

- Original records: 7,043
- Features: 20 input features
- Target variable: Customer churn status
- Prediction output: Churn probability and predicted class

### Model Performance

The following metrics were obtained during model evaluation:

| Evaluation Metric | Score |
|---|---:|
| Accuracy | 77.00% |
| Precision | 55.12% |
| Recall | 71.93% |
| F1-Score | 62.41% |
| ROC-AUC | 84.29% |

**Note:** These results represent the model's evaluation performance on the project's evaluation data. Actual prediction performance may vary with new customer data.

### Risk Classification

The application uses a configured prediction threshold to classify customer churn predictions into risk categories.

- **Low Risk:** Lower predicted likelihood of churn.
- **Medium Risk:** Moderate predicted likelihood of churn.
- **High Risk:** Higher predicted likelihood of churn.

The prediction indicates the likelihood of churn; it does not guarantee that a customer will leave.

---

## Application Workflow

1. The user logs into ChurnGuard AI.
2. Customer information is stored and managed through the MySQL database.
3. The backend retrieves customer information.
4. The data is processed and passed to the trained XGBoost model.
5. The model generates a churn probability.
6. The application classifies the customer into a risk category.
7. Prediction results are stored in the database.
8. The dashboard and analytics pages display the results.
9. The retention team can record actions to help retain at-risk customers.
10. Reports can be generated and exported for further analysis.

---

## Project Structure

```text
customer-churn-project/
│
├── backend/
│   ├── main.py
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   ├── services/
│   └── ...
│
├── frontend/
│   ├── index.html
│   │
│   ├── assets/
│   │
│   ├── css/
│   │   └── style.css
│   │
│   ├── js/
│   │   ├── api.js
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── customers.js
│   │   ├── prediction.js
│   │   ├── analytics.js
│   │   ├── retention.js
│   │   └── reports.js
│   │
│   └── pages/
│       ├── dashboard.html
│       ├── customers.html
│       ├── prediction.html
│       ├── analytics.html
│       ├── retention.html
│       └── reports.html
│
├── models/
│   └── churn_xgb_pipeline.pkl
│
├── Telco-Customer-Churn.csv
│
├── Virtual_Enviroment/
│
└── README.md
```

*Note: This is a simplified project structure. Update it to match the actual files and folders in your repository.*

---

## Installation and Setup

### Prerequisites

Make sure you have installed:

- Python 3.10 or later (compatible with your project dependencies).
- MySQL or XAMPP.
- Visual Studio Code.
- Git.
- A modern web browser.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/customer-churn-project.git
```

Navigate into the project directory:

```bash
cd customer-churn-project
```

### 2. Create a Virtual Environment

```bash
python -m venv Virtual_Enviroment
```

Activate it on Windows PowerShell:

```powershell
.\Virtual_Enviroment\Scripts\Activate.ps1
```

### 3. Install Dependencies

If your repository contains a `requirements.txt` file:

```bash
pip install -r requirements.txt
```

Otherwise, install the required project packages according to your backend imports.

### 4. Configure MySQL Database

1. Start Apache and MySQL through XAMPP, if using XAMPP.
2. Open phpMyAdmin.
3. Create the database required by your backend configuration.
4. Configure the database connection settings in your backend environment configuration.

Do not upload database passwords, JWT secrets, or other private credentials to GitHub.

### 5. Run the Backend

Start your FastAPI application using the actual Python module containing your FastAPI instance.

For example, if your application instance is defined in `backend/main.py`:

```bash
uvicorn backend.main:app --reload
```

Open the API documentation in your browser:

```text
http://127.0.0.1:8000/docs
```

### 6. Run the Frontend

Open `frontend/index.html` using a local development server, such as the VS Code Live Server extension.

Make sure the frontend API configuration points to your running FastAPI backend.

---

## Application Pages

| Page | Description |
|---|---|
| Login | Authenticates application users |
| Dashboard | Displays overall customer and churn statistics |
| Customers | Manages customer records |
| Prediction | Predicts customer churn probability |
| Analytics | Visualizes customer behavior and churn patterns |
| Retention | Manages customer retention activities |
| Reports | Generates and exports business reports |

---

## Database Overview

The application uses MySQL for persistent data storage.

The database includes tables for:

- Users
- Customers
- Datasets
- Model Versions
- Predictions
- Retention Actions
- Customer Interactions
- Audit Logs

These tables support authentication, customer management, prediction history, retention tracking, and application activity.

---

## Future Improvements

- Improve model performance through additional feature engineering and model experimentation.
- Introduce more advanced customer behavior analytics.
- Support datasets from additional business industries.
- Add automated retention recommendation features.
- Implement advanced customer segmentation.
- Add scheduled prediction and reporting functionality.
- Improve model monitoring and retraining capabilities.

---

## Project Purpose

The primary objective of ChurnGuard AI is to demonstrate how machine learning can be integrated into a real-world business application.

It combines machine learning, backend API development, database management, and frontend development into a single platform that helps businesses make data-driven customer retention decisions.

**ChurnGuard AI – Predict Early. Understand Better. Retain Customers.**

---

## Author

**Muhammad Arsalan**

GitHub: (https://github.com/arsalansworksapace)

---

## License

This project is developed for educational and learning purposes. Add a suitable open-source license if you intend to distribute or reuse the project under specific terms.
