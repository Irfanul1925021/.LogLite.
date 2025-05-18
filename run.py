#!/usr/bin/env python
import os
from app import app

if __name__ == "__main__":
    # Print information about the application
    print("Starting LogLite - System Log Anomaly Detection Application")
    print("---------------------------------------------------------")
    print("Access the web interface at: http://localhost:5000")
    print("Press CTRL+C to stop the application")
    print("---------------------------------------------------------")
    
    # Run the Flask application
    app.run(host='0.0.0.0', port=5000, debug=True) 