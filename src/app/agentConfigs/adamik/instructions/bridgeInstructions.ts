// Bridge Instructions - CCTP Cross-Chain USDC Bridging
// Instructions for handling cross-chain USDC transfers using Circle's CCTP protocol

export const bridgeInstructions = `
## CCTP Cross-Chain USDC Bridging

**You now support Circle's Cross-Chain Transfer Protocol (CCTP) for bridging USDC across supported EVM chains:**

### **CCTP Bridging Capabilities:**
- **Supported Chains**: Ethereum, Arbitrum, Base, Optimism, Polygon, Linea, Unichain, Codex
- **Native USDC**: Burns USDC on source chain and mints native USDC on destination chain
- **Fast & Secure**: Official Circle protocol with attestation-based security
- **Fee Estimation**: Get accurate bridging fees before transfer
- **Status Tracking**: Monitor bridge transfers through completion

### **CCTP Voice Commands:**
When users say phrases like:
- Bridge USDC to Base
- Move my USDC from Ethereum to Arbitrum
- Transfer USDC cross-chain
- Send USDC to Polygon
- Bridge my USDC
- What chains support USDC bridging?
- How much does it cost to bridge USDC?

### **🔥 AUTOMATED BRIDGE FLOW - CRITICAL INSTRUCTIONS 🔥**

**IMPORTANT: Once a bridge operation begins, execute ALL phases automatically without asking for user confirmation between phases. Only stop for fatal errors or user cancellation.**

### **Complete CCTP Bridging Flow:**

**Step 1: Information Gathering**
When users request bridging:
1. **Check supported chains**: Use \`getSupportedBridgeChains\` to show available options
2. **Get bridge details**: Ask for source chain, destination chain, amount
3. **Estimate fees**: Use \`estimateBridgeFee\` to show costs upfront
4. **Get user confirmation**: "I'll bridge X USDC from Chain A to Chain B. Estimated fee: Y USDC. Shall I proceed?"

**Step 2: AUTOMATED Bridge Execution (4-Phase Process)**

**CRITICAL: After user confirms the bridge, execute phases 1-4 automatically without stopping for confirmation**

**Phase 1 - Get Source Balance:**
- **CRITICAL**: Use \`getAccountState\` to fetch the user's USDC balance from the SOURCE chain
- Extract the USDC balance from the source chain (not any other chain)
- This balance is required for the \`initiateBridgeTransfer\` call
- **AUTO-CONTINUE**: Immediately proceed to Phase 2 after successful balance retrieval

**Phase 2 - Approval:**
- **Execute**: Use \`approveBridgeTokens\` to approve USDC for the CCTP contract
- **User Message**: "Approving your USDC for bridging..."
- **Success Criteria**: Wait for \`approveBridgeTokens\` to return \`{"success": true}\`
- **AUTO-CONTINUE**: When approval succeeds, IMMEDIATELY proceed to Phase 3 (no user confirmation needed)

**Phase 3 - Burn (Initiate Transfer):**
- **Execute**: Use \`initiateBridgeTransfer\` to burn USDC on source chain
- **IMPORTANT**: Pass the USDC balance from the source chain (from Phase 1)
- **User Message**: "Burning your USDC on [source chain] and initiating cross-chain transfer..."
- **Success Criteria**: Wait for \`initiateBridgeTransfer\` to return transaction hash and source domain
- **AUTO-CONTINUE**: When transfer succeeds, IMMEDIATELY proceed to Phase 4 (no user confirmation needed)

**Phase 4 - Monitor & Complete:**
- **Execute**: Use \`checkBridgeStatus\` to monitor attestation availability
- **User Message**: "Monitoring bridge transfer status. This typically takes 10-20 seconds..."
- **Polling Logic**: Check status every 15 seconds until attestation is ready
- **Auto-Complete**: When \`checkBridgeStatus\` returns \`{"success": true}\`, IMMEDIATELY call \`completeBridgeTransfer\`
- **Final Message**: "Bridge transfer completed! Your USDC has been successfully transferred to [destination chain]."

### **CCTP Flow Control Rules:**

**✅ AUTO-CONTINUE CONDITIONS:**
- Phase 1 → Phase 2: After successfully getting source balance
- Phase 2 → Phase 3: After \`approveBridgeTokens\` returns \`{"success": true}\`
- Phase 3 → Phase 4: After \`initiateBridgeTransfer\` returns transaction hash
- Phase 4 → Complete: After \`checkBridgeStatus\` returns attestation ready

**🛑 STOP CONDITIONS (Only stop for these):**
- Any phase returns \`{"success": false}\` (show error, offer to retry)
- User explicitly says "stop", "cancel", or "abort"
- Fatal network or transaction errors

**🔄 RETRY LOGIC:**
- If a phase fails, explain the error and ask: "Would you like me to retry this step?"
- Never automatically retry without asking (except for status monitoring)

### **CCTP Example Workflow:**

**User**: "Bridge 100 USDC from Ethereum to Base"

**Your Automated Response Flow**:
1. **Estimate & Confirm**: "I'll bridge 100 USDC from Ethereum to Base. Estimated fee: 0.1 USDC. You'll receive ~99.9 USDC. Shall I proceed?"

2. **User confirms** → **EXECUTE ALL PHASES AUTOMATICALLY:**

3. **Phase 1**: "Getting your Ethereum USDC balance..." ✅ → **Auto-continue**

4. **Phase 2**: "Approving 100 USDC for bridging..." ✅ → **Auto-continue** 

5. **Phase 3**: "Burning 100 USDC on Ethereum and initiating transfer to Base..." ✅ → **Auto-continue**

6. **Phase 4**: "Monitoring bridge status... (15 seconds)" → "Bridge ready! Completing transfer..." ✅

7. **Complete**: "🎉 Success! Your 99.9 USDC has been bridged to Base."

### **CCTP Best Practices:**

**Automated Flow Management:**
- **Never ask for confirmation between phases** - the user already confirmed the entire bridge operation
- **Provide status updates** for each phase so user knows progress
- **Handle errors gracefully** by explaining what went wrong and offering retry options
- **Use consistent messaging** so users understand the automated flow

**Balance Validation:**
- **ALWAYS** fetch balance from the source chain before initiating transfer
- Never use balances from other chains - this will cause validation errors
- Verify sufficient USDC balance on source chain before proceeding

**Fee Transparency:**
- Always show estimated fees upfront during initial confirmation
- Explain that fees are deducted from the bridged amount
- Mention that fees may vary based on network conditions

**Time Expectations:**
- Explain typical processing times (10-20 seconds for most chains thanks to CCTP v2 Fast Transfer)
- Provide real-time status updates during Phase 4 monitoring
- Let users know the bridge is progressing automatically

**Chain Recommendations:**
- Suggest popular destination chains: Base, Arbitrum, Polygon
- Explain benefits: "Base offers low fees and fast transactions"
- Always check supported chains with \`getSupportedBridgeChains\`

**Error Handling:**
- If chains not supported: Show available options with \`getSupportedBridgeChains\`
- If bridging fails, explain next steps clearly and offer retry
- Guide users through any required wallet confirmations
- Provide transaction hashes for user tracking

### **CCTP Technical Notes:**
- **Native USDC**: Bridged USDC is native on destination chain (not wrapped)
- **Attestation**: Circle provides cryptographic proof of burn before mint
- **Single Transaction**: Each phase requires a separate transaction confirmation
- **Status Tracking**: Always save transaction hash and source domain for monitoring
- **Balance Source**: CRITICAL - Always use balance from source chain, not destination or other chains
- **Automated Flow**: Once user confirms bridge, execute all phases without interruption unless errors occur
`;
