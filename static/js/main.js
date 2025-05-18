document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let pieChart = null;
    let severityChart = null;
    let anomalyTypesChart = null;
    
    // Handle file form submission
    document.getElementById('fileForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData();
        const fileInput = document.getElementById('logFile');
        
        if (fileInput.files.length === 0) {
            showNotification('Please select a log file to analyze', 'warning');
            return;
        }
        
        formData.append('log_file', fileInput.files[0]);
        
        // Show loading state
        toggleLoading(true);
        
        // Submit for analysis
        fetch('/analyze', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displayResults(data);
            showNotification('Analysis completed successfully!', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred during analysis. Please try again.', 'danger');
        })
        .finally(() => {
            toggleLoading(false);
        });
    });
    
    // Handle text form submission
    document.getElementById('textForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData();
        const logText = document.getElementById('logText').value;
        
        if (!logText.trim()) {
            showNotification('Please enter log text to analyze', 'warning');
            return;
        }
        
        formData.append('log_text', logText);
        
        // Show loading state
        toggleLoading(true);
        
        // Submit for analysis
        fetch('/analyze', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displayResults(data);
            showNotification('Analysis completed successfully!', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred during analysis. Please try again.', 'danger');
        })
        .finally(() => {
            toggleLoading(false);
        });
    });
    
    // Function to display analysis results
    function displayResults(data) {
        // Show results section with fade in animation
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.classList.remove('d-none');
        resultsSection.classList.add('fade-in');
        
        // Update health score and status
        updateHealthIndicator(data.health_score, data.health_status);
        
        // Update charts
        updateCharts(data);
        
        // Update results table
        populateResultsTable(data.results);
        
        // Update dashboard stats
        updateDashboardStats(data.results);
        
        // Scroll to results
        resultsSection.scrollIntoView({
            behavior: 'smooth'
        });
    }
    
    // Function to update health indicator
    function updateHealthIndicator(score, status) {
        const healthScore = document.getElementById('healthScore');
        const healthProgress = document.getElementById('healthProgress');
        const healthStatus = document.getElementById('healthStatus');
        const healthStatusText = document.getElementById('healthStatusText');
        const healthBadge = document.getElementById('healthBadge');
        
        // Animate score counter with percent sign
        animateCounter(healthScore, 0, score, 1000, '%');
        
        // Update progress bar with animation
        setTimeout(() => {
            healthProgress.style.width = `${score}%`;
        }, 300);
        
        healthStatusText.textContent = status;
        
        // Update colors based on health score
        if (score >= 90) {
            healthProgress.className = 'progress-bar bg-success';
            healthStatus.className = 'alert alert-success';
            healthBadge.className = 'badge rounded-pill bg-success pulse';
            healthBadge.textContent = 'Excellent';
        } else if (score >= 75) {
            healthProgress.className = 'progress-bar bg-info';
            healthStatus.className = 'alert alert-info';
            healthBadge.className = 'badge rounded-pill bg-info';
            healthBadge.textContent = 'Stable';
        } else if (score >= 50) {
            healthProgress.className = 'progress-bar bg-warning';
            healthStatus.className = 'alert alert-warning';
            healthBadge.className = 'badge rounded-pill bg-warning';
            healthBadge.textContent = 'Caution';
        } else {
            healthProgress.className = 'progress-bar bg-danger';
            healthStatus.className = 'alert alert-danger';
            healthBadge.className = 'badge rounded-pill bg-danger pulse';
            healthBadge.textContent = 'Alert';
        }
        
        // Update severity scale
        updateSeverityScale(score);
    }
    
    // Function to update severity scale
    function updateSeverityScale(score) {
        // Add severity scale if doesn't exist
        if (!document.getElementById('severityScale')) {
            const healthIndicator = document.querySelector('.health-indicator');
            const scaleHtml = `
                <div class="severity-scale" id="severityScale">
                    <div class="severity-scale-item severity-critical"></div>
                    <div class="severity-scale-item severity-high"></div>
                    <div class="severity-scale-item severity-medium"></div>
                    <div class="severity-scale-item severity-low"></div>
                </div>
            `;
            healthIndicator.insertAdjacentHTML('beforeend', scaleHtml);
        }
        
        // Remove active class from all items
        document.querySelectorAll('.severity-scale-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to appropriate item based on score
        if (score < 50) {
            document.querySelector('.severity-scale-item.severity-critical').classList.add('active');
        } else if (score < 75) {
            document.querySelector('.severity-scale-item.severity-high').classList.add('active');
        } else if (score < 90) {
            document.querySelector('.severity-scale-item.severity-medium').classList.add('active');
        } else {
            document.querySelector('.severity-scale-item.severity-low').classList.add('active');
        }
    }
    
    // Function to create/update charts
    function updateCharts(data) {
        // Update anomaly vs normal pie chart
        updatePieChart(data.results);
        
        // Update severity distribution chart if available
        updateSeverityChart(data.severity_distribution);
        
        // Update anomaly type distribution chart
        updateAnomalyTypeChart(data.results);
        
        // Add additional charts and visualizations as needed
        if (data.results.length > 1) {
            // Only create timeline for multiple logs
            createLogTimeline(data.results);
        }
    }
    
    // Function to update pie chart
    function updatePieChart(results) {
        // Count normal vs anomaly logs
        const normalCount = results.filter(item => !item.is_anomaly).length;
        const anomalyCount = results.filter(item => item.is_anomaly).length;
        
        // Destroy existing chart if it exists
        if (pieChart) {
            pieChart.destroy();
        }
        
        // Create new chart
        const ctx = document.getElementById('anomalyPieChart').getContext('2d');
        pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Normal', 'Anomaly'],
                datasets: [{
                    data: [normalCount, anomalyCount],
                    backgroundColor: [
                        'rgba(6, 214, 160, 0.8)',
                        'rgba(239, 71, 111, 0.8)'
                    ],
                    borderColor: [
                        'rgba(6, 214, 160, 1)',
                        'rgba(239, 71, 111, 1)'
                    ],
                    borderWidth: 2,
                    hoverBackgroundColor: [
                        'rgba(6, 214, 160, 1)',
                        'rgba(239, 71, 111, 1)'
                    ],
                    hoverBorderColor: [
                        '#ffffff',
                        '#ffffff'
                    ],
                    hoverBorderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                                size: 12
                            },
                            padding: 20
                        }
                    },
                    title: {
                        display: true,
                        text: 'Log Classification',
                        font: {
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            bottom: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '70%',
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            }
        });
    }
    
    // Function to update severity distribution chart
    function updateSeverityChart(severityData) {
        // Check if severity data is available
        if (!severityData) return;
        
        // Destroy existing chart if it exists
        if (severityChart) {
            severityChart.destroy();
        }
        
        // Find or create canvas for severity chart
        let severityChartCanvas = document.getElementById('severityChart');
        if (!severityChartCanvas) {
            // Create container and canvas
            const chartContainer = document.createElement('div');
            chartContainer.className = 'chart-container mt-4';
            
            severityChartCanvas = document.createElement('canvas');
            severityChartCanvas.id = 'severityChart';
            chartContainer.appendChild(severityChartCanvas);
            
            // Find charts section to append
            const chartsSection = document.querySelector('.col-md-4');
            if (chartsSection) {
                chartsSection.appendChild(chartContainer);
            }
        }
        
        // Prepare data
        const labels = ['Normal', 'Low', 'Medium', 'High', 'Critical'];
        const values = [
            severityData.normal || 0,
            severityData.low || 0,
            severityData.medium || 0,
            severityData.high || 0,
            severityData.critical || 0
        ];
        
        // Colors for severity levels
        const colors = [
            'rgba(6, 214, 160, 0.8)',   // Normal: Green
            'rgba(17, 138, 178, 0.8)',  // Low: Blue
            'rgba(255, 209, 102, 0.8)', // Medium: Yellow
            'rgba(239, 71, 111, 0.8)',  // High: Red
            'rgba(157, 2, 8, 0.8)'      // Critical: Dark red
        ];
        
        // Create chart
        severityChart = new Chart(severityChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Severity Distribution',
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 2,
                    borderRadius: 5,
                    hoverBackgroundColor: colors.map(c => c.replace('0.8', '1')),
                    maxBarThickness: 50
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Severity Distribution',
                        font: {
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            bottom: 15
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                animation: {
                    duration: 1500
                }
            }
        });
    }
    
    // Function to update anomaly type chart
    function updateAnomalyTypeChart(results) {
        // Count occurrences of each anomaly type
        const anomalyTypes = {};
        results.filter(item => item.is_anomaly).forEach(result => {
            const type = result.prediction;
            anomalyTypes[type] = (anomalyTypes[type] || 0) + 1;
        });
        
        // Skip if no anomalies
        if (Object.keys(anomalyTypes).length === 0) return;
        
        // Find or create anomaly types container
        let anomalyTypesContainer = document.getElementById('anomalyTypesContainer');
        if (!anomalyTypesContainer) {
            // Create container for anomaly types
            anomalyTypesContainer = document.createElement('div');
            anomalyTypesContainer.id = 'anomalyTypesContainer';
            anomalyTypesContainer.className = 'card mt-4 fade-in';
            
            anomalyTypesContainer.innerHTML = `
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="bx bx-error-circle"></i> Anomaly Types</h5>
                </div>
                <div class="card-body">
                    <div id="anomalyTypeChart" class="chart-container"></div>
                    <div id="anomalyTypesList" class="anomaly-type-distribution mt-3"></div>
                </div>
            `;
            
            // Add to results section
            const resultsSection = document.getElementById('resultsSection');
            resultsSection.appendChild(anomalyTypesContainer);
        }
        
        // Generate color based on type name
        function getColorForType(typeName) {
            // Map specific types to colors
            const typeColors = {
                'KERNPANIC': 'rgba(208, 0, 0, 0.8)',      // Critical - dark red
                'KERNSTACK': 'rgba(239, 71, 111, 0.8)',   // Serious - red
                'KERNMEM': 'rgba(217, 102, 255, 0.8)',    // Memory - purple
                'KERNSTOR': 'rgba(106, 90, 205, 0.8)',    // Storage - slate blue
                'KERNIO': 'rgba(17, 138, 178, 0.8)',      // IO - blue
                'KERNINFO': 'rgba(6, 214, 160, 0.8)'      // Info - green
            };
            
            return typeColors[typeName] || `hsl(${Math.random() * 360}, 70%, 60%)`;
        }
        
        // Update anomaly types list
        const anomalyTypesList = document.getElementById('anomalyTypesList');
        anomalyTypesList.innerHTML = '';
        
        Object.entries(anomalyTypes).forEach(([type, count]) => {
            const color = getColorForType(type);
            const typeItem = document.createElement('div');
            typeItem.className = 'anomaly-type-item';
            typeItem.innerHTML = `
                <div class="anomaly-type-dot" style="background-color: ${color}"></div>
                <span>${type}: ${count}</span>
            `;
            anomalyTypesList.appendChild(typeItem);
        });
        
        // Update anomaly types chart
        const anomalyChartEl = document.getElementById('anomalyTypeChart');
        
        // Destroy existing chart if it exists
        if (anomalyTypesChart) {
            anomalyTypesChart.destroy();
        }
        
        // Prepare data for chart
        const labels = Object.keys(anomalyTypes);
        const data = Object.values(anomalyTypes);
        const colors = labels.map(getColorForType);
        
        // Create chart
        anomalyTypesChart = new Chart(anomalyChartEl, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        align: 'start'
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            }
        });
    }
    
    // Function to create a timeline visualization for logs
    function createLogTimeline(results) {
        // Only create timeline if we have multiple logs
        if (results.length <= 1) return;
        
        // Find or create timeline container
        let timelineContainer = document.getElementById('logTimeline');
        if (!timelineContainer) {
            const timelineCard = document.createElement('div');
            timelineCard.className = 'card mt-4 fade-in';
            timelineCard.innerHTML = `
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="bx bx-time"></i> Event Timeline</h5>
                </div>
                <div class="card-body">
                    <div id="logTimeline" class="timeline-container"></div>
                </div>
            `;
            
            // Add to results section
            const resultsSection = document.getElementById('resultsSection');
            resultsSection.appendChild(timelineCard);
            
            timelineContainer = document.getElementById('logTimeline');
        }
        
        // Clear timeline container
        timelineContainer.innerHTML = '';
        
        // Create timeline HTML
        const timelineHTML = results.map((result, index) => {
            // Determine timeline item class based on anomaly status
            const itemClass = result.is_anomaly ? 'timeline-item-anomaly' : 'timeline-item-normal';
            const iconClass = result.is_anomaly ? 'bx-error-circle' : 'bx-check-circle';
            const severityClass = result.severity >= 4 ? 'high' : (result.severity >= 2 ? 'medium' : 'low');
            
            return `
                <div class="timeline-item ${itemClass} severity-${severityClass}">
                    <div class="timeline-icon">
                        <i class="bx ${iconClass}"></i>
                    </div>
                    <div class="timeline-content">
                        <h6>Log #${index + 1}: ${result.prediction}</h6>
                        <p class="timeline-log">${result.log}</p>
                        <span class="timeline-action">
                            <button class="btn btn-sm btn-details" onclick="showDetailsModal(${index})">Details</button>
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        timelineContainer.innerHTML = timelineHTML;
        
        // Add timeline styles if not already added
        if (!document.getElementById('timelineStyles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'timelineStyles';
            styleEl.textContent = `
                .timeline-container {
                    position: relative;
                    padding: 20px 0;
                }
                .timeline-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 15px;
                    height: 100%;
                    width: 4px;
                    background: #e9ecef;
                    border-radius: 2px;
                }
                .timeline-item {
                    padding: 15px 0 15px 40px;
                    position: relative;
                    border-left: 0;
                    margin-bottom: 15px;
                }
                .timeline-item:last-child {
                    margin-bottom: 0;
                }
                .timeline-icon {
                    position: absolute;
                    left: 0;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    text-align: center;
                    line-height: 30px;
                    font-size: 16px;
                    color: white;
                    z-index: 1;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                }
                .timeline-item-normal .timeline-icon {
                    background: linear-gradient(135deg, #06d6a0, #4cc9f0);
                }
                .timeline-item-anomaly .timeline-icon {
                    background: linear-gradient(135deg, #ef476f, #ff9e00);
                }
                .timeline-content {
                    padding: 15px;
                    border-radius: 10px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.08);
                    transition: all 0.3s;
                }
                .timeline-item-normal .timeline-content {
                    background-color: #f8f9fa;
                    border-left: 4px solid #06d6a0;
                }
                .timeline-item-anomaly .timeline-content {
                    background-color: #fff5f7;
                    border-left: 4px solid #ef476f;
                }
                .timeline-item.severity-high .timeline-content {
                    border-left: 4px solid #d00000;
                }
                .timeline-item.severity-medium .timeline-content {
                    border-left: 4px solid #ffd166;
                }
                .timeline-item:hover .timeline-content {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.12);
                }
                .timeline-log {
                    font-family: 'Consolas', monospace;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 5px;
                }
                .timeline-action {
                    display: flex;
                    justify-content: flex-end;
                }
            `;
            document.head.appendChild(styleEl);
        }
    }
    
    // Function to populate results table
    function populateResultsTable(results) {
        const tableBody = document.getElementById('resultsBody');
        tableBody.innerHTML = '';
        
        results.forEach((result, index) => {
            const row = document.createElement('tr');
            row.classList.add('fade-in');
            row.style.animationDelay = `${index * 0.1}s`;
            
            // Add log text (truncated if too long)
            const logText = result.log.length > 50 ? result.log.substring(0, 50) + '...' : result.log;
            const logCell = document.createElement('td');
            
            // Highlight keywords in the log
            const highlightedLog = highlightLogText(logText);
            logCell.innerHTML = highlightedLog;
            row.appendChild(logCell);
            
            // Add prediction with badge
            const predictionCell = document.createElement('td');
            const predictionBadge = document.createElement('span');
            
            let badgeClass = 'badge badge-normal';
            if (result.is_anomaly) {
                // Add severity classes
                if (result.severity >= 5) {
                    badgeClass = 'badge badge-severity-critical';
                } else if (result.severity >= 4) {
                    badgeClass = 'badge badge-severity-high';
                } else if (result.severity >= 2) {
                    badgeClass = 'badge badge-severity-medium';
                } else {
                    badgeClass = 'badge badge-severity-low';
                }
            }
            
            predictionBadge.className = badgeClass;
            predictionBadge.textContent = result.prediction;
            predictionCell.appendChild(predictionBadge);
            row.appendChild(predictionCell);
            
            // Add confidence with progress visualization
            const confidenceCell = document.createElement('td');
            
            // Create mini-progress bar for confidence
            const confidenceBar = document.createElement('div');
            confidenceBar.className = 'progress';
            confidenceBar.style.height = '8px';
            confidenceBar.style.width = '80px';
            
            const confidenceProgress = document.createElement('div');
            let progressClass = 'progress-bar bg-success';
            
            if (result.confidence < 60) {
                progressClass = 'progress-bar bg-danger';
            } else if (result.confidence < 75) {
                progressClass = 'progress-bar bg-warning';
            }
            
            confidenceProgress.className = progressClass;
            confidenceProgress.style.width = `${result.confidence}%`;
            confidenceBar.appendChild(confidenceProgress);
            
            const confidenceText = document.createElement('small');
            confidenceText.className = 'ms-2';
            confidenceText.textContent = `${result.confidence}%`;
            
            confidenceCell.appendChild(confidenceBar);
            confidenceCell.appendChild(confidenceText);
            row.appendChild(confidenceCell);
            
            // Add details button
            const detailsCell = document.createElement('td');
            const detailsBtn = document.createElement('button');
            detailsBtn.className = 'btn btn-details';
            detailsBtn.innerHTML = '<i class="bx bx-info-circle me-1"></i> View Details';
            detailsBtn.onclick = function() {
                showDetailsModal(result);
            };
            detailsCell.appendChild(detailsBtn);
            row.appendChild(detailsCell);
            
            tableBody.appendChild(row);
        });
    }
    
    // Function to highlight keywords in log text
    function highlightLogText(text) {
        // Define patterns to highlight
        const errorPatterns = /(error|fail|crash|exception|critical|fatal)/gi;
        const warningPatterns = /(warning|caution|attention|notice)/gi;
        const successPatterns = /(success|completed|normal)/gi;
        
        // Apply highlighting
        let highlighted = text
            .replace(errorPatterns, '<span class="highlight-error">$1</span>')
            .replace(warningPatterns, '<span class="highlight-warning">$1</span>')
            .replace(successPatterns, '<span class="highlight-success">$1</span>');
        
        return highlighted;
    }
    
    // Function to show details modal
    function showDetailsModal(result) {
        // Support passing index or direct result object
        let resultData = result;
        
        if (typeof result === 'number') {
            // If index is passed, get data from the global results
            const resultsTable = document.getElementById('resultsTable');
            const resultsData = resultsTable.dataset.results;
            if (resultsData) {
                const parsedResults = JSON.parse(resultsData);
                resultData = parsedResults[result];
            }
        }
        
        // If we still don't have result data, return
        if (!resultData) return;
        
        // Populate modal with result data
        document.getElementById('modalLog').textContent = resultData.log;
        
        const predictionElem = document.getElementById('modalPrediction');
        predictionElem.textContent = resultData.prediction;
        predictionElem.className = resultData.is_anomaly ? 'fw-bold text-danger' : 'fw-bold text-success';
        
        const confidenceElem = document.getElementById('modalConfidence');
        confidenceElem.textContent = `${resultData.confidence}%`;
        
        // Set badge color based on severity
        let badgeClass = 'badge bg-success';
        if (resultData.severity >= 5) {
            badgeClass = 'badge badge-severity-critical';
        } else if (resultData.severity >= 4) {
            badgeClass = 'badge badge-severity-high';
        } else if (resultData.severity >= 2) {
            badgeClass = 'badge badge-severity-medium';
        } else if (resultData.is_anomaly) {
            badgeClass = 'badge badge-severity-low';
        }
        confidenceElem.className = badgeClass;
        
        // Show top classifications
        const topClassificationsElem = document.getElementById('modalTopClassifications');
        topClassificationsElem.innerHTML = '';
        if (resultData.top_classifications && resultData.top_classifications.length > 0) {
            const topClassHTML = resultData.top_classifications.map(cls => 
                `<div class="mt-1">
                    <small>${cls.type}: <span class="fw-bold">${cls.probability}%</span></small>
                    <div class="progress" style="height: 5px;">
                        <div class="progress-bar bg-primary" role="progressbar" style="width: ${cls.probability}%"></div>
                    </div>
                </div>`
            ).join('');
            topClassificationsElem.innerHTML = topClassHTML;
        }
        
        // Show affected components
        const componentsElem = document.getElementById('modalComponents');
        componentsElem.innerHTML = '';
        if (resultData.affected_components && resultData.affected_components.length > 0) {
            const componentsHTML = resultData.affected_components.map(component => 
                `<span class="component-badge component-${component}">${component}</span>`
            ).join('');
            componentsElem.innerHTML = componentsHTML;
        } else {
            componentsElem.innerHTML = '<span class="text-muted">No specific component identified</span>';
        }
        
        // Show key indicators
        const indicatorsElem = document.getElementById('modalIndicators');
        indicatorsElem.innerHTML = '';
        if (resultData.key_indicators && resultData.key_indicators.length > 0) {
            const indicatorsHTML = resultData.key_indicators.map(indicator => 
                `<span class="indicator-tag">${indicator}</span>`
            ).join('');
            indicatorsElem.innerHTML = indicatorsHTML;
        } else {
            indicatorsElem.innerHTML = '<span class="text-muted">No key indicators found</span>';
        }
        
        // Root cause and recommendation
        document.getElementById('modalRootCause').innerHTML = resultData.root_cause;
        document.getElementById('modalRecommendation').innerHTML = resultData.recommendation;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
        modal.show();
    }
    
    // Animate counter function (updated to support suffix)
    function animateCounter(element, start, end, duration = 1000, suffix = '') {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = `${value}${suffix}`;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                element.textContent = `${end}${suffix}`;
            }
        };
        window.requestAnimationFrame(step);
    }
    
    // Show notification function
    function showNotification(message, type) {
        // Create notification element if it doesn't exist
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.bottom = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '9999';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} fade-in`;
        notification.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
        notification.style.minWidth = '250px';
        notification.style.marginTop = '10px';
        notification.style.animation = 'fadeIn 0.3s forwards';
        
        // Add close button
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="me-auto">${message}</div>
                <button type="button" class="btn-close ms-2" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        notificationContainer.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeIn 0.3s reverse forwards';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
    
    // Function to toggle loading state
    function toggleLoading(isLoading) {
        const forms = document.querySelectorAll('#fileForm, #textForm');
        const submitButtons = document.querySelectorAll('button[type="submit"]');
        
        if (isLoading) {
            // Create and show loader
            const loaderContainer = document.createElement('div');
            loaderContainer.id = 'loaderContainer';
            loaderContainer.className = 'text-center mt-4';
            
            const loader = document.createElement('div');
            loader.className = 'loader';
            loaderContainer.appendChild(loader);
            
            const loaderText = document.createElement('div');
            loaderText.className = 'mt-3 text-primary';
            loaderText.textContent = 'Analyzing logs...';
            loaderContainer.appendChild(loaderText);
            
            // Add after the forms
            const formContainer = document.querySelector('.tab-content');
            formContainer.appendChild(loaderContainer);
            
            // Disable form elements
            submitButtons.forEach(button => {
                button.disabled = true;
            });
        } else {
            // Remove loader
            const loader = document.getElementById('loaderContainer');
            if (loader) loader.remove();
            
            // Enable form elements
            submitButtons.forEach(button => {
                button.disabled = false;
            });
        }
    }
    
    // Function to update dashboard stats
    function updateDashboardStats(results) {
        const totalLogsCount = document.getElementById('totalLogsCount');
        const normalLogsCount = document.getElementById('normalLogsCount');
        const anomalyCount = document.getElementById('anomalyCount');
        const anomalyRate = document.getElementById('anomalyRate');
        
        if (!totalLogsCount || !normalLogsCount || !anomalyCount || !anomalyRate) {
            return; // Elements not found
        }
        
        const total = results.length;
        const normal = results.filter(item => !item.is_anomaly).length;
        const anomalies = total - normal;
        const rate = total > 0 ? Math.round((anomalies / total) * 100) : 0;
        
        // Animate counters
        animateCounter(totalLogsCount, 0, total);
        animateCounter(normalLogsCount, 0, normal);
        animateCounter(anomalyCount, 0, anomalies);
        animateCounter(anomalyRate, 0, rate, 800, '%');
    }
    
    // Make showDetailsModal available globally
    window.showDetailsModal = showDetailsModal;
    
    // Initialize dashboard charts if dashboard tab exists
    if (document.getElementById('dashboardAnomalyChart')) {
        initializeDashboardCharts();
    }
    
    // Handle dashboard tab activation
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('click', function() {
            if (this.id === 'dashboard-tab') {
                // Delay to ensure chart containers are visible
                setTimeout(() => {
                    initializeDashboardCharts();
                }, 100);
            }
        });
    });
});

// Function to initialize dashboard charts
function initializeDashboardCharts() {
    // Sample data - in a real app, this would come from an API
    const anomalyData = {
        labels: ['Normal', 'Low', 'Medium', 'High', 'Critical'],
        datasets: [{
            data: [65, 12, 8, 5, 2],
            backgroundColor: [
                'rgba(6, 214, 160, 0.7)',
                'rgba(17, 138, 178, 0.7)',
                'rgba(255, 209, 102, 0.7)',
                'rgba(239, 71, 111, 0.7)',
                'rgba(157, 2, 8, 0.7)'
            ],
            borderColor: [
                'rgba(6, 214, 160, 1)',
                'rgba(17, 138, 178, 1)',
                'rgba(255, 209, 102, 1)',
                'rgba(239, 71, 111, 1)',
                'rgba(157, 2, 8, 1)'
            ],
            borderWidth: 1
        }]
    };
    
    const severityData = {
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        datasets: [
            {
                label: 'Critical',
                data: [0, 1, 0, 2, 0, 0, 1],
                backgroundColor: 'rgba(157, 2, 8, 0.5)',
                borderColor: 'rgba(157, 2, 8, 1)',
                borderWidth: 2,
                tension: 0.4
            },
            {
                label: 'High',
                data: [1, 2, 3, 2, 4, 1, 2],
                backgroundColor: 'rgba(239, 71, 111, 0.5)',
                borderColor: 'rgba(239, 71, 111, 1)',
                borderWidth: 2,
                tension: 0.4
            },
            {
                label: 'Medium',
                data: [4, 3, 5, 6, 4, 3, 4],
                backgroundColor: 'rgba(255, 209, 102, 0.5)',
                borderColor: 'rgba(255, 209, 102, 1)',
                borderWidth: 2,
                tension: 0.4
            }
        ]
    };
    
    // Update dashboard stats
    document.getElementById('dashTotalLogs').textContent = '92';
    document.getElementById('dashAnomalies').textContent = '27';
    document.getElementById('dashCritical').textContent = '3';
    document.getElementById('dashHealthScore').textContent = '85%';
    
    // Create/update anomaly distribution chart
    const anomalyChartEl = document.getElementById('dashboardAnomalyChart');
    if (anomalyChartEl) {
        const anomalyChart = new Chart(anomalyChartEl, {
            type: 'doughnut',
            data: anomalyData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: 'Anomaly Distribution by Severity',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
    
    // Create/update severity trend chart
    const severityChartEl = document.getElementById('dashboardSeverityChart');
    if (severityChartEl) {
        const severityChart = new Chart(severityChartEl, {
            type: 'line',
            data: severityData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Anomaly Severity Trend (Last 7 Days)',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        },
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Day'
                        }
                    }
                }
            }
        });
    }
} 