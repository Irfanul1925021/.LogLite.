import os
import torch
import numpy as np
from flask import Flask, render_template, request, jsonify
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
import re
from collections import Counter
import random

# Try to import SHAP, but handle if not installed
try:
    import shap
    SHAP_AVAILABLE = True
    print("SHAP is available and will be used for explanations")
except ImportError:
    SHAP_AVAILABLE = False
    print("SHAP not available, using fallback mechanism for explanations")

app = Flask(__name__)

# Configuration for model locations
# Primary location in the app's models directory
APP_MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
# Fallback location for model 
ROOT_MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'log_anomaly_model')

# Find the model file
if os.path.exists(os.path.join(APP_MODEL_DIR, 'model.safetensors')):
    MODEL_DIR = APP_MODEL_DIR
    print("Using model from app directory")
elif os.path.exists(os.path.join(ROOT_MODEL_DIR, 'model.safetensors')):
    MODEL_DIR = ROOT_MODEL_DIR
    print("Using model from root directory")
else:
    raise FileNotFoundError("Cannot find model.safetensors in any known location")

MODEL_PATH = os.path.join(MODEL_DIR, 'model.safetensors')
TOKENIZER_PATH = MODEL_DIR

print(f"Model path: {MODEL_PATH}")
print(f"Tokenizer path: {TOKENIZER_PATH}")

# Label mapping - map your model's numerical outputs to anomaly types
LABEL_MAP = {
    0: "-",  # Normal
    1: "KERNELRND",
    2: "KERNDTLB",
    3: "KERNUTILS",
    4: "KERNSQLA",
    5: "KERNSTOR",
    6: "KERNSTACK",
    7: "KERNPANIC",
    8: "KERNMEM",
    9: "KERNIO",
    10: "KERNINFO"
}

# Component inference mapping with expanded keywords
COMPONENT_MAP = {
    'memory': ['cache', 'memory', 'ram', 'buffer', 'tlb', 'allocation', 'heap', 'stack', 'leak', 'page'],
    'storage': ['disk', 'storage', 'io', 'read', 'write', 'mount', 'lustre', 'filesystem', 'partition', 'sector', 'block'],
    'network': ['network', 'connection', 'packet', 'socket', 'link', 'interface', 'eth', 'tcp', 'udp', 'ip', 'dns', 'http'],
    'process': ['process', 'thread', 'execution', 'terminated', 'application', 'daemon', 'service', 'job', 'task', 'pid', 'fork'],
    'system': ['system', 'kernel', 'panic', 'crash', 'boot', 'shutdown', 'firmware', 'driver', 'module', 'interrupt', 'bios', 'uefi']
}

# Severity mapping for anomaly types
SEVERITY_MAP = {
    "-": 0,          # Normal - no severity
    "KERNELRND": 3,  # Medium severity
    "KERNDTLB": 4,   # Medium-high severity
    "KERNUTILS": 2,  # Low-medium severity
    "KERNSQLA": 2,   # Low-medium severity
    "KERNSTOR": 3,   # Medium severity
    "KERNSTACK": 4,  # Medium-high severity
    "KERNPANIC": 5,  # Critical severity
    "KERNMEM": 4,    # Medium-high severity
    "KERNIO": 3,     # Medium severity
    "KERNINFO": 1    # Low severity - informational
}

class LogAnalyzer:
    def __init__(self):
        # Load tokenizer
        self.tokenizer = DistilBertTokenizer.from_pretrained(TOKENIZER_PATH)
        
        # Load model
        self.model = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR)
        self.model.eval()
        
        # Debug mode - analyze real predictions
        self.debug = True
        
        # Initialize SHAP explainer if available
        self.has_shap = False
        if SHAP_AVAILABLE:
            try:
                self.explainer = shap.Explainer(self.predict_function, self.tokenizer)
                self.has_shap = True
                print("SHAP explainer initialized successfully")
            except Exception as e:
                print(f"Error initializing SHAP explainer: {e}")
                self.has_shap = False
    
    def tokenize(self, text):
        return self.tokenizer(text, padding=True, truncation=True, return_tensors="pt")
    
    def predict_function(self, text_list):
        """Function for SHAP explainer to get model predictions."""
        if not isinstance(text_list, list):
            text_list = [text_list]
        inputs = self.tokenizer(text_list, padding=True, truncation=True, return_tensors="pt")
        outputs = self.model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        return probs.detach().numpy()
    
    def analyze_log(self, log_text):
        # Tokenize the log
        tokenized = self.tokenize(log_text)
        
        # Get prediction
        with torch.no_grad():
            outputs = self.model(**tokenized)
            logits = outputs.logits
            probabilities = torch.nn.functional.softmax(logits, dim=1)
            
            # Enhanced keyword analysis for anomaly detection
            anomaly_info = self.enhanced_keyword_analysis(log_text)
            is_anomaly_keywords = anomaly_info['is_anomaly']
            keyword_confidence = anomaly_info['confidence']
            keyword_class = anomaly_info['class']
            
            # Model-based prediction
            pred_class = torch.argmax(probabilities, dim=1).item()
            confidence = probabilities[0][pred_class].item() * 100
            
            # Enhanced hybrid prediction system
            # Use keyword detection as a fallback when:
            # 1. Model predicts normal but keywords suggest anomaly
            # 2. Model confidence is low and keywords suggest anomaly
            if (pred_class == 0 and is_anomaly_keywords) or (confidence < 70 and is_anomaly_keywords):
                # Use the keyword-detected class or fallback to a reasonable anomaly type
                if keyword_class:
                    pred_class = keyword_class
                else:
                    # Select class based on log content
                    if 'memory' in log_text.lower() or 'cache' in log_text.lower() or 'tlb' in log_text.lower():
                        pred_class = 2  # KERNDTLB
                    elif 'disk' in log_text.lower() or 'storage' in log_text.lower() or 'read' in log_text.lower():
                        pred_class = 5  # KERNSTOR
                    elif 'fail' in log_text.lower() or 'error' in log_text.lower() or 'corrupt' in log_text.lower():
                        pred_class = 7  # KERNPANIC
                    else:
                        pred_class = 1  # KERNELRND
                
                # Blend confidence between model and keyword detection
                confidence = (confidence * 0.2) + (keyword_confidence * 0.8)
                
                # Update probabilities for display purposes
                probabilities[0][pred_class] = confidence / 100.0
                probabilities[0][0] = 1.0 - (confidence / 100.0)  # Adjust normal class probability
            
            # Get top 3 predictions with probabilities for better insight
            top_preds = torch.topk(probabilities, min(3, probabilities.size(1)))
            top_classes = top_preds.indices[0].tolist()
            top_probs = top_preds.values[0].tolist()
        
        # Process results
        is_anomaly = pred_class != 0  # 0 is the normal class
        class_name = LABEL_MAP[pred_class]
        severity = SEVERITY_MAP.get(class_name, 0)
        
        # Identify affected component with more sophisticated analysis
        affected_components = self.identify_components(log_text)
        
        # Get key indicators and explanations
        if self.has_shap:
            try:
                # Try to get SHAP values for explanation
                shap_values = self.explainer([log_text])
                key_indicators = self.get_key_indicators_shap(log_text, shap_values)
                root_cause = self.generate_root_cause(log_text, class_name, key_indicators)
            except Exception as e:
                print(f"Error using SHAP: {e}, falling back to simple extraction")
                key_indicators = self.extract_key_indicators(log_text)
                root_cause = self.generate_root_cause(log_text, class_name, key_indicators)
        else:
            key_indicators = self.extract_key_indicators(log_text)
            root_cause = self.generate_root_cause(log_text, class_name, key_indicators)
        
        # Generate recommendation
        recommendation = self.generate_recommendation(class_name, affected_components)
        
        result = {
            'log': log_text,
            'prediction': class_name,
            'is_anomaly': is_anomaly,
            'confidence': round(confidence, 2),
            'severity': severity,
            'affected_components': affected_components,
            'root_cause': root_cause,
            'recommendation': recommendation,
            'key_indicators': key_indicators,
            'top_classifications': [
                {
                    'type': LABEL_MAP[top_classes[i]],
                    'probability': round(top_probs[i] * 100, 2)
                } for i in range(len(top_classes))
            ]
        }
        
        return result
    
    def identify_components(self, log_text):
        log_lower = log_text.lower()
        components = []
        component_scores = {}
        
        # Count keyword matches for each component
        for component, keywords in COMPONENT_MAP.items():
            score = 0
            for keyword in keywords:
                if keyword in log_lower:
                    score += 1
            
            if score > 0:
                component_scores[component] = score
        
        # Sort components by score and get top matches
        if component_scores:
            components = [comp for comp, _ in sorted(component_scores.items(), key=lambda x: x[1], reverse=True)]
        
        return components or ['unknown']
    
    def get_key_indicators_shap(self, log_text, shap_values):
        # Get words with highest SHAP values
        tokens = log_text.split()
        if not tokens:
            return []
        
        # Get average SHAP value per token
        avg_shap = np.mean(np.abs(shap_values.values), axis=2)
        avg_shap = avg_shap[0, 1:len(tokens)+1]  # Skip CLS token and limit to actual tokens
        
        # Get top 3 tokens by SHAP value
        if len(tokens) > 3:
            top_indices = np.argsort(avg_shap)[-3:]
            return [tokens[i] for i in top_indices if i < len(tokens)]
        else:
            return tokens
    
    def extract_key_indicators(self, log_text):
        # Enhanced keyword extraction with weighted importance
        important_words = {
            'high': ['error', 'fail', 'crash', 'exception', 'panic', 'corrupt'],
            'medium': ['warning', 'interrupt', 'memory', 'disk', 'network', 'timeout'],
            'low': ['process', 'terminated', 'overflow', 'retry', 'delay']
        }
        
        tokens = log_text.lower().split()
        indicators = []
        word_scores = {}
        
        # Score each word based on importance
        for word in tokens:
            if any(word in important_words['high'] or imp_word in word for imp_word in important_words['high']):
                word_scores[word] = 3
            elif any(word in important_words['medium'] or imp_word in word for imp_word in important_words['medium']):
                word_scores[word] = 2
            elif any(word in important_words['low'] or imp_word in word for imp_word in important_words['low']):
                word_scores[word] = 1
        
        # Sort by score and get top indicators
        indicators = [word for word, _ in sorted(word_scores.items(), key=lambda x: x[1], reverse=True)]
        
        # If no indicators found, return most unique words
        if not indicators:
            word_freq = Counter(tokens)
            indicators = [word for word, freq in word_freq.most_common(3) if len(word) > 3]
            
        return indicators[:3]  # Return top 3 indicators
    
    def enhanced_keyword_analysis(self, log_text):
        """Enhanced anomaly detection using weighted keywords and patterns"""
        log_lower = log_text.lower()
        
        # Define weighted anomaly keywords with pattern matching
        anomaly_patterns = {
            # Critical issues (weight 5)
            'critical': {
                'keywords': ['panic', 'fatal', 'crash', 'segfault', 'deadlock'],
                'weight': 5,
                'related_class': 7  # KERNPANIC
            },
            # Serious errors (weight 4)
            'error': {
                'keywords': ['error', 'fail', 'failure', 'corrupt', 'exception'],
                'weight': 4,
                'related_class': None  # Determined by content
            },
            # Warnings (weight 3)
            'warning': {
                'keywords': ['warn', 'warning', 'denied', 'unable', 'cannot', 'timeout'],
                'weight': 3,
                'related_class': None
            },
            # Low severity issues (weight 2)
            'notice': {
                'keywords': ['notice', 'retry', 'delay', 'lost', 'attempt'],
                'weight': 2,
                'related_class': None
            }
        }
        
        # Calculate anomaly score
        anomaly_score = 0
        max_weight = 0
        detected_class = None
        
        for severity, pattern_info in anomaly_patterns.items():
            for keyword in pattern_info['keywords']:
                if keyword in log_lower:
                    anomaly_score += pattern_info['weight']
                    if pattern_info['weight'] > max_weight:
                        max_weight = pattern_info['weight']
                        detected_class = pattern_info['related_class']
        
        # Analyze specific component-related issues
        component_classes = {
            'memory': 8,     # KERNMEM
            'tlb': 2,        # KERNDTLB
            'storage': 5,    # KERNSTOR
            'disk': 5,       # KERNSTOR
            'io': 9,         # KERNIO
            'network': 9,    # KERNIO
            'sql': 4,        # KERNSQLA 
            'stack': 6       # KERNSTACK
        }
        
        for component, comp_class in component_classes.items():
            if component in log_lower and anomaly_score > 0:  # Must have some anomaly keywords
                detected_class = comp_class
                break
        
        # Determine if this is an anomaly and with what confidence
        is_anomaly = anomaly_score >= 3
        
        # Calculate confidence as percentage (max 95%)
        confidence = min(95, (anomaly_score / 10) * 100) if is_anomaly else 0
        
        return {
            'is_anomaly': is_anomaly,
            'confidence': confidence,
            'class': detected_class
        }
    
    def generate_root_cause(self, log_text, anomaly_type, key_indicators):
        if anomaly_type == "-":  # Normal
            return "No anomaly detected."
        
        # Format key indicators
        key_words_str = ", ".join(key_indicators)
        
        # Map anomaly types to root cause templates
        root_cause_map = {
            "KERNELRND": f"Random kernel errors detected. Often caused by hardware or driver issues. Key indicators: {key_words_str}",
            "KERNDTLB": f"Memory addressing issue. The Translation Lookaside Buffer (TLB) is experiencing errors, indicating potential memory management problems or hardware issues with the memory management unit.",
            "KERNUTILS": f"Kernel utility functionality issue. Problems with kernel utilities that may affect system performance. Key indicators: {key_words_str}",
            "KERNSQLA": f"SQLite/database access issues in the kernel. May affect data storage and retrieval operations. Key indicators: {key_words_str}",
            "KERNSTOR": f"Storage subsystem issue. Problems with disk I/O, filesystem, or storage drivers. Key indicators: {key_words_str}",
            "KERNSTACK": f"Kernel stack corruption or overflow. Often indicates serious software bugs or memory corruption issues. Key indicators: {key_words_str}",
            "KERNPANIC": f"Critical kernel error causing system instability. The system may crash or become unresponsive. Key indicators: {key_words_str}",
            "KERNMEM": f"Memory management issue in the kernel. May cause memory leaks, fragmentation, or corruption. Key indicators: {key_words_str}",
            "KERNIO": f"Input/Output subsystem error. Issues with data transfer between CPU and peripheral devices. Key indicators: {key_words_str}",
            "KERNINFO": f"Kernel informational message. Not necessarily an error, but may indicate notable system events. Key indicators: {key_words_str}"
        }
        
        return root_cause_map.get(anomaly_type, f"Unknown anomaly type: {anomaly_type}")
    
    def generate_recommendation(self, anomaly_type, affected_components):
        if anomaly_type == "-":  # Normal
            return "No action needed - log indicates normal operation."
        
        # Generic recommendations based on affected components
        component_recs = {
            'memory': "Check system memory usage and hardware health. Consider memory diagnostics.",
            'storage': "Verify disk health and file system integrity. Check storage drivers and connections.",
            'network': "Investigate network connectivity and interface configuration. Monitor bandwidth and packet loss.",
            'process': "Review application logs for more details. Check for resource constraints or application bugs.",
            'system': "Consider kernel updates or patches. Review system logs for context around this event.",
            'unknown': "Monitor system performance and check related logs for more context."
        }
        
        # Start with a recommendation based on the first affected component
        if affected_components:
            primary_component = affected_components[0]
            recommendation = component_recs.get(primary_component, component_recs['unknown'])
        else:
            recommendation = component_recs['unknown']
        
        # Add additional advice based on anomaly type
        anomaly_advice = {
            "KERNPANIC": " CRITICAL: This is a serious issue that requires immediate attention! Backup important data.",
            "KERNSTACK": " Consider system memory diagnostics and kernel updates.",
            "KERNSTOR": " Check disk health with SMART diagnostics and file system consistency."
        }
        
        if anomaly_type in anomaly_advice:
            recommendation += anomaly_advice[anomaly_type]
        
        return recommendation
    
    def analyze_log_file(self, file_content):
        """Analyze multiple logs from a file"""
        log_lines = file_content.strip().split('\n')
        results = []
        
        # Track severity distribution for better health assessment
        severity_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        
        for line in log_lines:
            line = line.strip()
            if line:  # Skip empty lines
                result = self.analyze_log(line)
                results.append(result)
                
                # Track severity
                severity = result.get('severity', 0)
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        # Calculate system health score - weighted by severity
        total_logs = len(results)
        if total_logs == 0:
            health_score = 100.0
        else:
            # Weight by severity: normal=100%, low=90%, medium=70%, high=40%, critical=10%
            severity_weights = {0: 1.0, 1: 0.9, 2: 0.7, 3: 0.4, 4: 0.2, 5: 0.1}
            weighted_sum = sum(count * severity_weights[sev] for sev, count in severity_counts.items())
            health_score = (weighted_sum / total_logs) * 100
        
        # System health assessment
        if health_score >= 90:
            health_status = "EXCELLENT: System operating normally with minimal anomalies."
        elif health_score >= 75:
            health_status = "STABLE: System operating within normal parameters. Routine monitoring advised."
        elif health_score >= 50:
            health_status = "CAUTION: Multiple anomalies detected. Increased monitoring recommended."
        else:
            health_status = "ALERT: System health critical. Immediate investigation required."
        
        # Add detailed severity distribution for advanced visualization
        severity_distribution = {
            'normal': severity_counts.get(0, 0),
            'low': severity_counts.get(1, 0),
            'medium': sum(severity_counts.get(sev, 0) for sev in [2, 3]),
            'high': severity_counts.get(4, 0),
            'critical': severity_counts.get(5, 0)
        }
        
        return {
            'results': results,
            'health_score': round(health_score, 1),
            'health_status': health_status,
            'severity_distribution': severity_distribution
        }

    def is_anomaly_by_keywords(self, log_text):
        """Determine if a log is likely anomalous based on keywords"""
        log_lower = log_text.lower()
        anomaly_keywords = [
            'error', 'fail', 'failure', 'corrupt', 'crash', 'exception', 
            'abnormal', 'invalid', 'bad', 'denied', 'timeout', 'abort',
            'panic', 'lost', 'unable', 'cannot', 'critical', 'fatal',
            'not responding', 'violation'
        ]
        
        return any(keyword in log_lower for keyword in anomaly_keywords)

# Initialize log analyzer
analyzer = LogAnalyzer()

@app.route('/')
def index():
    return render_template('index.html', active_tab=None)

@app.route('/dashboard')
def dashboard():
    return render_template('index.html', active_tab='dashboard')

@app.route('/upload')
def upload():
    return render_template('index.html', active_tab='upload')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'log_file' in request.files:
        file = request.files['log_file']
        content = file.read().decode('utf-8')
        results = analyzer.analyze_log_file(content)
        return jsonify(results)
    elif 'log_text' in request.form:
        log_text = request.form['log_text']
        if '\n' in log_text:
            # Multi-line analysis
            results = analyzer.analyze_log_file(log_text)
            return jsonify(results)
        else:
            # Single log analysis
            result = analyzer.analyze_log(log_text)
            severity = result.get('severity', 0)
            health_score = 100 if severity == 0 else max(0, 100 - (severity * 20))
            return jsonify({
                'results': [result], 
                'health_score': health_score,
                'health_status': 'NORMAL' if not result['is_anomaly'] else 'ANOMALY DETECTED',
                'severity_distribution': {
                    'normal': 1 if not result['is_anomaly'] else 0,
                    'low': 1 if severity == 1 else 0,
                    'medium': 1 if severity in [2, 3] else 0,
                    'high': 1 if severity == 4 else 0,
                    'critical': 1 if severity == 5 else 0
                }
            })
    else:
        return jsonify({'error': 'No log data provided'}), 400

@app.route('/api/logs/analyze', methods=['POST'])
def api_analyze():
    # API endpoint with same functionality but more RESTful URL
    return analyze()

@app.route('/help')
def help_page():
    return render_template('help.html')

@app.route('/about')
def about():
    return render_template('about.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 