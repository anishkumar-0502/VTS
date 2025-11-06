# 🚀 Swagger Integration - Quick Start Guide

## ✅ What's Already Done

- [x] Packages installed: `swagger-jsdoc` and `swagger-ui-express`
- [x] Configuration file created: `config/swagger.js`
- [x] Swagger middleware integrated into `app.js`
- [x] Documentation added to `authRoutes.js` (5 endpoints)
- [x] Documentation added to `superadminRoutes.js` (30+ endpoints)
- [x] Comprehensive setup guide created: `SWAGGER_SETUP_GUIDE.md`
- [x] Complete examples provided: `SWAGGER_EXAMPLES.md`

---

## 🎯 Getting Started in 3 Steps

### Step 1: Start Your Server
```bash
cd /Users/outdid/Desktop/VTS/BACKEND
npm run dev
```

### Step 2: Open Swagger UI
**Browser URL:** `http://localhost:8787/api-docs`

You should see:
- ✅ VTS API Logo and title
- ✅ All endpoints organized by tags
- ✅ Try-it-out functionality
- ✅ Authorization button for JWT tokens

### Step 3: Try an Endpoint
1. Click on any endpoint (e.g., `/auth/login`)
2. Click **"Try it out"**
3. Fill in the parameters
4. Click **"Execute"**
5. View the response

---

## 📋 Current Documentation Status

### ✅ Complete (With Full JSDoc Comments)
- **authRoutes.js** - 5 endpoints
  - POST /auth/register
  - POST /auth/login
  - GET /auth/profile
  - PUT /auth/profile
  - POST /auth/change-password

- **superadminRoutes.js** - 30+ endpoints
  - Dashboard & Analytics
  - Operator Management
  - User Management
  - Device Management
  - Role Management
  - Audit Logs

### ⏳ Pending Documentation
- **operatorRoutes.js** - (Needs JSDoc comments)
- **driverRoutes.js** - (Needs JSDoc comments)
- **parentRoutes.js** - (Needs JSDoc comments)

---

## 🔧 Adding Documentation to Remaining Routes

### Quick Process for Each Route File

1. **Open route file** (e.g., `operatorRoutes.js`)
2. **For each endpoint**, add JSDoc comment above the route definition
3. **Save the file**
4. **Refresh** `http://localhost:8787/api-docs` in browser
5. **New endpoints appear** automatically

### Template to Copy-Paste

```javascript
/**
 * @swagger
 * /path/to/endpoint:
 *   methodType:
 *     summary: What does this endpoint do?
 *     description: More detailed explanation
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.methodType('/path', AuthController.method);
```

### Choose Your Tag from These Options:
- `[Auth]` - Authentication endpoints
- `[SuperAdmin]` - Admin only
- `[Operator]` - Operator routes
- `[Driver]` - Driver routes
- `[Parent/Guardian]` - Guardian routes

---

## 🔐 Testing Protected Endpoints

### Step-by-Step: Test Login & Protected Route

#### 1. Test Login Endpoint
- Endpoint: `POST /auth/login`
- Body:
```json
{
  "email": "superadmin@vts.com",
  "password": "YourPassword",
  "role_id": 1
}
```
- Copy the returned `token` value

#### 2. Authorize Swagger UI
- Click **🔒 Authorize** button (top right)
- Paste token in the text field
- Click **Authorize**
- Close dialog

#### 3. Test Protected Endpoint
- Try any endpoint with `security: [{ bearerAuth: [] }]`
- Token is automatically included in requests

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `config/swagger.js` | Main Swagger configuration |
| `app.js` | Middleware integration (lines 20, 93) |
| `authRoutes.js` | Example with 5 documented endpoints |
| `superadminRoutes.js` | Example with 30+ documented endpoints |
| `SWAGGER_SETUP_GUIDE.md` | Comprehensive documentation |
| `SWAGGER_EXAMPLES.md` | 10+ detailed code examples |
| `SWAGGER_QUICKSTART.md` | This file |

---

## 🚦 Accessing Documentation

### Interactive UI (Recommended)
```
http://localhost:8787/api-docs
```
- Best for: Testing, exploring, documentation
- Features: Try-it-out, request/response visualization

### JSON OpenAPI Spec
```
http://localhost:8787/api-docs.json
```
- Best for: Importing to Postman, Insomnia, code generation
- Use this URL to import into other tools

### Health Check
```
http://localhost:8787/health
```
- Verify server is running

---

## 🎨 Swagger UI Features

### Explore Endpoints
- **Search** for endpoints by name
- **Filter** by tag (Auth, SuperAdmin, etc.)
- **Sort** by HTTP method

### Try Endpoints
- Click **"Try it out"** button
- Fill in parameters/body
- Click **"Execute"**
- View response, headers, curl command

### Copy Curl
- Every request generates a `curl` command
- Copy and use in terminal or Postman

### View Models
- See all defined schemas
- Understand request/response structures

---

## 💡 Tips & Tricks

### Tip 1: Auto-Reload Documentation
- Documentation reloads on server restart
- No cache issues - always fresh
- Browser cache: Use Ctrl+Shift+R (full refresh)

### Tip 2: Use `Try-it-out` Feature
- Best way to test API without Postman
- Built-in request/response visualization
- Useful for API demos

### Tip 3: Export to Postman
1. Get OpenAPI JSON: `http://localhost:8787/api-docs.json`
2. In Postman: `Import` → `Link` → paste URL
3. Full collection created automatically

### Tip 4: Share API Docs
- Send this URL to team: `http://localhost:8787/api-docs`
- No setup needed on their side
- Live documentation!

### Tip 5: Reference Reusable Schemas
```javascript
// Instead of repeating schema definitions:
schema:
  $ref: '#/components/schemas/LoginRequest'
```

---

## 🐛 Troubleshooting

### Issue: Swagger UI shows 404
**Solution:** 
- Verify server is running: `npm run dev`
- Check URL: `http://localhost:8787/api-docs`
- Port might be different - check terminal output

### Issue: New endpoint not appearing
**Solution:**
- Verify JSDoc comment is directly above route
- Check tag is in `config/swagger.js` tags array
- Restart server: Ctrl+C, then `npm run dev`

### Issue: "No API title specified" error
**Solution:** 
- Ensure `config/swagger.js` is properly formatted
- Check for syntax errors in JSDoc
- Restart server

### Issue: Authorization not working
**Solution:**
- Verify endpoint has `security: [{ bearerAuth: [] }]`
- Token must be from `/auth/login`
- Token must not be expired
- Use "Bearer" prefix if manually entering

### Issue: Parameter not showing up
**Solution:**
- Check parameter indentation (2 spaces per level)
- Verify `in:` is set correctly (`path`, `query`, `body`)
- Restart server

---

## 📊 Example Response in Swagger UI

When you click "Execute" on `/auth/login`, you'll see:

```
Request URL
http://localhost:8787/auth/login

Curl
curl -X POST "http://localhost:8787/auth/login" 
  -H "Content-Type: application/json" 
  -d "{"email":"john@example.com","password":"pass","role_id":2}"

Request Body
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role_id": 2
}

Response
200 OK

{
  "error": false,
  "message": "Login successful",
  "data": {
    "user": {
      "user_id": "USER-123",
      "name": "John Doe",
      "email": "john@example.com",
      "role_id": 2
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🔄 Next Steps

### Immediate (Today)
- [x] Start server: `npm run dev`
- [x] Visit `http://localhost:8787/api-docs`
- [x] Test 2-3 endpoints with "Try it out"
- [x] Try authorization with login endpoint

### Short Term (This Week)
- [ ] Add JSDoc to `operatorRoutes.js`
- [ ] Add JSDoc to `driverRoutes.js`
- [ ] Add JSDoc to `parentRoutes.js`
- [ ] Test all endpoints in Swagger UI

### Medium Term (This Month)
- [ ] Export docs to Postman collection
- [ ] Share Swagger URL with team
- [ ] Train team on Try-it-out feature
- [ ] Update docs when adding new endpoints

### Long Term
- [ ] Automate API documentation in CI/CD
- [ ] Generate SDK from OpenAPI spec
- [ ] Keep documentation in sync with code
- [ ] Regular docs review and updates

---

## 📞 Quick Reference Commands

```bash
# Start development server
npm run dev

# Restart server
# Press Ctrl+C, then npm run dev

# View in browser
# http://localhost:8787/api-docs

# Get JSON spec
# http://localhost:8787/api-docs.json

# Check if server is running
# curl http://localhost:8787/health
```

---

## 📚 Documentation Structure

```
BACKEND/
├── 📄 SWAGGER_SETUP_GUIDE.md      ← Full reference (this is the bible!)
├── 📄 SWAGGER_EXAMPLES.md         ← 10+ code examples to copy-paste
├── 📄 SWAGGER_QUICKSTART.md       ← This file (for getting started)
├── 🔧 config/swagger.js           ← Core configuration
├── 🔧 app.js                      ← Integration point
└── 📋 routes/
    ├── authRoutes.js              ← ✅ Fully documented
    ├── superadminRoutes.js        ← ✅ Fully documented
    ├── operatorRoutes.js          ← ⏳ Needs docs
    ├── driverRoutes.js            ← ⏳ Needs docs
    └── parentRoutes.js            ← ⏳ Needs docs
```

---

## 🎓 Learning Resources

### Inside This Project
1. **SWAGGER_SETUP_GUIDE.md** - Everything about Swagger
2. **SWAGGER_EXAMPLES.md** - Copy-paste ready code
3. **authRoutes.js** - See how it's done
4. **superadminRoutes.js** - More complex examples

### External Resources
- [OpenAPI 3.0.0 Spec](https://spec.openapis.org/oas/v3.0.0)
- [Swagger-JSDoc Docs](https://github.com/Surnet/swagger-jsdoc)
- [Swagger-UI Docs](https://github.com/scottie1984/swagger-ui-express)

---

## ✨ You're All Set!

Your API documentation is now:
- ✅ **Interactive** - Try endpoints directly
- ✅ **Auto-Generated** - Updates with code
- ✅ **Professional** - Looks great
- ✅ **Shareable** - Send URL to team
- ✅ **Importable** - Use in Postman/Insomnia

### Start exploring:
👉 **[Open Swagger UI](http://localhost:8787/api-docs)**

---

**Questions?** Check:
1. SWAGGER_SETUP_GUIDE.md (comprehensive reference)
2. SWAGGER_EXAMPLES.md (code examples)
3. authRoutes.js or superadminRoutes.js (live examples)

**Happy documenting! 🚀**