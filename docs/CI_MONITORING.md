# CI Monitoring and Alerting

This document describes the CI monitoring and alerting system implemented for the Bitcoin Price Tag project.

## Overview

The CI monitoring system provides comprehensive pipeline health tracking with three layers:

1. **Core Monitoring**: Always-on GitHub-native monitoring (no configuration required)
2. **External Notifications**: Optional integrations for enhanced alerting
3. **Health Dashboard**: Simple web dashboard for pipeline visibility

## Features

### ✅ Core Monitoring (Always Active)

- **Enhanced Failure Analysis**: Detailed context for each failure type
- **Health Scoring**: Numerical pipeline health assessment (0-100%)
- **Performance Tracking**: Job timing and optimization metrics
- **Contextual Guidance**: Specific troubleshooting steps for each failure
- **Smart Optimization Reports**: Cache hits, job skipping, performance gains

### 🔔 External Notifications (Optional)

Enable by configuring repository variables:

- **Slack Integration**: Rich notifications with pipeline context
- **Discord Integration**: Embedded status updates with metrics
- **Microsoft Teams**: Professional pipeline status reports
- **GitHub Issues**: Automatic failure tracking issues
- **Performance Metrics**: Structured data collection for monitoring tools

### 📊 Health Dashboard (Optional)

- **Real-time Metrics**: Success rate, health score, average duration
- **Recent Activity**: Last 10 pipeline runs with status
- **Trend Analysis**: 7-day success rate and failure patterns
- **Performance Insights**: Duration trends and optimization impact

## Setup Instructions

### Core Monitoring

✅ **No setup required** - automatically active with enhanced CI pipeline.

### External Notifications

Configure any combination of these repository variables in GitHub Settings > Variables:

#### Slack Notifications
```
SLACK_WEBHOOK_URL = https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

#### Discord Notifications
```
DISCORD_WEBHOOK_URL = https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK
```

#### Microsoft Teams Notifications
```
TEAMS_WEBHOOK_URL = https://your-org.webhook.office.com/YOUR/TEAMS/WEBHOOK
```

#### Automatic Issue Creation
```
AUTO_CREATE_ISSUES = true
```

### Health Dashboard

1. **Enable GitHub Pages** in repository settings
2. **Set source** to `/.github/pages/`
3. **Access dashboard** at: `https://[username].github.io/[repository]/ci-dashboard.html`

Or view the dashboard locally by opening `.github/pages/ci-dashboard.html` in a browser.

## Monitoring Features

### Health Analysis

The system calculates a health score based on:
- Recent success rate (last 20 runs)
- Time since last failure
- Pipeline performance trends
- Optimization effectiveness

**Health Score Ranges:**
- 80-100%: 🟢 Excellent health
- 60-79%: 🟡 Good with some issues
- 0-59%: 🔴 Needs attention

### Failure Analysis

When pipelines fail, the system provides:

1. **Immediate Context**: Which components failed and why
2. **Troubleshooting Commands**: Exact commands to run locally
3. **Resource Links**: Documentation and guides
4. **Performance Impact**: How failures affect optimization

### Performance Monitoring

Tracks and reports:
- Pipeline duration trends
- Cache hit rates and effectiveness  
- Job skipping optimization impact
- Resource usage patterns

## Example Outputs

### Success Notification
```
🎉 CI PIPELINE SUCCESS
• Health Score: 95%
• Successful Jobs: 4
• Optimized Jobs: 1
⚡ Performance: 2 jobs skipped, ~30s saved
```

### Failure Analysis
```
🚨 CI FAILURE DETECTED
• Failed Jobs: 1 (test)
• Health Score: 75%
🔧 Troubleshooting:
  • Test Failure: Run 'pnpm run test' locally
  • Check test output for specific failures
  • Verify test environment and mocks
```

## Integration Examples

### Slack Setup
1. Create a Slack webhook in your workspace
2. Add `SLACK_WEBHOOK_URL` variable in GitHub repository settings
3. Notifications will appear in the configured channel

### Dashboard Access
1. Enable GitHub Pages for the repository
2. Visit: `https://[username].github.io/[repository]/ci-dashboard.html`
3. View real-time pipeline health and history

## Troubleshooting

### Common Issues

**Notifications not working:**
- Verify webhook URLs are correct
- Check repository variables are set (not secrets)
- Ensure webhook services are accessible

**Dashboard not loading:**
- Verify GitHub Pages is enabled
- Check if repository is public (required for GitHub Pages)
- Ensure API rate limits aren't exceeded

**Health scores seem incorrect:**
- Health calculation includes recent runs only (last 20)
- Recent failures heavily impact score
- Check if calculation logic matches your expectations

### Manual Testing

Test notification integrations:
```bash
# Trigger a test failure to verify alerting
git commit --allow-empty -m "test: trigger CI for notification testing"
git push
```

## Advanced Configuration

### Custom Metrics Collection

The system outputs structured performance data that can be ingested by:
- DataDog, New Relic, Grafana Cloud
- Custom monitoring endpoints
- Time series databases
- Analytics platforms

See `.github/workflows/ci-notifications.yml` for metric format details.

### Retry Logic

The monitoring system analyzes failures for transient issues but doesn't automatically retry to avoid infinite loops. Manual re-run is available via GitHub Actions UI.

Future enhancement: Implement smart retry for known transient patterns.

## Contributing

To enhance the monitoring system:

1. **Core Features**: Modify `.github/workflows/ci.yml`
2. **External Integrations**: Update `.github/workflows/ci-notifications.yml`
3. **Dashboard**: Edit `.github/pages/ci-dashboard.html`

Follow the progressive enhancement pattern: ensure core functionality always works, with optional enhancements that gracefully degrade when unavailable.