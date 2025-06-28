# DocumentAI SDK - Installation Guide

## 🚀 Quick Installation

### 1. Install the Package

```bash
npm install extract-node-sdk
```

### 2. Get Your API Key

1. Visit [Landing AI](https://app.landing.ai/)
2. Sign up or log in to your account
3. Navigate to the API section
4. Copy your API key

### 3. Set Environment Variable

```bash
# Linux/Mac
export DOCUMENT_AI_API_KEY=your-api-key-here

# Windows (Command Prompt)
set DOCUMENT_AI_API_KEY=your-api-key-here

# Windows (PowerShell)
$env:DOCUMENT_AI_API_KEY="your-api-key-here"
```

### 4. Test Installation

```bash
# Run the getting started example
npm run example:getting-started

# Or run the simple example
npm run example:simple
```

## 📦 Manual Installation (Development)

If you want to install from source:

```bash
# Clone the repository
git clone https://github.com/your-username/extract-node-sdk.git
cd extract-node-sdk

# Install dependencies
npm install

# Set your API key
export DOCUMENT_AI_API_KEY=your-api-key-here

# Test the installation
npm run example:getting-started
```

## 🔧 Dependencies

The SDK requires the following dependencies:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Internet connection** for API calls

### Optional Dependencies

For advanced features:
- **pdfkit** - For creating test PDFs
- **jest** - For running tests

## 🧪 Verify Installation

### 1. Connection Test

```javascript
const { DocumentAI } = require('extract-node-sdk');

const docAI = new DocumentAI(process.env.DOCUMENT_AI_API_KEY);
const test = await docAI.testConnection();

if (test.success) {
    console.log('✅ Installation successful!');
} else {
    console.log('❌ Installation failed:', test.message);
}
```

### 2. Basic Extraction Test

```javascript
const schema = { name: 'string', email: 'string' };
const result = await docAI.extract('./test-document.pdf', schema);

if (result.success) {
    console.log('✅ Extraction working!');
} else {
    console.log('❌ Extraction failed:', result.error);
}
```

## 🔍 Troubleshooting

### Common Issues

1. **"Module not found"**
   ```bash
   npm install
   ```

2. **"Invalid API key"**
   - Check your API key at https://app.landing.ai/
   - Ensure environment variable is set correctly

3. **"Permission denied"**
   ```bash
   chmod +x examples/getting-started.js
   ```

4. **"Cannot find module 'pdfkit'"**
   ```bash
   npm install pdfkit
   ```

### Environment Setup

For permanent environment variables:

**Linux/Mac (.bashrc or .zshrc):**
```bash
echo 'export DOCUMENT_AI_API_KEY=your-api-key-here' >> ~/.bashrc
source ~/.bashrc
```

**Windows (System Properties):**
1. Right-click "This PC" → Properties
2. Advanced system settings → Environment Variables
3. Add new variable: `DOCUMENT_AI_API_KEY`

## 📚 Next Steps

After successful installation:

1. **Read the documentation**: `README.md`
2. **Try examples**: `USAGE.md`
3. **Run tests**: `npm test`
4. **Start building**: Use the SDK in your projects!

## 🆘 Need Help?

- Check the [README.md](README.md) for complete documentation
- Review [USAGE.md](USAGE.md) for quick examples
- Run `npm run example:getting-started` for a guided tour
- Check error messages for specific guidance