# Adamik Agent

A sophisticated voice-enabled blockchain assistant powered by OpenAI's Realtime API and Privy authentication. Built with Next.js, this application provides seamless voice interactions for blockchain operations with secure embedded wallet management.

## ✨ Features

### 🎯 Core Functionality

- **Voice-First Interface**: Natural speech recognition and AI-powered responses
- **Blockchain Integration**: Direct interaction with blockchain networks via Adamik API
- **Secure Authentication**: Privy-powered login with embedded wallet creation
- **Real-time Communication**: WebRTC-based low-latency audio streaming
- **Multi-Agent Support**: Configurable AI agents for different blockchain scenarios

### 🎨 Modern UI/UX

- **Professional Design**: Clean, modern interface with thoughtful visual hierarchy
- **Responsive Layout**: Optimized for desktop and mobile experiences
- **Enhanced Chat Interface**: Modern message bubbles with markdown support
- **Real-time Logs**: Comprehensive event logging with beautiful UI
- **Smooth Animations**: Micro-interactions and transitions for better UX
- **Accessibility**: Focus management and keyboard navigation support

### 🔐 Security & Wallet Management

- **Embedded Wallets**: Secure, user-specific wallet creation and management
- **Multi-User Support**: Individual user sessions with personal wallet access
- **Authentication Guards**: Protected routes ensuring secure access
- **Wallet Integration**: Seamless blockchain transaction signing

## 🏗️ Architecture

### Authentication Flow

```
User Login → Privy Authentication → Embedded Wallet Creation → Agent Connection
```

### Agent System

- **Configurable Agents**: Multiple agent personalities and capabilities
- **Tool Integration**: Blockchain-specific functions with user context
- **Real-time Processing**: Live audio processing with WebRTC
- **Event Logging**: Comprehensive client/server event tracking

### Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Authentication**: Privy (email, Google, Twitter)
- **Audio**: OpenAI Realtime API with WebRTC
- **Blockchain**: Adamik API integration
- **Deployment**: Vercel-ready configuration

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Privy account and application setup
- OpenAI API access with Realtime API enabled
- Adamik API credentials

### Environment Setup

Create a `.env.local` file with:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Privy Configuration (Client-side)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Privy Configuration (Server-side)
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# Adamik API Configuration
ADAMIK_API_KEY=your_adamik_api_key
ADAMIK_BASE_URL=https://api.adamik.io
```

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Privy Dashboard Configuration

1. **Allowed Origins**: Add your domain(s):
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
2. **Login Methods**: Enable email, Google, Twitter as needed
3. **Embedded Wallets**: Ensure embedded wallets are enabled

## 🎮 Usage

### Getting Started

1. **Sign In**: Use email, Google, or Twitter authentication
2. **Wallet Creation**: Embedded wallet automatically created upon login
3. **Agent Selection**: Choose from available blockchain agents
4. **Voice Interaction**: Click "Connect" and start speaking
5. **Blockchain Operations**: Perform transactions via voice commands

### Voice Commands Examples

- "Check my wallet balance"
- "Send 0.1 ETH to [address]"
- "Show my transaction history"
- "What's the current ETH price?"

### Push-to-Talk Mode

- Enable PTT for controlled audio input
- Hold "Talk" button while speaking
- Release to process your request

## 🔧 Configuration

### Agent Configuration

Agents are defined in `src/app/agentConfigs/`:

- **Instructions**: AI behavior and personality
- **Tools**: Available blockchain functions
- **Chains**: Supported blockchain networks

### Adding New Agents

1. Create agent folder in `agentConfigs/`
2. Define `index.ts` with agent configuration
3. Implement required tools with user context
4. Add to `agentConfigs/index.ts`

### Blockchain Integration

Tools receive user context for secure operations:

```typescript
function myTool(
  args: ToolArgs,
  sendMessage: SendMessageFunction,
  addContent: AddContentFunction,
  userContext?: { userId: string; walletAddress: string }
) {
  // Use userContext for user-specific operations
}
```

## 🎨 UI Components

### Design System

- **Colors**: Blue-centric palette with gray accents
- **Typography**: System fonts with proper font features
- **Spacing**: Consistent 4px grid system
- **Shadows**: Layered shadow system for depth
- **Animations**: Smooth micro-interactions

### Key Components

- **Header**: Logo, agent selection, user info
- **Transcript**: Modern chat interface with message bubbles
- **Events**: Real-time logs with expandable details
- **Toolbar**: Connection controls and settings
- **Login**: Stunning authentication screen

### Responsive Design

- **Mobile-First**: Optimized for all screen sizes
- **Touch-Friendly**: Proper touch targets and gestures
- **Adaptive Layout**: Flexible grid system

## 📊 Monitoring & Debugging

### Event Logging

- **Client Events**: User actions and WebRTC status
- **Server Events**: AI responses and API calls
- **Real-time Display**: Live event stream in logs panel
- **Expandable Details**: JSON payload inspection

### Audio Debugging

- **Codec Selection**: Choose optimal audio format
- **Playback Control**: Toggle audio output
- **Recording Download**: Save conversation audio

## 🚀 Deployment

### Vercel Deployment

1. **Environment Variables**: Set all required env vars in Vercel
2. **Domain Configuration**: Update Privy allowed origins
3. **Build Settings**: Use default Next.js build configuration

### Production Considerations

- **HTTPS Required**: Privy and WebRTC need secure contexts
- **Audio Permissions**: Handle browser audio policy
- **Rate Limiting**: Implement OpenAI API rate limiting
- **Error Handling**: Comprehensive error boundaries

## 🤝 Contributing

### Development Guidelines

- **TypeScript**: Strict typing required
- **ESLint**: Follow configured rules
- **Prettier**: Automatic code formatting
- **Components**: Reusable, well-documented components

### Code Structure

```
src/
├── app/
│   ├── agentConfigs/     # Agent definitions
│   ├── api/              # API routes
│   ├── components/       # UI components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities
│   └── types.ts          # Type definitions
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:

1. Check existing [GitHub Issues](../../issues)
2. Review [Privy Documentation](https://docs.privy.io)
3. Consult [OpenAI Realtime API Docs](https://platform.openai.com/docs)
4. Check [Adamik API Documentation](https://docs.adamik.io)

---

**Built with ❤️ for the blockchain community**
