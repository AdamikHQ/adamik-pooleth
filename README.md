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
- **EVM Transactions**: Secure transaction processing via Privy's built-in modal

## 🏗️ Architecture

### System Overview

This application uses a **main agent + supervisor agent** pattern for advanced, reliable, and extensible voice-based blockchain operations.

### Main Agent + Supervisor Pattern

- **Main Agent**: Handles real-time conversation and delegates all tool calls to the supervisor agent. Keeps the conversation fast and responsive.
- **Supervisor Agent**: Implements all tool logic, powered by a more capable model (e.g., gpt-4.1). Handles complex, high-stakes, or tool-using tasks.
- **Benefits**: Centralizes tool logic, enables high-quality tool use, and allows for future extensibility (e.g., multi-agent handoffs).

#### Main Agent + Supervisor Flow Diagram

```mermaid
graph TD
    A["User Voice Input"] --> B["OpenAI Realtime API"]
    B --> C["Main Agent (Adamik)"]
    C --> D{"Tool Required?"}
    D -->|No| E["Direct AI Response"]
    D -->|Yes| F["Delegate Tool Call to Supervisor"]
    F --> G["Supervisor Agent (Tool Logic)"]
    G --> H["API Layer (makeWalletRequest/makeProxyRequest)"]
    H --> I["Service Layer (Privy/Adamik API)"]
    I --> J["Infrastructure Layer (Wallets/Blockchains)"]
    J --> K["Response Data"]
    K --> L["Supervisor Returns Tool Result"]
    L --> M["Main Agent Processes Result"]
    M --> N["AI Response Generation"]
    N --> O["Voice Output to User"]

    subgraph "Agent Layer"
        C
        F
        G
    end
    subgraph "API Layer"
        H
    end
    subgraph "Service Layer"
        I
    end
    subgraph "Infrastructure Layer"
        J
    end
    style A fill:#e1f5fe
    style O fill:#e8f5e8
    style C fill:#fff3e0
    style G fill:#ffe0b2
    style H fill:#f3e5f5
    style I fill:#fce4ec
```

### Component Architecture

#### 1. Agent Layer

**Adamik Agent Configuration** (`src/app/agentConfigs/adamik/`)

- **Purpose**: Defines the blockchain assistant's personality, capabilities, and available tools
- **Key Files**:
  - `index.ts`: Main agent configuration with instructions and tool definitions
  - `chains.ts`: Supported blockchain networks
  - `schemas.ts`: TypeScript schemas for API interactions
  - `supervisorAgent.ts`: Agent oversight and routing logic

#### 2. API Layer

**Request Routing** (`src/app/lib/api.ts`)

- **`makeWalletRequest()`**: Routes wallet operations to Privy service
- **`makeProxyRequest()`**: Routes blockchain queries to Adamik API
- **Purpose**: Abstracts service calls and handles user context

**API Endpoints**:

- **`/api/wallet`**: Wallet operations (keys, addresses)
- **`/api/adamik`**: Blockchain data and transaction encoding

#### 3. Service Layer

- **Privy Service** (`src/app/services/privy.ts`)
- **Adamik Service** (`src/app/services/adamik.ts`)

All third-party integrations are now centralized in the `src/app/services/` directory for maintainability and clarity.

**Privy Service**

- **Wallet Management**: Create and manage embedded wallets
- **Key Operations**: Extract public keys for multi-chain address derivation
- **EVM Transactions**: Secure transaction processing via sendTransaction
- **User Context**: Secure, user-specific wallet operations

**Adamik Service**

- **Chain Operations**: Balance queries, transaction history, validator lists
- **Transaction Encoding**: Convert transaction intents to signable format
- **Multi-Chain Support**: Works across all supported blockchain networks

#### 4. Infrastructure Layer

**Privy Infrastructure**

- **Embedded Wallets**: Secure key storage and management
- **Authentication**: User login and session management
- **Transaction Processing**: EVM transaction handling via built-in modal

**Blockchain Networks**

- **Multi-Chain Support**: Ethereum, Polygon, Solana, and more
- **Real-Time Data**: Live blockchain state and transaction status
- **Transaction Processing**: Mempool submission and confirmation tracking

### Authentication Flow

```
User Login → Privy Authentication → Embedded Wallet Creation → Agent Connection
```

### Agent-Privy Connection

The connection between the Adamik agent and Privy service works as follows:

1. **Agent Tools**: Defined in agent config (e.g., `getPubKey`, `getAddress`, `requestUserSignature`)
2. **API Routing**: Tools call `makeWalletRequest()` with user context
3. **Wallet Endpoint**: `/api/wallet` receives requests and routes to Privy service
4. **Privy Operations**: Service performs secure wallet operations
5. **Response Chain**: Results flow back through the layers to the agent

**Example Flow**:

```typescript
// 1. Agent tool execution
getPubKey: async (args, transcript, breadcrumb, userContext) => {
  const pubKey = await makeWalletRequest("getPubKey", {}, userContext);
  return { content: [{ type: "text", text: JSON.stringify(pubKey) }] };
}

// 2. API routing
export async function makeWalletRequest(action, params, userContext) {
  const response = await fetch("/api/wallet", {
    method: "POST",
    body: JSON.stringify({ action, userId: userContext?.userId, ...params })
  });
  return await response.json();
}

// 3. Wallet endpoint processing
case "getPubKey":
  const wallet = await privyService.getWallet(userId, { walletAddress, chainType });
  const publicKey = await privyService.getPublicKey(wallet.id);
  return NextResponse.json({ publicKey, walletId: wallet.id });
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
- **Blockchain API**: Adamik API for multi-chain operations
- **Wallet Backend**: Privy embedded wallets for secure key management
- **Agent System**: Custom blockchain agent configuration (not MCP server)
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

### Multi-Chain Wallet Management

The system supports creating and managing wallets across multiple blockchain networks with **different filtering policies** depending on how you access the system:

#### Chain Filtering Policies

**🎙️ Voice Agent (STRICT Filtering)**

The voice agent enforces **strict chain validation** and only accepts chains explicitly defined in `src/app/agentConfigs/adamik/chains.ts`:

- **Allowed Chains**: Only ~40 predefined blockchain networks
- **Validation**: Each chain name must exactly match entries in `chains.ts`
- **Voice Commands**: "Create a wallet for base" ✅ vs "Create a wallet for unknown-chain" ❌
- **Purpose**: Prevents voice recognition errors and ensures reliable blockchain operations

**🔧 Direct API (PERMISSIVE Filtering)**

The direct API endpoints (`/api/wallet`) use **permissive chain handling**:

- **Accepts**: Any chain name as input
- **Auto-Mapping**: Unknown chains automatically map to `ethereum` base type
- **Fallback**: EVM-compatible networks work seamlessly
- **Purpose**: Maximum flexibility for programmatic access

#### Supported Base Chain Types

All wallets are organized into **5 base chain types**, regardless of specific network:

- **`ethereum`**: For all EVM-compatible networks (Ethereum, Base, Arbitrum, Polygon, BSC, etc.)
- **`solana`**: For Solana network operations
- **`tron`**: For TRON network operations
- **`cosmos`**: For Cosmos SDK-based networks
- **`stellar`**: For Stellar network operations

#### Automatic Chain Mapping

The system intelligently maps specific networks to base types:

```typescript
// Voice Agent: STRICT - only accepts predefined chains
const voiceChains = [
  "ethereum", "base", "arbitrum", "polygon", "optimism",
  "bsc", "avalanche", "solana", "tron", "cosmos", "stellar"
  // ... ~40 total predefined chains
];

// API: PERMISSIVE - maps any chain to base type
const chainMapping = {
  "base" → "ethereum",           // EVM networks map to ethereum
  "arbitrum" → "ethereum",
  "polygon" → "ethereum",
  "custom-evm" → "ethereum",     // Unknown EVM chains default to ethereum
  "solana" → "solana",           // Direct mapping for other base types
  "unknown-chain" → "ethereum"   // Unknown chains fallback to ethereum
};
```

#### Voice Commands for Wallet Management

**✅ Supported Voice Commands** (chains from `chains.ts`):

- "Create a new Solana wallet"
- "Create a wallet for Base network"
- "Show my Arbitrum address"
- "List all my wallets"
- "What's my Polygon address?"
- "Create a TRON wallet"

**❌ Unsupported Voice Commands** (not in `chains.ts`):

- "Create a wallet for my-custom-chain"
- "Show my unknown-network address"

#### Wallet Creation Behavior

**One Wallet Per Base Type**: Each user can have one wallet per base chain type, but that wallet works across all networks of that type:

```typescript
// User creates ethereum wallet
createWallet({ chainType: "ethereum" });
// Result: One wallet that works for ALL EVM networks:
// - Ethereum mainnet: 0xABC...123
// - Base network: 0xABC...123 (same address)
// - Arbitrum: 0xABC...123 (same address)
// - Polygon: 0xABC...123 (same address)

// User creates solana wallet
createWallet({ chainType: "solana" });
// Result: Separate Solana wallet
// - Solana: ACHFP5Ze4cw7SyFPShF1LsEQ4afpnMNRNgzJVjgmjFgG
```

#### Comprehensive Chain Support

**Voice Agent Supported Networks** (from `chains.ts`):

**EVM Networks**:

- `ethereum`, `base`, `arbitrum`, `polygon`, `optimism`
- `bsc`, `avalanche`, `zksync`, `linea`, `gnosis`
- `moonbeam`, `fantom`, `mantle`, `cronos`, `world-chain`

**Testnets**:

- `sepolia`, `holesky`, `base-sepolia`, `polygon-amoy`

**Non-EVM Networks**:

- `solana`, `tron`, `cosmos`, `stellar`

**API Supported Networks**: Any chain name (with automatic base type mapping)

#### Real-World Testing Results

Our comprehensive testing confirmed the system works with **real multi-chain wallets**:

```json
// User: did:privy:cmcnf68ol00j4i30mxrx7hgiv
{
  "wallets": [
    {
      "chainType": "ethereum",
      "address": "0xb5bC63da4C78A933c30D50f03333E34f84196B56",
      "id": null // Primary wallet (no ID)
    },
    {
      "chainType": "solana",
      "address": "ACHFP5Ze4cw7SyFPShF1LsEQ4afpnMNRNgzJVjgmjFgG",
      "id": "d7uers5z1b11bcvkt8gk0ry5"
    },
    {
      "chainType": "tron",
      "address": "TTrdkgmkVma6S1ZWabMR7qgSB1ouVbBEBk",
      "id": "kz3aa46a85dhpstw2t0mskf2"
    },
    {
      "chainType": "cosmos",
      "address": "cosmos1kneyyfm6vdul03hpm65hqtqtqljlwu547v5zks",
      "id": "vn8e9wdawna1ya3vus9etpxd"
    },
    {
      "chainType": "stellar",
      "address": "GDDIGYPJSZKM5CDIMDWMRB4SQNDMOWES3CIK3EUFQGCEFI4HDGTOSLKR",
      "id": "pfewukwk9z3drybncu6m5w9v"
    }
  ]
}
```

**✅ All Tests Passed**: 19/19 including core functionality, multi-chain support, error handling, and agent integration.

### Push-to-Talk Mode

- Enable PTT for controlled audio input
- Hold "Talk" button while speaking
- Release to process your request

## 🔧 Configuration

### Agent Configuration

Agents are defined in `src/app/agentConfigs/adamik/`:

- **Instructions**: AI behavior and personality defined in `chatAgentInstructions`
- **Tools**: Available blockchain functions with OpenAI function calling format
- **Tool Logic**: Implementation of each tool with Privy/Adamik integration
- **Chains**: Supported blockchain networks from `chains.ts`

### Agent Configuration Structure

```typescript
const chatAgent: AgentConfig = {
  name: "Adamik",
  publicDescription: "Smart Blockchain Wallet",
  instructions: chatAgentInstructions, // Detailed personality and behavior
  tools: [
    // OpenAI function calling format
    {
      type: "function",
      name: "getPubKey",
      description: "Get the wallet public key",
      parameters: {
        /* schema */
      },
    },
    // ... more tools
  ],
  toolLogic: {
    // Implementation of each tool
    getPubKey: async (args, transcript, breadcrumb, userContext) => {
      const pubKey = await makeWalletRequest("getPubKey", {}, userContext);
      return { content: [{ type: "text", text: JSON.stringify(pubKey) }] };
    },
    // ... more implementations
  },
  downstreamAgents: [], // Supervisor/routing capabilities
};
```

### Available Tools

**Wallet Operations**:

- `getPubKey`: Extract public key for address derivation
- `getAddress`: Get wallet address
- `listWallets`: List all embedded wallets across different blockchains
- `createWallet`: Create new embedded wallets for specific blockchain networks
- `requestUserSignature`: Send EVM transactions using Privy's built-in modal

**Blockchain Queries**:

- `getSupportedChains`: List available blockchain networks
- `listFeatures`: Get chain capabilities and native currency info
- `getTokenDetails`: Fetch token metadata (decimals, symbol, etc.)
- `getAccountState`: Check balances and staking positions
- `getAccountHistory`: Retrieve transaction history
- `getChainValidators`: List available validators for staking

**Transaction Operations**:

- `encodeTransaction`: Convert transaction intent to signable format
- `deriveAddress`: Generate blockchain-specific addresses from public key

### Adding New Agents

1. Create agent folder in `agentConfigs/`
2. Define `index.ts` with agent configuration:

   ```typescript
   import { AgentConfig } from "@/app/types";

   const myAgent: AgentConfig = {
     name: "MyAgent",
     instructions: "Agent personality and behavior...",
     tools: [
       /* tool definitions */
     ],
     toolLogic: {
       /* tool implementations */
     },
   };

   export default [myAgent];
   ```

3. Implement required tools with user context
4. Add to `agentConfigs/index.ts`

### Blockchain Integration

Tools receive user context for secure operations:

```typescript
function myTool(
  args: ToolArgs,
  transcriptItems: any,
  addTranscriptBreadcrumb: any,
  userContext?: { userId: string; walletAddress?: string }
) {
  // Use userContext for user-specific operations
  // Tools can call makeWalletRequest() or makeProxyRequest()
}
```

### Privy Service Configuration

**Environment Variables**:

```bash
# Privy Configuration (Server-side)
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
```

**Service Capabilities**:

- **User Management**: Get user details and linked accounts
- **Wallet Operations**: List, create, and manage embedded wallets with proper ID handling
- **Multi-Chain Support**: Create wallets for Ethereum, Solana, TRON, Cosmos, and Stellar networks
- **Chain Mapping**: Automatically map EVM-compatible chains (Base, Arbitrum, etc.) to Ethereum base type
- **Key Extraction**: Get public keys for multi-chain address derivation
- **EVM Transactions**: Secure transaction processing via Privy's built-in sendTransaction
- **Context Handling**: User-specific wallet selection and operations

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
│   ├── agentConfigs/     # Agent definitions & configurations
│   ├── api/              # Next.js API routes
│   ├── components/       # React UI components
│   ├── contexts/         # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions & helpers
│   ├── services/         # Third-party service integrations
│   │   └── privy.ts      # Privy wallet service
│   └── types.ts          # TypeScript type definitions
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

## ❗️ Important: Not an MCP Server

This project is **not** an MCP (Model Context Protocol) server. All agent and supervisor logic, tool implementations, and business rules are written in TypeScript code (see `src/app/agentConfigs/adamik/supervisorAgent.ts`).

- **Rules and behaviors are hardcoded in code.**
- **To change logic (e.g., add validation, formatting, or business rules), you must edit the relevant TypeScript function and redeploy.**
- **You cannot change agent behavior or add rules at runtime by updating a prompt or context.**
- **All tools are explicit TypeScript functions with clear parameters and return values.**

### How to Add or Change Rules

- **Find the relevant tool logic in `supervisorAgent.ts` (e.g., `getAccountState`).**
- **Edit the function to add your custom rule (e.g., decimal verification, validation, formatting, etc.).**
- **Save, test, and redeploy.**

### Example: Decimal Verification for Balances

- The supervisor agent's `getAccountState` tool logic fetches and verifies decimals for both native and token balances before returning results to the user.
- This is implemented in TypeScript, not via prompt.

---

## 🆚 How This Differs from an MCP Server

| Feature/Capability        | This Project (Supervisor Agent) | MCP Server        |
| ------------------------- | ------------------------------- | ----------------- |
| Hardcoded tool logic      | ✅                              | ❌                |
| Prompt-driven rules       | ❌                              | ✅                |
| Runtime behavior changes  | ❌                              | ✅                |
| Explicit TypeScript tools | ✅                              | (Optional/Hybrid) |

- **MCP Server:** You can change agent behavior by updating the prompt/context at runtime.
- **This Project:** You must update the code to change agent behavior or add rules.

---
