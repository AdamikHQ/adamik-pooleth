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
- **Smart Header Indicators**: Privy and Ledger wallet status with branded logos
- **Connection Status**: Real-time hardware wallet connection indicator with green dot
- **Unified Wallet Display**: Ellipsis-formatted addresses with one-click copy functionality

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

**Unified Adamik Agent Configuration** (`src/app/agentConfigs/adamik/`)

- **Purpose**: Defines the comprehensive blockchain assistant with integrated Ledger hardware wallet support
- **Key Files**:
  - `index.ts`: Main agent configuration with instructions and unified tool definitions
  - `chains.ts`: Supported blockchain networks for both Privy and Ledger operations
  - `schemas.ts`: TypeScript schemas for API interactions
  - `supervisorAgent.ts`: Unified agent logic with blockchain queries, wallet operations, and Ledger integration

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

The system supports creating and managing wallets across multiple blockchain networks with **EVM-only policy** currently implemented. While the backend can access all wallet types, the frontend only returns Ethereum-compatible wallets:

#### Chain Filtering Policies

**🎙️ Voice Agent (STRICT + EVM-Only)**

The voice agent enforces **strict chain validation** and **EVM-only policy**:

- **Allowed Chains**: Only EVM-compatible networks from `src/app/agentConfigs/adamik/chains.ts`
- **Validation**: Each chain name must exactly match entries in `chains.ts`
- **Voice Commands**: "Create a wallet for base" ✅ vs "Create a wallet for solana" ❌ (filtered out)
- **Purpose**: Prevents voice recognition errors and ensures reliable EVM operations

**🔧 Direct API (PERMISSIVE + EVM-Only)**

The direct API endpoints (`/api/wallet`) use **permissive chain handling** with **EVM-only filtering**:

- **Accepts**: Any chain name as input
- **Auto-Mapping**: Unknown chains automatically map to `ethereum` base type
- **EVM-Only**: Only returns Ethereum-compatible wallets to users
- **Purpose**: Maximum flexibility for EVM-compatible operations

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
// Voice Agent: STRICT + EVM-Only - accepts predefined EVM chains
const voiceChains = [
  "ethereum", "base", "arbitrum", "polygon", "optimism",
  "bsc", "avalanche", "zksync", "linea", "gnosis"
  // ... EVM-compatible chains only
];

// API: PERMISSIVE + EVM-Only - maps any chain to ethereum base type
const chainMapping = {
  "base" → "ethereum",           // EVM networks map to ethereum
  "arbitrum" → "ethereum",
  "polygon" → "ethereum",
  "custom-evm" → "ethereum",     // Unknown EVM chains default to ethereum
  "solana" → "filtered out",     // Non-EVM chains filtered out
  "unknown-chain" → "ethereum"   // Unknown chains fallback to ethereum
};
```

#### Voice Commands for Wallet Management

**✅ Supported Voice Commands** (EVM chains from `chains.ts`):

- "Create a wallet for Base network"
- "Show my Arbitrum address"
- "List all my wallets"
- "What's my Polygon address?"
- "Send ETH on Optimism"
- "Check my Base balance"

**❌ Unsupported Voice Commands** (filtered out by EVM-only policy):

- "Create a new Solana wallet"
- "Create a TRON wallet"
- "Show my Cosmos address"
- "Create a wallet for my-custom-chain"

#### Wallet Creation Behavior

**EVM-Only Policy**: Each user can have multiple EVM wallets, but only EVM-compatible wallets are accessible:

```typescript
// User creates ethereum wallet
createWallet({ chainType: "ethereum" });
// Result: One wallet that works for ALL EVM networks:
// - Ethereum mainnet: 0xABC...123
// - Base network: 0xABC...123 (same address)
// - Arbitrum: 0xABC...123 (same address)
// - Polygon: 0xABC...123 (same address)

// User creates additional ethereum wallet
createWallet({ chainType: "ethereum" });
// Result: Additional EVM wallet
// - All EVM networks: 0xDEF...456 (different address)

// Non-EVM wallets exist in backend but filtered out
// Backend: Solana wallet exists but not accessible via frontend
// Frontend: Only EVM wallets returned to users
```

#### Comprehensive Chain Support

**Voice Agent Supported Networks** (from `chains.ts`):

**EVM Networks**:

- `ethereum`, `base`, `arbitrum`, `polygon`, `optimism`
- `bsc`, `avalanche`, `zksync`, `linea`, `gnosis`
- `moonbeam`, `fantom`, `mantle`, `cronos`, `world-chain`

**Testnets**:

- `sepolia`, `holesky`, `base-sepolia`, `polygon-amoy`

**Non-EVM Networks** (Backend only, filtered out on frontend):

- `solana`, `tron`, `cosmos`, `stellar`

**API Supported Networks**: Any EVM-compatible chain name (with automatic ethereum base type mapping)

#### Real-World Testing Results

Our comprehensive testing confirmed the system works with **EVM-only policy**:

**Backend View (All Wallets)**:

```json
// User: did:privy:cmcnvwtdj00o7l20mlzwvr5qd
{
  "totalWallets": 5,
  "allWallets": [
    {
      "chainType": "ethereum",
      "address": "0xE7ccd18A3d23F72f5d12F9de54F8fB94b2C7B3CE",
      "id": null
    },
    {
      "chainType": "ethereum",
      "address": "0xFa2A1a3611A35A18a8a892424b13515274Ed1c16",
      "id": "jpyvvqkkv280zvy0brru7de4"
    },
    {
      "chainType": "solana",
      "address": "2MzhBMh6RPJbEcbayCFu8C7VCzghUZBgMmZzYTRBmnbY",
      "id": "waxy7kmuk424febk05sym3p2"
    },
    {
      "chainType": "cosmos",
      "address": "cosmos1yupxkadqv2rw5j6lt4rc5dx04v8y5yujhphnep",
      "id": "t9ev0auqdzz4uzaldrnbex3e"
    },
    {
      "chainType": "cosmos",
      "address": "cosmos1cnpc6k0js68fp3v0v8c3sa7cf47dn8flh4l53x",
      "id": "jm1ei9e4a2kni6ofq8q7vrfi"
    }
  ]
}
```

**Frontend View (EVM-Only)**:

```json
{
  "evmWalletsReturned": 2,
  "wallets": [
    {
      "chainType": "ethereum",
      "address": "0xE7ccd18A3d23F72f5d12F9de54F8fB94b2C7B3CE"
    },
    {
      "chainType": "ethereum",
      "address": "0xFa2A1a3611A35A18a8a892424b13515274Ed1c16"
    }
  ]
}
```

**✅ All Tests Passed**: EVM-only policy working correctly, filtering out non-EVM wallets while maintaining backend access.

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

## 🔒 Ledger Hardware Wallet Integration

### Overview

The Adamik agent now includes comprehensive Ledger hardware wallet integration, providing secure fund management by transferring cryptocurrency from Privy hot wallets to Ledger hardware wallets for cold storage. This integration focuses on **fund security** rather than complex transaction signing, leveraging the existing Privy transaction system and providing a unified voice interface.

### Key Features

- **Device Discovery**: Automatically discover connected Ledger devices via WebHID
- **Secure Connection**: Establish secure communication with Ledger hardware wallets
- **Address Retrieval**: Get Ethereum addresses from connected Ledger devices
- **Fund Security**: Transfer funds from hot wallet to cold storage with one voice command
- **User Guidance**: Step-by-step assistance for hardware wallet operations

### Voice Commands

- **"Secure my funds on Ledger"** - Primary command to transfer funds to hardware wallet
- **"Transfer funds to my hardware wallet"** - Alternative phrasing for fund security
- **"Move my crypto to cold storage"** - Another way to request fund transfer
- **"Connect to my Ledger device"** - Connect to hardware wallet
- **"Show my Ledger address"** - Display hardware wallet address
- **"Find my Ledger device"** - Discover connected devices

### Fund Security Flow

The Ledger agent implements a **Hot Wallet → Cold Storage** security flow:

```mermaid
graph LR
    A[🎤 "Secure my funds"] --> B[🔍 Discover Ledger]
    B --> C[📱 Connect Device]
    C --> D[📍 Get ETH Address]
    D --> E[💰 Calculate Amount]
    E --> F[✍️ Privy Signs TX]
    F --> G[📡 Send to Ledger]
    G --> H[🔒 Funds Secured]

    style B fill:#e1f5fe
    style D fill:#fff3e0
    style F fill:#f3e5f5
    style H fill:#e8f5e8
```

### Usage Example

1. **User**: _"Secure my funds on Ledger"_
2. **Agent**: _"I'll help you transfer your funds to your Ledger hardware wallet for enhanced security. Please ensure your Ledger device is connected and unlocked."_
3. **System**: Discovers and connects to Ledger device
4. **Agent**: _"Connected to your Nano X. Opening the Ethereum app and retrieving your secure address..."_
5. **System**: Gets Ethereum address from Ledger device
6. **Agent**: _"Your Ledger address is 0x1234...5678. I'll now transfer your available funds from your Privy wallet. Please confirm the transaction."_
7. **System**: Uses existing Privy transaction system to send funds to Ledger address
8. **Agent**: _"Transfer complete! Your funds are now secured on your Ledger hardware wallet."_

### Prerequisites

- **Chrome/Edge Browser**: WebHID support required
- **Ledger Device**: Nano S Plus, Nano X, or compatible device
- **Device Setup**: Device unlocked with Ethereum app open
- **USB Connection**: Device connected via USB cable
- **App Settings**: "Allow external access" enabled in Ethereum app

### Security Benefits

- **Cold Storage**: Private keys never leave the hardware device
- **Enhanced Security**: Protection against online threats and malware
- **User Control**: Physical confirmation required for all operations
- **Backup Protection**: Hardware wallet recovery phrases provide ultimate security
- **Professional Grade**: Same security used by institutions and crypto professionals

### Technical Implementation

**Promise Resolution System**:

- Robust promise chain between voice agent and Ledger modal interface
- Proper cleanup of timeouts and global promise handlers
- Session-based connection state management with automatic cleanup
- Fixed critical timing issues in agent-to-modal communication

**Modal Interface**:

- 4-step visual progress flow with real-time feedback
- Comprehensive error handling with specific retry options
- Device state detection and smart flow optimization
- Auto-close functionality after successful operations

### Configuration

The Ledger integration is configured within the unified Adamik agent in `src/app/agentConfigs/adamik/`:

- **Main Agent** (`index.ts`): Voice interface with Ledger instructions and user communication
- **Supervisor Agent** (`supervisorAgent.ts`): Unified device operations, blockchain queries, and fund security logic
- **Service Layer** (`src/app/services/ledger.ts`): Hardware wallet communication via DMK
- **Tool Integration**: `connectToLedgerHardwareWallet` tool provides complete Ledger workflow

### Available Tools

**Wallet Operations**:

- `getPubKey`: Extract public key for address derivation
- `getAddress`: Get wallet address
- `listWallets`: List all embedded wallets across different blockchains
- `createWallet`: Create new embedded wallets for specific blockchain networks
- `requestUserSignature`: Send EVM transactions using Privy's built-in modal
- `sendTokenTransfer`: Send ERC-20 token transfers using Privy's built-in transaction support

**Ledger Hardware Wallet**:

- `connectToLedgerHardwareWallet`: Complete Ledger device connection workflow with modal interface
- `secureFundsToLedger`: Transfer funds from Privy hot wallet to Ledger cold storage

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

## 🪙 Token Transfer Support

### Privy Built-in Token Support

The system now supports seamless ERC-20 token transfers using Privy's native transaction infrastructure:

#### Features:

- **Native Privy Integration**: Uses Privy's `sendTransaction` with encoded token data
- **All EVM Chains**: Works on Ethereum, Polygon, Base, Arbitrum, and all supported networks
- **Direct ERC-20 Encoding**: Generates standard transfer function call data directly
- **Secure UX**: Users see Privy's native transaction modal with token details
- **Cross-chain**: Same wallet address works for tokens on all EVM networks

#### How It Works:

1. User requests token transfer via voice: _"Send 100 USDC to Alice"_
2. Agent calls `sendTokenTransfer` tool with token parameters
3. Tool directly encodes ERC-20 transfer function call data
4. Tool calls `requestUserSignature` with the encoded transaction data
5. Privy shows transaction modal with token details for user review
6. User confirms → Privy automatically signs and broadcasts
7. Transaction hash returned for confirmation

#### Example Usage:

**Voice Command**: _"Send 100 USDC to 0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b"_

**Tool Call**:

```javascript
sendTokenTransfer({
  tokenAddress: "0xA0b86a33E6e87C6e81962e0c50c5B4e4b4c6c4f8", // USDC contract
  to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
  amount: "100000000", // 100 USDC (6 decimals)
  chainId: "ethereum",
  description: "Send 100 USDC to Alice",
});
```

**Result**: Privy modal shows token transfer details, user confirms, transaction broadcasts automatically.

#### Supported Token Examples:

- **USDC**: 6 decimals (100 USDC = "100000000")
- **USDT**: 6 decimals (50 USDT = "50000000")
- **DAI**: 18 decimals (25 DAI = "25000000000000000000")
- **Any ERC-20**: Automatically encoded with proper decimals

#### Implementation Benefits:

- ✅ **Secure**: Uses Privy's built-in security and signing
- ✅ **User-friendly**: Native transaction modal with clear details
- ✅ **Simple**: Direct ERC-20 encoding, no external API dependencies
- ✅ **Fast**: Single tool call handles entire flow
- ✅ **Cross-chain**: Works on all EVM networks seamlessly
- ✅ **Gas optimized**: Privy handles gas estimation automatically
