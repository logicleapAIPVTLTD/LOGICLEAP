# Render Environment Variables Setup

## How to Add Environment Variables in Render

### Method 1: Via Render Dashboard (Recommended)

1. **Login to [Render Dashboard](https://dashboard.render.com)**

2. **Select your service** (msme-backend)

3. **Go to Settings tab**

4. **Scroll to "Environment"** section

5. **Click "Add Environment Variable"** for each variable:

```
GEMINI_API_KEY = AIzaSyDuOnFahA9RvScwL0gTtga9K8tA0acdTio
GEMINI_MODEL_NAME = gemini-2.5-flash
AWS_REGION = ap-south-2
AWS_ACCESS_KEY_ID = AKIAYH3VJY2ZUOPIZ27O
AWS_SECRET_ACCESS_KEY = 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
NODE_ENV = production
PORT = 10000
PYTHON_PATH = python3
```

6. **Click Save** after adding all variables

7. **Service will auto-redeploy** with new environment variables

### Method 2: Using render.yaml (Alternative)

Update [render.yaml](../render.yaml):

```yaml
services:
  - type: web
    name: msme-backend
    env: docker
    rootDir: backend
    dockerfilePath: ./Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: PYTHON_PATH
        value: python3
      - key: GEMINI_API_KEY
        fromDatabase: false
      - key: GEMINI_MODEL_NAME
        value: gemini-2.5-flash
      - key: AWS_REGION
        value: ap-south-2
      - key: AWS_ACCESS_KEY_ID
        fromDatabase: false
      - key: AWS_SECRET_ACCESS_KEY
        fromDatabase: false
```

## Environment Variables Explained

| Variable | Purpose | Required? | Example |
|----------|---------|-----------|---------|
| **GEMINI_API_KEY** | Google API key for vision processing | ✅ Yes | AIzaSyDu... |
| **GEMINI_MODEL_NAME** | Gemini model version | ✅ Yes | gemini-2.5-flash |
| **AWS_REGION** | AWS region for DynamoDB | ✅ Yes | ap-south-2 |
| **AWS_ACCESS_KEY_ID** | AWS access key | ✅ Yes | AKIAYX... |
| **AWS_SECRET_ACCESS_KEY** | AWS secret key | ✅ Yes | bj/52jj... |
| **NODE_ENV** | Environment type | ✅ Yes | production |
| **PORT** | Server port | ✅ Yes | 10000 |
| **PYTHON_PATH** | Python executable path | ✅ Yes | python3 |

## Verification After Setup

### 1. Check Deployment Logs
In Render Dashboard → Logs tab:
- Look for: `✅ Gemini client initialized successfully`
- This confirms the API key is working

### 2. Test Health Endpoint
```bash
curl https://your-service.onrender.com/health
```

Expected response:
```json
{
    "status": "success",
    "message": "BOM Prediction API is running",
    "timestamp": "2026-01-15T..."
}
```

### 3. Test Image Upload
```bash
curl -X POST https://your-service.onrender.com/api/boq/process-file \
  -F "file=@sample.jpg" \
  -F "project_name=Test Project" \
  -F "location=Mumbai" \
  -F "project_type=Interior"
```

Expected responses:
- ✅ **Success** (200): Returns BOQ data with `"success": true`
- ❌ **API Key Error** (500): `"error": "Vision processing not available: Google GenAI library not installed..."`

## Security Best Practices

### ⚠️ DO NOT:
- Commit `.env` or environment variables to Git
- Share API keys in logs or error messages
- Use same API keys in multiple services

### ✅ DO:
- Store secrets in Render's Environment Variables
- Rotate API keys periodically
- Monitor API usage in Google Cloud Console
- Use separate API keys for dev/prod

## Troubleshooting Deployment

### Problem: Service keeps restarting
**Solution:** Check Render logs for startup errors
```
ERROR: GEMINI_API_KEY not found
```
→ Add GEMINI_API_KEY to environment variables

### Problem: Image upload returns error
**Solution:** Verify all environment variables are set
```bash
# Check logs for:
❌ Google GenAI not available
```
→ Ensure GEMINI_API_KEY is correctly configured

### Problem: Docker build fails
**Solution:** Check requirements.txt installation
```
ERROR: Failed to install google-generativeai
```
→ Verify [requirements.txt](../backend/requirements.txt) has correct package name

## Rolling Back

If something breaks:

1. **View Deployment History** in Render dashboard
2. **Click "Deploy"** on a previous working version
3. **Service will revert** to that deployment

## Next Steps

1. ✅ Add all environment variables to Render
2. ✅ Commit code changes: `git push origin main`
3. ✅ Monitor logs for successful deployment
4. ✅ Test image upload endpoint
5. ✅ Monitor for errors in production

---

For more help: [Render Documentation](https://render.com/docs)
