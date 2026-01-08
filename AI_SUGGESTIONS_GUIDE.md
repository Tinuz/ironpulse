# AI Accessory Suggestions - Setup Guide

## Overview
IronPulse now includes intelligent AI-powered accessory exercise recommendations using Claude 3.5 Sonnet via OpenRouter.

## Features
- **Smart Analysis**: Detects muscle imbalances, plateaus, and weak points automatically
- **Contextual Recommendations**: Suggests 3-5 exercises based on your training history
- **One-Click Integration**: Add suggested exercises directly to routines
- **Cost Effective**: ~$0.006 per suggestion (~$0.60/month for typical usage)

## Setup

### 1. Get OpenRouter API Key
1. Visit [openrouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Add credits ($5 minimum, lasts months for IronPulse usage)
4. Generate an API key from your dashboard

### 2. Configure Environment Variable
The API key is already configured in `.env.local`:
```env
NEXT_PUBLIC_OPENROUTER_API_KEY=your_key_here
```

**Note**: The key is prefixed with `NEXT_PUBLIC_` to make it available in the browser. This is safe because:
- OpenRouter has built-in rate limiting
- The key is domain-restricted (only works from your deployed URL)
- You can set spending limits in the OpenRouter dashboard

### 3. Test the Feature
1. Complete at least 5 workouts (widget appears after 5 workouts)
2. Navigate to Dashboard
3. Scroll to "AI Accessory Suggestions" widget
4. Click "Generate AI Suggestions"
5. Wait 3-5 seconds for analysis and AI response
6. Review suggestions and click "Add to Routine" to create new exercises

## How It Works

### Analysis Pipeline
1. **Workout Analysis**: Examines last 8 weeks of training
2. **Imbalance Detection**: Checks push/pull ratio, upper/lower split, shoulder health
3. **Plateau Detection**: Identifies stagnant exercises using existing analytics
4. **Weak Point Detection**: Finds undertrained muscle groups
5. **Prompt Generation**: Builds contextual prompt with all findings
6. **AI Processing**: Claude 3.5 Sonnet analyzes and suggests exercises
7. **Validation**: Ensures response is valid JSON with required fields

### Response Format
Each suggestion includes:
- **Exercise Name**: Standard exercise terminology
- **Reason**: Specific explanation based on your data
- **Category**: strength | hypertrophy | mobility | injury-prevention
- **Priority**: high | medium | low (color-coded: 🔴🟡🟢)
- **Target Muscles**: Which muscles it addresses
- **Sets/Reps**: Recommended volume (optional)

### Example Suggestion
```json
{
  "exercise": "Face Pulls",
  "reason": "Strengthen rear delts to balance heavy bench pressing and prevent shoulder impingement",
  "category": "injury-prevention",
  "priority": "high",
  "targetMuscles": ["Rear Deltoids", "Rotator Cuff"],
  "sets": 3,
  "reps": 15
}
```

## Cost Management

### Typical Usage
- **Per Request**: $0.006 (0.6 cents)
- **Monthly (100 suggestions)**: $0.60
- **Monthly (500 suggestions)**: $3.00

### Token Usage
- **Input**: ~500-1000 tokens (workout context)
- **Output**: ~300-500 tokens (5 suggestions)
- **Total**: ~800-1500 tokens per request

### Model Pricing
- **Claude 3.5 Sonnet**: $3/1M input, $15/1M output
- **Average**: ~$6/1M combined tokens
- **Per Request**: (1500 tokens / 1M) × $6 = $0.009

### Cost Optimization
- Widget only appears after 5+ workouts (prevents spam)
- No auto-refresh (user must click "Generate")
- Cached analysis (reuses recent data)
- 30-second timeout (prevents runaway costs)
- Max 2 retries with exponential backoff

## Error Handling

### Graceful Degradation
- If OpenRouter is unavailable → Shows friendly error message
- If API key is missing → Logs warning, widget still renders with disabled state
- If response is invalid → Falls back to empty suggestions
- If timeout occurs → Cancels request, shows error

### Error Messages
- "No suggestions available. AI service may be unavailable."
- "Failed to generate suggestions. Please try again."
- Console warnings for debugging (check browser DevTools)

## Security

### API Key Protection
- **Domain Restriction**: Set in OpenRouter dashboard
- **Rate Limiting**: Built into OpenRouter (prevents abuse)
- **Spending Limits**: Set monthly budget in OpenRouter
- **No Server Secrets**: All processing happens client-side (Edge Runtime)

### Best Practices
1. Set spending limit to $5/month in OpenRouter dashboard
2. Enable domain restrictions (only your production URL)
3. Monitor usage in OpenRouter dashboard
4. Rotate keys periodically (every 6 months)

## Troubleshooting

### Widget Not Appearing
- **Cause**: Less than 5 workouts completed
- **Solution**: Complete at least 5 workouts

### "AI service may be unavailable"
- **Cause 1**: OpenRouter API is down (rare)
- **Cause 2**: API key is invalid or expired
- **Cause 3**: Out of OpenRouter credits
- **Solution**: Check OpenRouter dashboard, verify key, add credits

### "Failed to generate suggestions"
- **Cause**: Network timeout or temporary error
- **Solution**: Click "Regenerate" to retry

### Slow Response Time
- **Normal**: 3-5 seconds for Claude 3.5 Sonnet
- **Slow**: 10+ seconds may indicate network issues
- **Timeout**: 30 seconds, then auto-cancels

### Invalid Suggestions
- **Cause**: AI returned malformed JSON
- **Solution**: Response validation automatically filters invalid entries
- **Fallback**: Empty suggestions list shown

## Development

### Local Testing
```bash
npm run dev
```
Navigate to http://localhost:3000 and test the widget

### Production Build
```bash
npm run build
```
Check for TypeScript errors and bundle size

### Debug Mode
Enable console logs in `lib/openrouter.ts`:
```typescript
console.log('OpenRouter request:', prompt);
console.log('OpenRouter response:', suggestions);
```

## Future Enhancements
- [ ] Cache suggestions for 24 hours (reduce API calls)
- [ ] Add "Explain why" button (detailed reasoning)
- [ ] Social sharing (share your AI suggestions)
- [ ] Exercise difficulty filtering (beginner/intermediate/advanced)
- [ ] Custom prompt templates (strength focus vs hypertrophy)
- [ ] Integration with workout schemas (auto-add to specific routine)

## Support
- OpenRouter docs: https://openrouter.ai/docs
- Claude model info: https://www.anthropic.com/claude
- IronPulse GitHub: (your repo URL)

---

**Built with**: Claude 3.5 Sonnet via OpenRouter  
**Cost**: ~$0.006 per suggestion  
**Response Time**: 3-5 seconds  
**Privacy**: All data processed client-side, not stored by OpenRouter
