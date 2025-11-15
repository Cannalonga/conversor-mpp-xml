# Marketing Performance Analytics & Tracking Setup - ConversorMPP.com

## 📊 **Analytics Infrastructure Overview**

### Core Tracking Requirements

1. **Google Analytics 4 (GA4) Setup**
2. **Google Ads Conversion Tracking**  
3. **LinkedIn Insight Tag**
4. **Facebook Pixel**
5. **Mercado Pago Analytics Integration**
6. **Customer Journey Analytics**
7. **Attribution Modeling**
8. **Performance Dashboards**

---

## 🎯 **Key Performance Indicators (KPIs) Framework**

### Primary Business Metrics

#### Revenue & Financial KPIs
```javascript
// Revenue Tracking
const revenueKPIs = {
  monthly_recurring_revenue: {
    target: "R$ 50,000/month by Q4 2024",
    current: "R$ 0",
    calculation: "conversions × R$ 10 average"
  },
  
  customer_acquisition_cost: {
    target: "< R$ 15 per customer",
    current: "TBD",
    calculation: "ad_spend ÷ conversions"
  },
  
  customer_lifetime_value: {
    target: "> R$ 45 per customer",
    current: "R$ 10 (single transaction)",
    calculation: "avg_order_value × repeat_rate × retention_period"
  },
  
  return_on_ad_spend: {
    target: "> 300% ROAS",
    current: "TBD",
    calculation: "revenue ÷ ad_spend × 100"
  },
  
  payback_period: {
    target: "< 1.5 months",
    current: "TBD", 
    calculation: "CAC ÷ monthly_revenue_per_customer"
  }
};
```

#### Conversion Funnel KPIs
```javascript
// Conversion Tracking
const conversionKPIs = {
  landing_page_conversion: {
    target: "> 3.5%",
    current: "TBD",
    calculation: "file_uploads ÷ visitors × 100"
  },
  
  payment_conversion: {
    target: "> 85%", 
    current: "TBD",
    calculation: "completed_payments ÷ file_uploads × 100"
  },
  
  overall_conversion: {
    target: "> 2.8%",
    current: "TBD", 
    calculation: "completed_payments ÷ visitors × 100"
  }
};
```

#### Traffic & Engagement KPIs
```javascript
// Traffic Quality Metrics
const trafficKPIs = {
  organic_traffic_growth: {
    target: "+25% month-over-month",
    current: "TBD",
    measurement: "monthly_organic_visitors"
  },
  
  average_session_duration: {
    target: "> 2.5 minutes",
    current: "TBD", 
    measurement: "time_on_site_seconds"
  },
  
  bounce_rate: {
    target: "< 45%",
    current: "TBD",
    measurement: "single_page_sessions ÷ total_sessions"
  },
  
  page_load_speed: {
    target: "< 3 seconds",
    current: "TBD",
    measurement: "core_web_vitals_LCP"
  }
};
```

### Platform-Specific KPIs

#### Google Ads Performance
```javascript
const googleAdsKPIs = {
  search_campaigns: {
    ctr: { target: "> 3.5%", weight: 0.2 },
    cpc: { target: "< R$ 2.50", weight: 0.3 },
    conversion_rate: { target: "> 4%", weight: 0.3 },
    quality_score: { target: "> 7/10", weight: 0.2 }
  },
  
  display_campaigns: {
    ctr: { target: "> 0.8%", weight: 0.2 },
    cpm: { target: "< R$ 15", weight: 0.3 },
    conversion_rate: { target: "> 1.5%", weight: 0.3 },
    viewability: { target: "> 80%", weight: 0.2 }
  },
  
  youtube_campaigns: {
    view_rate: { target: "> 25%", weight: 0.3 },
    cpv: { target: "< R$ 0.30", weight: 0.3 },
    engagement_rate: { target: "> 2%", weight: 0.2 },
    conversion_rate: { target: "> 1.2%", weight: 0.2 }
  }
};
```

#### LinkedIn Ads Performance
```javascript
const linkedinKPIs = {
  sponsored_content: {
    ctr: { target: "> 1.5%", weight: 0.25 },
    cpc: { target: "< R$ 8", weight: 0.25 },
    conversion_rate: { target: "> 3%", weight: 0.35 },
    engagement_rate: { target: "> 4%", weight: 0.15 }
  },
  
  message_ads: {
    open_rate: { target: "> 55%", weight: 0.3 },
    response_rate: { target: "> 15%", weight: 0.4 },
    conversion_rate: { target: "> 8%", weight: 0.3 }
  },
  
  text_ads: {
    ctr: { target: "> 0.8%", weight: 0.3 },
    cpc: { target: "< R$ 12", weight: 0.4 },
    conversion_rate: { target: "> 2.5%", weight: 0.3 }
  }
};
```

---

## 🔧 **Analytics Implementation Code**

### Google Analytics 4 Setup

```html
<!-- GA4 Global Site Tag -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-XXXXXXXXXX', {
    // Enhanced ecommerce settings
    send_page_view: true,
    custom_map: {
      'custom_parameter_1': 'file_type',
      'custom_parameter_2': 'conversion_source',
      'custom_parameter_3': 'user_segment'
    }
  });
</script>
```

### Enhanced Ecommerce Tracking

```javascript
// File Upload Event
function trackFileUpload(fileName, fileSize) {
  gtag('event', 'file_upload_started', {
    'event_category': 'conversion_funnel',
    'file_name': fileName,
    'file_size': fileSize,
    'timestamp': new Date().toISOString(),
    'user_segment': identifyUserSegment(),
    'traffic_source': getTrafficSource()
  });
}

// Payment Initiated Event  
function trackPaymentInitiated(amount, paymentMethod) {
  gtag('event', 'begin_checkout', {
    'currency': 'BRL',
    'value': amount,
    'payment_method': paymentMethod,
    'items': [{
      'item_id': 'mpp_conversion',
      'item_name': 'MPP to XML Conversion',
      'category': 'file_conversion',
      'quantity': 1,
      'price': amount
    }]
  });
}

// Successful Conversion Event
function trackConversionComplete(transactionId, amount, paymentMethod) {
  // GA4 Purchase Event
  gtag('event', 'purchase', {
    'transaction_id': transactionId,
    'currency': 'BRL', 
    'value': amount,
    'payment_method': paymentMethod,
    'items': [{
      'item_id': 'mpp_conversion',
      'item_name': 'MPP to XML Conversion',
      'category': 'file_conversion',
      'quantity': 1,
      'price': amount
    }]
  });
  
  // Custom Conversion Event for detailed tracking
  gtag('event', 'conversion_completed', {
    'event_category': 'business_goal',
    'transaction_id': transactionId,
    'payment_method': paymentMethod,
    'processing_time': getProcessingTime(),
    'file_size_mb': getFileSize(),
    'user_segment': identifyUserSegment(),
    'acquisition_source': getAcquisitionSource()
  });
}
```

### Google Ads Conversion Tracking

```javascript
// Google Ads Conversion Code
function trackGoogleAdsConversion(conversionValue) {
  gtag('event', 'conversion', {
    'send_to': 'AW-XXXXXXXXXX/YYYYYYYYYYY',
    'value': conversionValue,
    'currency': 'BRL',
    'transaction_id': generateTransactionId()
  });
}

// Enhanced Conversion Tracking
function setupEnhancedConversions() {
  gtag('config', 'AW-XXXXXXXXXX', {
    'enhanced_conversions': true,
    'user_data': {
      'email_address': getUserEmail(),
      'phone_number': getUserPhone(),
      'address': {
        'first_name': getUserFirstName(),
        'last_name': getUserLastName(),
        'country': 'BR',
        'postal_code': getUserPostalCode()
      }
    }
  });
}
```

### LinkedIn Insight Tag Setup

```html
<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
_linkedin_partner_id = "XXXXXXX";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script>
<script type="text/javascript">
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);
</script>

<!-- LinkedIn Conversion Tracking -->
<script>
function trackLinkedInConversion(conversionId) {
  lintrk('track', { conversion_id: conversionId });
}
</script>
```

### Facebook Pixel Setup

```html
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'XXXXXXXXXXXXXXXXX');
fbq('track', 'PageView');
</script>

<!-- Facebook Conversion Events -->
<script>
function trackFacebookPurchase(value, currency = 'BRL') {
  fbq('track', 'Purchase', {
    value: value,
    currency: currency,
    content_name: 'MPP to XML Conversion',
    content_category: 'file_conversion'
  });
}

function trackFacebookLead() {
  fbq('track', 'Lead', {
    content_name: 'File Upload Started',
    content_category: 'conversion_funnel'
  });
}
</script>
```

---

## 📈 **Custom Dashboard Implementation**

### Real-Time Performance Dashboard (HTML/JavaScript)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>ConversorMPP - Marketing Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .dashboard-container { max-width: 1200px; margin: 0 auto; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2.5em; font-weight: bold; color: #2563eb; }
        .metric-label { font-size: 0.9em; color: #6b7280; text-transform: uppercase; }
        .metric-change { font-size: 0.8em; margin-top: 5px; }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        .chart-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <h1>ConversorMPP Marketing Performance Dashboard</h1>
        
        <!-- Key Metrics Cards -->
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Revenue Today</div>
                <div class="metric-value" id="revenue-today">R$ 0</div>
                <div class="metric-change positive" id="revenue-change">+0% vs yesterday</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Conversions Today</div>
                <div class="metric-value" id="conversions-today">0</div>
                <div class="metric-change" id="conversions-change">+0% vs yesterday</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">CAC</div>
                <div class="metric-value" id="cac-value">R$ 0</div>
                <div class="metric-change" id="cac-change">+0% vs last week</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">ROAS</div>
                <div class="metric-value" id="roas-value">0%</div>
                <div class="metric-change" id="roas-change">+0% vs last week</div>
            </div>
        </div>
        
        <!-- Conversion Funnel Chart -->
        <div class="chart-container">
            <h3>Conversion Funnel</h3>
            <canvas id="funnel-chart"></canvas>
        </div>
        
        <!-- Traffic Sources Chart -->
        <div class="chart-container">
            <h3>Traffic Sources Performance</h3>
            <canvas id="sources-chart"></canvas>
        </div>
        
        <!-- Daily Revenue Trend -->
        <div class="chart-container">
            <h3>Revenue Trend (Last 30 Days)</h3>
            <canvas id="revenue-chart"></canvas>
        </div>
    </div>

    <script>
        // Dashboard Data Management
        class MarketingDashboard {
            constructor() {
                this.initializeCharts();
                this.updateMetrics();
                setInterval(() => this.updateMetrics(), 300000); // Update every 5 minutes
            }
            
            async updateMetrics() {
                try {
                    const data = await this.fetchAnalyticsData();
                    this.updateMetricCards(data);
                    this.updateCharts(data);
                } catch (error) {
                    console.error('Error updating dashboard:', error);
                }
            }
            
            async fetchAnalyticsData() {
                // Integration with Google Analytics API, Mercado Pago API, etc.
                const response = await fetch('/api/dashboard-data');
                return await response.json();
            }
            
            updateMetricCards(data) {
                document.getElementById('revenue-today').textContent = `R$ ${data.revenueToday.toLocaleString()}`;
                document.getElementById('conversions-today').textContent = data.conversionsToday;
                document.getElementById('cac-value').textContent = `R$ ${data.cac.toFixed(2)}`;
                document.getElementById('roas-value').textContent = `${(data.roas * 100).toFixed(0)}%`;
                
                // Update change indicators
                this.updateChangeIndicator('revenue-change', data.revenueChange);
                this.updateChangeIndicator('conversions-change', data.conversionsChange);
                this.updateChangeIndicator('cac-change', data.cacChange);
                this.updateChangeIndicator('roas-change', data.roasChange);
            }
            
            updateChangeIndicator(elementId, change) {
                const element = document.getElementById(elementId);
                const sign = change >= 0 ? '+' : '';
                element.textContent = `${sign}${(change * 100).toFixed(1)}% vs previous period`;
                element.className = `metric-change ${change >= 0 ? 'positive' : 'negative'}`;
            }
            
            initializeCharts() {
                // Conversion Funnel Chart
                const funnelCtx = document.getElementById('funnel-chart').getContext('2d');
                this.funnelChart = new Chart(funnelCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Visitors', 'File Uploads', 'Payment Started', 'Conversion Complete'],
                        datasets: [{
                            label: 'Conversion Funnel',
                            data: [1000, 35, 30, 28],
                            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });
                
                // Traffic Sources Chart
                const sourcesCtx = document.getElementById('sources-chart').getContext('2d');
                this.sourcesChart = new Chart(sourcesCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Google Ads', 'LinkedIn Ads', 'Organic Search', 'Direct', 'Referral'],
                        datasets: [{
                            data: [45, 25, 15, 10, 5],
                            backgroundColor: ['#dc2626', '#0077b5', '#16a34a', '#7c3aed', '#ea580c']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
                
                // Revenue Trend Chart
                const revenueCtx = document.getElementById('revenue-chart').getContext('2d');
                this.revenueChart = new Chart(revenueCtx, {
                    type: 'line',
                    data: {
                        labels: [], // Will be populated with dates
                        datasets: [{
                            label: 'Daily Revenue (R$)',
                            data: [],
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });
            }
            
            updateCharts(data) {
                // Update funnel chart
                this.funnelChart.data.datasets[0].data = [
                    data.visitors,
                    data.fileUploads,
                    data.paymentStarted,
                    data.conversions
                ];
                this.funnelChart.update();
                
                // Update sources chart
                this.sourcesChart.data.datasets[0].data = [
                    data.trafficSources.googleAds,
                    data.trafficSources.linkedinAds,
                    data.trafficSources.organic,
                    data.trafficSources.direct,
                    data.trafficSources.referral
                ];
                this.sourcesChart.update();
                
                // Update revenue chart
                this.revenueChart.data.labels = data.revenueTrend.dates;
                this.revenueChart.data.datasets[0].data = data.revenueTrend.values;
                this.revenueChart.update();
            }
        }
        
        // Initialize dashboard when page loads
        document.addEventListener('DOMContentLoaded', function() {
            new MarketingDashboard();
        });
    </script>
</body>
</html>
```

---

## 🔄 **Attribution Modeling Setup**

### Multi-Touch Attribution Implementation

```javascript
// Advanced Attribution Tracking
class AttributionTracker {
    constructor() {
        this.touchpoints = [];
        this.sessionStart = Date.now();
        this.initializeTracking();
    }
    
    // Track user touchpoints throughout their journey
    trackTouchpoint(source, medium, campaign, content) {
        const touchpoint = {
            timestamp: Date.now(),
            source: source,
            medium: medium,
            campaign: campaign,
            content: content,
            page: window.location.pathname,
            sessionId: this.getSessionId(),
            userId: this.getUserId()
        };
        
        this.touchpoints.push(touchpoint);
        this.saveTouchpoints();
        
        // Send to analytics
        gtag('event', 'attribution_touchpoint', {
            'touchpoint_source': source,
            'touchpoint_medium': medium,
            'touchpoint_campaign': campaign,
            'touchpoint_order': this.touchpoints.length,
            'session_duration': Date.now() - this.sessionStart
        });
    }
    
    // Calculate attribution weights
    calculateAttribution(conversionValue) {
        if (this.touchpoints.length === 0) return {};
        
        const attribution = {};
        
        // Time-decay model: recent touchpoints get more credit
        const decayFactor = 0.7;
        let totalWeight = 0;
        
        this.touchpoints.forEach((touchpoint, index) => {
            const position = this.touchpoints.length - index - 1; // 0 = most recent
            const weight = Math.pow(decayFactor, position);
            const key = `${touchpoint.source}_${touchpoint.medium}_${touchpoint.campaign}`;
            
            attribution[key] = (attribution[key] || 0) + weight;
            totalWeight += weight;
        });
        
        // Normalize weights and calculate attributed value
        Object.keys(attribution).forEach(key => {
            attribution[key] = (attribution[key] / totalWeight) * conversionValue;
        });
        
        return attribution;
    }
    
    // Send attribution data on conversion
    sendAttributionData(transactionId, conversionValue) {
        const attribution = this.calculateAttribution(conversionValue);
        
        gtag('event', 'conversion_attribution', {
            'transaction_id': transactionId,
            'conversion_value': conversionValue,
            'attribution_data': JSON.stringify(attribution),
            'touchpoint_count': this.touchpoints.length,
            'journey_duration': Date.now() - this.sessionStart
        });
        
        // Send to backend for advanced analysis
        fetch('/api/attribution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transactionId: transactionId,
                conversionValue: conversionValue,
                attribution: attribution,
                touchpoints: this.touchpoints,
                journeyDuration: Date.now() - this.sessionStart
            })
        });
    }
    
    getSessionId() {
        return sessionStorage.getItem('sessionId') || this.generateSessionId();
    }
    
    getUserId() {
        return localStorage.getItem('userId') || this.generateUserId();
    }
    
    saveTouchpoints() {
        sessionStorage.setItem('touchpoints', JSON.stringify(this.touchpoints));
    }
    
    initializeTracking() {
        // Track initial page load
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('utm_source') || 'direct';
        const medium = urlParams.get('utm_medium') || 'none';
        const campaign = urlParams.get('utm_campaign') || 'none';
        const content = urlParams.get('utm_content') || 'none';
        
        this.trackTouchpoint(source, medium, campaign, content);
        
        // Track page changes for SPAs
        if ('history' in window) {
            const originalPushState = history.pushState;
            history.pushState = function() {
                originalPushState.apply(history, arguments);
                // Track page change as new touchpoint if different campaign
                window.attributionTracker.trackPageChange();
            };
        }
    }
}

// Initialize attribution tracking
window.attributionTracker = new AttributionTracker();
```

---

## 📱 **Automated Reporting Setup**

### Daily Performance Email Report

```javascript
// Automated Daily Report Generation
class PerformanceReporter {
    constructor() {
        this.setupDailyReport();
    }
    
    async setupDailyReport() {
        // Schedule daily report at 9 AM
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(9, 0, 0, 0);
        
        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        const timeUntilReport = scheduledTime.getTime() - now.getTime();
        setTimeout(() => {
            this.generateDailyReport();
            setInterval(() => this.generateDailyReport(), 24 * 60 * 60 * 1000);
        }, timeUntilReport);
    }
    
    async generateDailyReport() {
        try {
            const data = await this.collectPerformanceData();
            const report = this.formatReport(data);
            await this.sendReport(report);
        } catch (error) {
            console.error('Error generating daily report:', error);
            await this.sendErrorAlert(error);
        }
    }
    
    async collectPerformanceData() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Collect data from multiple sources
        const [gaData, adsData, linkedinData, revenueData] = await Promise.all([
            this.getGAData(yesterday),
            this.getGoogleAdsData(yesterday),
            this.getLinkedInData(yesterday),
            this.getRevenueData(yesterday)
        ]);
        
        return {
            date: yesterday.toISOString().split('T')[0],
            traffic: gaData,
            googleAds: adsData,
            linkedinAds: linkedinData,
            revenue: revenueData,
            summary: this.calculateSummary(gaData, adsData, linkedinData, revenueData)
        };
    }
    
    formatReport(data) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .metric-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .metric-label { font-weight: bold; }
        .metric-value { color: #2563eb; }
        .section { margin: 20px 0; }
        .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 10px 0; }
        .success { background: #f0f9ff; border-left: 4px solid #10b981; padding: 15px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ConversorMPP Daily Performance Report</h1>
        <p>${data.date}</p>
    </div>
    
    <div class="section">
        <h2>📊 Key Metrics Summary</h2>
        <div class="metric-row">
            <span class="metric-label">Total Revenue:</span>
            <span class="metric-value">R$ ${data.revenue.total.toFixed(2)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Conversions:</span>
            <span class="metric-value">${data.revenue.conversions}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Visitors:</span>
            <span class="metric-value">${data.traffic.users}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Conversion Rate:</span>
            <span class="metric-value">${((data.revenue.conversions / data.traffic.users) * 100).toFixed(2)}%</span>
        </div>
    </div>
    
    <div class="section">
        <h2>💰 Google Ads Performance</h2>
        <div class="metric-row">
            <span class="metric-label">Spend:</span>
            <span class="metric-value">R$ ${data.googleAds.cost.toFixed(2)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Clicks:</span>
            <span class="metric-value">${data.googleAds.clicks}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">CTR:</span>
            <span class="metric-value">${(data.googleAds.ctr * 100).toFixed(2)}%</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">ROAS:</span>
            <span class="metric-value">${((data.revenue.total / data.googleAds.cost) * 100).toFixed(0)}%</span>
        </div>
    </div>
    
    <div class="section">
        <h2>💼 LinkedIn Ads Performance</h2>
        <div class="metric-row">
            <span class="metric-label">Spend:</span>
            <span class="metric-value">R$ ${data.linkedinAds.cost.toFixed(2)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Impressions:</span>
            <span class="metric-value">${data.linkedinAds.impressions.toLocaleString()}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">CTR:</span>
            <span class="metric-value">${(data.linkedinAds.ctr * 100).toFixed(2)}%</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Lead Generation:</span>
            <span class="metric-value">${data.linkedinAds.leads}</span>
        </div>
    </div>
    
    ${this.generateAlerts(data)}
    
    <div class="section">
        <h2>🎯 Recommendations</h2>
        ${this.generateRecommendations(data)}
    </div>
</body>
</html>
        `;
    }
    
    generateAlerts(data) {
        const alerts = [];
        
        // Performance alerts
        if (data.summary.roas < 250) {
            alerts.push(`<div class="alert">⚠️ ROAS below target: ${data.summary.roas}% (Target: 300%)</div>`);
        }
        
        if (data.summary.conversionRate < 2.0) {
            alerts.push(`<div class="alert">⚠️ Low conversion rate: ${data.summary.conversionRate}% (Target: 2.8%)</div>`);
        }
        
        if (data.revenue.total === 0) {
            alerts.push(`<div class="alert">🚨 No revenue generated yesterday</div>`);
        }
        
        // Success alerts
        if (data.summary.roas > 400) {
            alerts.push(`<div class="success">🎉 Excellent ROAS performance: ${data.summary.roas}%</div>`);
        }
        
        return alerts.length > 0 ? `
            <div class="section">
                <h2>🚨 Alerts</h2>
                ${alerts.join('')}
            </div>
        ` : '';
    }
    
    generateRecommendations(data) {
        const recommendations = [];
        
        if (data.summary.roas < 300) {
            recommendations.push('• Consider pausing low-performing keywords and reallocating budget to top performers');
            recommendations.push('• Review landing page conversion optimization opportunities');
        }
        
        if (data.googleAds.ctr < 0.03) {
            recommendations.push('• Test new ad copy variations to improve CTR');
            recommendations.push('• Review keyword relevance and match types');
        }
        
        if (data.linkedinAds.leads > 0 && data.linkedinAds.conversions === 0) {
            recommendations.push('• Follow up on LinkedIn leads - check email nurture sequence');
        }
        
        return recommendations.map(rec => `<p>${rec}</p>`).join('');
    }
    
    async sendReport(reportHtml) {
        await fetch('/api/send-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: ['marketing@conversor.com', 'ceo@conversor.com'],
                subject: `ConversorMPP Daily Report - ${new Date().toISOString().split('T')[0]}`,
                html: reportHtml
            })
        });
    }
}

// Initialize performance reporter
new PerformanceReporter();
```

This comprehensive analytics and tracking setup provides enterprise-grade performance monitoring, attribution modeling, and automated reporting capabilities that will enable data-driven optimization of all marketing campaigns and business performance.