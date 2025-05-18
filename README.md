# LogLite - Advanced System Log Anomaly Detection
![LogLite Banner](static/img/loglite-banner.png)
LogLite is an advanced web-based application for real-time detection and analysis of anomalies in system logs. It combines the power of DistilBERT (a lightweight BERT transformer) with SHAP explainability to provide accurate anomaly detection and insightful root cause analysis.
## Features
* AI-Powered Analysis: Uses DistilBERT for accurate log anomaly classification
* Interactive Dashboard: Modern, colorful UI with real-time visualizations
* Multiple Input Methods: Upload log files or paste log text directly
* Advanced Visualization: Interactive charts for anomaly distribution and severity analysis
* Root Cause Analysis: Identifies key indicators and provides actionable recommendations
* Severity Scoring: Grades anomalies by severity level for better prioritization
* Component Identification: Automatically detects affected system components
* Sample Logs: Built-in sample logs for testing and demonstration
## Technologies Used
* Backend: Flask, Python
* ML/AI: PyTorch, Transformers (DistilBERT), SHAP
* Frontend: HTML5, CSS3, JavaScript, Bootstrap 5
* Visualization: Chart.js
## Quick Start Guide
### Running the Application (Windows)
1. Simply double-click on run_loglite.bat in the project directory
2. The application will start automatically and open in your default browser
3. If not, navigate to http://localhost:5000 in your web browser
### Running the Application (Linux/Mac)
1. Open a terminal in the project directory
2. Run the following commands: bash pip install -r requirements.txt python run.py
3. Open http://localhost:5000 in your web browser
## Usage Instructions
1. Upload a Log File: Use the file upload tab to analyze an entire log file
2. Enter Log Text: Paste log entries directly into the text area
3. Use Sample Logs: Try the provided sample logs for demonstration
4. View Results: Examine the interactive dashboard and detailed analysis
5. Explore Details: Click on individual logs to see in-depth analysis and recommendations
## System Requirements
* Python 3.8 or higher
* 4GB RAM minimum (8GB recommended for larger log files)
* Modern web browser (Chrome, Firefox, Edge, Safari)
## Model Information
The core of LogLite is a fine-tuned DistilBERT model trained on system logs to detect various types of anomalies. The model can identify multiple anomaly categories:
* Memory issues (KERNDTLB, KERNMEM)
* Storage problems (KERNSTOR)
* I/O errors (KERNIO)
* Stack corruption (KERNSTACK)
* Kernel panics (KERNPANIC)
* And more...
## Hybrid Detection System
LogLite uses a sophisticated hybrid approach for anomaly detection:
1. Primary Detection: DistilBERT model predictions
2. Secondary Detection: Keyword-based pattern analysis
3. Confidence Blending: Intelligently combines both approaches
4. Severity Assessment: Evaluates the criticality of detected anomalies
## Project Structure 
loglite/
├── app/
│   ├── __init__.py
│   ├── routes.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── anomaly_detector.py
│   │   ├── log_processor.py
│   │   └── result_analyzer.py
│   ├── static/
│   │   ├── css/
│   │   ├── js/
│   │   └── img/
│   └── templates/
├── data/
│   ├── sample_logs/
│   └── model/
├── utils/
│   ├── __init__.py
│   ├── preprocessing.py
│   └── visualization.py
├── tests/
├── run.py
├── run_loglite.bat
├── requirements.txt
└── README.md
## Screenshots
![Dashboard](static/img/dashboard.png) ![Analysis](static/img/analysis.png) ![Details](static/img/details.png)
## License
This project is licensed under the MIT License - see the LICENSE file for details.
## References
* DistilBERT: https://huggingface.co/docs/transformers/model_doc/distilbert
* SHAP: https://github.com/slundberg/shap
